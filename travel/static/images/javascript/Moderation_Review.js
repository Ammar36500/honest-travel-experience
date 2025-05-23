// Ensure all code runs after the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded - initializing moderator reviews script");

    // --- Helper: Get CSRF Token ---
    // Retrieves CSRF token from cookies, necessary for Django POST requests if any.
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
    // Get the CSRF token once for use in fetch requests
    const csrfToken = getCookie('csrftoken');
    console.log("CSRF Token available:", !!csrfToken);
    if (!csrfToken) {
        console.error("CSRF Token not found. POST requests will likely fail.");
    }

    // --- Helper: Show Notification ---
    // Function to display success/error messages dynamically
    function showNotification(message, type) {
        console.log(`Showing ${type} notification: ${message}`);

        // Remove any existing notification first
        const existingNotification = document.querySelector('.dynamic-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create notification element
        const notification = document.createElement('div');
        // Use a unique class to avoid conflicts if 'notification' is used elsewhere
        notification.className = `dynamic-notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
            <span>${message}</span>
            <button class="close-btn" aria-label="Close notification">&times;</button>
        `;
        document.body.appendChild(notification);

        // Add show class after a small delay to trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10); // 10ms delay

        // Auto-hide after 5 seconds (5000ms)
        const autoHideTimeout = setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                // Check if the element still exists before removing
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300); // Wait for fade-out animation
        }, 5000);

        // Add close button functionality
        const closeBtn = notification.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                clearTimeout(autoHideTimeout); // Prevent auto-hide if manually closed
                notification.classList.remove('show');
                setTimeout(() => {
                    // Check if the element still exists before removing
                    if (notification.parentNode) {
                       notification.remove();
                    }
                }, 300); // Wait for fade-out animation
            });
        }
    }

    // --- Helper: Inject CSS ---
    // Function to ensure necessary CSS for modal and notifications is present
    function ensureStyles() {
        const styleId = 'moderator-dynamic-styles';
        if (!document.getElementById(styleId)) {
            const styleElement = document.createElement('style');
            styleElement.id = styleId;
            // CSS for notifications and the reject modal
            styleElement.textContent = `
                /* Notification Styles */
                .dynamic-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 5px;
                    display: flex;
                    align-items: center;
                    transition: opacity 0.3s ease, transform 0.3s ease;
                    opacity: 0;
                    transform: translateY(-20px);
                    z-index: 10000; /* High z-index */
                    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
                    max-width: 400px; /* Limit width */
                    font-family: sans-serif; /* Basic font */
                    font-size: 14px;
                }
                .dynamic-notification.show {
                    opacity: 1;
                    transform: translateY(0);
                }
                .dynamic-notification.success {
                    background-color: #e8f5e9; /* Light green */
                    color: #1b5e20; /* Dark green */
                    border-left: 5px solid #4caf50; /* Green accent */
                }
                .dynamic-notification.error {
                    background-color: #ffebee; /* Light red */
                    color: #b71c1c; /* Dark red */
                    border-left: 5px solid #f44336; /* Red accent */
                }
                .dynamic-notification i { /* Icon styling */
                    margin-right: 12px;
                    font-size: 18px;
                }
                .dynamic-notification .close-btn { /* Close button */
                    margin-left: auto;
                    padding: 0 5px;
                    background: none;
                    border: none;
                    color: inherit;
                    cursor: pointer;
                    font-size: 20px;
                    line-height: 1;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                }
                .dynamic-notification .close-btn:hover {
                    opacity: 1;
                }

                /* Modal Styles (Copied from java.js ensureModalStyles) */
                .modal {
                    display: none; /* Hidden by default */
                    position: fixed !important; /* Force position */
                    z-index: 9999 !important; /* Ensure it's on top */
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    overflow: auto; /* Enable scroll if needed */
                    background-color: rgba(0, 0, 0, 0.6); /* Dim background */
                }
                /* Force display when style attribute or data attribute is set */
                .modal[style*="display: block"],
                .modal[data-show="true"] {
                    display: block !important;
                }
                .modal-content {
                    background-color: #ffffff;
                    margin: 8% auto; /* Centered vertically and horizontally */
                    padding: 0; /* Remove padding, handle inside sections */
                    border: none;
                    border-radius: 8px;
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                    width: 90%;
                    max-width: 550px; /* Slightly narrower */
                    animation: modalSlideIn 0.4s ease-out; /* Smoother animation */
                }
                .modal-header {
                    padding: 18px 25px;
                    border-bottom: 1px solid #e0e0e0; /* Lighter border */
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                 .modal-header h2 {
                    margin: 0;
                    font-size: 1.3em;
                    color: #333;
                 }
                .modal-header .close { /* Style the close button */
                    color: #aaa;
                    font-size: 28px;
                    font-weight: bold;
                    cursor: pointer;
                    line-height: 1;
                    padding: 0 5px;
                }
                .modal-header .close:hover,
                .modal-header .close:focus {
                    color: #333;
                    text-decoration: none;
                }
                .modal-body {
                    padding: 25px;
                }
                .modal-footer {
                    padding: 18px 25px;
                    border-top: 1px solid #e0e0e0; /* Lighter border */
                    text-align: right; /* Align buttons to the right */
                    background-color: #f9f9f9; /* Slight background tint */
                    border-bottom-left-radius: 8px;
                    border-bottom-right-radius: 8px;
                }
                .modal-footer .btn { /* General button styling */
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    margin-left: 10px;
                    border: none;
                }
                .modal-footer .btn-secondary { /* Cancel button */
                    background-color: #6c757d;
                    color: white;
                }
                 .modal-footer .btn-secondary:hover {
                    background-color: #5a6268;
                 }
                .modal-footer .btn-danger { /* Reject button */
                    background-color: #dc3545;
                    color: white;
                }
                 .modal-footer .btn-danger:hover {
                    background-color: #c82333;
                 }
                /* Form group styling */
                .form-group {
                    margin-bottom: 20px;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #555;
                }
                .form-control {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #ced4da;
                    border-radius: 4px;
                    box-sizing: border-box; /* Include padding and border in element's total width/height */
                    font-size: 14px;
                }
                .form-control:focus {
                    border-color: #80bdff;
                    outline: 0;
                    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
                }
                textarea.form-control {
                    resize: vertical; /* Allow vertical resize */
                    min-height: 80px;
                }
                .checkbox label { /* Bias confirmation label styling */
                    font-weight: normal;
                    color: #333;
                    display: inline-flex; /* Align checkbox and text */
                    align-items: center;
                    cursor: pointer;
                }
                .checkbox input[type="checkbox"] {
                    margin-right: 8px;
                    cursor: pointer;
                }

                /* Keyframe animation for modal */
                @keyframes modalSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `;
            document.head.appendChild(styleElement);
            console.log("Added dynamic moderator styles");
        }
    }

    // --- Main Logic ---

    // Inject CSS needed for modal and notifications
    ensureStyles();

    // --- Approve Action ---
    // Find all approve forms (assuming each approve button is inside its own form)
    const approveForms = document.querySelectorAll('.review-card form input[name="action"][value="approve"]');
    console.log(`Found ${approveForms.length} approve action inputs (forms)`);

    approveForms.forEach(input => {
        const form = input.closest('form'); // Get the parent form
        if (!form) {
            console.error("Could not find form for approve input:", input);
            return;
        }

        console.log("Setting up submit listener for approve form:", form.action);

        form.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent default synchronous submission
            console.log("Approve form submitted, action:", form.action);

            const actionUrl = form.getAttribute('action'); // Get URL like /moderate-review/{{ review.id }}/
            if (!actionUrl) {
                console.error("Form action URL is missing!");
                showNotification("Error: Could not determine submission URL.", "error");
                return;
            }

            // Create form data (includes hidden fields like action and CSRF token)
            const formData = new FormData(form);

            // Send AJAX request using fetch
            fetch(actionUrl, {
                method: 'POST',
                headers: {
                    // 'Content-Type': 'application/x-www-form-urlencoded', // Not needed when using FormData with fetch
                    'X-CSRFToken': csrfToken, // Include CSRF token
                    'X-Requested-With': 'XMLHttpRequest' // Often needed for Django to detect AJAX
                },
                body: formData // Use FormData directly
            })
            .then(response => {
                console.log("Approve Response Status:", response.status);
                if (!response.ok) {
                    // If response is not OK, try to read error text, otherwise throw generic error
                    return response.text().then(text => {
                        throw new Error(`Server error: ${response.status} - ${text || 'Unknown error'}`);
                    });
                }
                 // Check content type before parsing JSON
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    return response.json();
                } else {
                    // If not JSON, assume success but log a warning
                    console.warn("Response was not JSON, assuming success based on OK status.");
                    return { success: true, message: "Action completed (non-JSON response)." };
                }
            })
            .then(data => {
                console.log("Approve Response Data:", data);
                if (data.success || data.message) { // Check for success flag or message
                    // Find the review card to remove
                    const reviewCard = form.closest('.review-card');
                    if (reviewCard) {
                        console.log("Found review card to remove:", reviewCard.dataset.reviewId);
                        reviewCard.style.transition = 'opacity 0.3s ease-out'; // Add transition
                        reviewCard.style.opacity = '0';
                        setTimeout(() => {
                            reviewCard.remove(); // Remove card from HTML after fade out
                            // Check if there are any reviews left and show empty state if needed
                            if (document.querySelectorAll('.review-card').length === 0) {
                                const container = document.querySelector('.reviews-container');
                                if (container) {
                                    container.innerHTML = `
                                        <div class="empty-state" style="text-align: center; padding: 40px; color: #777;">
                                            <i class="fas fa-check-circle" style="font-size: 40px; color: #28a745; margin-bottom: 15px;"></i>
                                            <h3>All caught up!</h3>
                                            <p>There are no reviews that need moderation at this time.</p>
                                        </div>
                                    `;
                                }
                            }
                        }, 300); // Wait for transition
                    } else {
                        console.error("Could not find review card to remove after approve.");
                        // Consider reloading if card removal fails consistently
                        // window.location.reload();
                    }
                    // Show success message
                    showNotification(data.message || "Review approved successfully", 'success');
                } else {
                    // Show error message from server response or a default one
                    showNotification(data.error || "Failed to approve review. Please check server logs.", 'error');
                }
            })
            .catch(error => {
                console.error('Approve Fetch Error:', error);
                showNotification(`An error occurred: ${error.message}`, 'error');
                 // Consider reloading the page on critical errors
                 // setTimeout(() => { window.location.reload(); }, 1500);
            });
        });
    });

    // --- Reject Action ---
    // Get modal elements
    const modal = document.getElementById('rejectModal');
    const closeBtn = modal ? modal.querySelector('.modal-header .close') : null;
    const cancelBtn = modal ? modal.querySelector('.modal-footer .cancel-btn') : null;
    const rejectForm = modal ? document.getElementById('rejectForm') : null;

    if (!modal || !closeBtn || !cancelBtn || !rejectForm) {
        console.error("Reject modal elements not found. Reject functionality will be limited.");
        return; // Stop if modal elements aren't present
    }

    // Add click handlers to all reject buttons on the page
    const rejectButtons = document.querySelectorAll('.reject-btn');
    console.log(`Found ${rejectButtons.length} reject buttons`);

    rejectButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault(); // Prevent any default button action
            event.stopPropagation(); // Stop event bubbling

            const reviewId = this.getAttribute('data-review-id'); // Get ID from button attribute
            console.log("Reject button clicked for review ID:", reviewId);

            if (!reviewId) {
                console.error("No review ID found on reject button!");
                showNotification("Error: Cannot identify which review to reject.", "error");
                return;
            }

            // Set the form's action attribute dynamically
            const actionUrl = `/moderate-review/${reviewId}/`; // Construct the URL
            rejectForm.setAttribute('action', actionUrl);
            console.log("Set reject form action to:", actionUrl);

            // Reset form fields (optional, good practice)
            rejectForm.reset();

            // Display the modal
            modal.style.display = 'block';
            modal.setAttribute('data-show', 'true'); // Use data attribute for CSS selector robustness
            console.log("Reject modal displayed");
        });
    });

    // Function to close the reject modal
    function closeRejectModal() {
        if (modal) {
            modal.style.display = 'none';
            modal.removeAttribute('data-show');
            console.log("Reject modal closed");
        }
    }

    // Handle modal close button click
    closeBtn.addEventListener('click', closeRejectModal);

    // Handle modal cancel button click
    cancelBtn.addEventListener('click', closeRejectModal);

    // Close modal when clicking outside of the modal content
    window.addEventListener('click', function(event) {
        if (event.target === modal) { // Check if the click target is the modal backdrop itself
            closeRejectModal();
        }
    });

    // Handle reject form submission
    rejectForm.addEventListener('submit', function(e) {
        e.preventDefault(); // Prevent default synchronous submission
        console.log("Reject form submitted");

        const formAction = this.getAttribute('action'); // Get the action URL set previously
        console.log("Reject form submission action:", formAction);

        if (!formAction || !formAction.includes('/moderate-review/')) {
            console.error("Invalid form action for reject submission:", formAction);
            showNotification("Error: Invalid submission URL.", "error");
            return;
        }

        // Basic validation (e.g., reason selected, bias checkbox)
        const reasonSelect = document.getElementById('rejection_reason');
        const biasConfirmation = document.getElementById('bias-confirmation');

        if (!reasonSelect || reasonSelect.value === "") {
             showNotification("Please select a reason for rejection.", "error");
             reasonSelect.focus(); // Focus the problematic field
             return;
        }
        if (!biasConfirmation || !biasConfirmation.checked) {
            showNotification("Please confirm your decision is fair and unbiased.", "error");
            biasConfirmation.focus();
            return;
        }

        // Get form data (includes reason, notes, bias confirmation, CSRF token, hidden action='reject')
        const formData = new FormData(this);

        // Extract the review ID from the form action URL for card removal later
        const urlParts = formAction.split('/');
        const reviewId = urlParts.filter(part => part).slice(-2)[0]; // Gets the ID part
        console.log("Extracted review ID for removal:", reviewId);

        // Send the request using fetch
        fetch(formAction, {
            method: 'POST',
            headers: {
                // 'Content-Type': 'application/x-www-form-urlencoded', // Not needed for FormData
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData
        })
        .then(response => {
            console.log("Reject Response Status:", response.status);
             if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(`Server error: ${response.status} - ${text || 'Unknown error'}`);
                });
            }
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return response.json();
            } else {
                console.warn("Response was not JSON, assuming success based on OK status.");
                return { success: true, message: "Action completed (non-JSON response)." };
            }
        })
        .then(data => {
            console.log("Reject Response Data:", data);
            closeRejectModal(); // Close the modal on success or handled error

            if (data.success || data.message) {
                // Find the review card using the extracted review ID
                const reviewCard = document.querySelector(`.review-card[data-review-id="${reviewId}"]`);
                if (reviewCard) {
                    console.log("Found review card to remove:", reviewId);
                    reviewCard.style.transition = 'opacity 0.3s ease-out';
                    reviewCard.style.opacity = '0';
                    setTimeout(() => {
                        reviewCard.remove(); // Remove card from HTML
                        // Check if empty and update UI
                         if (document.querySelectorAll('.review-card').length === 0) {
                            const container = document.querySelector('.reviews-container');
                            if (container) {
                                container.innerHTML = `
                                    <div class="empty-state" style="text-align: center; padding: 40px; color: #777;">
                                        <i class="fas fa-check-circle" style="font-size: 40px; color: #28a745; margin-bottom: 15px;"></i>
                                        <h3>All caught up!</h3>
                                        <p>There are no reviews that need moderation at this time.</p>
                                    </div>
                                `;
                            }
                        }
                    }, 300);
                } else {
                    console.error("Could not find review card to remove after reject. ID:", reviewId);
                    // Fallback: Reload page if card not found
                    showNotification("Review rejected. Refreshing page to update...", "success");
                    setTimeout(() => window.location.reload(), 1500);
                    return; // Stop further execution in this .then block
                }
                // Show success message
                showNotification(data.message || "Review rejected successfully", "success");
            } else {
                // Show error message
                showNotification(data.error || "Failed to reject the review.", 'error');
            }
        })
        .catch(error => {
            console.error('Reject Fetch Error:', error);
            closeRejectModal(); // Ensure modal is closed even on error
            showNotification(`An error occurred: ${error.message}`, 'error');
            // Consider reloading on critical errors
            // setTimeout(() => { window.location.reload(); }, 1500);
        });
    });

    // --- Sorting ---
    // Add event listener for the sort dropdown
    const sortSelector = document.getElementById('sort-selector');
    if (sortSelector) {
        sortSelector.addEventListener('change', function() {
            const sortByValue = this.value;
            console.log("Sort selection changed to:", sortByValue);

            // Get current URL parameters
            const currentUrl = new URL(window.location.href);
            const params = currentUrl.searchParams;

            // Update or add the 'sort' parameter
            params.set('sort', sortByValue);

            // Navigate to the new URL
            window.location.href = currentUrl.pathname + '?' + params.toString();
        });
    } else {
        console.warn("Sort selector element not found.");
    }

    // Log message to confirm script loaded properly
    console.log("Moderator reviews script initialized successfully");
}); 
