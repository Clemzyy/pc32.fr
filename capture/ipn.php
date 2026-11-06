<?php
// Appelé par PayPal à chaque paiement ou remboursement (notification instantanée de paiement, IPN).
declare(strict_types=1);
require __DIR__ . '/lib.php';

// PayPal veut toujours un « 200 » rapide ; les décisions se lisent dans le journal.
http_response_code(200);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    exit;
}
$raw = file_get_contents('php://input') ?: '';
try {
    if (!paypal_confirms($raw)) {
        log_line('Notification refusée : PayPal ne la reconnaît pas');
        exit;
    }
    handle_ipn($_POST);
} catch (Throwable $e) {
    log_line('ERREUR : ' . $e->getMessage());
    // 500 : PayPal renverra la notification plus tard.
    http_response_code(500);
}
