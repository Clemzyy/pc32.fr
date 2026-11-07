<?php
// Envoie par e-mail la clé d'une licence déjà créée à la main dans phpMyAdmin (clé offerte), avec le même courrier que
// celui des donateurs. Appelé par envoyer_cle.py (sur le PC de l'auteur), jamais par CapTure.
// Entrée : JSON {"code":"CAPT-XXXX-XXXX-XXXX","token":"<admin_token de config.php>","resend":false}.
// Sortie : {"ok":true,"sent_to":"m***@exemple.fr"} ou
//          {"ok":false,"error":"invalid|forbidden|throttled|unknown|revoked|already_sent|mail_failed|server"}.
// Sans « admin_token » (32 signes au moins) dans config.php, ce programme refuse tout.
declare(strict_types=1);
require __DIR__ . '/lib.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    reply(['ok' => false, 'error' => 'invalid']);
}
$input = json_decode(file_get_contents('php://input') ?: '', true);
$code = strtoupper(trim((string) ($input['code'] ?? '')));
$token = (string) ($input['token'] ?? '');
$resend = ($input['resend'] ?? false) === true;
if (!valid_code($code) || $token === '' || strlen($token) > 200) {
    reply(['ok' => false, 'error' => 'invalid']);
}

try {
    $c = cfg();
    $pdo = db();
    $ip = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . $c['salt']);

    // Même freinage que activate.php : on ne peut pas deviner le jeton à coups d'essais.
    $pdo->prepare('DELETE FROM essais WHERE tried_at < ?')->execute([gmdate('Y-m-d H:i:s', time() - 86400)]);
    $count = $pdo->prepare('SELECT COUNT(*) FROM essais WHERE ip = ? AND tried_at >= ?');
    $count->execute([$ip, gmdate('Y-m-d H:i:s', time() - 3600)]);
    if ((int) $count->fetchColumn() >= (int) $c['max_failures_per_hour']) {
        reply(['ok' => false, 'error' => 'throttled']);
    }

    $expected = (string) ($c['admin_token'] ?? '');
    if (strlen($expected) < 32 || !hash_equals(hash('sha256', $expected), hash('sha256', $token))) {
        $pdo->prepare('INSERT INTO essais (ip, tried_at) VALUES (?, ?)')->execute([$ip, now()]);
        log_line('Envoi de clé refusé : jeton incorrect ou absent');
        reply(['ok' => false, 'error' => 'forbidden']);
    }

    $licence = find_licence_by_code($code);
    if ($licence === null) {
        reply(['ok' => false, 'error' => 'unknown']);
    }
    if ($licence['revoked_at'] !== null) {
        reply(['ok' => false, 'error' => 'revoked']);
    }
    // Pas de second envoi par erreur : il faut le demander explicitement.
    if ($licence['mail_sent_at'] !== null && !$resend) {
        reply(['ok' => false, 'error' => 'already_sent']);
    }

    $max = isset($licence['max_machines']) ? (int) $licence['max_machines'] : null;
    if (!send_key_mail($licence['email'], $licence['holder'], $licence['code'], $max)) {
        log_line('E-MAIL NON ENVOYÉ (envoi manuel) à ' . mask_email($licence['email']));
        reply(['ok' => false, 'error' => 'mail_failed']);
    }
    $pdo->prepare('UPDATE licences SET mail_sent_at = ? WHERE id = ?')->execute([now(), $licence['id']]);
    log_line('E-mail envoyé à ' . mask_email($licence['email']) . ' (clé offerte, envoi manuel)');
    reply(['ok' => true, 'sent_to' => mask_email($licence['email'])]);
} catch (Throwable $e) {
    log_line('ERREUR envoi manuel : ' . $e->getMessage());
    reply(['ok' => false, 'error' => 'server']);
}
