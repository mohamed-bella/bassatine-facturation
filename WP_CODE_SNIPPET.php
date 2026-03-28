
/**
 * Plugin Name: Bassatine Invoice Manager
 * Description: Système de facturation professionnel. Gestion centralisée, design minimaliste.
 * Version: 6.0
 * Author: Antigravity
 */

if (!defined('ABSPATH')) exit;

class BassatineInvoiceManager {
    private $table_name;
    private $version = '6.0';

    public function __construct() {
        global $wpdb;
        $this->table_name = $wpdb->prefix . 'bassatine_invoices';

        register_activation_hook(__FILE__, array($this, 'activate'));
        add_action('admin_init', array($this, 'check_db_installation'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_assets'));
        add_action('admin_init', array($this, 'register_settings'));
        
        // POST Handlers (No AJAX)
        add_action('admin_post_bassatine_save_invoice', array($this, 'handle_save_invoice'));
        add_action('admin_post_bassatine_delete_invoice', array($this, 'handle_delete_invoice'));
        add_action('admin_post_bassatine_trash_invoice', array($this, 'handle_trash_invoice'));
        add_action('admin_post_bassatine_restore_invoice', array($this, 'handle_restore_invoice'));
        add_action('admin_post_bassatine_permanent_delete', array($this, 'handle_permanent_delete'));
        add_action('admin_post_bassatine_view_invoice', array($this, 'render_print_view')); // Standalone View
        add_action('admin_post_bassatine_convert_invoice', array($this, 'handle_convert_invoice'));
        add_action('admin_post_bassatine_export_csv', array($this, 'handle_export_csv'));
        add_action('admin_post_bassatine_export_sql', array($this, 'handle_export_sql'));
        add_action('admin_post_bassatine_bulk_print', array($this, 'handle_bulk_print'));
        add_action('admin_post_bassatine_email_invoice', array($this, 'handle_email_invoice'));
        
        // AJAX Handlers for Email with PDF
        add_action('wp_ajax_bassatine_get_invoice_html', array($this, 'ajax_get_invoice_html'));
        add_action('wp_ajax_bassatine_send_email_with_pdf', array($this, 'ajax_send_email_with_pdf'));
    }

    public function activate() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $this->table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            invoice_number varchar(50) NOT NULL,
            invoice_date date NOT NULL,
            invoice_type varchar(20) NOT NULL,
            invoice_status varchar(20) DEFAULT 'paid' NOT NULL,
            is_trashed tinyint(1) DEFAULT 0 NOT NULL,
            recipient_name varchar(255) NOT NULL,
            recipient_ice varchar(50) NOT NULL,
            recipient_email varchar(100) NOT NULL,
            items_json longtext NOT NULL,
            subtotal_ht decimal(15,2) NOT NULL,
            vat_amount decimal(15,2) NOT NULL,
            grand_total_ttc decimal(15,2) NOT NULL,
            amount_words text NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            PRIMARY KEY  (id),
            KEY is_trashed (is_trashed),
            KEY invoice_date (invoice_date)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        update_option('bassatine_db_version', '6.0');
    }

    public function check_db_installation() {
        if (get_option('bassatine_db_version') != '6.0') {
            $this->activate();
        }
    }

    public function register_settings() {
        register_setting('bassatine_options', 'bassatine_logo_url');
        register_setting('bassatine_options', 'bassatine_company_name');
        register_setting('bassatine_options', 'bassatine_company_details');
        register_setting('bassatine_options', 'bassatine_email_subject');
        register_setting('bassatine_options', 'bassatine_email_template');
    }

    public function add_admin_menu() {
        add_menu_page('Factures', 'Les Factures', 'manage_options', 'bassatine-invoices', array($this, 'render_admin_list'), 'dashicons-media-document', 25);
        add_submenu_page('bassatine-invoices', 'Toutes', 'Toutes les Factures', 'manage_options', 'bassatine-invoices', array($this, 'render_admin_list'));
        add_submenu_page('bassatine-invoices', 'Nouveau', 'Nouvelle Facture', 'manage_options', 'bassatine-new-invoice', array($this, 'render_invoice_form'));
        add_submenu_page('bassatine-invoices', 'Réglages', 'Réglages', 'manage_options', 'bassatine-settings', array($this, 'render_settings_page'));
    }

    public function enqueue_assets($hook) {
        if (strpos($hook, 'bassatine') === false) return;
        wp_enqueue_script('tailwindcss', 'https://cdn.tailwindcss.com', array(), '3.4.1');
        wp_enqueue_style('google-fonts-inter', 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap', array(), null);
        
        if (strpos($hook, 'bassatine-invoices') !== false) {
            wp_enqueue_script('html2pdf', 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js', array(), '0.10.1', true);
        }
    }

    /* -------------------------------------------------------------------------- */
    /*                                  HANDLERS                                  */
    /* -------------------------------------------------------------------------- */
    public function handle_save_invoice() {
        check_admin_referer('bassatine_save_action', 'bassatine_nonce');
        if (!current_user_can('manage_options')) wp_die('Unauthorized');

        global $wpdb;
        $items = isset($_POST['items']) ? $_POST['items'] : array();
        
        $data = array(
            'invoice_number'   => sanitize_text_field($_POST['invoice_number']),
            'invoice_date'     => sanitize_text_field($_POST['invoice_date']),
            'invoice_type'     => sanitize_text_field($_POST['invoice_type']),
            'invoice_status'   => sanitize_text_field($_POST['invoice_status']),
            'recipient_name'   => sanitize_text_field($_POST['recipient_name']),
            'recipient_ice'    => sanitize_text_field($_POST['recipient_ice']),
            'recipient_email'  => sanitize_email($_POST['recipient_email']),
            'items_json'       => wp_json_encode(array_values($items)), // Re-index to ensure JSON array
            'subtotal_ht'      => floatval($_POST['subtotal_ht']),
            'vat_amount'       => floatval($_POST['vat_amount']),
            'grand_total_ttc'  => floatval($_POST['grand_total_ttc']),
            'amount_words'     => sanitize_textarea_field($_POST['amount_words']),
        );

        if (!empty($_POST['id'])) {
            $wpdb->update($this->table_name, $data, array('id' => intval($_POST['id'])));
            wp_safe_redirect(admin_url('admin.php?page=bassatine-invoices&updated=1'));
        } else {
            $wpdb->insert($this->table_name, $data);
            wp_safe_redirect(admin_url('admin.php?page=bassatine-invoices&created=1'));
        }
        exit;
    }

    public function handle_delete_invoice() {
        // Legacy handler - redirects to trash for safety
        $this->handle_trash_invoice();
    }
    
    public function handle_trash_invoice() {
        check_admin_referer('bassatine_delete_action', 'bassatine_nonce');
        if (!current_user_can('manage_options')) wp_die('Non autorisé');

        global $wpdb;
        $id = isset($_REQUEST['id']) ? intval($_REQUEST['id']) : 0;
        $wpdb->update($this->table_name, array('is_trashed' => 1), array('id' => $id));
        
        wp_safe_redirect(admin_url('admin.php?page=bassatine-invoices&trashed=1'));
        exit;
    }
    
    public function handle_restore_invoice() {
        check_admin_referer('bassatine_restore_action', 'bassatine_nonce');
        if (!current_user_can('manage_options')) wp_die('Non autorisé');

        global $wpdb;
        $id = isset($_REQUEST['id']) ? intval($_REQUEST['id']) : 0;
        $wpdb->update($this->table_name, array('is_trashed' => 0), array('id' => $id));
        
        wp_safe_redirect(admin_url('admin.php?page=bassatine-invoices&restored=1'));
        exit;
    }
    
    public function handle_permanent_delete() {
        check_admin_referer('bassatine_permanent_delete_action', 'bassatine_nonce');
        if (!current_user_can('manage_options')) wp_die('Non autorisé');

        global $wpdb;
        $id = isset($_REQUEST['id']) ? intval($_REQUEST['id']) : 0;
        $wpdb->delete($this->table_name, array('id' => $id));
        
        wp_safe_redirect(admin_url('admin.php?page=bassatine-invoices&view=trash&permanently_deleted=1'));
        exit;
    }

    public function handle_convert_invoice() {
        check_admin_referer('bassatine_convert_action', 'bassatine_nonce');
        if (!current_user_can('manage_options')) wp_die('Non autorisé');

        global $wpdb;
        $id = isset($_REQUEST['id']) ? intval($_REQUEST['id']) : 0;
        $source = $wpdb->get_row($wpdb->prepare("SELECT * FROM $this->table_name WHERE id = %d", $id), ARRAY_A);
        
        if (!$source) wp_die('Invoice not found');

        unset($source['id']); // New record
        $source['invoice_type'] = 'commercial';
        // RETAIN SAME NUMBER: $source['invoice_number'] is unchanged
        $source['invoice_date'] = date('Y-m-d');
        $source['created_at'] = current_time('mysql');

        $wpdb->insert($this->table_name, $source);
        
        wp_safe_redirect(admin_url('admin.php?page=bassatine-invoices&converted=1'));
        exit;
    }

    public function handle_email_invoice() {
        check_admin_referer('bassatine_email_action', 'bassatine_nonce');
        if (!current_user_can('manage_options')) wp_die('Non autorisé');

        global $wpdb;
        $id = isset($_REQUEST['id']) ? intval($_REQUEST['id']) : 0;
        $invoice = $wpdb->get_row($wpdb->prepare("SELECT * FROM $this->table_name WHERE id = %d", $id));

        if (!$invoice) wp_die('Facture non trouvée');
        if (empty($invoice->recipient_email)) wp_die('Email du client manquant');

        $subject = get_option('bassatine_email_subject', 'Votre facture de Bassatine Skoura');
        $template = get_option('bassatine_email_template', "Bonjour {client_name},\n\nVeuillez trouver ci-joint votre facture N° {invoice_number}.\n\nCordialement,\nL'équipe Bassatine Skoura");

        $body = str_replace(
            array('{client_name}', '{invoice_number}'),
            array($invoice->recipient_name, $invoice->invoice_number),
            $template
        );

        $headers = array('Content-Type: text/plain; charset=UTF-8');
        
        // Note: Real attachment would require generating PDF and saving it temporarily.
        // For now, we send the notification. We could later add a link to the public invoice view if available.
        // In this implementation, the user asked for "One-Click Email Sending" with customizable body.
        
        $sent = wp_mail($invoice->recipient_email, $subject, $body, $headers);

        if ($sent) {
            wp_safe_redirect(admin_url('admin.php?page=bassatine-invoices&email_sent=1'));
        } else {
            wp_safe_redirect(admin_url('admin.php?page=bassatine-invoices&email_failed=1'));
        }
        exit;
    }

    public function ajax_get_invoice_html() {
        check_ajax_referer('bassatine_invoice_nonce', 'nonce');
        if (!current_user_can('manage_options')) wp_die(-1);

        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
        $html = $this->get_invoice_html($id, true);
        
        wp_send_json_success(array('html' => $html));
    }

    public function ajax_send_email_with_pdf() {
        check_ajax_referer('bassatine_invoice_nonce', 'nonce');
        if (!current_user_can('manage_options')) wp_die(-1);

        $id = isset($_POST['id']) ? intval($_POST['id']) : 0;
        global $wpdb;
        $invoice = $wpdb->get_row($wpdb->prepare("SELECT * FROM $this->table_name WHERE id = %d", $id));

        if (!$invoice || empty($invoice->recipient_email)) {
            wp_send_json_error('Facture ou email manquant');
        }

        $subject = get_option('bassatine_email_subject', 'Votre facture de Bassatine Skoura');
        $template = get_option('bassatine_email_template', "Bonjour {client_name},\n\nVeuillez trouver ci-joint votre facture N° {invoice_number}.\n\nCordialement,\nL'équipe Bassatine Skoura");

        // Replace placeholders in subject
        $subject = str_replace(
            array('{client_name}', '{invoice_number}'),
            array($invoice->recipient_name, $invoice->invoice_number),
            $subject
        );

        // Inject HTML invoice if tag present
        $invoice_html = $this->get_invoice_html($invoice->id, true);
        $body = str_replace(
            array('{client_name}', '{invoice_number}', '{invoice_table}'),
            array($invoice->recipient_name, $invoice->invoice_number, $invoice_html),
            $template
        );
        
        // If {invoice_table} not in template, append it
        if (strpos($template, '{invoice_table}') === false) {
            $body .= "<br><br>" . $invoice_html;
        }

        // Handle PDF Attachment from JS Blob
        $attachments = array();
        if (!empty($_FILES['pdf'])) {
            $upload_dir = wp_upload_dir();
            $filename = 'Facture-' . $invoice->invoice_number . '.pdf';
            $filepath = $upload_dir['path'] . '/' . $filename;
            
            if (move_uploaded_file($_FILES['pdf']['tmp_name'], $filepath)) {
                $attachments[] = $filepath;
            }
        }

        add_filter('wp_mail_content_type', function() { return 'text/html'; });
        $sent = wp_mail($invoice->recipient_email, $subject, $body, '', $attachments);

        // Clean up attachment
        if (!empty($attachments)) {
            unlink($attachments[0]);
        }

        if ($sent) {
            wp_send_json_success('Email envoyé avec succès');
        } else {
            wp_send_json_error('Échec de l\'envoi');
        }
    }

    public function handle_export_csv() {
        check_admin_referer('bassatine_export_action', 'bassatine_export_nonce');
        if (!current_user_can('manage_options')) wp_die('Unauthorized');
        
        global $wpdb;
        $rows = $wpdb->get_results("SELECT * FROM $this->table_name", ARRAY_A);
        
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="factures-' . date('Y-m-d') . '.csv"');
        
        $fp = fopen('php://output', 'w');
        fputcsv($fp, array('ID', 'Numéro', 'Date', 'Type', 'Statut', 'Client', 'ICE', 'Total HT', 'TVA', 'Total TTC'));
        
        foreach ($rows as $row) {
            fputcsv($fp, array(
                $row['id'], $row['invoice_number'], $row['invoice_date'], $row['invoice_type'], 
                $row['invoice_status'], $row['recipient_name'], $row['recipient_ice'], 
                $row['subtotal_ht'], $row['vat_amount'], $row['grand_total_ttc']
            ));
        }
        fclose($fp);
        exit;
    }

    public function handle_export_sql() {
        check_admin_referer('bassatine_export_action', 'bassatine_export_nonce');
        if (!current_user_can('manage_options')) wp_die('Unauthorized');
        global $wpdb;
        $rows = $wpdb->get_results("SELECT * FROM $this->table_name", ARRAY_A);
        
        header('Content-Type: application/sql');
        header('Content-Disposition: attachment; filename="backup-' . date('Y-m-d') . '.sql"');
        
        echo "-- Bassatine Invoice Backup\n-- Date: " . date('Y-m-d H:i:s') . "\n\n";
        foreach ($rows as $row) {
            $cols = implode("`, `", array_keys($row));
            $vals = implode("', '", array_map('esc_sql', array_values($row)));
            echo "INSERT INTO `$this->table_name` (`$cols`) VALUES ('$vals');\n";
        }
        exit;
    }
    
    public function handle_bulk_print() {
        check_admin_referer('bassatine_bulk_print_action', 'bassatine_bulk_nonce');
        if (!current_user_can('manage_options')) wp_die('Unauthorized');
        $ids = isset($_POST['bulk_ids']) ? array_map('intval', $_POST['bulk_ids']) : [];
        if(empty($ids)) wp_die('Aucune sélection');
        
        global $wpdb;
        $placeholders = implode(',', array_fill(0, count($ids), '%d'));
        $invoices = $wpdb->get_results($wpdb->prepare("SELECT * FROM $this->table_name WHERE id IN ($placeholders) ORDER BY created_at DESC", $ids));

        // Use same template logic but loop
        $logo = get_option('bassatine_logo_url', 'https://bassatine-skoura.com/wp-content/uploads/2025/01/Green-Cream-Palm-Beach-Club-Logo-240-x-80-px.png');
        echo '<!DOCTYPE html><html><head><title>Impression Groupée</title>';
        echo '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet">';
        echo '<style>
                body { margin: 0; padding: 0; background: #555; font-family: "Inter", sans-serif; }
                @page { margin: 0; size: A4; }
                .sheet { background: white; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 20mm; box-sizing: border-box; position: relative; page-break-after: always; }
                .sheet:last-child { page-break-after: auto; }
                .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
                .logo { max-width: 200px; height: auto; margin-bottom: 10px; }
                .co-name { font-weight: 700; font-size: 14pt; border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 5px; display: inline-block; }
                .meta { font-size: 10pt; line-height: 1.4; color: #444; }
                .client-box { margin: 40px 0; padding: 0; }
                .title { font-weight: 900; font-size: 16pt; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 30px; text-align: left; }
                .client-row { margin-bottom: 15px; font-size: 12pt; }
                .label { color: #1e40af; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-right: 15px; display: inline-block; width: 60px; }
                .value { font-weight: 900; color: #000; text-transform: uppercase; }
                table { width: 100%; border-collapse: collapse; margin-top: 40px; font-size: 10pt; }
                th { background: #f9f9f9; padding: 15px 10px; border: 1px solid #000; text-transform: uppercase; font-weight: 900; text-align: center; letter-spacing: 0.5px; }
                td { padding: 12px 10px; border: 1px solid #000; vertical-align: middle; }
                .text-right { text-align: right; } .text-center { text-align: center; }
                .totals { margin-top: -1px; display: flex; justify-content: flex-end; }
                .t-table { width: 350px; border-collapse: collapse; }
                .t-table td { padding: 12px; border: 1px solid #000; font-weight: 900; text-align: right; }
                .t-table td:first-child { text-align: left; background: #fff; text-transform: uppercase; color: #000; }
                .footer { margin-top: 60px; font-size: 11pt; line-height: 1.5; }
                .legal { margin-top: 50px; font-size: 8pt; color: #666; text-align: center; border-top: 1px solid #eee; padding-top: 15px; margin-bottom: 20px;}
                .stamp { position: absolute; bottom: 20mm; right: 10mm; width: 180px; opacity: 0.9; transform: rotate(-5deg); pointer-events: none; }
                @media print { body { background: white; } .sheet { margin: 0; width: 100%; height: 100%; } .bar { display: none; } }
              </style></head>
              <body onload="window.print()">';

        foreach($invoices as $invoice) {
            echo $this->get_invoice_html($invoice->id);
        }
        echo '</body></html>';
        exit;
    }

    /* -------------------------------------------------------------------------- */
    /*                               INVOICE HTML                                 */
    /* -------------------------------------------------------------------------- */
    private function get_invoice_html($id, $is_email = false) {
        global $wpdb;
        $invoice = $wpdb->get_row($wpdb->prepare("SELECT * FROM $this->table_name WHERE id = %d", $id));
        if (!$invoice) return '';

        $decoded = json_decode($invoice->items_json, true);
        $items = is_array($decoded) ? $decoded : array();
        
        $logo = get_option('bassatine_logo_url', 'https://bassatine-skoura.com/wp-content/uploads/2025/01/Green-Cream-Palm-Beach-Club-Logo-240-x-80-px.png');
        $co_name = get_option('bassatine_company_name', 'BOUMHCHAD SARL AU');
        $details = get_option('bassatine_company_details', "Douar Boumhchad Skoura – Ouarzazate – GMS : 06 61 70 99 20\nRC : 7755/Ouarzazate • T.P : 47165021 • IF : 25287521 • CNSS : 1093803 • ICE : 002092692000010");

        ob_start();
        ?>
        <div class="sheet" <?php if($is_email) echo 'style="width: 100%; max-width: 800px; margin: 0 auto; padding: 20px; font-family: \'Inter\', sans-serif;"'; ?>>
            <div class="header" <?php if($is_email) echo 'style="display: flex; justify-content: space-between; margin-bottom: 20px;"'; ?>>
                <div <?php if($is_email) echo 'style="flex: 1;"'; ?>>
                    <img src="<?php echo esc_url($logo); ?>" class="logo" <?php if($is_email) echo 'style="max-width: 150px;"'; ?>>
                    <br>
                    <div class="co-name" <?php if($is_email) echo 'style="font-weight: 700; font-size: 14pt;"'; ?>><?php echo esc_html($co_name); ?></div>
                    <div class="meta" <?php if($is_email) echo 'style="font-size: 10pt; color: #444;"'; ?>>
                        <strong>BASSATINE SKOURA</strong><br>
                        04/06/2025<br>
                        06 23 34 99 51 - 06 61 70 99 20
                    </div>
                </div>
                <div style="text-align: right; padding-top: 20px; <?php if($is_email) echo 'flex: 1;'; ?>">
                    OUARZAZATE LE : <strong><?php echo date('d/m/Y', strtotime($invoice->invoice_date)); ?></strong>
                </div>
            </div>

            <div class="client-box" <?php if($is_email) echo 'style="margin: 20px 0;"'; ?>>
                <div class="title" <?php if($is_email) echo 'style="font-weight: 900; font-size: 16pt; margin-bottom: 15px;"'; ?>><?php echo $invoice->invoice_type === 'commercial' ? 'FACTURE COMMERCIALE' : 'FACTURE PROFORMA'; ?> N° : <?php echo esc_html($invoice->invoice_number); ?></div>
                <div class="client-row" <?php if($is_email) echo 'style="margin-bottom: 10px; font-size: 12pt;"'; ?>>
                    <span class="label" <?php if($is_email) echo 'style="font-weight: 700; color: #1e40af; display: inline-block; width: 60px;"'; ?>>DOIT :</span> <span class="value" <?php if($is_email) echo 'style="font-weight: 900;"'; ?>><?php echo esc_html($invoice->recipient_name); ?></span>
                </div>
                <div class="client-row" <?php if($is_email) echo 'style="margin-bottom: 10px; font-size: 12pt;"'; ?>>
                    <span class="label" <?php if($is_email) echo 'style="font-weight: 700; color: #1e40af; display: inline-block; width: 60px;"'; ?>>ICE :</span> <span class="value" <?php if($is_email) echo 'style="font-weight: 900;"'; ?>><?php echo esc_html($invoice->recipient_ice); ?></span>
                </div>
            </div>

            <table border="1" cellpadding="10" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10pt;">
                <thead>
                    <tr style="background: #f9f9f9;">
                        <th>Désignation</th>
                        <th>Nb Chambres</th>
                        <th>Nb Clients</th>
                        <th>P.U</th>
                        <th>Total TTC</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach($items as $item): ?>
                    <tr>
                        <td><?php echo esc_html($item['desc']); ?></td>
                        <td class="text-center" align="center"><?php echo esc_html($item['qty']); ?></td>
                        <td class="text-center" align="center"><?php echo esc_html($item['clients']); ?></td>
                        <td class="text-right" align="right"><?php echo number_format($item['price'], 2, ',', ' '); ?></td>
                        <td class="text-right" align="right"><?php echo number_format($item['qty'] * $item['price'], 2, ',', ' '); ?></td>
                    </tr>
                    <?php endforeach; ?>
                    <?php for($i=count($items); $i<8; $i++): ?>
                    <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>
                    <?php endfor; ?>
                </tbody>
            </table>

            <div class="totals" style="display: flex; justify-content: flex-end; margin-top: 10px;">
                <table border="1" cellpadding="10" cellspacing="0" style="width: 300px; border-collapse: collapse;">
                    <tr><td style="font-weight: 900;">TOTAL TTC</td><td align="right" style="font-weight: 900;"><?php echo number_format($invoice->grand_total_ttc, 2, ',', ' '); ?> DH</td></tr>
                    <tr><td style="font-weight: 900;">TOTAL HT</td><td align="right" style="font-weight: 900;"><?php echo number_format($invoice->subtotal_ht, 2, ',', ' '); ?> DH</td></tr>
                    <tr><td style="font-weight: 900;">DONT TVA 10%</td><td align="right" style="font-weight: 900;"><?php echo number_format($invoice->vat_amount, 2, ',', ' '); ?> DH</td></tr>
                </table>
            </div>

            <div class="footer" style="margin-top: 30px; font-size: 11pt;">
                Arrêté la présente facture à la somme de : <br>
                <span style="font-weight: bold; font-style: italic; text-transform: uppercase;"><?php echo esc_html($invoice->amount_words); ?></span>
            </div>

            <?php if ($invoice->invoice_type === 'commercial'): ?>
            <div class="legal" style="margin-top: 30px; font-size: 8pt; color: #666; text-align: center; border-top: 1px solid #eee; padding-top: 10px;">
                <?php echo nl2br(esc_html($details)); ?>
            </div>
            <div class="stamp" style="position: absolute; bottom: 20mm; right: 10mm; width: 180px; opacity: 0.9; transform: rotate(-5deg); pointer-events: none;">
                <img src="https://mohamedbella.com/wp-content/uploads/2025/11/BASSATINE-SKOURA.png" style="width: 100%;">
            </div>
            <?php endif; ?>
        </div>
        <?php
        return ob_get_clean();
    }

    /* -------------------------------------------------------------------------- */
    /*                                 ANALYTICS                                  */
    /* -------------------------------------------------------------------------- */
    private function get_analytics() {
        global $wpdb;
        $current_month = date('Y-m');
        $prev_month = date('Y-m', strtotime('-1 month'));
        
        $rev = $wpdb->get_var($wpdb->prepare(
            "SELECT SUM(grand_total_ttc) FROM $this->table_name WHERE invoice_type='commercial' AND is_trashed=0 AND invoice_date LIKE %s",
            $current_month . '%'
        ));
        $vat = $wpdb->get_var($wpdb->prepare(
            "SELECT SUM(vat_amount) FROM $this->table_name WHERE invoice_type='commercial' AND is_trashed=0 AND invoice_date LIKE %s",
            $current_month . '%'
        ));
        
        $prev_rev = $wpdb->get_var($wpdb->prepare(
            "SELECT SUM(grand_total_ttc) FROM $this->table_name WHERE invoice_type='commercial' AND is_trashed=0 AND invoice_date LIKE %s",
            $prev_month . '%'
        ));
        $growth = ($prev_rev > 0) ? (($rev - $prev_rev) / $prev_rev) * 100 : 0;
        
        return array(
            'revenue' => $rev ?: 0,
            'vat' => $vat ?: 0,
            'growth' => round($growth, 1)
        );
    }

    /* -------------------------------------------------------------------------- */
    /*                                 ADMIN LIST                                 */
    /* -------------------------------------------------------------------------- */
    public function render_admin_list() {
        global $wpdb;
        
        // VIEW: Active vs Trash
        $view = isset($_GET['view']) && $_GET['view'] === 'trash' ? 'trash' : 'active';
        $is_trash = $view === 'trash';
        
        // COUNTS
        $count_active = $wpdb->get_var("SELECT COUNT(*) FROM $this->table_name WHERE is_trashed = 0");
        $count_trash  = $wpdb->get_var("SELECT COUNT(*) FROM $this->table_name WHERE is_trashed = 1");

        // FILTERING
        $where = $is_trash ? "is_trashed = 1" : "is_trashed = 0";
        if (!empty($_GET['start_date'])) $where .= $wpdb->prepare(" AND invoice_date >= %s", $_GET['start_date']);
        if (!empty($_GET['end_date'])) $where .= $wpdb->prepare(" AND invoice_date <= %s", $_GET['end_date']);
        if (!empty($_GET['client_search'])) $where .= $wpdb->prepare(" AND (recipient_name LIKE %s OR recipient_ice LIKE %s OR invoice_number LIKE %s)", '%' . $wpdb->esc_like($_GET['client_search']) . '%', '%' . $wpdb->esc_like($_GET['client_search']) . '%', '%' . $wpdb->esc_like($_GET['client_search']) . '%');
        if (!empty($_GET['type_filter'])) $where .= $wpdb->prepare(" AND invoice_type = %s", $_GET['type_filter']);
        if (!empty($_GET['status_filter'])) $where .= $wpdb->prepare(" AND invoice_status = %s", $_GET['status_filter']);

        $invoices = $wpdb->get_results("SELECT * FROM $this->table_name WHERE $where ORDER BY created_at DESC");
        $stats = $this->get_analytics();
        ?>
        <div class="wrap" style="font-family: 'Inter', sans-serif; background: #fff; min-height: 100vh; margin: -20px -20px 0 -20px; padding: 40px;">
            <div class="max-w-7xl mx-auto">
                <!-- Analytics Row (Active Only) -->
                <?php if(!$is_trash): ?>
                
                <!-- Feedback Notices -->
                <?php if(isset($_GET['email_sent'])): ?>
                    <div class="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs font-bold uppercase tracking-widest">Email envoyé avec succès au client.</div>
                <?php elseif(isset($_GET['email_failed'])): ?>
                    <div class="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-800 text-xs font-bold uppercase tracking-widest">Échec de l'envoi de l'email. Vérifiez la configuration de votre serveur.</div>
                <?php endif; ?>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div class="bg-gray-900 text-white p-6 shadow-lg">
                        <div class="text-xs font-bold uppercase tracking-widest opacity-50 mb-1">Chiffre d'Affaires (Mois)</div>
                        <div class="text-3xl font-black"><?php echo number_format($stats['revenue'], 2, ',', ' '); ?> <span class="text-sm font-medium">DH</span></div>
                        <div class="text-[10px] mt-2 <?php echo $stats['growth'] >= 0 ? 'text-green-400' : 'text-red-400'; ?>">
                            <?php echo $stats['growth'] >= 0 ? '▲' : '▼'; ?> <?php echo abs($stats['growth']); ?>% vs mois dernier
                        </div>
                    </div>
                    <div class="bg-white border border-gray-200 p-6 shadow-sm">
                        <div class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">TVA Collectée (Mois)</div>
                        <div class="text-3xl font-black text-gray-900"><?php echo number_format($stats['vat'], 2, ',', ' '); ?> <span class="text-sm font-medium text-gray-400">DH</span></div>
                    </div>
                    <div class="bg-white border border-gray-200 p-6 flex flex-col justify-center items-start gap-3 shadow-sm">
                        <div class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Actions Rapides</div>
                        <div class="flex gap-2 w-full">
                            <form action="<?php echo admin_url('admin-post.php'); ?>" method="post" class="flex-1">
                                <input type="hidden" name="action" value="bassatine_export_csv">
                                <?php wp_nonce_field('bassatine_export_action', 'bassatine_export_nonce'); ?>
                                <button class="w-full py-2 bg-gray-100 hover:bg-gray-200 text-xs font-bold uppercase tracking-wide">Export CSV</button>
                            </form>
                            <form action="<?php echo admin_url('admin-post.php'); ?>" method="post" class="flex-1">
                                <input type="hidden" name="action" value="bassatine_export_sql">
                                <?php wp_nonce_field('bassatine_export_action', 'bassatine_export_nonce'); ?>
                                <button class="w-full py-2 bg-gray-100 hover:bg-gray-200 text-xs font-bold uppercase tracking-wide">Backup BD</button>
                            </form>
                        </div>
                    </div>
                </div>
                <?php endif; ?>

                <!-- Header & Filters -->
                <div class="flex flex-col md:flex-row justify-between items-start mb-8 border-b border-gray-100 pb-6 gap-6">
                    <div>
                        <h1 class="text-4xl font-black text-gray-900 tracking-tighter uppercase mb-2">Factures</h1>
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">Bassatine Skoura • Management System v6.0</p>
                        
                        <!-- View Tabs -->
                        <div class="flex gap-4 mt-4">
                            <a href="<?php echo admin_url('admin.php?page=bassatine-invoices'); ?>" 
                               class="px-4 py-2 text-xs font-bold uppercase tracking-widest <?php echo $view === 'active' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-900'; ?>">
                                Actives (<?php echo $count_active; ?>)
                            </a>
                            <a href="<?php echo admin_url('admin.php?page=bassatine-invoices&view=trash'); ?>" 
                               class="px-4 py-2 text-xs font-bold uppercase tracking-widest <?php echo $view === 'trash' ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-900'; ?>">
                                Corbeille (<?php echo $count_trash; ?>)
                            </a>
                        </div>
                    </div>
                    
                    <!-- Enhanced Filters -->
                    <div class="flex flex-col gap-3 items-end">
                         <form method="get" class="flex flex-wrap gap-2 items-end">
                            <input type="hidden" name="page" value="bassatine-invoices">
                            <?php if($is_trash): ?><input type="hidden" name="view" value="trash"><?php endif; ?>
                            
                            <div class="flex flex-col">
                                <label class="text-[9px] font-bold uppercase text-gray-400 mb-1">Type</label>
                                <select name="type_filter" class="border border-gray-200 px-3 py-2 text-xs font-bold uppercase focus:outline-none focus:border-black">
                                    <option value="">Tous</option>
                                    <option value="commercial" <?php echo (isset($_GET['type_filter']) && $_GET['type_filter']=='commercial')?'selected':''; ?>>Commercial</option>
                                    <option value="proforma" <?php echo (isset($_GET['type_filter']) && $_GET['type_filter']=='proforma')?'selected':''; ?>>Proforma</option>
                                </select>
                            </div>
                            
                            <?php if(!$is_trash): ?>
                            <div class="flex flex-col">
                                <label class="text-[9px] font-bold uppercase text-gray-400 mb-1">Statut</label>
                                <select name="status_filter" class="border border-gray-200 px-3 py-2 text-xs font-bold uppercase focus:outline-none focus:border-black">
                                    <option value="">Tous</option>
                                    <option value="paid" <?php echo (isset($_GET['status_filter']) && $_GET['status_filter']=='paid')?'selected':''; ?>>Payée</option>
                                    <option value="pending" <?php echo (isset($_GET['status_filter']) && $_GET['status_filter']=='pending')?'selected':''; ?>>En attente</option>
                                </select>
                            </div>
                            <?php endif; ?>
                            
                            <div class="flex flex-col">
                                <label class="text-[9px] font-bold uppercase text-gray-400 mb-1">Début</label>
                                <input type="date" name="start_date" value="<?php echo isset($_GET['start_date'])?esc_attr($_GET['start_date']):''; ?>" class="border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-black">
                            </div>
                            
                            <div class="flex flex-col">
                                <label class="text-[9px] font-bold uppercase text-gray-400 mb-1">Fin</label>
                                <input type="date" name="end_date" value="<?php echo isset($_GET['end_date'])?esc_attr($_GET['end_date']):''; ?>" class="border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-black">
                            </div>
                            
                            <div class="flex flex-col">
                                <label class="text-[9px] font-bold uppercase text-gray-400 mb-1">Recherche</label>
                                <input type="text" name="client_search" value="<?php echo isset($_GET['client_search'])?esc_attr($_GET['client_search']):''; ?>" placeholder="Client, ICE, N°..." class="border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:border-black w-32">
                            </div>
                            
                            <button type="submit" class="bg-black text-white px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-gray-800">Filtrer</button>
                            <a href="<?php echo admin_url('admin.php?page=bassatine-invoices' . ($is_trash ? '&view=trash' : '')); ?>" class="bg-gray-100 text-gray-700 px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-gray-200">Reset</a>
                         </form>
                        <a href="<?php echo admin_url('admin.php?page=bassatine-new-invoice'); ?>" class="bg-emerald-600 text-white px-6 py-3 text-xs font-black uppercase tracking-[0.2em] hover:bg-emerald-700 shadow-lg">+ Nouvelle Facture</a>
                    </div>
                </div>

                <form method="post" action="<?php echo admin_url('admin-post.php'); ?>" target="_blank">
                    <input type="hidden" name="action" value="bassatine_bulk_print">
                    <?php wp_nonce_field('bassatine_bulk_print_action', 'bassatine_bulk_nonce'); ?>
                    
                    <?php if(!$is_trash): ?>
                    <div class="mb-4">
                        <button type="submit" class="text-xs font-bold uppercase tracking-widest text-blue-600 hover:underline">Imprimer la sélection &#9113;</button>
                    </div>
                    <?php endif; ?>

                    <div class="overflow-x-auto bg-white border border-gray-100 shadow-sm">
                        <table class="w-full text-left border-collapse">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="py-4 px-4 w-10"><input type="checkbox" onclick="document.querySelectorAll('.bulk-check').forEach(c=>c.checked=this.checked)"></th>
                                    <th class="py-4 px-4 text-xs font-black text-gray-900 uppercase tracking-widest w-24">Date</th>
                                    <th class="py-4 px-4 text-xs font-black text-gray-900 uppercase tracking-widest w-32">Numéro</th>
                                    <th class="py-4 px-4 text-xs font-black text-gray-900 uppercase tracking-widest w-24">Type</th>
                                    <th class="py-4 px-4 text-xs font-black text-gray-900 uppercase tracking-widest w-24">Statut</th>
                                    <th class="py-4 px-4 text-xs font-black text-gray-900 uppercase tracking-widest">Client</th>
                                    <th class="py-4 px-4 text-xs font-black text-gray-900 uppercase tracking-widest text-right w-32">Total TTC</th>
                                    <th class="py-4 px-4 text-xs font-black text-gray-900 uppercase tracking-widest text-right w-64">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                                <?php if (empty($invoices)): ?>
                                    <tr><td colspan="8" class="py-12 text-center text-gray-400 text-sm font-medium">Aucune facture trouvée.</td></tr>
                                <?php else: ?>
                                    <?php foreach ($invoices as $inv): ?>
                                        <tr class="group hover:bg-blue-50 transition-colors">
                                            <td class="py-4 px-4"><input type="checkbox" name="bulk_ids[]" value="<?php echo $inv->id; ?>" class="bulk-check"></td>
                                            <td class="py-4 px-4 text-sm font-medium text-gray-500"><?php echo date('d/m/y', strtotime($inv->invoice_date)); ?></td>
                                            <td class="py-4 px-4 text-sm font-bold text-gray-900"><?php echo esc_html($inv->invoice_number); ?></td>
                                            <td class="py-4 px-4">
                                                <span class="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border rounded <?php echo $inv->invoice_type === 'commercial' ? 'border-gray-900 text-gray-900 bg-white' : 'border-gray-300 text-gray-400 bg-gray-50'; ?>">
                                                    <?php echo $inv->invoice_type === 'commercial' ? 'Comm.' : 'Proforma'; ?>
                                                </span>
                                            </td>
                                            <td class="py-4 px-4">
                                                <span class="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded <?php echo $inv->invoice_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'; ?>">
                                                    <?php 
                                                        if($inv->is_trashed) echo 'CORBEILLE';
                                                        elseif($inv->invoice_status == 'paid') echo 'PAYÉE';
                                                        else echo 'EN ATTENTE';
                                                    ?>
                                                </span>
                                            </td>
                                            <td class="py-4 px-4 text-sm font-bold text-gray-800"><?php echo esc_html($inv->recipient_name); ?></td>
                                            <td class="py-4 px-4 text-sm font-black text-gray-900 text-right"><?php echo number_format($inv->grand_total_ttc, 2, ',', ' '); ?></td>
                                            <td class="py-4 px-4 text-right relative">
                                                <button type="button" onclick="const m=this.nextElementSibling; document.querySelectorAll('.dropdown-menu').forEach(el=>{if(el!==m)el.classList.add('hidden')}); m.classList.toggle('hidden'); event.stopPropagation();" class="dropdown-btn inline-flex justify-center items-center px-3 py-1 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 focus:outline-none">
                                                    Actions ▾
                                                </button>
                                                <div class="dropdown-menu hidden absolute right-0 z-50 w-40 mt-1 origin-top-right bg-white border border-gray-200 rounded-md shadow-2xl outline-none ring-1 ring-black ring-opacity-5">
                                                    <div class="py-1">
                                                        <?php if(!$is_trash): ?>
                                                            <!-- ACTIVE ACTIONS -->
                                                            <a href="<?php echo admin_url('admin.php?page=bassatine-new-invoice&id=' . $inv->id); ?>" class="block px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 font-bold uppercase text-left">Modifier</a>
                                                            
                                                            <a href="<?php echo admin_url('admin-post.php?action=bassatine_view_invoice&id=' . $inv->id); ?>" target="_blank" class="block px-4 py-2 text-xs text-blue-600 hover:bg-gray-100 font-bold uppercase text-left">Imprimer</a>
                                                            <a href="<?php echo admin_url('admin-post.php?action=bassatine_view_invoice&id=' . $inv->id); ?>" target="_blank" class="block px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 font-bold uppercase text-left">Voir</a>
                                                            
                                                            <?php if($inv->invoice_type === 'proforma'): ?>
                                                            <a href="<?php echo wp_nonce_url(admin_url('admin-post.php?action=bassatine_convert_invoice&id=' . $inv->id), 'bassatine_convert_action', 'bassatine_nonce'); ?>" onclick="return confirm('Convertir ?');" class="block px-4 py-2 text-xs text-blue-600 hover:bg-blue-50 font-bold uppercase text-left">Convertir</a>
                                                            <?php endif; ?>

                                                            <?php if(!empty($inv->recipient_email)): ?>
                                                            <button type="button" onclick="sendInvoiceEmail(<?php echo $inv->id; ?>, this)" class="block w-full px-4 py-2 text-xs text-emerald-600 hover:bg-emerald-50 font-bold uppercase text-left">Email au Client</button>
                                                            <?php endif; ?>
                                                            
                                                            <div class="border-t border-gray-100 my-1"></div>
                                                            
                                                            <a href="<?php echo wp_nonce_url(admin_url('admin-post.php?action=bassatine_trash_invoice&id=' . $inv->id), 'bassatine_delete_action', 'bassatine_nonce'); ?>" onclick="return confirm('Mettre à la corbeille ?');" class="block px-4 py-2 text-xs text-red-500 hover:bg-red-50 font-bold uppercase text-left">Corbeille</a>
                                                        
                                                        <?php else: ?>
                                                            <!-- TRASH ACTIONS -->
                                                            <a href="<?php echo wp_nonce_url(admin_url('admin-post.php?action=bassatine_restore_invoice&id=' . $inv->id), 'bassatine_restore_action', 'bassatine_nonce'); ?>" onclick="return confirm('Restaurer ?');" class="block px-4 py-2 text-xs text-green-600 hover:bg-green-50 font-bold uppercase text-left">Restaurer</a>
                                                            
                                                            <div class="border-t border-gray-100 my-1"></div>
                                                            
                                                            <a href="<?php echo wp_nonce_url(admin_url('admin-post.php?action=bassatine_permanent_delete&id=' . $inv->id), 'bassatine_permanent_delete_action', 'bassatine_nonce'); ?>" onclick="return confirm('Supprimer DEFINITIVEMENT ? Cette action est irréversible.');" class="block px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-bold uppercase text-left">Supprimer</a>
                                                        <?php endif; ?>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </form>
            </div>
        </div>
        <div id="pdf-temp" style="position: absolute; left: -9999px; top: -9999px;"></div>
        <script>
            document.addEventListener('click',function(e){if(!e.target.closest('.dropdown-btn') && !e.target.closest('.dropdown-menu')){document.querySelectorAll('.dropdown-menu').forEach(el=>el.classList.add('hidden'))}});

            async function sendInvoiceEmail(id, btn) {
                if (typeof html2pdf === 'undefined') {
                    alert('Erreur : La bibliothèque PDF (html2pdf) n\'est pas chargée. Veuillez rafraîchir la page ou vérifier votre connexion.');
                    return;
                }
                if(!confirm('Générer le PDF et envoyer l\'email au client ?')) return;
                
                const originalText = btn.textContent;
                btn.textContent = 'Génération PDF...';
                btn.disabled = true;

                try {
                    // 1. Get HTML for PDF
                    const response = await fetch(ajaxurl + '?action=bassatine_get_invoice_html&id=' + id + '&nonce=<?php echo wp_create_nonce("bassatine_invoice_nonce"); ?>');
                    const data = await response.json();
                    
                    if(!data.success) throw new Error('Erreur de chargement');

                    const temp = document.getElementById('pdf-temp');
                    temp.innerHTML = data.data.html;

                    // Ensure fonts are loaded (optional but helpful)
                    await document.fonts.ready;

                    // 2. Generate PDF using html2pdf.js
                    const opt = {
                        margin: 10,
                        filename: 'Facture-' + id + '.pdf',
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                    };

                    // Use the newly added content directly from temp
                    const pdfBlob = await html2pdf().set(opt).from(temp.innerHTML).output('blob');
                    btn.textContent = 'Envoi Email...';

                    // 3. Send via AJAX
                    const formData = new FormData();
                    formData.append('action', 'bassatine_send_email_with_pdf');
                    formData.append('id', id);
                    formData.append('pdf', pdfBlob, 'facture.pdf');
                    formData.append('nonce', '<?php echo wp_create_nonce("bassatine_invoice_nonce"); ?>');

                    const sendRes = await fetch(ajaxurl, {
                        method: 'POST',
                        body: formData
                    });
                    const sendData = await sendRes.json();

                    if(sendData.success) {
                        alert('Email envoyé avec succès !');
                        location.reload();
                    } else {
                        alert('Erreur : ' + sendData.data);
                    }

                } catch (err) {
                    console.error(err);
                    alert('Erreur lors de l\'opération : ' + err.message);
                } finally {
                    btn.textContent = originalText;
                    btn.disabled = false;
                    document.getElementById('pdf-temp').innerHTML = '';
                }
            }
        </script>
        <?php
    }

    /* -------------------------------------------------------------------------- */
    /*                             SETTINGS PAGE                                  */
    /* -------------------------------------------------------------------------- */
    public function render_settings_page() {
        ?>
        <div class="wrap" style="font-family: 'Inter', sans-serif; background: #fff; min-height: 100vh; margin: -20px -20px 0 -20px; padding: 40px;">
            <div class="max-w-2xl mx-auto">
                <h1 class="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-8">Réglages Facturation</h1>
                <form method="post" action="options.php" class="space-y-6">
                    <?php settings_fields('bassatine_options'); ?>
                    <?php do_settings_sections('bassatine_options'); ?>
                    
                    <div>
                        <label class="block text-xs font-bold uppercase text-gray-500 mb-2">URL du Logo</label>
                        <input type="text" name="bassatine_logo_url" value="<?php echo esc_attr(get_option('bassatine_logo_url', 'https://bassatine-skoura.com/wp-content/uploads/2025/01/Green-Cream-Palm-Beach-Club-Logo-240-x-80-px.png')); ?>" class="w-full border-2 border-gray-100 p-3 text-sm focus:border-black rounded-lg">
                    </div>
                    
                    <div>
                        <label class="block text-xs font-bold uppercase text-gray-500 mb-2">Nom de l'entreprise</label>
                        <input type="text" name="bassatine_company_name" value="<?php echo esc_attr(get_option('bassatine_company_name', 'BOUMHCHAD SARL AU')); ?>" class="w-full border-2 border-gray-100 p-3 text-sm focus:border-black rounded-lg">
                    </div>

                    <div>
                        <label class="block text-xs font-bold uppercase text-gray-500 mb-2">Détails (Pied de page)</label>
                        <textarea name="bassatine_company_details" rows="4" class="w-full border-2 border-gray-100 p-3 text-sm focus:border-black rounded-lg"><?php echo esc_textarea(get_option('bassatine_company_details', "Douar Boumhchad Skoura – Ouarzazate – GMS : 06 61 70 99 20\nRC : 7755/Ouarzazate • T.P : 47165021 • IF : 25287521 • CNSS : 1093803 • ICE : 002092692000010")); ?></textarea>
                    </div>

                    <div class="pt-8 border-t border-gray-100">
                        <h3 class="text-lg font-black text-gray-900 uppercase tracking-tighter mb-4">Email au Client</h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-xs font-bold uppercase text-gray-500 mb-2">Sujet de l'email</label>
                                <input type="text" name="bassatine_email_subject" value="<?php echo esc_attr(get_option('bassatine_email_subject', 'Votre facture de Bassatine Skoura')); ?>" class="w-full border-2 border-gray-100 p-3 text-sm focus:border-black rounded-lg">
                            </div>
                            <div>
                                <label class="block text-xs font-bold uppercase text-gray-500 mb-2">Modèle de l'email</label>
                                <textarea name="bassatine_email_template" rows="6" class="w-full border-2 border-gray-100 p-3 text-sm focus:border-black rounded-lg" placeholder="Utilisez {client_name}, {invoice_number} et {invoice_table}"><?php echo esc_textarea(get_option('bassatine_email_template', "Bonjour {client_name},\n\nVeuillez trouver ci-joint votre facture N° {invoice_number}.\n\n{invoice_table}\n\nCordialement,\nL'équipe Bassatine Skoura")); ?></textarea>
                                <p class="text-[10px] text-gray-400 mt-1 uppercase font-bold">Tags: {client_name}, {invoice_number}, {invoice_table}</p>
                            </div>
                        </div>
                    </div>

                    <button type="submit" class="bg-black text-white px-8 py-3 text-sm font-bold uppercase tracking-widest hover:bg-gray-800">Enregistrer</button>
                </form>
            </div>
        </div>
        <?php
    }

    /* -------------------------------------------------------------------------- */
    /*                                INVOICE FORM                                */
    /* -------------------------------------------------------------------------- */
    public function render_invoice_form() {
        global $wpdb;
        $recipients = $wpdb->get_results("SELECT DISTINCT recipient_name as name, recipient_ice as ice, recipient_email as email FROM $this->table_name GROUP BY recipient_name");
        
        // Editing Logic
        $is_edit = false;
        $inv_data = null;
        $inv_items = array();
        if(isset($_GET['id'])) {
            $id = intval($_GET['id']);
            $inv_data = $wpdb->get_row($wpdb->prepare("SELECT * FROM $this->table_name WHERE id = %d", $id));
            if($inv_data) {
                $is_edit = true;
                $inv_items = json_decode($inv_data->items_json, true);
            }
        }
        ?>
        <div class="wrap" style="font-family: 'Inter', sans-serif; background: #f9f9f9; min-height: 100vh; margin: -20px -20px 0 -20px; padding: 40px;">
            <div class="max-w-4xl mx-auto">
                <div class="flex justify-between items-center mb-12">
                    <a href="<?php echo admin_url('admin.php?page=bassatine-invoices'); ?>" class="text-gray-400 hover:text-gray-900 text-xs font-bold uppercase tracking-widest transition-colors">&larr; Retour</a>
                    <h1 class="text-xl font-black text-gray-900 uppercase tracking-widest"><?php echo $is_edit ? 'Modifier la Facture' : 'Nouvelle Facture'; ?></h1>
                </div>

                <form action="<?php echo admin_url('admin-post.php'); ?>" method="post" class="bg-white border border-gray-200 p-12 shadow-sm">
                    <input type="hidden" name="action" value="bassatine_save_invoice">
                    <?php wp_nonce_field('bassatine_save_action', 'bassatine_nonce'); ?>
                    <?php if($is_edit): ?><input type="hidden" name="id" value="<?php echo $inv_data->id; ?>"><?php endif; ?>
                    <input type="hidden" name="invoice_type" id="invoice_type" value="<?php echo $is_edit ? $inv_data->invoice_type : 'commercial'; ?>">

                    <!-- Header Controls -->
                    <div class="flex justify-between items-start mb-12 pb-12 border-b border-gray-100">
                        <div class="inline-flex border border-gray-200 p-1">
                            <button type="button" onclick="setType('commercial')" id="btn-c" class="px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all">Commerciale</button>
                            <button type="button" onclick="setType('proforma')" id="btn-p" class="px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all">Proforma</button>
                        </div>
                        
                        <div class="flex items-center gap-2">
                             <label class="text-[10px] font-bold uppercase text-gray-400">Statut:</label>
                             <select name="invoice_status" class="border-b border-gray-200 py-1 text-xs font-bold uppercase focus:outline-none bg-transparent">
                                 <option value="paid" <?php echo ($is_edit && $inv_data->invoice_status=='paid')?'selected':''; ?>>Payée</option>
                                 <option value="pending" <?php echo ($is_edit && $inv_data->invoice_status=='pending')?'selected':''; ?>>En attente</option>
                             </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-12 mb-12">
                        <div class="space-y-6">
                            <h3 class="text-xs font-black text-gray-300 uppercase tracking-widest border-b border-gray-100 pb-2">Client</h3>
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nom / Raison Sociale</label>
                                    <input type="text" name="recipient_name" id="recipient_name" list="list-recipients" value="<?php echo $is_edit?$inv_data->recipient_name:''; ?>" class="w-full border-b border-gray-200 py-2 text-sm font-bold text-gray-900 focus:border-black focus:outline-none placeholder-gray-300 bg-transparent rounded-none" placeholder="Ex: ATLAS OUTDOOR" required>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">ICE</label>
                                    <input type="text" name="recipient_ice" id="recipient_ice" value="<?php echo $is_edit?$inv_data->recipient_ice:''; ?>" class="w-full border-b border-gray-200 py-2 text-sm font-medium text-gray-900 focus:border-black focus:outline-none placeholder-gray-300 bg-transparent rounded-none" placeholder="00000000" required>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Email du Client</label>
                                    <input type="email" name="recipient_email" id="recipient_email" value="<?php echo $is_edit?$inv_data->recipient_email:''; ?>" class="w-full border-b border-gray-200 py-2 text-sm font-medium text-gray-900 focus:border-black focus:outline-none placeholder-gray-300 bg-transparent rounded-none" placeholder="client@email.com">
                                </div>
                            </div>
                        </div>
                        <div class="space-y-6">
                            <h3 class="text-xs font-black text-gray-300 uppercase tracking-widest border-b border-gray-100 pb-2">Facture</h3>
                            <div class="space-y-4">
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Numéro</label>
                                        <input type="text" name="invoice_number" value="<?php echo $is_edit?$inv_data->invoice_number:''; ?>" class="w-full border-b border-gray-200 py-2 text-sm font-bold text-gray-900 focus:border-black focus:outline-none placeholder-gray-300 bg-transparent rounded-none h-auto" required>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Date</label>
                                        <input type="date" name="invoice_date" value="<?php echo $is_edit?$inv_data->invoice_date:date('Y-m-d'); ?>" class="w-full border-b border-gray-200 py-2 text-sm font-medium text-gray-900 focus:border-black focus:outline-none bg-transparent rounded-none h-auto" required>
                                    </div>
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Montant en lettres</label>
                                    <input type="text" name="amount_words" value="<?php echo $is_edit?$inv_data->amount_words:''; ?>" class="w-full border-b border-gray-200 py-2 text-sm font-medium text-gray-900 italic focus:border-black focus:outline-none placeholder-gray-300 bg-transparent rounded-none" placeholder="..." required>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="mb-12">
                        <div class="flex justify-between items-end mb-6">
                            <h3 class="text-xs font-black text-gray-900 uppercase tracking-widest">Prestations</h3>
                            <button type="button" onclick="addRow()" class="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-800">+ Ajouter</button>
                        </div>
                        <div id="rows" class="space-y-2"></div>
                    </div>

                    <div class="bg-gray-50 p-8 flex flex-col items-end gap-4">
                         <div class="flex items-center gap-6 mb-4">
                            <label class="inline-flex items-center cursor-pointer gap-2">
                                <input type="radio" name="mode" value="HT" onchange="calc()" checked class="accent-black">
                                <span class="text-[10px] font-bold uppercase tracking-wide">Saisie HT</span>
                            </label>
                            <label class="inline-flex items-center cursor-pointer gap-2">
                                <input type="radio" name="mode" value="TTC" onchange="calc()" class="accent-black">
                                <span class="text-[10px] font-bold uppercase tracking-wide">Saisie TTC</span>
                            </label>
                            <label class="inline-flex items-center cursor-pointer gap-2 border-l border-gray-300 pl-6">
                                <input type="checkbox" id="vat" onchange="calc()" checked class="accent-black">
                                <span class="text-[10px] font-bold uppercase tracking-wide">TVA 10%</span>
                            </label>
                         </div>
                         
                         <div class="text-right">
                             <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total HT</div>
                             <div id="disp_ht" class="text-sm font-bold text-gray-900">0.00</div>
                         </div>
                         <div class="text-right">
                             <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">TVA (10%)</div>
                             <div id="disp_vat" class="text-sm font-bold text-gray-900">0.00</div>
                         </div>
                         <div class="text-right pt-4 border-t border-gray-200 mt-2 w-48">
                             <div class="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-1">Net à Payer</div>
                             <div id="disp_ttc" class="text-3xl font-black text-gray-900">0.00</div>
                         </div>

                         <input type="hidden" name="subtotal_ht" id="val_ht">
                         <input type="hidden" name="vat_amount" id="val_vat">
                         <input type="hidden" name="grand_total_ttc" id="val_ttc">
                    </div>

                    <div class="mt-8 pt-8 border-t border-gray-100">
                        <button type="submit" class="w-full bg-emerald-600 text-white py-4 text-sm font-black uppercase tracking-[0.2em] hover:bg-emerald-700 transition-colors">Enregistrer le document</button>
                    </div>
                </form>
            </div>
        </div>

        <datalist id="list-recipients">
            <?php foreach($recipients as $r) echo "<option value='".esc_attr($r->name)."' data-ice='".esc_attr($r->ice)."' data-email='".esc_attr($r->email)."'>"; ?>
        </datalist>
        <datalist id="rooms"><option value="CHAMBRE SINGLE"><option value="CHAMBRE TWIN"><option value="CHAMBRE DOUBLE"><option value="CHAMBRE TRIPLE"><option value="CHAMBRE QUADRUPLE"><option value="REPAS"><option value="TAXE DE SEJOUR"></datalist>

        <script>
            const SERVER_ITEMS = <?php echo $is_edit && !empty($inv_items) ? wp_json_encode($inv_items) : '[]'; ?>;
            let idx = 0;
            
            function setType(t) {
                const el = document.getElementById('invoice_type');
                if(el) el.value = t;
                const bC = document.getElementById('btn-c'), bP = document.getElementById('btn-p');
                if(!bC || !bP) return;
                
                const on = 'px-6 py-2 text-xs font-bold uppercase tracking-widest bg-gray-900 text-white transition-all';
                const off = 'px-6 py-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all';
                if(t==='commercial') { bC.className=on; bP.className=off; } else { bP.className=on; bC.className=off; }
            }

            function addRow(d={},q=1,p=0) {
                const i = idx++, div = document.createElement('div');
                div.className = 'grid grid-cols-12 gap-4 items-center group';
                div.innerHTML = `
                    <div class="col-span-5"><input name="items[${i}][desc]" list="rooms" class="w-full bg-gray-50 border-none p-3 text-xs font-bold focus:ring-1 focus:ring-black" placeholder="Désignation" required value="${d.desc||''}"></div>
                    <div class="col-span-2"><input type="number" name="items[${i}][qty]" class="w-full bg-gray-50 border-none p-3 text-xs text-center focus:ring-1 focus:ring-black" required oninput="calc()" value="${q}"></div>
                    <div class="col-span-2"><input type="text" name="items[${i}][clients]" class="w-full bg-gray-50 border-none p-3 text-xs text-center focus:ring-1 focus:ring-black" placeholder="Clients" value="${d.clients||''}"></div>
                    <div class="col-span-2"><input type="number" step="0.01" name="items[${i}][price]" class="w-full bg-gray-50 border-none p-3 text-xs text-center focus:ring-1 focus:ring-black" required oninput="calc()" value="${p}"></div>
                    <div class="col-span-1 text-center"><button type="button" onclick="this.closest('.grid').remove();calc()" class="text-red-400 hover:text-red-600 font-bold text-xs">X</button></div>
                `;
                document.getElementById('rows').appendChild(div);
                calc();
            }

            function calc() {
                let ht=0, ttc=0, items = document.querySelectorAll('#rows .grid');
                const modeInput = document.querySelector('input[name="mode"]:checked');
                const isHT = modeInput ? modeInput.value === 'HT' : true;
                const vatEl = document.getElementById('vat');
                const vat = vatEl ? vatEl.checked : true;
                
                if(items.length > 0) {
                    items.forEach(el => {
                        const q = parseFloat(el.querySelector('input[name*="[qty]"]').value)||0;
                        const p = parseFloat(el.querySelector('input[name*="[price]"]').value)||0;
                        const t = q*p;
                        isHT ? ht+=t : ttc+=t;
                    });
                }

                if(isHT) { ttc = vat ? ht*1.1 : ht; }
                else { ht = vat ? ttc/1.1 : ttc; }
                
                const v = ttc - ht;
                
                const dHT = document.getElementById('disp_ht'); if(dHT) dHT.textContent = ht.toFixed(2);
                const dVAT = document.getElementById('disp_vat'); if(dVAT) dVAT.textContent = v.toFixed(2);
                const dTTC = document.getElementById('disp_ttc'); if(dTTC) dTTC.textContent = ttc.toFixed(2);
                
                const vHT = document.getElementById('val_ht'); if(vHT) vHT.value = ht.toFixed(2);
                const vVAT = document.getElementById('val_vat'); if(vVAT) vVAT.value = v.toFixed(2);
                const vTTC = document.getElementById('val_ttc'); if(vTTC) vTTC.value = ttc.toFixed(2);
            }

            // Init
            document.addEventListener('DOMContentLoaded', () => {
                setType('<?php echo $is_edit ? $inv_data->invoice_type : 'commercial'; ?>');
                
                // Recipient List Listener
                const rName = document.getElementById('recipient_name');
                if(rName) {
                    rName.addEventListener('input', function(e) {
                        const opt = document.querySelector(`#list-recipients option[value="${this.value}"]`);
                        if(opt) {
                            document.getElementById('recipient_ice').value = opt.dataset.ice;
                            document.getElementById('recipient_email').value = opt.dataset.email;
                        }
                    });
                }

                // Hydrate Items
                if (typeof SERVER_ITEMS !== 'undefined' && Array.isArray(SERVER_ITEMS) && SERVER_ITEMS.length > 0) {
                    SERVER_ITEMS.forEach(item => {
                        addRow({
                            desc: item.desc || '',
                            clients: item.clients || ''
                        }, 
                        item.qty || 1, 
                        item.price || 0
                        );
                    });
                } else {
                    addRow({desc:'CHAMBRE TWIN'}, 1, 0);
                }
                
                calc();
            });
        </script>
        <?php
    }

    /* -------------------------------------------------------------------------- */
    /*                                INVOICE VIEW                                */
    /* -------------------------------------------------------------------------- */
    public function render_print_view() { // Standalone
        // Security check
        if (!current_user_can('manage_options')) wp_die('Introuvable ou non autorisé');
        
        global $wpdb;
        $id = intval($_GET['id']);
        $invoice = $wpdb->get_row($wpdb->prepare("SELECT * FROM $this->table_name WHERE id = %d", $id));
        if (!$invoice) wp_die('Introuvable');
        
        // ROBUST DECODE
        $decoded = json_decode($invoice->items_json, true);
        $items = is_array($decoded) ? $decoded : array();
        
        $logo = get_option('bassatine_logo_url', 'https://bassatine-skoura.com/wp-content/uploads/2025/01/Green-Cream-Palm-Beach-Club-Logo-240-x-80-px.png');
        $co_name = get_option('bassatine_company_name', 'BOUMHCHAD SARL AU');
        $details = get_option('bassatine_company_details', "Douar Boumhchad Skoura – Ouarzazate – GMS : 06 61 70 99 20\nRC : 7755/Ouarzazate • T.P : 47165021 • IF : 25287521 • CNSS : 1093803 • ICE : 002092692000010");
        ?>
        <!DOCTYPE html>
        <html>
        <head>
            <title>Facture <?php echo esc_html($invoice->invoice_number); ?></title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap" rel="stylesheet">
            <style>
                body { margin: 0; padding: 0; background: #555; font-family: 'Inter', sans-serif; }
                @page { margin: 0; size: A4; }
                .sheet {
                    background: white; width: 210mm; min-height: 297mm; margin: 50px auto; padding: 20mm; box-sizing: border-box; position: relative;
                }
                .bar { position: fixed; top: 0; left: 0; right: 0; background: #222; padding: 15px; text-align: center; display: flex; justify-content: center; gap: 20px; z-index: 999; }
                .btn { padding: 10px 20px; font-weight: bold; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; border: none; cursor: pointer; text-decoration: none; color: white; display: inline-block; }
                .btn-back { background: #444; } .btn-print { background: #059669; }
                
                /* INVOICE CSS */
                .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
                .logo { max-width: 200px; height: auto; margin-bottom: 10px; }
                .co-name { font-weight: 700; font-size: 14pt; border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 5px; display: inline-block; }
                .meta { font-size: 10pt; line-height: 1.4; color: #444; }
                
                .client-box { margin: 40px 0; padding: 0; }
                .title { font-weight: 900; font-size: 16pt; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 30px; text-align: left; }
                .client-row { margin-bottom: 15px; font-size: 12pt; }
                .label { color: #1e40af; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-right: 15px; display: inline-block; width: 60px; }
                .value { font-weight: 900; color: #000; text-transform: uppercase; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 40px; font-size: 10pt; }
                th { background: #f9f9f9; padding: 15px 10px; border: 1px solid #000; text-transform: uppercase; font-weight: 900; text-align: center; letter-spacing: 0.5px; }
                td { padding: 12px 10px; border: 1px solid #000; vertical-align: middle; }
                .text-right { text-align: right; } .text-center { text-align: center; }
                
                .totals { margin-top: -1px; display: flex; justify-content: flex-end; }
                .t-table { width: 350px; border-collapse: collapse; }
                .t-table td { padding: 12px; border: 1px solid #000; font-weight: 900; text-align: right; }
                .t-table td:first-child { text-align: left; background: #fff; text-transform: uppercase; color: #000; }
                
                .footer { margin-top: 60px; font-size: 11pt; line-height: 1.5; }
                .legal { margin-top: 50px; font-size: 8pt; color: #666; text-align: center; border-top: 1px solid #eee; padding-top: 15px; margin-bottom: 20px;}
                
                .stamp { position: absolute; bottom: 20mm; right: 10mm; width: 180px; opacity: 0.9; transform: rotate(-5deg); pointer-events: none; }

                @media print {
                    body { background: white; }
                    .sheet { margin: 0; box-shadow: none; width: 100%; height: 100%; }
                    .bar { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="bar">
                <a href="<?php echo admin_url('admin.php?page=bassatine-invoices'); ?>" class="btn btn-back">Retour</a>
                <button class="btn btn-print" onclick="window.print()">Imprimer</button>
            </div>
            
            <div class="sheet">
                <div class="header">
                    <div>
                        <img src="<?php echo esc_url($logo); ?>" class="logo">
                        <br>
                        <div class="co-name"><?php echo esc_html($co_name); ?></div>
                        <div class="meta">
                            <strong>BASSATINE SKOURA</strong><br>
                            04/06/2025<br>
                            06 23 34 99 51 - 06 61 70 99 20
                        </div>
                    </div>
                    <div style="text-align: right; padding-top: 20px;">
                        OUARZAZATE LE : <strong><?php echo date('d/m/Y', strtotime($invoice->invoice_date)); ?></strong>
                    </div>
                </div>

                <div class="client-box">
                    <div class="title"><?php echo $invoice->invoice_type === 'commercial' ? 'FACTURE COMMERCIALE' : 'FACTURE PROFORMA'; ?> N° : <?php echo esc_html($invoice->invoice_number); ?></div>
                    <div class="client-row">
                        <span class="label">DOIT :</span> <span class="value"><?php echo esc_html($invoice->recipient_name); ?></span>
                    </div>
                    <div class="client-row">
                        <span class="label">ICE :</span> <span class="value"><?php echo esc_html($invoice->recipient_ice); ?></span>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 40%;">Désignation</th>
                            <th style="width: 15%;">Nb Chambres</th>
                            <th style="width: 15%;">Nb Clients</th>
                            <th style="width: 15%;">P.U</th>
                            <th style="width: 15%;">Total TTC</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach($items as $item): ?>
                        <tr>
                            <td><?php echo esc_html($item['desc']); ?></td>
                            <td class="text-center"><?php echo esc_html($item['qty']); ?></td>
                            <td class="text-center"><?php echo esc_html($item['clients']); ?></td>
                            <td class="text-right"><?php echo number_format($item['price'], 2, ',', ' '); ?></td>
                            <td class="text-right"><?php echo number_format($item['qty'] * $item['price'], 2, ',', ' '); ?></td>
                        </tr>
                        <?php endforeach; ?>
                        <?php for($i=count($items); $i<8; $i++): ?>
                        <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>
                        <?php endfor; ?>
                    </tbody>
                </table>

                <div class="totals">
                    <table class="t-table">
                        <tr><td>TOTAL TTC</td><td><?php echo number_format($invoice->grand_total_ttc, 2, ',', ' '); ?> DH</td></tr>
                        <tr><td>TOTAL HT</td><td><?php echo number_format($invoice->subtotal_ht, 2, ',', ' '); ?> DH</td></tr>
                        <tr><td>DONT TVA 10%</td><td><?php echo number_format($invoice->vat_amount, 2, ',', ' '); ?> DH</td></tr>
                    </table>
                </div>

                <div class="footer">
                    Arrêté la présente facture à la somme de : <br>
                    <span style="font-weight: bold; font-style: italic; text-transform: uppercase;"><?php echo esc_html($invoice->amount_words); ?></span>
                </div>

                <?php if ($invoice->invoice_type === 'commercial'): ?>
                <div class="legal">
                    <?php echo nl2br(esc_html($details)); ?>
                </div>
                <div class="stamp">
                    <img src="https://mohamedbella.com/wp-content/uploads/2025/11/BASSATINE-SKOURA.png" style="width: 100%;">
                </div>
                <?php endif; ?>
            </div>
        </body>
        </html>
        <?php
    }
}

new BassatineInvoiceManager();
