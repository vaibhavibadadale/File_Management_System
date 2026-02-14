<?php
/**
 * Plugin Name: SEO Profile Manager
 * Description: Profiles with media uploader, AJAX load more, edit/delete & SEO URLs.
 * Version: 1.0
 */

if (!defined('ABSPATH')) exit;

/* CREATE TABLE */
register_activation_hook(__FILE__, function () {
    global $wpdb;
    $table = $wpdb->prefix . 'seo_profiles';
    $charset = $wpdb->get_charset_collate();
    $sql = "CREATE TABLE $table (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200),
        slug VARCHAR(200),
        email VARCHAR(200),
        designation VARCHAR(200),
        description TEXT,
        image VARCHAR(255)
    ) $charset;";
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);
    flush_rewrite_rules();
});

/* REWRITE */
add_action('init', function () {
    add_rewrite_rule('^profile/([^/]*)/?', 'index.php?profile_slug=$matches[1]', 'top');
});
add_filter('query_vars', fn($v)=>array_merge($v,['profile_slug']));

/* ADMIN MENU */
add_action('admin_menu', function () {
    add_menu_page('Profiles','Profiles','manage_options','seo-profiles','seo_profiles_admin');
});

/* ADMIN PAGE */
function seo_profiles_admin() {
    global $wpdb;
    $table = $wpdb->prefix . 'seo_profiles';

    if (isset($_GET['delete'])) {
        $wpdb->delete($table, ['id'=>intval($_GET['delete'])]);
        echo '<div class="updated"><p>Deleted</p></div>';
    }

    if (isset($_POST['save'])) {
        $data = [
            'name'=>sanitize_text_field($_POST['name']),
            'slug'=>sanitize_title($_POST['name']),
            'email'=>sanitize_email($_POST['email']),
            'designation'=>sanitize_text_field($_POST['designation']),
            'description'=>sanitize_textarea_field($_POST['description']),
            'image'=>esc_url_raw($_POST['image'])
        ];
        if (!empty($_POST['id'])) {
            $wpdb->update($table,$data,['id'=>intval($_POST['id'])]);
        } else {
            $wpdb->insert($table,$data);
        }
    }

    $edit = isset($_GET['edit']) ? $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE id=%d",$_GET['edit'])) : null;
    $rows = $wpdb->get_results("SELECT * FROM $table");
?>
<div class="wrap">
<h2><?php echo $edit?'Edit':'Add'; ?> Profile</h2>
<form method="post">
<input type="hidden" name="id" value="<?php echo $edit->id??''; ?>">
<input name="name" value="<?php echo $edit->name??''; ?>" placeholder="Name" required><br><br>
<input name="designation" value="<?php echo $edit->designation??''; ?>" placeholder="Designation"><br><br>
<input name="email" value="<?php echo $edit->email??''; ?>" placeholder="Email"><br><br>
<input id="image" name="image" value="<?php echo $edit->image??''; ?>" placeholder="Image URL">
<button type="button" class="button upload_image">Upload</button><br><br>
<textarea name="description"><?php echo $edit->description??''; ?></textarea><br><br>
<button name="save" class="button button-primary">Save</button>
</form>

<hr>
<table class="widefat">
<tr><th>Name</th><th>Action</th></tr>
<?php foreach($rows as $r): ?>
<tr>
<td><?php echo esc_html($r->name); ?></td>
<td>
<a href="?page=seo-profiles&edit=<?php echo $r->id; ?>">Edit</a> |
<a href="?page=seo-profiles&delete=<?php echo $r->id; ?>" onclick="return confirm('Delete?')">Delete</a>
</td>
</tr>
<?php endforeach; ?>
</table>
</div>

<script>
jQuery('.upload_image').click(function(e){
 e.preventDefault();
 var frame = wp.media({title:'Select',multiple:false});
 frame.on('select',()=>{
  jQuery('#image').val(frame.state().get('selection').first().toJSON().url);
 });
 frame.open();
});
</script>
<?php }

/* ASSETS */
add_action('wp_enqueue_scripts', function(){
 wp_enqueue_style('seo-profile-style',plugin_dir_url(__FILE__).'assets/style.css');
 wp_enqueue_script('seo-profile-ajax',plugin_dir_url(__FILE__).'assets/ajax.js',['jquery'],null,true);
 wp_localize_script('seo-profile-ajax','profileAjax',['ajaxurl'=>admin_url('admin-ajax.php')]);
});

/* LOAD MORE */
add_action('wp_ajax_load_profiles','load_profiles');
add_action('wp_ajax_nopriv_load_profiles','load_profiles');
function load_profiles(){
 global $wpdb;
 $table = $wpdb->prefix.'seo_profiles';
 $page=intval($_POST['page']);
 $limit=6;
 $offset=($page-1)*$limit;
 $rows=$wpdb->get_results($wpdb->prepare("SELECT * FROM $table LIMIT %d OFFSET %d",$limit,$offset));
 wp_send_json($rows);
}

/* SHORTCODE */
add_shortcode('profile_list',function(){
 return '<div id="profile-results"></div><button id="load-more" data-page="1">Load More</button>';
});

/* DETAIL */
add_action('template_redirect',function(){
 global $wpdb;
 $slug=get_query_var('profile_slug');
 if(!$slug) return;
 $table=$wpdb->prefix.'seo_profiles';
 $p=$wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE slug=%s",$slug));
 if(!$p) wp_die('Not found');
 echo "<h1>$p->name</h1><img src='$p->image' width='200'><p>$p->designation</p><p>$p->description</p>";
 exit;
});
