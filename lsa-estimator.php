<?php
/*
Plugin Name: LSA Estimator
Description: Local Services Ads Calculator Integration
Version: 1.0
Author: Your Name
*/

// Enqueue scripts and styles
function lsa_estimator_enqueue_scripts() {
    wp_enqueue_style('lsa-estimator-style', plugins_url('style.css', __FILE__));
    wp_enqueue_script('lsa-estimator-script', plugins_url('script.js', __FILE__), array('jquery'), '1.0', true);
    
    // Pass API URL to JavaScript
    wp_localize_script('lsa-estimator-script', 'lsaEstimator', array(
        'apiUrl' => 'https://your-node-server.com/get-estimate' // Replace with your actual Node.js server URL
    ));
}
add_action('wp_enqueue_scripts', 'lsa_estimator_enqueue_scripts');

// Shortcode implementation
function lsa_estimator_shortcode() {
    ob_start();
    ?>
    <div class="lsa-estimator-container">
        <form id="lsa-estimator-form">
            <div class="form-group">
                <label for="zip-code">ZIP Code</label>
                <input type="text" id="zip-code" name="zipCode" required pattern="[0-9]{5}">
            </div>
            <div class="form-group">
                <label for="category">Service Category</label>
                <select id="category" name="category" required>
                    <option value="">Select a category</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="locksmith">Locksmith</option>
                    <option value="garage-door">Garage Door</option>
                </select>
            </div>
            <button type="submit" class="submit-btn">Get Estimate</button>
        </form>
        
        <div id="loading" class="loading" style="display: none;">
            <div class="spinner"></div>
            <p>Fetching your estimate...</p>
        </div>
        
        <div id="result" class="result" style="display: none;">
            <h3>Estimated Budget Range</h3>
            <p class="budget-range"></p>
            <a href="https://calendly.com/your-link" class="cta-button">Schedule Your Call</a>
        </div>
        
        <div id="error" class="error" style="display: none;">
            <p>Sorry, we couldn't fetch the estimate at this time. Please try again later.</p>
        </div>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode('lsa_estimator', 'lsa_estimator_shortcode'); 