<?php
// Appelé par CapTure quand une personne colle sa clé : vérifie la clé et renvoie une preuve liée à son ordinateur.
// Entrée : JSON {"code":"CAPT-XXXX-XXXX-XXXX","machine":"<16 signes hexadécimaux>"}.
// Sortie : {"ok":true,"token":"…","holder":"…"} ou {"ok":false,"error":"invalid|unknown|revoked|limit|throttled|server"}.
// Avec "action":"deactivate" en plus : libère la place de cet ordinateur, sortie {"ok":true,"released":true|false}.
declare(strict_types=1);
require __DIR__ . '/lib.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    reply(['ok' => false, 'error' => 'invalid']);
}
$input = json_decode(file_get_contents('php://input') ?: '', true);
$code = strtoupper(trim((string) ($input['code'] ?? '')));
$machine = strtolower(trim((string) ($input['machine'] ?? '')));
$action = (string) ($input['action'] ?? 'activate');
if (!valid_code($code) || !valid_machine($machine) || !in_array($action, ['activate', 'deactivate'], true)) {
    reply(['ok' => false, 'error' => 'invalid']);
}

try {
    $c = cfg();
    $pdo = db();
    $ip = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . $c['salt']);

    // Freinage de ceux qui devinent des clés.
    $pdo->prepare('DELETE FROM essais WHERE tried_at < ?')->execute([gmdate('Y-m-d H:i:s', time() - 86400)]);
    $count = $pdo->prepare('SELECT COUNT(*) FROM essais WHERE ip = ? AND tried_at >= ?');
    $count->execute([$ip, gmdate('Y-m-d H:i:s', time() - 3600)]);
    if ((int) $count->fetchColumn() >= (int) $c['max_failures_per_hour']) {
        reply(['ok' => false, 'error' => 'throttled']);
    }

    $licence = find_licence_by_code($code);
    if ($licence === null) {
        $pdo->prepare('INSERT INTO essais (ip, tried_at) VALUES (?, ?)')->execute([$ip, now()]);
        reply(['ok' => false, 'error' => 'unknown']);
    }
    // Désactivation demandée depuis CapTure : libère la place de CET ordinateur (jamais celle d'un autre).
    // Sans effet si l'ordinateur n'était pas activé ; permise même pour une clé annulée.
    if ($action === 'deactivate') {
        $gone = $pdo->prepare('DELETE FROM activations WHERE licence_id = ? AND machine = ?');
        $gone->execute([$licence['id'], $machine]);
        if ($gone->rowCount() > 0) {
            log_line('Clé #' . $licence['id'] . ' : un ordinateur désactivé, une place libérée');
        }
        reply(['ok' => true, 'released' => $gone->rowCount() > 0]);
    }
    if ($licence['revoked_at'] !== null) {
        reply(['ok' => false, 'error' => 'revoked']);
    }

    $known = $pdo->prepare('SELECT id FROM activations WHERE licence_id = ? AND machine = ?');
    $known->execute([$licence['id'], $machine]);
    if ($known->fetch()) {
        $pdo->prepare('UPDATE activations SET last_seen = ? WHERE licence_id = ? AND machine = ?')
            ->execute([now(), $licence['id'], $machine]);
    } else {
        $used = $pdo->prepare('SELECT COUNT(*) FROM activations WHERE licence_id = ?');
        $used->execute([$licence['id']]);
        if ((int) $used->fetchColumn() >= (int) $c['max_machines']) {
            log_line('Clé #' . $licence['id'] . ' : refus, ' . $c['max_machines'] . ' ordinateurs déjà activés');
            reply(['ok' => false, 'error' => 'limit']);
        }
        $pdo->prepare('INSERT INTO activations (licence_id, machine, first_seen, last_seen) VALUES (?, ?, ?, ?)')
            ->execute([$licence['id'], $machine, now(), now()]);
        log_line('Clé #' . $licence['id'] . ' activée sur un nouvel ordinateur');
    }
    reply(['ok' => true, 'token' => make_token($licence['holder'], $machine), 'holder' => $licence['holder']]);
} catch (Throwable $e) {
    log_line('ERREUR activation : ' . $e->getMessage());
    reply(['ok' => false, 'error' => 'server']);
}
