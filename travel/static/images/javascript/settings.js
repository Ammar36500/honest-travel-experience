// Ensure all code runs after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("Settings JS Loaded"); // Log to confirm script execution.

    // --- Elements ---
    // Caching DOM elements for faster access and cleaner code.
    const settingsForm = document.querySelector('.settings-content'); // Main form container for all settings.
    // General Settings Inputs
    const platformNameInput = document.getElementById('platform-name');
    const reviewsPerPageInput = document.getElementById('default-reviews-per-page');
    const enableRegistrationToggle = document.getElementById('enable-user-registration'); // Ensure this ID matches HTML for the toggle/checkbox.
    const minReviewLengthInput = document.getElementById('minimum-review-length');
    const allowAnonymousToggle = document.getElementById('allow-anonymous-reviews'); // Ensure this ID matches HTML.
    const supportEmailInput = document.getElementById('support-contact-email');
    // Bias Prevention Inputs
    const secondaryReviewToggle = document.getElementById('secondary-review'); // Ensure this ID matches HTML.
    const decisionTrackingToggle = document.getElementById('decision-tracking'); // Ensure this ID matches HTML.
    const rejectionReasonToggle = document.getElementById('rejection-reason');   // Ensure this ID matches HTML.
    const biasThresholdSelect = document.getElementById('bias-threshold');
    // Buttons & Containers
    const saveSettingsButton = document.getElementById('save-settings-btn');
    const cancelSettingsButton = document.getElementById('cancel-changes-btn');
    const reasonCodesListContainer = document.getElementById('reason-codes-list'); // Container to display reason codes.
    const addReasonBtn = document.getElementById('add-reason-btn'); // Button to open the add reason code modal.
    const messageContainer = document.getElementById('message-container'); // For displaying success/error messages.
    const reasonCodesLoading = document.getElementById('reason-codes-loading'); // Loading indicator for reason codes.

    // Modal Elements (for adding/editing reason codes)
    const reasonCodeModal = document.getElementById('reasonCodeModal');
    const closeModalBtn = document.getElementById('closeModalBtn'); // Close button (X) in modal.
    const cancelModalBtn = document.getElementById('cancelModalBtn'); // Cancel button in modal footer.
    const saveReasonCodeBtn = document.getElementById('saveReasonCodeBtn'); // Save button in modal.
    const modalTitle = document.getElementById('modal-title'); // Title of the modal.
    const reasonCodeIdInput = document.getElementById('reasonCodeId'); // Hidden input for reason code ID (for editing).
    const reasonCodeInput = document.getElementById('reasonCodeInput'); // Input for the reason code itself (e.g., "SPAM").
    const reasonLabelInput = document.getElementById('reasonLabelInput'); // Input for the human-readable label.
    const reasonDescriptionInput = document.getElementById('reasonDescriptionInput'); // Input for detailed description.

    // --- CSRF Token ---
    // Retrieves CSRF token, trying a global variable first, then from cookies.
    const csrftoken = typeof CSRF_TOKEN !== 'undefined' ? CSRF_TOKEN : getCookie('csrftoken');
    function getCookie(name) { // Utility function to get a cookie by name.
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    if (!csrftoken) { // Log error if CSRF token is not found, as it's crucial for POST requests.
        console.error("CSRF Token not found. POST requests will likely fail.");
    }

    // --- State ---
    // Variables to store the initial state of settings and reason codes to detect changes or revert.
    let originalSettings = {};
    let originalReasonCodes = [];
    let isEditingReasonCode = false; // Flag to track if the modal is for editing an existing reason code.

    // --- Utility Functions ---
    function escapeHtml(unsafe) { // Basic HTML escaping to prevent XSS when displaying user-generated content.
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
    function displayMessage(message, type = 'info', duration = 5000) { // Shows a message to the user.
        if (!messageContainer) { // Fallback if message container element is not found.
            console.warn("Message container not found. Message:", message);
            alert(`[${type.toUpperCase()}] ${message}`); // Use alert as a last resort.
            return;
        }
        const alertClasses = { success: 'alert-success', error: 'alert-danger', info: 'alert-info' };
        const alertClass = alertClasses[type] || 'alert-info'; // Determine CSS class based on message type.
        messageContainer.innerHTML = `<div class="alert ${alertClass}">${escapeHtml(message)}</div>`; // Display message.
        if (duration > 0) { // If duration is positive, auto-hide the message.
            setTimeout(() => {
                // Only clear if the currently displayed message is the one we set.
                if (messageContainer.firstChild && messageContainer.firstChild.textContent === message) {
                    messageContainer.innerHTML = '';
                }
            }, duration);
        }
    }
    function showLoading(element) { // Shows a loading indicator.
        if (element) element.style.display = 'flex'; // Assumes loading indicator uses flex for centering.
    }
    function hideLoading(element) { // Hides a loading indicator.
        if (element) element.style.display = 'none';
    }

    // --- API Call Functions ---
    // Fetches both platform settings and reason codes on initial load.
    async function fetchSettingsAndCodes() { 
        console.log("Fetching platform settings and reason codes...");
        showLoading(reasonCodesLoading); // Show loading indicator while fetching.
        try {
            // Fetch platform settings.
            const settingsResponse = await fetch('/api/settings/get/', { // Endpoint to get platform settings.
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest', // Common for Django to identify AJAX.
                },
            });
            if (!settingsResponse.ok) { // Handle HTTP errors.
                let errorMsg = `HTTP error! status: ${settingsResponse.status}`;
                try { const errorData = await settingsResponse.json(); errorMsg = errorData.error || errorMsg; } catch (e) { /* Ignore if error response is not JSON */ }
                throw new Error(errorMsg);
            }
            const settingsData = await settingsResponse.json();

            if (settingsData.success && settingsData.settings) {
                originalSettings = { ...settingsData.settings }; // Store a copy of original settings.
                populatePlatformSettingsForm(settingsData.settings); // Populate form fields.
                console.log("Platform settings loaded:", settingsData.settings);
            } else {
                displayMessage('Failed to load platform settings: ' + (settingsData.error || 'Unknown server error'), 'error');
            }

            await fetchReasonCodes(); // After settings, fetch reason codes.
            // displayMessage('Settings and reason codes loaded.', 'info'); // Consider if this is too noisy.

        } catch (error) {
            console.error('Error fetching initial data:', error);
            displayMessage('Error loading initial settings: ' + error.message, 'error');
            hideLoading(reasonCodesLoading); // Hide loading on error.
            if (reasonCodesListContainer) reasonCodesListContainer.innerHTML = '<p>Error loading reason codes. Please try refreshing.</p>';
        }
    }
    // Fetches the list of reason codes from the server.
    async function fetchReasonCodes() { 
        console.log("Fetching reason codes...");
        showLoading(reasonCodesLoading);
        if (reasonCodesListContainer) reasonCodesListContainer.innerHTML = ''; // Clear previous list.
        try {
            const response = await fetch('/api/settings/reason-codes/list/', { /* ... headers ... */ }); // Endpoint for listing reason codes.
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log("Reason codes received:", data);
            hideLoading(reasonCodesLoading); // Hide loading indicator.

            if (data.success && data.reason_codes) {
                originalReasonCodes = data.reason_codes.map(code => ({ ...code })); // Store a copy.
                displayReasonCodes(data.reason_codes); // Display fetched codes.
            } else {
                if (reasonCodesListContainer) reasonCodesListContainer.innerHTML = '<p>Failed to load reason codes.</p>';
                displayMessage('Failed to load reason codes: ' + (data.error || 'Unknown server error'), 'error');
            }
        } catch (error) {
            hideLoading(reasonCodesLoading);
            if (reasonCodesListContainer) reasonCodesListContainer.innerHTML = '<p>Error loading reason codes. Please try refreshing.</p>';
            console.error('Error fetching reason codes:', error);
            displayMessage('Error fetching reason codes: ' + error.message, 'error');
        }
    }
    // Saves the current platform settings to the server.
    async function savePlatformSettings() { 
        // Collect current values from form inputs.
        const currentFormData = {
            platform_name: platformNameInput ? platformNameInput.value.trim() : '',
            default_reviews_per_page: reviewsPerPageInput ? (parseInt(reviewsPerPageInput.value, 10) || 10) : 10, // Default if parsing fails.
            enable_user_registration: enableRegistrationToggle ? enableRegistrationToggle.checked : true,
            minimum_review_length: minReviewLengthInput ? (parseInt(minReviewLengthInput.value, 10) || 50) : 50,
            allow_anonymous_reviews: allowAnonymousToggle ? allowAnonymousToggle.checked : false,
            support_contact_email: supportEmailInput ? (supportEmailInput.value.trim() || null) : null, // Send null if empty.
            secondary_review_non_english: secondaryReviewToggle ? secondaryReviewToggle.checked : false,
            admin_decision_tracking: decisionTrackingToggle ? decisionTrackingToggle.checked : true,
            require_rejection_reason: rejectionReasonToggle ? rejectionReasonToggle.checked : true,
            fairness_alert_threshold: biasThresholdSelect ? biasThresholdSelect.value : '15',
        };

        // Basic client-side validation for numeric and email fields.
        if (isNaN(currentFormData.default_reviews_per_page) || currentFormData.default_reviews_per_page < 5 || currentFormData.default_reviews_per_page > 50) {
            displayMessage("Default reviews per page must be a number between 5 and 50.", "error"); return;
        }
        if (isNaN(currentFormData.minimum_review_length) || currentFormData.minimum_review_length < 10) {
            displayMessage("Minimum review length must be a number, 10 or greater.", "error"); return;
        }
        if (currentFormData.support_contact_email && !/.+@.+\..+/.test(currentFormData.support_contact_email)) { // Simple email regex.
            displayMessage("Please enter a valid support email address or leave it blank.", "error"); return;
        }

        console.log("Saving platform settings:", currentFormData);
        saveSettingsButton.disabled = true; // Disable button during save.
        saveSettingsButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; // Show loading state.

        try {
            const response = await fetch('/api/settings/save/', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': csrftoken, }, body: JSON.stringify(currentFormData), });
            const data = await response.json();
            console.log("Save response:", data);

            if (response.ok && data.success) {
                displayMessage('Platform settings saved successfully!', 'success');
                originalSettings = { ...currentFormData }; // Update original settings state on successful save.
            } else {
                const errorMessage = data.error || (data.errors ? JSON.stringify(data.errors) : `HTTP error ${response.status}`); // Try to get detailed errors.
                console.error('Save failed:', errorMessage);
                displayMessage(`Failed to save settings: ${errorMessage}`, 'error');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            displayMessage('Error saving settings: ' + error.message, 'error');
        } finally {
            saveSettingsButton.disabled = false; // Re-enable button.
            saveSettingsButton.innerHTML = '<i class="fas fa-save"></i> Save Changes'; // Restore button text.
        }
    }

    // --- UI Update Functions ---

    // Populates the platform settings form fields with data fetched from the server.
    function populatePlatformSettingsForm(settings) {
        if (!settings) { // Guard against null or undefined settings.
            console.error("populatePlatformSettingsForm called with null/undefined settings. Cannot populate form.");
            displayMessage("Error: Could not load settings data into form.", "error");
            return;
        }
        console.log("Populating form with settings:", settings);

        // Populate each input field, with null checks for elements and default values.
        if (platformNameInput) platformNameInput.value = settings.platform_name || '';
        else console.warn("Element 'platform-name' not found in DOM.");

        if (reviewsPerPageInput) reviewsPerPageInput.value = settings.default_reviews_per_page || 10;
        else console.warn("Element 'default-reviews-per-page' not found in DOM.");

        if (enableRegistrationToggle) enableRegistrationToggle.checked = settings.enable_user_registration === true;
        else console.warn("Element 'enable-user-registration' not found in DOM.");

        if (minReviewLengthInput) minReviewLengthInput.value = settings.minimum_review_length || 50;
        else console.warn("Element 'minimum-review-length' not found in DOM.");

        if (allowAnonymousToggle) allowAnonymousToggle.checked = settings.allow_anonymous_reviews === true;
        else console.warn("Element 'allow-anonymous-reviews' not found in DOM.");

        if (supportEmailInput) supportEmailInput.value = settings.support_contact_email || '';
        else console.warn("Element 'support-contact-email' not found in DOM.");

        // Bias Prevention settings
        if (secondaryReviewToggle) secondaryReviewToggle.checked = settings.secondary_review_non_english === true;
        else console.warn("Element 'secondary-review' not found in DOM.");

        if (decisionTrackingToggle) decisionTrackingToggle.checked = settings.admin_decision_tracking === true;
        else console.warn("Element 'decision-tracking' not found in DOM.");

        if (rejectionReasonToggle) rejectionReasonToggle.checked = settings.require_rejection_reason === true;
        else console.warn("Element 'rejection-reason' not found in DOM.");

        if (biasThresholdSelect) biasThresholdSelect.value = settings.fairness_alert_threshold || '15';
        else console.warn("Element 'bias-threshold' not found in DOM.");
    }

    // Renders the list of reason codes in the UI.
    function displayReasonCodes(codes) { 
        if (!reasonCodesListContainer) { console.error("Reason codes list container not found. Cannot display codes."); return; }
        reasonCodesListContainer.innerHTML = ''; // Clear existing list.
        if (!codes || codes.length === 0) { // Display message if no codes are configured.
            reasonCodesListContainer.innerHTML = '<p>No reason codes configured yet. Click "Add Reason Code" to create one.</p>'; 
            return; 
        }
        codes.forEach(code => { // Create and append an element for each reason code.
            const div = document.createElement('div');
            div.classList.add('reason-code'); // For styling.
            div.dataset.codeId = code.id; // Store ID for actions.
            // HTML structure for displaying a reason code.
            div.innerHTML = `
                <div class="reason-code-header">
                    <div class="reason-code-name">${escapeHtml(code.code)}</div>
                    <div class="reason-code-label">${escapeHtml(code.label)}</div>
                </div>
                <div class="reason-code-description">${escapeHtml(code.description) || 'No description provided.'}</div>
                <div class="reason-code-actions">
                    <button class="action-btn edit-reason-btn" title="Edit Reason Code" data-id="${code.id}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-reason-btn" title="Delete Reason Code" data-id="${code.id}"><i class="fas fa-trash"></i></button>
                </div>`;
            reasonCodesListContainer.appendChild(div);
        });
        // Attach event listeners to the newly created edit and delete buttons.
        reasonCodesListContainer.querySelectorAll('.edit-reason-btn').forEach(btn => btn.addEventListener('click', () => openEditReasonCodeModal(btn.dataset.id)));
        reasonCodesListContainer.querySelectorAll('.delete-reason-btn').forEach(btn => btn.addEventListener('click', () => handleDeleteReasonCode(btn.dataset.id)));
    }

    // --- Modal Handling ---
    // Opens the modal for adding a new reason code.
    function openModal(title = "Add Reason Code") { 
        modalTitle.textContent = title; // Set modal title.
        // Clear form fields for a new entry.
        reasonCodeIdInput.value = ''; 
        reasonCodeInput.value = ''; 
        reasonLabelInput.value = ''; 
        reasonDescriptionInput.value = '';
        reasonCodeInput.disabled = false; // Ensure code input is enabled for new codes.
        reasonCodeModal.style.display = "block"; // Show the modal.
        isEditingReasonCode = false; // Set flag to indicate adding new.
    }
    // Opens the modal for editing an existing reason code, pre-filling form fields.
    function openEditReasonCodeModal(codeId) { 
        const codeToEdit = originalReasonCodes.find(code => code.id == codeId); // Find code by ID.
        if (!codeToEdit) { displayMessage(`Reason code with ID ${codeId} not found for editing.`, 'error'); return; }
        
        modalTitle.textContent = "Edit Reason Code";
        reasonCodeIdInput.value = codeToEdit.id; // Populate hidden ID field.
        reasonCodeInput.value = codeToEdit.code;
        reasonCodeInput.disabled = true; // Code field is typically not editable for existing codes.
        reasonLabelInput.value = codeToEdit.label;
        reasonDescriptionInput.value = codeToEdit.description;
        
        reasonCodeModal.style.display = "block";
        isEditingReasonCode = true; // Set flag to indicate editing.
    }
    // Closes the reason code modal.
    function closeModal() { 
        reasonCodeModal.style.display = "none";
    }

    // --- Reason Code CRUD Actions ---
    // Handles saving a new or edited reason code.
    async function handleSaveReasonCode() { 
        const id = reasonCodeIdInput.value; // ID will be present if editing.
        const code = reasonCodeInput.value.trim().toUpperCase(); // Code, trimmed and uppercased.
        const label = reasonLabelInput.value.trim(); // Label, trimmed.
        const description = reasonDescriptionInput.value.trim(); // Description, trimmed.

        if (!code || !label) { // Basic validation.
            displayMessage("Reason Code and Label are required fields.", "error"); 
            return; 
        }
        // Determine API endpoint and method based on whether it's an add or update.
        const url = id ? `/api/settings/reason-codes/update/${id}/` : '/api/settings/reason-codes/add/';
        const method = id ? 'PUT' : 'POST'; // Use PUT for updates, POST for new.
        const payload = { code, label, description };

        saveReasonCodeBtn.disabled = true; // Disable button during save.
        saveReasonCodeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; // Loading state.

        try {
            const response = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': csrftoken, }, body: JSON.stringify(payload), });
            const data = await response.json();
            if (response.ok && data.success) { 
                displayMessage(data.message || 'Reason code saved successfully.', 'success'); 
                closeModal(); 
                await fetchReasonCodes(); // Refresh the list of reason codes.
            } else { 
                displayMessage(`Error saving reason code: ${data.error || 'Failed to save.'}`, 'error'); 
            }
        } catch (error) { 
            console.error(`Error saving reason code:`, error); 
            displayMessage(`An error occurred while saving: ${error.message}`, 'error'); 
        } finally { 
            saveReasonCodeBtn.disabled = false; // Re-enable button.
            saveReasonCodeBtn.innerHTML = '<i class="fas fa-save"></i> Save'; // Restore button text.
        }
    }
    // Handles deleting a reason code.
    async function handleDeleteReasonCode(codeId) { 
        const codeToDelete = originalReasonCodes.find(code => code.id == codeId); // Find code to confirm.
        if (!codeToDelete) {
            displayMessage(`Cannot delete: Reason code ID ${codeId} not found.`, 'error');
            return;
        }
        // Confirm deletion with the user.
        if (confirm(`Are you sure you want to delete the reason code "${escapeHtml(codeToDelete.code)} - ${escapeHtml(codeToDelete.label)}"? This action cannot be undone.`)) {
            console.log(`Attempting to delete reason code ID: ${codeId}`);
            const itemElement = reasonCodesListContainer.querySelector(`.reason-code[data-code-id="${codeId}"]`);
            if (itemElement) itemElement.style.opacity = '0.5'; // Visually indicate processing.

            try {
                const response = await fetch(`/api/settings/reason-codes/delete/${codeId}/`, { method: 'DELETE', headers: { 'X-Requested-With': 'XMLHttpRequest', 'X-CSRFToken': csrftoken, }, });
                const data = await response.json();
                if (response.ok && data.success) { 
                    displayMessage(data.message || 'Reason code deleted successfully.', 'success'); 
                    await fetchReasonCodes(); // Refresh the list.
                } else { 
                    if (itemElement) itemElement.style.opacity = '1'; // Revert opacity on failure.
                    displayMessage(`Error deleting reason code: ${data.error || 'Failed to delete.'}`, 'error'); 
                }
            } catch (error) { 
                if (itemElement) itemElement.style.opacity = '1'; // Revert opacity on error.
                console.error('Error deleting reason code:', error); 
                displayMessage(`An error occurred during deletion: ${error.message}`, 'error'); 
            }
        }
    }

    // --- Event Listeners ---
    // Attach event listeners to buttons and other interactive elements.
    if (saveSettingsButton) { saveSettingsButton.addEventListener('click', savePlatformSettings); } 
    else { console.error("Save Settings button ('save-settings-btn') not found in DOM."); }

    if (cancelSettingsButton) { 
        cancelSettingsButton.addEventListener('click', () => { 
            console.log("Cancel changes clicked. Reverting to original settings."); 
            populatePlatformSettingsForm(originalSettings); // Revert form to original loaded settings.
            displayMessage('Changes cancelled. Form reverted to last saved state.', 'info'); 
        }); 
    } else { console.error("Cancel Changes button ('cancel-changes-btn') not found in DOM."); }

    if (addReasonBtn) { addReasonBtn.addEventListener('click', () => openModal("Add New Reason Code")); } 
    else { console.error("Add Reason Code button ('add-reason-btn') not found in DOM."); }
    
    // Modal close/cancel buttons
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
    if (saveReasonCodeBtn) saveReasonCodeBtn.addEventListener('click', handleSaveReasonCode);
    
    // Close modal if clicked outside of its content area.
    window.addEventListener('click', (event) => { 
        if (reasonCodeModal && event.target == reasonCodeModal) { // Check if the click target is the modal backdrop.
            closeModal(); 
        }
    });

    // --- Initial Load ---
    // Fetch initial data when the page loads.
    fetchSettingsAndCodes();

});
