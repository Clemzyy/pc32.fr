<?php
// Fonctions communes à ipn.php (notifications PayPal) et activate.php (activation depuis CapTure).
declare(strict_types=1);

/** Configuration : config.php à côté de ce fichier (ou le fichier nommé par la variable CAPTURE_CONFIG, pour les essais). */
function cfg(): array
{
    static $config = null;
    if ($config === null) {
        $path = getenv('CAPTURE_CONFIG') ?: __DIR__ . '/config.php';
        $config = require $path;
    }
    return $config;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = cfg();
        $pdo = new PDO($c['db_dsn'], $c['db_user'] ?? null, $c['db_pass'] ?? null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

function now(): string
{
    return gmdate('Y-m-d H:i:s');
}

function log_line(string $message): void
{
    @file_put_contents(cfg()['log_file'], '[' . now() . '] ' . $message . "\n", FILE_APPEND | LOCK_EX);
}

/** Adresse masquée pour le journal : « ma***@exemple.fr ». */
function mask_email(string $email): string
{
    $parts = explode('@', $email, 2);
    return substr($parts[0], 0, 2) . '***@' . ($parts[1] ?? '?');
}

/** Clé de la forme CAPT-XXXX-XXXX-XXXX (32 signes sans I, O, 0 ni 1 : 60 bits au hasard). */
function new_code(): string
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $part = static function () use ($alphabet): string {
        $out = '';
        for ($i = 0; $i < 4; $i++) {
            $out .= $alphabet[random_int(0, 31)];
        }
        return $out;
    };
    return 'CAPT-' . $part() . '-' . $part() . '-' . $part();
}

function valid_code(string $code): bool
{
    return preg_match('/^CAPT-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/', $code) === 1;
}

function valid_machine(string $machine): bool
{
    return preg_match('/^[0-9a-f]{16}$/', $machine) === 1;
}

/** Prénom affiché : celui donné par PayPal, sinon le début de l'adresse. */
function holder_name(string $firstName, string $email): string
{
    $name = trim(preg_replace('/[\x00-\x1f\x7f]/u', '', $firstName) ?? '');
    if ($name === '') {
        $name = explode('@', $email, 2)[0];
    }
    return mb_substr($name, 0, 40);
}

/** Crée la clé d'un don (ou d'un cadeau). Renvoie la ligne créée. */
function create_licence(string $email, string $holder, string $txn, float $amount, string $currency, ?string $note = null): array
{
    $pdo = db();
    for ($try = 0; $try < 5; $try++) {
        $code = new_code();
        try {
            $stmt = $pdo->prepare(
                'INSERT INTO licences (code, email, holder, txn_id, amount, currency, created_at, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([$code, $email, $holder, $txn, number_format($amount, 2, '.', ''), $currency, now(), $note]);
            return find_licence_by_code($code) ?? throw new RuntimeException('clé créée mais introuvable');
        } catch (PDOException $e) {
            // Code déjà pris (rarissime) : on retente. Transaction déjà connue : on remonte l'erreur.
            if (str_contains($e->getMessage(), 'txn')) {
                throw $e;
            }
        }
    }
    throw new RuntimeException('impossible de créer une clé unique');
}

function find_licence_by_code(string $code): ?array
{
    $stmt = db()->prepare('SELECT * FROM licences WHERE code = ?');
    $stmt->execute([$code]);
    return $stmt->fetch() ?: null;
}

function find_licence_by_txn(string $txn): ?array
{
    $stmt = db()->prepare('SELECT * FROM licences WHERE txn_id = ?');
    $stmt->execute([$txn]);
    return $stmt->fetch() ?: null;
}

/** Adresses citées dans le courrier : la page du logiciel (avec son bouton de téléchargement) et le logo. */
const MAIL_PAGE_URL = 'https://www.pc32.fr/capture/';
const MAIL_DOWNLOAD_URL = 'https://www.pc32.fr/capture/#telecharger';
const MAIL_LOGO_URL = 'https://www.pc32.fr/assets/capture-mail.png';

/** « 1 seul ordinateur » ou « 2 ordinateurs au plus », pour l'e-mail de la clé. */
function computers_phrase(int $max): string
{
    return $max === 1 ? '1 seul ordinateur' : "$max ordinateurs au plus";
}

function mail_greeting(string $holder): string
{
    return $holder !== '' ? "Bonjour $holder," : 'Bonjour,';
}

/** Version texte du courrier : lisible partout, et seule version affichée si la messagerie refuse le HTML. */
function key_mail_text(string $holder, string $code, int $max): string
{
    return mail_greeting($holder) . "\r\n\r\n"
        . "Merci pour votre soutien à CapTure !\r\n\r\n"
        . "Votre clé d'activation :\r\n\r\n    $code\r\n\r\n"
        . "Pour l'activer :\r\n"
        . "1. Téléchargez et installez CapTure (gratuit, Windows 10 et 11) : " . MAIL_DOWNLOAD_URL . "\r\n"
        . "   Windows peut afficher un avertissement car le programme n'est pas encore signé : la page explique quoi faire.\r\n"
        . "2. Ouvrez CapTure, allez dans Réglages > Activation, collez la clé et cliquez sur « Activer ».\r\n"
        . "   L'ordinateur doit être connecté à internet pendant l'activation.\r\n\r\n"
        . 'Cette clé fonctionne sur ' . computers_phrase($max) . ". Pour changer d'ordinateur, cliquez sur « Désactiver cet ordinateur » dans Réglages > Activation. Conservez ce message.\r\n"
        . "Un souci ? Répondez simplement à ce message.\r\n\r\n"
        . "Clemzy\r\nInforMagicien · " . MAIL_PAGE_URL . "\r\n";
}

/** Version HTML : mise en page à tableaux et styles en ligne, la seule forme comprise par toutes les messageries. */
function key_mail_html(string $holder, string $code, int $max): string
{
    $h = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $hello = $h(mail_greeting($holder));
    $computers = computers_phrase($max);
    $key = $h($code);
    $page = MAIL_PAGE_URL;
    $download = MAIL_DOWNLOAD_URL;
    $logo = MAIL_LOGO_URL;
    $step = static fn (int $n, string $text): string =>
        '<tr><td width="34" valign="top" style="padding:6px 0;"><span style="display:inline-block;width:24px;height:24px;line-height:24px;border-radius:12px;background:#e8f0fe;color:#1e66f5;font-weight:bold;font-size:13px;text-align:center;">' . $n . '</span></td>'
        . '<td valign="top" style="padding:6px 0;font-size:15px;line-height:22px;color:#13233a;">' . $text . '</td></tr>';
    $steps = $step(1, '<strong>Téléchargez et installez CapTure</strong> avec le bouton ci-dessus (gratuit, Windows 10 et 11).')
        . $step(2, 'Ouvrez CapTure, puis <strong>Réglages › Activation</strong>.')
        . $step(3, 'Collez la clé et cliquez sur <strong>Activer</strong>. L’ordinateur doit être connecté à internet.');
    return <<<HTML
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Votre clé d’activation CapTure</title>
</head>
<body style="margin:0;padding:0;background:#f2f6f8;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f2f6f8;">Votre clé d’activation CapTure est prête : voici comment l’utiliser.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f6f8;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;border:1px solid #dfe7ec;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
<tr><td style="background:#102f50;border-radius:12px 12px 0 0;padding:20px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td valign="middle"><img src="$logo" width="56" height="56" alt="CapTure" style="display:block;border:0;border-radius:10px;"></td>
<td valign="middle" style="padding-left:14px;"><div style="font-size:22px;font-weight:bold;color:#ffffff;">CapTure</div><div style="font-size:13px;color:#79e6df;">L’enregistreur de réunions pour Windows</div></td>
</tr></table>
</td></tr>
<tr><td style="padding:28px 28px 8px 28px;color:#13233a;">
<p style="margin:0 0 12px 0;font-size:18px;font-weight:bold;">$hello</p>
<p style="margin:0 0 20px 0;font-size:15px;line-height:23px;">Merci pour votre soutien à CapTure ! Voici votre clé d’activation.</p>
<div style="background:#f2f6f8;border:2px solid #dfe7ec;border-radius:10px;padding:18px 12px;text-align:center;">
<div style="font-size:12px;color:#5c6b7d;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Votre clé d’activation</div>
<div style="font-family:Consolas,Menlo,'Courier New',monospace;font-size:24px;font-weight:bold;letter-spacing:2px;color:#102f50;">$key</div>
</div>
</td></tr>
<tr><td align="center" style="padding:24px 28px 8px 28px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#1e66f5" style="background:#1e66f5;border-radius:8px;">
<a href="$download" style="display:inline-block;padding:14px 30px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;">Télécharger CapTure</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:16px 28px 8px 28px;">
<p style="margin:0 0 6px 0;font-size:15px;font-weight:bold;color:#13233a;">Pour l’activer</p>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">$steps</table>
</td></tr>
<tr><td style="padding:12px 28px 24px 28px;">
<p style="margin:0 0 10px 0;font-size:13px;line-height:20px;color:#5c6b7d;">Cette clé fonctionne sur $computers. Pour changer d’ordinateur, cliquez sur « Désactiver cet ordinateur » dans Réglages › Activation. Conservez ce message.</p>
<p style="margin:0;font-size:13px;line-height:20px;color:#5c6b7d;">Windows peut afficher « Windows a protégé votre ordinateur » car le programme n’est pas encore signé : <a href="$download" style="color:#1e66f5;">la page de téléchargement</a> explique quoi faire.</p>
</td></tr>
<tr><td style="border-top:1px solid #dfe7ec;padding:18px 28px;font-size:13px;line-height:20px;color:#5c6b7d;">
Un souci ? Répondez simplement à ce message.<br>
Clemzy · <a href="$page" style="color:#1e66f5;">InforMagicien, pc32.fr</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
HTML;
}

/**
 * Courrier complet : objet, en-têtes et corps (texte + HTML, encodés en quoted-printable).
 * @return array{subject: string, headers: list<string>, body: string}
 */
function key_mail_message(string $holder, string $code, ?int $maxMachines = null): array
{
    $c = cfg();
    $max = $maxMachines ?? (int) $c['max_machines'];
    $boundary = '=_capture_' . bin2hex(random_bytes(12));
    $part = static fn (string $type, string $content): string =>
        "--$boundary\r\nContent-Type: $type; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n"
        . quoted_printable_encode($content) . "\r\n";
    return [
        'subject' => 'Votre clé d\'activation CapTure',
        'headers' => [
            'From: ' . mb_encode_mimeheader($c['mail_from_name'], 'UTF-8') . ' <' . $c['mail_from'] . '>',
            'Reply-To: ' . $c['mail_from'],
            'MIME-Version: 1.0',
            "Content-Type: multipart/alternative; boundary=\"$boundary\"",
        ],
        'body' => $part('text/plain', key_mail_text($holder, $code, $max))
            . $part('text/html', key_mail_html($holder, $code, $max))
            . "--$boundary--\r\n",
    ];
}

/** Envoie la clé au donateur. Renvoie vrai si le courrier est parti. */
function send_key_mail(string $to, string $holder, string $code, ?int $maxMachines = null): bool
{
    $c = cfg();
    if (!filter_var($to, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $to)) {
        return false;
    }
    $m = key_mail_message($holder, $code, $maxMachines);
    if (($c['mail_transport'] ?? 'mail') === 'file') {
        // Essais : le courrier est écrit en clair (corps décodé) pour pouvoir être relu.
        $text = "À : $to\nObjet : {$m['subject']}\n" . implode("\n", $m['headers']) . "\n\n" . quoted_printable_decode($m['body']) . "\n----\n";
        return file_put_contents($c['mail_file'], $text, FILE_APPEND | LOCK_EX) !== false;
    }
    return mail($to, '=?UTF-8?B?' . base64_encode($m['subject']) . '?=', $m['body'], implode("\r\n", $m['headers']));
}

function b64url(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/** Preuve d'activation : le même format que les clés signées de CapTure, liée à un ordinateur. */
function make_token(string $holder, string $machine): string
{
    $secret = base64_decode(cfg()['signing_key'], true);
    if ($secret === false || strlen($secret) !== SODIUM_CRYPTO_SIGN_SECRETKEYBYTES) {
        throw new RuntimeException('signing_key absente ou invalide dans config.php');
    }
    $payload = json_encode(
        ['holder' => $holder, 'issued' => gmdate('Y-m-d'), 'machine' => $machine],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    return 'CAPT1-' . b64url($payload) . '.' . b64url(sodium_crypto_sign_detached($payload, $secret));
}

/** Confirme auprès de PayPal qu'une notification est authentique (elle lui est renvoyée telle quelle). */
function paypal_confirms(string $rawBody): bool
{
    $curl = curl_init(cfg()['paypal_verify_url']);
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => 'cmd=_notify-validate&' . $rawBody,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_HTTPHEADER => ['Connection: Close', 'User-Agent: CapTure-IPN'],
    ]);
    $answer = curl_exec($curl);
    curl_close($curl);
    return is_string($answer) && trim($answer) === 'VERIFIED';
}

/** PayPal envoie les textes dans le jeu de caractères du champ « charset » (souvent windows-1252) : on passe en UTF-8. */
function ipn_to_utf8(array $p): array
{
    $charset = strtolower(trim((string) ($p['charset'] ?? '')));
    if ($charset === '' || $charset === 'utf-8') {
        return $p;
    }
    $from = in_array($charset, ['windows-1252', 'iso-8859-1', 'iso-8859-15'], true) ? $charset : 'Windows-1252';
    foreach ($p as $key => $value) {
        if (is_string($value)) {
            $p[$key] = mb_convert_encoding($value, 'UTF-8', $from);
        }
    }
    return $p;
}

/** Traite une notification de paiement ou de remboursement déjà authentifiée. */
function handle_ipn(array $p): void
{
    $p = ipn_to_utf8($p);
    $c = cfg();
    $status = (string) ($p['payment_status'] ?? '');
    $txn = trim((string) ($p['txn_id'] ?? ''));
    if ($txn === '' || strlen($txn) > 40) {
        return;
    }
    if (($p['test_ipn'] ?? '') === '1' && empty($c['allow_test_ipn'])) {
        log_line("IPN de test ignorée ($txn)");
        return;
    }
    if (strcasecmp(trim((string) ($p['receiver_email'] ?? '')), (string) $c['paypal_receiver']) !== 0) {
        log_line("IPN ignorée ($txn) : destinataire inattendu");
        return;
    }

    if ($status === 'Refunded' || $status === 'Reversed') {
        $parent = trim((string) ($p['parent_txn_id'] ?? ''));
        $licence = $parent === '' ? null : find_licence_by_txn($parent);
        if ($licence === null) {
            return;
        }
        $remaining = (float) $licence['amount'] - abs((float) ($p['mc_gross'] ?? 0));
        if ($remaining < (float) $c['min_amount'] && $licence['revoked_at'] === null) {
            $stmt = db()->prepare('UPDATE licences SET revoked_at = ? WHERE id = ?');
            $stmt->execute([now(), $licence['id']]);
            log_line("Clé révoquée après remboursement ($parent)");
        }
        return;
    }
    if ($status !== 'Completed') {
        return;
    }

    if (strtoupper((string) ($p['mc_currency'] ?? '')) !== $c['currency']) {
        log_line("Don ignoré ($txn) : devise " . ($p['mc_currency'] ?? '?'));
        return;
    }
    $amount = (float) ($p['mc_gross'] ?? 0);
    if ($amount + 0.001 < (float) $c['min_amount']) {
        log_line("Don de $amount sans clé ($txn) : sous le minimum");
        return;
    }
    $email = trim((string) ($p['payer_email'] ?? ''));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        log_line("Don ignoré ($txn) : adresse du donateur illisible");
        return;
    }

    $licence = find_licence_by_txn($txn);
    if ($licence === null) {
        try {
            $holder = holder_name((string) ($p['first_name'] ?? ''), $email);
            $licence = create_licence($email, $holder, $txn, $amount, $c['currency']);
            log_line("Clé créée pour " . mask_email($email) . " ($txn)");
        } catch (PDOException $e) {
            log_line("Clé non créée ($txn) : transaction déjà traitée");
            return;
        }
    }
    if ($licence['mail_sent_at'] === null) {
        if (send_key_mail($licence['email'], $licence['holder'], $licence['code'])) {
            $stmt = db()->prepare('UPDATE licences SET mail_sent_at = ? WHERE id = ?');
            $stmt->execute([now(), $licence['id']]);
            log_line("E-mail envoyé à " . mask_email($licence['email']));
        } else {
            log_line("E-MAIL NON ENVOYÉ à " . mask_email($licence['email']) . " : la clé est en base, PayPal réessaiera");
        }
    }
}

/** Réponse JSON de activate.php. */
function reply(array $data): never
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
