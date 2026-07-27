<?php

declare(strict_types=1);

ini_set('display_errors', '0');
date_default_timezone_set('Europe/Paris');

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
header("Content-Security-Policy: default-src 'none'; base-uri 'none'; frame-ancestors 'none'");
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');

const RECIPIENT = 'informagicien32@proton.me';
const ALLOWED_NEEDS = [
    'Dépannage ou réparation',
    'Création ou refonte de site internet',
    'Virus, sécurité ou publicités',
    'Internet, réseau ou Wi-Fi',
    'Sauvegarde ou récupération de données',
    'Achat et installation de matériel',
    'Conseil ou formation',
    'Autre demande',
];
const ENGLISH_NEEDS = [
    'Troubleshooting or repairs' => 'Dépannage ou réparation',
    'Website creation or redesign' => 'Création ou refonte de site internet',
    'Viruses, security or pop-ups' => 'Virus, sécurité ou publicités',
    'Internet, network or Wi-Fi' => 'Internet, réseau ou Wi-Fi',
    'Data backup or recovery' => 'Sauvegarde ou récupération de données',
    'Equipment purchase and installation' => 'Achat et installation de matériel',
    'Advice or training' => 'Conseil ou formation',
    'Other request' => 'Autre demande',
];

function respond(int $status, bool $ok, string $message): never
{
    http_response_code($status);
    echo json_encode(
        ['ok' => $ok, 'message' => $message],
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

function text_length(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function single_line(string $value): string
{
    $value = str_replace(["\r", "\n", "\0"], ' ', trim($value));
    return preg_replace('/\s+/u', ' ', $value) ?? '';
}

function rate_limit_exceeded(string $ip): bool
{
    $file = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR)
        . DIRECTORY_SEPARATOR
        . 'pc32-contact-'
        . hash('sha256', 'pc32-contact-form|' . $ip)
        . '.json';

    $handle = @fopen($file, 'c+');
    if ($handle === false || !flock($handle, LOCK_EX)) {
        if (is_resource($handle)) {
            fclose($handle);
        }
        return false;
    }

    $now = time();
    $windowStart = $now - 900;
    $contents = stream_get_contents($handle);
    $attempts = json_decode($contents ?: '[]', true);
    $attempts = is_array($attempts)
        ? array_values(array_filter($attempts, static fn ($time): bool => is_int($time) && $time >= $windowStart))
        : [];

    $blocked = count($attempts) >= 5;
    if (!$blocked) {
        $attempts[] = $now;
    }

    rewind($handle);
    ftruncate($handle, 0);
    fwrite($handle, json_encode($attempts));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);

    return $blocked;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, false, 'Méthode non autorisée.');
}

$contentType = strtolower(trim(explode(';', (string) ($_SERVER['CONTENT_TYPE'] ?? ''))[0]));
if (!in_array($contentType, ['application/x-www-form-urlencoded', 'multipart/form-data'], true)) {
    respond(415, false, 'Format de requête non pris en charge.');
}

$contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > 20000) {
    respond(413, false, 'La demande est trop volumineuse.');
}

if (count($_POST) > 7 || $_FILES !== []) {
    respond(400, false, 'Contenu de la demande non autorisé.');
}

foreach ($_POST as $value) {
    if (is_array($value)) {
        respond(400, false, 'Contenu de la demande non autorisé.');
    }
}

$fetchSite = strtolower((string) ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? ''));
if ($fetchSite !== '' && !in_array($fetchSite, ['same-origin', 'same-site'], true)) {
    respond(403, false, 'Origine de la demande non autorisée.');
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$requestHost = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
if ($origin !== '') {
    $originHost = strtolower((string) parse_url($origin, PHP_URL_HOST));
    if ($originHost === '' || $originHost !== $requestHost) {
        respond(403, false, 'Origine de la demande non autorisée.');
    }
}

if (trim((string) ($_POST['website'] ?? '')) !== '') {
    respond(200, true, 'Votre demande a bien été transmise.');
}

$startedAt = filter_var($_POST['form_started_at'] ?? null, FILTER_VALIDATE_INT);
$elapsedMilliseconds = $startedAt === false ? 0 : ((int) round(microtime(true) * 1000) - $startedAt);
if ($elapsedMilliseconds < 1500) {
    respond(400, false, 'Veuillez patienter un instant avant d’envoyer le formulaire.');
}

$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
if (rate_limit_exceeded($ip)) {
    respond(429, false, 'Trop de demandes ont été envoyées. Veuillez réessayer dans 15 minutes.');
}

$name = single_line((string) ($_POST['nom'] ?? ''));
$phone = single_line((string) ($_POST['telephone'] ?? ''));
$email = single_line((string) ($_POST['email'] ?? ''));
$need = single_line((string) ($_POST['besoin'] ?? ''));
$need = ENGLISH_NEEDS[$need] ?? $need;
$message = trim(str_replace(["\r\n", "\r", "\0"], ["\n", "\n", ''], (string) ($_POST['message'] ?? '')));

if (text_length($name) < 2 || text_length($name) > 100) {
    respond(422, false, 'Veuillez renseigner un nom valide.');
}

if (text_length($phone) < 6 || text_length($phone) > 30 || !preg_match('/^[0-9+().\s-]+$/', $phone)) {
    respond(422, false, 'Veuillez renseigner un numéro de téléphone valide.');
}

if ($email !== '' && (text_length($email) > 254 || filter_var($email, FILTER_VALIDATE_EMAIL) === false)) {
    respond(422, false, 'Veuillez renseigner une adresse email valide.');
}

if (!in_array($need, ALLOWED_NEEDS, true)) {
    respond(422, false, 'Veuillez sélectionner le type d’intervention souhaité.');
}

if (text_length($message) < 15 || text_length($message) > 3000) {
    respond(422, false, 'La description doit contenir entre 15 et 3 000 caractères.');
}

$subject = 'Nouvelle demande sur pc32.fr — ' . $need;
$encodedSubject = function_exists('mb_encode_mimeheader')
    ? mb_encode_mimeheader($subject, 'UTF-8')
    : '=?UTF-8?B?' . base64_encode($subject) . '?=';

$body = implode("\r\n", [
    'Nouvelle demande reçue depuis le formulaire de pc32.fr',
    '',
    'Nom : ' . $name,
    'Téléphone : ' . $phone,
    'Email : ' . ($email !== '' ? $email : 'Non renseigné'),
    'Besoin : ' . $need,
    '',
    'Description :',
    $message,
    '',
    'Date : ' . date('d/m/Y à H:i'),
]);

$headers = [
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8',
    'Content-Transfer-Encoding' => '8bit',
    'From' => 'Formulaire pc32.fr <noreply@pc32.fr>',
];

if ($email !== '') {
    $headers['Reply-To'] = $email;
}

$dryRun = getenv('PC32_FORM_DRY_RUN') === '1';
$sent = $dryRun || @mail(RECIPIENT, $encodedSubject, $body, $headers);

if (!$sent) {
    error_log('Échec de la fonction mail() pour le formulaire pc32.fr');
    respond(500, false, 'L’envoi est temporairement indisponible. Appelez-nous au 06 45 76 87 84.');
}

respond(200, true, 'Votre demande a bien été transmise.');
