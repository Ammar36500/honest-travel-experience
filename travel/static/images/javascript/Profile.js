/* ------------------------------------------- Profile ------------------------------------------------*/

// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', initProfilePage); // Main entry point for profile page scripts.

// Main initialization function
function initProfilePage() { // Orchestrates the setup of all profile page functionalities.
    setupProfilePictureUpload();
    setupProfileDropdown();
    setupEditProfileButton();
    setupCoverPhotoUpload();
    setupProfileTabs();
    loadUserReviews();
    setupTripWishlist();
    // restoreImagesFromLocalStorage(); // This function was defined but not called in initProfilePage. Uncomment if needed.
}

// Configuration and utilities
// Retrieves the URL for updating profile information from a meta tag, with a fallback.
const updateProfileUrl = document.querySelector('meta[name="update-profile-url"]')?.getAttribute('content') || '/update-profile/';
// Retrieves the URL for uploading images from a meta tag, with a fallback.
const uploadImageUrl = document.querySelector('meta[name="upload-image-url"]')?.getAttribute('content') || '/upload-profile-image/';

// Get CSRF token (for Django)
// Utility function to extract CSRF token value from document cookies.
function getCookie(name) {
    if (!document.cookie) return null; // Return null if no cookies are set.
    const value = `; ${document.cookie}`; // Add leading semicolon and space for consistent splitting.
    const parts = value.split(`; ${name}=`); // Split by the cookie name.
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift()); // Extract and decode the value.
    return null; // Return null if cookie not found.
}

// Show notification
// Displays a temporary notification message to the user.
function showNotification(message, type = 'info') { // type can be 'info', 'success', 'error', 'warning'.
    // Check if notification container exists, create if not.
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        // Basic styling for the container, ensuring it's visible.
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '10000'; // High z-index to appear on top.
        document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`; // Apply classes for styling.
    // Basic inline styles for the notification itself.
    notification.style.padding = '12px 20px';
    notification.style.marginBottom = '10px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    notification.style.opacity = '1'; // Start fully visible (or '0' for fade-in).
    notification.style.transition = 'all 0.3s ease'; // Smooth transition for opacity changes.
    
    // Style based on notification type
    switch (type) {
        case 'success': notification.style.backgroundColor = '#4CAF50'; break; // Green for success.
        case 'error': notification.style.backgroundColor = '#f44336'; break;   // Red for error.
        case 'warning': notification.style.backgroundColor = '#ff9800'; break; // Orange for warning.
        default: notification.style.backgroundColor = '#2196F3'; // Blue for info.
    }
    notification.style.color = 'white'; // Text color for readability.
    
    // Add message and a close button (× symbol).
    notification.innerHTML = `${message}<span style="position: absolute; top: 5px; right: 10px; cursor: pointer;">&times;</span>`;
    container.appendChild(notification);
    
    // Close button functionality
    const closeBtn = notification.querySelector('span');
    if (closeBtn) { // Ensure close button was found.
        closeBtn.addEventListener('click', () => {
            notification.style.opacity = '0'; // Fade out.
            setTimeout(() => notification.parentElement?.removeChild(notification), 300); // Remove after fade.
        });
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0'; // Start fade out.
        setTimeout(() => notification.parentElement?.removeChild(notification), 300); // Remove after fade transition.
    }, 5000);
}

// Add cache buster to URL
// Appends a timestamp to a URL to prevent browser caching issues.
function addCacheBuster(url) {
    if (!url) return url; // Return original URL if it's null or empty.
    const separator = url.includes('?') ? '&' : '?'; // Determine separator based on existing query params.
    return `${url}${separator}t=${Date.now()}`; // Append timestamp.
}

// Upload image to server
// Handles file upload (profile or cover image) to the specified endpoint.
function uploadImage(file, type) { // 'type' is 'profile' or 'cover'.
    if (!file) return Promise.reject(new Error("No file provided")); // Reject if no file.
    
    const formData = new FormData(); // Create FormData object for multipart request.
    formData.append('image', file); // Add the image file.
    formData.append('type', type);  // Add the type of image being uploaded.
    
    showNotification(`Uploading ${type} image...`, 'info'); // Inform user.
    
    return fetch(uploadImageUrl, { // Use the globally defined upload URL.
        method: 'POST',
        body: formData,
        headers: { 'X-CSRFToken': getCookie('csrftoken') }, // Include CSRF token.
        credentials: 'same-origin' // Important for sending cookies with the request.
    })
    .then(response => {
        if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`); // Handle HTTP errors.
        return response.json(); // Parse JSON response.
    })
    .then(data => {
        if (data.imageUrl) { // If server returns an image URL.
            const imageUrl = addCacheBuster(data.imageUrl); // Add cache buster to the new URL.
            
            if (type === 'profile') {
                // Update all elements displaying the profile picture.
                document.querySelectorAll('.profile-picture, #modalProfilePic, .profile-icon').forEach(img => {
                    if (img) img.src = imageUrl;
                });
                localStorage.setItem('lastProfileImageUrl', imageUrl); // Store for persistence.
            } else if (type === 'cover') {
                // Update the cover photo image.
                const coverPhoto = document.querySelector('.cover-photo');
                if (coverPhoto) {
                    coverPhoto.src = imageUrl;
                } else { // If no existing cover photo, try to update/create in placeholder.
                    const placeholder = document.querySelector('.cover-photo-placeholder');
                    if (placeholder) {
                        placeholder.innerHTML = `<img src="${imageUrl}" alt="Cover Photo" class="cover-photo">`;
                    }
                }
                localStorage.setItem('lastCoverPhotoUrl', imageUrl); // Store for persistence.
            }
            
            showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} image uploaded successfully`, 'success');
            return data.imageUrl; // Return the new image URL.
        }
        // If server response doesn't include imageUrl, it implies an issue or no change.
        console.warn("Image upload response did not contain an imageUrl.", data);
        return null;
    })
    .catch(error => {
        showNotification(`Failed to upload ${type} image: ${error.message}`, 'error');
        throw error; // Re-throw error for further handling if needed.
    });
}

// Profile picture upload functionality
// Sets up the event listeners for the profile picture upload button and input.
function setupProfilePictureUpload() {
    const editProfilePicBtn = document.getElementById('editProfilePicBtn'); // The visible "edit" button.
    const profilePicInput = document.getElementById('profilePicInput');   // The hidden file input.
    if (!editProfilePicBtn || !profilePicInput) return; // Exit if elements not found.
    
    // Style the input to be hidden but functional.
    profilePicInput.style.opacity = "0";
    profilePicInput.style.position = "absolute";
    profilePicInput.style.pointerEvents = "none"; // Prevents it from interfering with layout.
    
    // Setup edit button click handler to trigger file input.
    editProfilePicBtn.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent any default button action.
        profilePicInput.click(); // Programmatically click the hidden file input.
    });
    
    // Setup file input change handler for when a file is selected.
    profilePicInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) { // If a file is selected.
            const file = e.target.files[0];
            
            // Preview image locally before upload.
            const reader = new FileReader();
            reader.onload = function(event) { // When file is read.
                // Update all relevant image elements with the new preview.
                document.querySelectorAll('.profile-picture, .profile-icon').forEach(img => {
                    if (img) img.src = event.target.result;
                });
            };
            reader.readAsDataURL(file); // Read file as Data URL for preview.
            
            // Upload to server.
            uploadImage(file, 'profile');
        }
    });
}

// Cover photo upload functionality
// Sets up the event listeners for the cover photo upload, with robust button finding.
function setupCoverPhotoUpload() {
    // Try multiple selectors to find the button, increasing robustness.
    const selectors = [
        '#changeCoverPhotoBtn',
        '.change-cover-photo-btn',
        'button.change-cover-photo-btn',
        '.cover-photo-container button'
    ];
    
    let changeCoverPhotoBtn = null;
    
    // Try each selector to find the button element.
    for (const selector of selectors) {
        try {
            const element = document.querySelector(selector);
            if (element) {
                changeCoverPhotoBtn = element;
                console.log(`Found cover photo button with selector: ${selector}`);
                break; // Stop if found.
            }
        } catch (e) {
            console.error(`Error with selector ${selector}:`, e); // Log selector errors.
        }
    }
    
    // If still not found, try a more aggressive approach by checking button text.
    if (!changeCoverPhotoBtn) {
        document.querySelectorAll('button').forEach(button => {
            if (button.textContent.toLowerCase().includes('cover') || 
                button.textContent.toLowerCase().includes('photo')) {
                changeCoverPhotoBtn = button;
                console.log("Found button by text content:", button.textContent);
            }
        });
    }
    
    if (!changeCoverPhotoBtn) { // If button is still not found.
        console.error("Cover photo button not found with any method");
        
        // Create a fallback button if no button exists and a container is present.
        const coverContainer = document.querySelector('.cover-photo-container');
        if (coverContainer) {
            console.log("Creating fallback cover photo button as none was found.");
            const fallbackBtn = document.createElement('button');
            fallbackBtn.className = 'change-cover-photo-btn'; // Assign classes for potential styling.
            fallbackBtn.id = 'changeCoverPhotoBtn'; // Assign ID.
            fallbackBtn.innerHTML = '<i class="ri-camera-line"></i> Change cover photo'; // Icon and text.
            // Basic styling for visibility and positioning.
            fallbackBtn.style.position = 'absolute';
            fallbackBtn.style.bottom = '15px';
            fallbackBtn.style.left = '15px';
            fallbackBtn.style.zIndex = '1000';
            fallbackBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            fallbackBtn.style.border = 'none';
            fallbackBtn.style.borderRadius = '4px';
            fallbackBtn.style.padding = '8px 16px';
            fallbackBtn.style.cursor = 'pointer';
            coverContainer.appendChild(fallbackBtn);
            
            changeCoverPhotoBtn = fallbackBtn; // Use the newly created button.
        } else {
            console.error("Cover container not found either, cannot create fallback button.");
            return; // Exit if no container to place fallback button.
        }
    }
    
    // Output debug info about the button that was found or created.
    console.log("Button details:", {
        id: changeCoverPhotoBtn.id,
        classes: changeCoverPhotoBtn.className,
        text: changeCoverPhotoBtn.textContent.trim(),
        visible: changeCoverPhotoBtn.offsetParent !== null, // Check if button is visible.
        dimensions: `${changeCoverPhotoBtn.offsetWidth}x${changeCoverPhotoBtn.offsetHeight}`,
        position: `${changeCoverPhotoBtn.getBoundingClientRect().top}, ${changeCoverPhotoBtn.getBoundingClientRect().left}`
    });
    
    // Ensure the button is clickable and appears on top.
    changeCoverPhotoBtn.style.cursor = 'pointer';
    changeCoverPhotoBtn.style.zIndex = '1000'; 
    
    // Create a fresh file input element to handle file selection.
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*'; // Accept all image types.
    fileInput.style.display = 'none'; // Keep it hidden.
    document.body.appendChild(fileInput); // Append to body to ensure it's part of DOM.
    
    // Create a completely new button and replace the old one to ensure clean event listeners.
    // This is a robust way to handle potentially problematic existing buttons.
    const newBtn = document.createElement('button');
    newBtn.id = changeCoverPhotoBtn.id || 'changeCoverPhotoBtn'; // Preserve ID.
    newBtn.className = changeCoverPhotoBtn.className || 'change-cover-photo-btn'; // Preserve classes.
    newBtn.innerHTML = changeCoverPhotoBtn.innerHTML; // Preserve content.
    newBtn.style.cssText = changeCoverPhotoBtn.style.cssText; // Preserve styles.
    newBtn.style.cursor = 'pointer'; // Ensure cursor style.
    newBtn.style.zIndex = '1000'; // Ensure z-index.
    
    // Replace the original button with the new one.
    if (changeCoverPhotoBtn.parentNode) { // Check if parentNode exists.
        changeCoverPhotoBtn.parentNode.replaceChild(newBtn, changeCoverPhotoBtn);
    } else {
        console.error("Original changeCoverPhotoBtn has no parentNode, cannot replace.");
        // If the original button wasn't in the DOM, newBtn might need to be appended elsewhere.
        // For this script, it assumes changeCoverPhotoBtn was part of the DOM.
    }
    
    // Add the click event directly on the element using onclick property.
    newBtn.onclick = function(e) {
        console.log("Cover photo button clicked (inline handler)");
        e.preventDefault(); // Prevent default action.
        e.stopPropagation(); // Stop event from bubbling up.
        
        showNotification('Opening file selector...', 'info'); // User feedback.
        
        fileInput.click(); // Trigger the hidden file input.
        
        return false; // Extra measure to prevent event bubbling.
    };
    
    // Also add a regular event listener as a backup or for other potential interactions.
    newBtn.addEventListener('click', function(e) {
        console.log("Cover photo button clicked (event listener)");
        // The logic is duplicated here from onclick; often one method is preferred.
        // If onclick is set, this might not always fire depending on browser and exact setup.
        // For robustness, it's included but ensure it doesn't cause double actions.
        // Given the `return false` in onclick, this might be fine.
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
    });
    
    // Add another click handler to the parent container as a fallback,
    // in case direct button clicks are intercepted by overlays or other elements.
    const parent = newBtn.parentNode;
    if (parent) {
        parent.addEventListener('click', function(e) {
            // Check if the click is on or very near the button.
            if (e.target === newBtn || newBtn.contains(e.target) || 
                (e.clientX >= newBtn.getBoundingClientRect().left && 
                 e.clientX <= newBtn.getBoundingClientRect().right &&
                 e.clientY >= newBtn.getBoundingClientRect().top &&
                 e.clientY <= newBtn.getBoundingClientRect().bottom)) {
                console.log("Parent container click detected near button, triggering file input.");
                e.preventDefault(); // Prevent default action on parent.
                fileInput.click(); // Trigger file input.
            }
        });
    }
    
    // Handle file selection via the dynamically created file input.
    fileInput.onchange = function(e) {
        console.log("File input changed:", e.target.files);
        
        if (e.target.files && e.target.files[0]) { // If a file is selected.
            const file = e.target.files[0];
            
            showNotification('Preparing cover photo...', 'info'); // User feedback.
            
            // Preview image locally.
            const reader = new FileReader();
            reader.onload = function(event) { // When file reading is complete.
                console.log("File read complete for cover photo preview.");
                
                // Try multiple selectors for the cover photo image element.
                const coverSelectors = ['.cover-photo', '#cover-photo', 'img.cover-photo', '.cover-photo-container img'];
                let coverPhoto = null;
                
                for (const selector of coverSelectors) {
                    coverPhoto = document.querySelector(selector);
                    if (coverPhoto) {
                        console.log(`Found cover photo for preview with selector: ${selector}`);
                        break;
                    }
                }
                
                if (coverPhoto) { // If existing cover photo element found.
                    console.log("Updating existing cover photo src for preview.");
                    coverPhoto.src = event.target.result;
                } else { // If no existing element, try placeholder or create new.
                    console.log("Cover photo element not found, looking for placeholder.");
                    const placeholder = document.querySelector('.cover-photo-placeholder');
                    if (placeholder) {
                        console.log("Updating placeholder with new cover image.");
                        placeholder.innerHTML = `<img src="${event.target.result}" alt="Cover Photo" class="cover-photo">`;
                    } else {
                        console.warn("Neither cover photo element nor placeholder found. Attempting to create in container.");
                        // Attempt to create one if a general container exists.
                        const coverContainer = document.querySelector('.cover-photo-container');
                        if (coverContainer) {
                            console.log("Creating new cover photo element in .cover-photo-container.");
                            coverContainer.innerHTML = `<img src="${event.target.result}" alt="Cover Photo" class="cover-photo">`;
                        } else {
                             console.error("No suitable container found to display cover photo preview.");
                        }
                    }
                }
            };
            
            reader.readAsDataURL(file); // Read file for preview.
            
            // Upload to server.
            console.log("Calling uploadImage for cover photo with selected file.");
            uploadImage(file, 'cover')
                .then(url => {
                    console.log("Cover photo upload complete, URL:", url);
                    // Notification is handled within uploadImage, but can add more here if needed.
                })
                .catch(err => {
                    console.error("Cover photo upload process error:", err);
                    // Notification is handled within uploadImage.
                });
        }
    };
    
    console.log("Cover photo upload setup complete with multiple fallbacks and robust event handling.");
}

// Profile dropdown functionality
// Manages the visibility of the user profile dropdown menu.
function setupProfileDropdown() {
    const profileIcon = document.querySelector('.profile-icon'); // The clickable profile icon/avatar.
    const dropdownContent = document.querySelector('.dropdown-content'); // The dropdown menu itself.
    if (!profileIcon || !dropdownContent) return; // Exit if elements not found.
    
    // Toggle dropdown when profile icon is clicked.
    profileIcon.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent link navigation if icon is an anchor.
        dropdownContent.classList.toggle('show'); // Toggle visibility class.
    });

    // Close dropdown when clicking outside of it.
    document.addEventListener('click', function(e) {
        // If click is not on profile icon and dropdown is shown, hide it.
        if (!profileIcon.contains(e.target) && !dropdownContent.contains(e.target) && dropdownContent.classList.contains('show')) {
            dropdownContent.classList.remove('show');
        }
    });

    // Handle logout form submission if logout is a form.
    const logoutForm = document.getElementById('logout-form');
    if (logoutForm) {
        const logoutLink = logoutForm.querySelector('a'); // Assuming logout is triggered by a link inside the form.
        if (logoutLink) {
            logoutLink.addEventListener('click', function(e) {
                e.preventDefault(); // Prevent default link action.
                logoutForm.submit(); // Submit the form to logout.
            });
        }
    }
}

// Create and setup profile edit modal
// Dynamically creates the HTML for the edit profile modal if it doesn't exist and sets up its listeners.
function setupEditProfileButton() {
    const editProfileBtn = document.getElementById('editProfileBtn'); // Button to open the edit modal.
    if (!editProfileBtn) return; // Exit if button not found.
    
    // Create modal HTML dynamically if it's not already in the DOM.
    if (!document.getElementById('editProfileModal')) {
        const profilePicture = document.querySelector('.profile-picture'); // Get current profile picture for modal.
        const profilePicSrc = profilePicture ? profilePicture.src : '/static/images/default-profile.png'; // Fallback src.
        
        // HTML structure for the modal.
        const modalHTML = `
            <div id="editProfileModal" class="profile-modal" style="display:none;"> <div class="modal-content">
                    <span class="close-modal" id="closeProfileModal">&times;</span>
                    
                    <div class="modal-profile-pic">
                        <img src="${profilePicSrc}" alt="Profile Picture" id="modalProfilePic">
                        <label class="edit-pic-label"> <input type="file" id="modalProfilePicInput" accept="image/*" style="display:none;">
                            <i class="ri-camera-line"></i> </label>
                    </div>
    
                    <form id="profileEditForm">
                        <div class="form-group">
                            <label for="editName">Name</label>
                            <input type="text" id="editName" value="">
                        </div>
    
                        <div class="form-group">
                            <label for="editUsername">Username</label>
                            <div class="username-field">
                                <span class="at-symbol">@</span>
                                <input type="text" id="editUsername" value="">
                            </div>
                        </div>
    
                        <div class="form-group">
                            <label for="editCity">Current City</label>
                            <input type="text" id="editCity" placeholder="Add your city">
                        </div>
    
                        <div class="form-group">
                            <label for="editWebsite">Website</label>
                            <input type="url" id="editWebsite" placeholder="Add a website">
                        </div>
                        
                        <div class="form-group">
                            <label for="editAbout">About you</label>
                            <textarea id="editAbout" placeholder="Write some details about yourself" maxlength="160"></textarea>
                            <div class="char-counter"><span id="charCount">160</span> characters remaining</div>
                        </div>
                        
                        <div class="modal-footer">
                            <p class="terms-text">By clicking Save, you agree to our Terms of Use.</p>
                            <div class="modal-actions">
                                <button type="button" class="cancel-btn" id="cancelModalBtn">Cancel</button>
                                <button type="submit" class="save-btn">Save</button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML); // Add modal HTML to the end of the body.
        setupModalEventListeners(); // Setup listeners for the newly created modal.
    }

    // Show modal when edit button is clicked.
    editProfileBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const modal = document.getElementById('editProfileModal');
        if (modal) {
            populateModalFields(); // Fill modal with current profile data.
            modal.style.display = 'block'; // Display the modal.
        }
    });
}

// Populate modal fields with current user data from the profile page.
function populateModalFields() {
    // Mapping of modal input IDs to profile page element selectors.
    const fieldsMap = {
        'editName': '.profile-name',
        'editUsername': '.profile-username',
        'editAbout': '.profile-bio',
        'editCity': '.profile-location',
        'editWebsite': '.profile-website a' // Assuming website is in an <a> tag.
    };
    
    Object.entries(fieldsMap).forEach(([inputId, selector]) => {
        const input = document.getElementById(inputId);
        const element = document.querySelector(selector);
        if (input && element) {
            let value = (selector.endsWith(' a') ? element.getAttribute('href') : element.textContent)?.trim() || '';
            if (inputId === 'editUsername') value = value.replace('@', ''); // Remove '@' for username input.
            input.value = value;
        } else {
            console.warn(`Modal field or source element not found: ${inputId} or ${selector}`);
        }
    });
    
    // Update profile picture in modal.
    const profilePicSrc = document.querySelector('.profile-picture')?.src;
    const modalProfilePic = document.getElementById('modalProfilePic');
    if (modalProfilePic && profilePicSrc) {
        modalProfilePic.src = profilePicSrc;
    }

    updateCharCounter(); // Initialize character counter for bio.
}

// Setup all event listeners for the edit profile modal.
function setupModalEventListeners() {
    const modal = document.getElementById('editProfileModal');
    if (!modal) return; // Exit if modal doesn't exist.

    // Close button (X) functionality.
    const closeModalBtn = document.getElementById('closeProfileModal');
    // Cancel button functionality.
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    if (cancelModalBtn) {
        cancelModalBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    // Close when clicking outside the modal content (on the overlay).
    window.addEventListener('click', (event) => {
        if (event.target === modal) { // If click target is the modal overlay itself.
            modal.style.display = 'none';
        }
    });
    
    // Character counter for 'About you' textarea.
    const aboutTextarea = document.getElementById('editAbout');
    if (aboutTextarea) {
        aboutTextarea.addEventListener('input', updateCharCounter);
    }
    
    // Profile picture change functionality within the modal.
    const modalProfilePicInput = document.getElementById('modalProfilePicInput'); // Hidden file input in modal.
    const modalProfilePic = document.getElementById('modalProfilePic'); // Image element in modal.
    
    if (modalProfilePicInput && modalProfilePic) {
        modalProfilePicInput.addEventListener('change', function(e) { // When a new file is selected.
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                
                const reader = new FileReader();
                reader.onload = function(event) {
                    // Update modal profile pic and also main page profile pics for immediate feedback.
                    document.querySelectorAll('#modalProfilePic, .profile-picture, .profile-icon').forEach(img => {
                        if (img) img.src = event.target.result;
                    });
                };
                reader.readAsDataURL(file); // Read for preview.
                
                uploadImage(file, 'profile'); // Upload the selected image.
            }
        });
    }
    
    // Form submission handler for the edit profile form.
    setupProfileEditForm();
}

// Setup form submission for the profile edit form within the modal.
function setupProfileEditForm() {
    const profileEditForm = document.getElementById('profileEditForm');
    const modal = document.getElementById('editProfileModal');
    
    if (profileEditForm && modal) {
        profileEditForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent default form submission.
            
            // Show loading state on the save button.
            const saveBtn = profileEditForm.querySelector('.save-btn');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = 'Saving...';
            saveBtn.disabled = true;
            
            updateProfileInfo() // Call function to send data to server.
                .then(() => {
                    modal.style.display = 'none'; // Close modal on success.
                    showNotification('Profile updated successfully', 'success');
                })
                .catch(error => {
                    console.error("Profile update failed:", error);
                    showNotification('Failed to update profile. Please try again.', 'error');
                })
                .finally(() => {
                    // Reset button state regardless of outcome.
                    saveBtn.textContent = originalText;
                    saveBtn.disabled = false;
                });
        });
    }
}

// Update profile information by sending data to the server.
function updateProfileInfo() {
    // Get input values from the modal form.
    const inputs = {
        name: document.getElementById('editName')?.value,
        username: document.getElementById('editUsername')?.value,
        bio: document.getElementById('editAbout')?.value,
        location: document.getElementById('editCity')?.value,
        website: document.getElementById('editWebsite')?.value
    };
    
    const formData = new FormData(); // Use FormData for easy construction.
    
    // Add values to FormData, handling potential splitting of full name.
    if (inputs.name) {
        const nameParts = inputs.name.trim().split(' ');
        formData.append('first_name', nameParts[0] || ''); // First part as first_name.
        formData.append('last_name', nameParts.slice(1).join(' ') || ''); // Rest as last_name.
    }
    // Append other fields if they have values.
    if (inputs.username) formData.append('username', inputs.username);
    if (inputs.bio) formData.append('bio', inputs.bio);
    if (inputs.location) formData.append('location', inputs.location);
    if (inputs.website) formData.append('website', inputs.website);
    
    // Send data to the server using the global updateProfileUrl.
    return fetch(updateProfileUrl, {
        method: 'POST',
        body: formData,
        headers: { 'X-CSRFToken': getCookie('csrftoken') }, // CSRF token for security.
        credentials: 'same-origin'
    })
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok: ' + response.status); // Handle HTTP errors.
        return response.json(); // Expect JSON response.
    })
    .then(data => {
        if (data.error) { // If backend returns an error message in JSON.
            throw new Error(data.error);
        }
        // Update UI elements on the profile page with new values.
        const elements = {
            name: document.querySelector('.profile-name'),
            username: document.querySelector('.profile-username'),
            bio: document.querySelector('.profile-bio'),
            location: document.querySelector('.profile-location'),
            website: document.querySelector('.profile-website a') // Assuming website is an <a> tag.
        };
        
        // Update textContent or attributes as appropriate.
        if (inputs.name && elements.name) elements.name.textContent = inputs.name;
        if (inputs.username && elements.username) elements.username.textContent = '@' + inputs.username;
        if (inputs.bio && elements.bio) elements.bio.textContent = inputs.bio;
        if (inputs.location && elements.location) elements.location.textContent = inputs.location;
        if (inputs.website && elements.website) {
            elements.website.textContent = inputs.website;
            elements.website.href = inputs.website; // Update href for links.
        }
        
        // Update profile picture in header/dropdown if it changed via modal (though uploadImage handles this mostly)
        const modalPicSrc = document.getElementById('modalProfilePic')?.src;
        if (modalPicSrc && modalPicSrc !== document.querySelector('.profile-icon')?.src) {
             document.querySelectorAll('.profile-icon, .profile-picture').forEach(img => {
                if (img) img.src = addCacheBuster(modalPicSrc); // Ensure cache buster.
            });
        }

        return data; // Return server response data.
    });
}

// Restore images from localStorage if needed (e.g., on page load if images might not update immediately).
// This function was defined but not called in initProfilePage.
function restoreImagesFromLocalStorage() {
    // Check for stored profile image URL.
    const savedProfileImageUrl = localStorage.getItem('lastProfileImageUrl');
    if (savedProfileImageUrl) {
        document.querySelectorAll('.profile-picture, .profile-icon').forEach(img => {
            if (img) img.src = savedProfileImageUrl; // Apply stored URL.
        });
    }
    
    // Check for stored cover photo URL.
    const savedCoverPhotoUrl = localStorage.getItem('lastCoverPhotoUrl');
    if (savedCoverPhotoUrl) {
        const coverPhoto = document.querySelector('.cover-photo');
        if (coverPhoto) coverPhoto.src = savedCoverPhotoUrl; // Apply stored URL.
    }
}

// Update character counter for 'About You' textarea in the edit modal.
function updateCharCounter() {
    const aboutTextarea = document.getElementById('editAbout');
    const charCountSpan = document.getElementById('charCount');
    
    if (aboutTextarea && charCountSpan) { // Ensure elements exist.
        const maxLength = parseInt(aboutTextarea.getAttribute('maxlength') || '160'); // Get max length.
        const remaining = maxLength - aboutTextarea.value.length;
        charCountSpan.textContent = remaining; // Display remaining characters.
    }
}

// Profile tabs functionality (e.g., for "Reviews", "Wishlist" sections).
function setupProfileTabs() {
    const profileTabs = document.querySelectorAll('.profile-tab'); // All clickable tab elements.
    const tabContents = document.querySelectorAll('.tab-content'); // All content sections for tabs.
    
    if (profileTabs.length === 0 || tabContents.length === 0) return; // Exit if no tabs or content.
    
    profileTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove 'active' class from all tabs and hide all tab contents.
            profileTabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active')); // Assuming 'active' class shows content.
            
            // Add 'active' class to the clicked tab.
            this.classList.add('active');
            
            // Show corresponding content based on 'data-tab' attribute.
            const tabName = this.getAttribute('data-tab');
            const contentToShow = document.getElementById(`${tabName}-content`);
            if (contentToShow) {
                contentToShow.classList.add('active'); // Show the target content.
            }
        });
    });
    
    // Activate the first tab by default if no tab is currently active.
    if (profileTabs.length > 0 && !document.querySelector('.profile-tab.active')) {
        profileTabs[0].click(); // Simulate a click on the first tab.
    }
}

// Load and display user's reviews on their profile page.
function loadUserReviews() {
    console.log("loadUserReviews function called");
    
    const reviewsContent = document.getElementById('reviews-content'); // Container for reviews.
    if (!reviewsContent) {
        console.error("Could not find #reviews-content element in the DOM");
        return;
    }
    
    const userReviewsUrl = '/api/user-reviews/'; // API endpoint to fetch reviews.
    
    reviewsContent.innerHTML = '<div class="loading-spinner">Loading your reviews...</div>'; // Show loading state.
    
    fetch(userReviewsUrl, { // Fetch reviews from the server.
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest', // Often used by Django to identify AJAX.
            'Accept': 'application/json',
        },
        credentials: 'same-origin' // Send cookies.
    })
    .then(response => {
        console.log('Response status for user reviews:', response.status);
        if (!response.ok) { // Handle HTTP errors.
            return response.text().then(text => {
                console.error('Non-OK response body for user reviews:', text);
                throw new Error(`Failed to load reviews. Status: ${response.status}`);
            });
        }
        return response.json(); // Parse JSON response.
    })
    .then(data => {
        console.log('Response data for user reviews:', data);
        if (!data) throw new Error('No data received from server for reviews');
        
        const reviews = data.reviews || (Array.isArray(data) ? data : []); // Flexible data handling.
        
        if (!reviews || reviews.length === 0) { // If no reviews are found.
            console.warn('No reviews found for this user.');
            reviewsContent.innerHTML = `
                <h3>Your Reviews</h3>
                <p class="no-content-message">You haven't written any reviews yet.</p>
                <a href="/submit-review/" class="action-button"> <i class="ri-edit-line"></i> Write Your First Review
                </a>
            `;
            return;
        }
        
        console.log(`Found ${reviews.length} reviews`);
        
        // Create HTML markup for each review.
        const reviewsHTML = reviews.map(review => {
            // Defensive checks for each review property to prevent errors.
            const title = review.title || 'Untitled Review';
            const content = review.content || 'No review content available.';
            const rating = review.rating || 0;
            const createdAt = review.created_at ? new Date(review.created_at).toLocaleDateString() : 'Date Unknown';
            const reviewId = review.id || ''; // Ensure ID is available for actions.
            
            let ratingHTML = ''; // Generate star icons for rating.
            for (let i = 1; i <= 5; i++) {
                ratingHTML += i <= rating 
                    ? '<i class="ri-star-fill"></i>'  // Filled star.
                    : '<i class="ri-star-line"></i>'; // Outline star.
            }
            
            return `
                <div class="review-card" data-review-id="${reviewId}"> <div class="review-header">
                        <h4>${title}</h4>
                        <div class="review-rating">${ratingHTML}</div>
                    </div>
                    <p class="review-date">Submitted on: ${createdAt}</p>
                    <p class="review-text">${content}</p>
                    <div class="review-actions">
                        <button class="edit-review-btn" data-review-id="${reviewId}">
                            <i class="ri-edit-line"></i> Edit
                        </button>
                        <button class="delete-review-btn" data-review-id="${reviewId}">
                            <i class="ri-delete-bin-line"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Update reviews content area with the generated HTML.
        reviewsContent.innerHTML = `
            <h3>Your Reviews</h3>
            <div class="reviews-container">
                ${reviewsHTML}
            </div>
        `;
        
        setupReviewActionButtons(); // Attach event listeners to new edit/delete buttons.
    })
    .catch(error => {
        console.error('Comprehensive error loading reviews:', error);
        reviewsContent.innerHTML = `
            <h3>Your Reviews</h3>
            <p class="error-message">Failed to load reviews: ${error.message}</p>
            <button class="retry-button" id="retryReviewsBtn">Retry</button> `;
        
        const retryBtn = document.getElementById('retryReviewsBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', loadUserReviews); // Retry fetching on click.
        }
    });
}

// Setup event listeners for edit and delete buttons on dynamically loaded reviews.
function setupReviewActionButtons() {
    document.querySelectorAll('.edit-review-btn').forEach(btn => {
        // Remove existing listener before adding, to prevent duplicates if called multiple times.
        btn.replaceWith(btn.cloneNode(true)); // Simple way to remove all listeners.
        document.querySelector(`.edit-review-btn[data-review-id="${btn.dataset.reviewId}"]`)
            .addEventListener('click', function() {
            const reviewId = this.getAttribute('data-review-id');
            if (reviewId) {
                window.location.href = `/edit-review/${reviewId}/`; // Redirect to edit page.
            }
        });
    });
    
    document.querySelectorAll('.delete-review-btn').forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
        document.querySelector(`.delete-review-btn[data-review-id="${btn.dataset.reviewId}"]`)
            .addEventListener('click', function() {
            const reviewId = this.getAttribute('data-review-id');
            if (reviewId && confirm('Are you sure you want to delete this review?')) {
                deleteReview(reviewId, this); // Pass button for potential UI update.
            }
        });
    });
}

// Edit Review functionality (placeholder - actual edit page would handle this).
// This event listener block seems to be for a separate edit review page, not the profile page directly.
document.addEventListener('DOMContentLoaded', function() {
    const editReviewForm = document.getElementById('edit-review-form'); // Form on the dedicated edit review page.
    const saveButton = editReviewForm?.querySelector('.save-btn'); // Save button within that form.
    
    if (editReviewForm && saveButton) { // Only proceed if these elements exist.
        console.log("Edit review form detected on current page, setting up handlers");
        
        editReviewForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent standard submission.
            console.log("Edit review form submission intercepted");
            handleSaveClick(); // Call custom save handler.
        });
        
        // saveButton.addEventListener('click', function(e) { // This might be redundant if submit is handled.
        //     e.preventDefault();
        //     console.log("Save button explicitly clicked on edit review page");
        //     handleSaveClick();
        // });
        
        function handleSaveClick() { // Logic to handle saving the edited review.
            if (saveButton.disabled) { // Prevent multiple submissions.
                console.log("Already saving review, not submitting again");
                return;
            }
            
            const originalText = saveButton.textContent;
            saveButton.textContent = 'Saving...'; // Indicate loading.
            saveButton.disabled = true;
            
            const form = new FormData(editReviewForm);
            form.append('direct_save', 'true'); // Potentially a flag for backend.
            
            fetch(window.location.href, { // POST to the current URL (edit review page URL).
                method: 'POST',
                body: form,
                credentials: 'same-origin', // Ensure cookies (like CSRF) are sent.
                headers: { 'X-CSRFToken': getCookie('csrftoken') } // Add CSRF token from the global getCookie.
            })
            .then(response => {
                console.log("Edit review save response status:", response.status);
                if (!response.ok) {
                    return response.text().then(text => {
                        console.error("Error response from saving review:", text);
                        throw new Error("Failed to save review. Server returned an error.");
                    });
                }
                return response.text().then(text => { // Try to parse as JSON, but handle non-JSON too.
                    try { return JSON.parse(text); } 
                    catch (e) { 
                        console.log("Response from saving review is not JSON, assuming success based on OK status.");
                        return { success: true }; // Assume success if status is OK but no JSON.
                    }
                });
            })
            .then(data => {
                console.log("Review saved successfully (edit page):", data);
                showNotification("Your review has been updated successfully!", "success");
                
                setTimeout(function() { // Redirect back to profile page after a delay.
                    window.location.href = '/profile/?t=' + new Date().getTime(); // Add cache buster.
                }, 1500);
            })
            .catch(error => {
                console.error("Error saving review (edit page):", error);
                showNotification("Error updating review: " + error.message, "error");
            })
            .finally(() => { // Reset button state.
                saveButton.textContent = originalText;
                saveButton.disabled = false;
            });
        }
        
        console.log("Edit review page handlers set up successfully");
    }
    // Note: The showNotification function is duplicated here. Ideally, it should be defined once globally or in a shared utility.
    // For this exercise, keeping it as provided.
    // function showNotification(message, type) { /* ... implementation ... */ }
});

// Ensure this runs when the DOM is loaded (redundant if loadUserReviews is called by initProfilePage).
// document.addEventListener('DOMContentLoaded', loadUserReviews); // Can be removed if initProfilePage calls it.

// Delete a review - FIXED VERSION (as per user's code structure)
// This function handles the API call to delete a review.
function deleteReview(reviewId, buttonElement) { // Added buttonElement to help remove the row.
    if (!reviewId) {
        console.error("No review ID provided for deletion");
        showNotification("Cannot delete: Review ID is missing.", "error");
        return;
    }
    
    const csrftoken = getCookie('csrftoken'); // Get CSRF token.
    if (!csrftoken) {
        console.error("CSRF token not found for delete operation.");
        showNotification("Action failed: Missing security token.", "error");
        return;
    }
    
    const deleteUrl = `/delete-review/${reviewId}/`; // Construct delete URL.
    
    console.log(`Sending delete request to: ${deleteUrl}`);
    showNotification('Deleting review...', 'info'); // User feedback.
    
    fetch(deleteUrl, {
        method: 'POST', // Django often uses POST for actions that change state, even delete.
        headers: {
            'X-CSRFToken': csrftoken,
            'X-Requested-With': 'XMLHttpRequest', // Standard for AJAX in Django.
            'Accept': 'application/json' // Expect JSON response.
        },
        credentials: 'include' // Or 'same-origin', ensure cookies are sent.
    })
    .then(response => {
        console.log('Delete review response status:', response.status);
        
        if (response.redirected && response.url.includes('/login/')) { // Handle session expiry.
            console.log("Redirected to login page during delete.");
            window.location.href = response.url;
            throw new Error('Authentication required'); // Stop further processing.
        }
        
        if (!response.ok) { // Handle HTTP errors.
            return response.text().then(text => {
                console.error('Error response body from delete:', text);
                throw new Error(`Failed to delete review: Server error ${response.status}`);
            });
        }
        
        return response.json().catch(() => { // Handle cases where response might be OK but not valid JSON (e.g., 204 No Content).
            console.log('Delete response was not JSON, assuming success based on OK status.');
            return { success: true, message: "Review deleted." }; // Default success object.
        });
    })
    .then(data => {
        console.log('Review deleted successfully (server response):', data);
        showNotification(data.message || 'Review deleted successfully!', 'success');
        
        // Remove the review card from the UI.
        const reviewCard = document.querySelector(`.review-card[data-review-id="${reviewId}"]`);
        if (reviewCard) {
            reviewCard.style.opacity = '0';
            reviewCard.style.transition = 'opacity 0.3s ease-out';
            setTimeout(() => {
                reviewCard.remove();
                // Check if review container is empty.
                const reviewsContainer = document.getElementById('reviews-content')?.querySelector('.reviews-container');
                if (reviewsContainer && reviewsContainer.children.length === 0) {
                    loadUserReviews(); // Reload to show "no reviews" message if applicable.
                }
            }, 300);
        } else if (buttonElement) { // Fallback if card selector fails, try using button's parent.
             const row = buttonElement.closest('.review-card') || buttonElement.closest('tr');
             if(row) row.remove();
        }
        // loadUserReviews(); // Optionally reload all reviews to refresh counts or display "no reviews".
    })
    .catch(error => {
        console.error('Error deleting review:', error);
        if (error.message !== 'Authentication required') { // Avoid double notification for auth issues.
            showNotification(`Failed to delete review: ${error.message}`, 'error');
        }
    });
}

// Setup delete buttons - attach only once (this function seems to be a duplicate effort or for a different context).
// The primary setup for delete buttons is within setupReviewActionButtons after reviews are loaded.
// function setupDeleteButtons() {
//   document.querySelectorAll('.delete-review-btn').forEach(btn => {
//     btn.removeEventListener('click', handleDeleteClick); // Remove to avoid duplicates.
//     btn.addEventListener('click', handleDeleteClick);   // Add new listener.
//   });
// }

// Separate handler function for delete button clicks (also seems duplicate if setupReviewActionButtons is used).
// function handleDeleteClick(e) {
//   e.preventDefault();
//   const reviewId = this.getAttribute('data-review-id');
//   if (reviewId && confirm('Are you sure you want to delete this review?')) {
//     deleteReview(reviewId);
//   }
// }

// Helper function to get cookies (for CSRF token) - DUPLICATE, defined at the top.
// function getCookie(name) { /* ... implementation ... */ }

// Function to show notifications - DUPLICATE, defined at the top.
// function showNotification(message, type) { /* ... implementation ... */ }

// Setup trip wishlist functionality using localStorage.
function setupTripWishlist() {
    const tripsContent = document.getElementById('trips-content'); // Container for wishlist.
    if (!tripsContent) return; // Exit if container not found.
    
    // Initialize trips content with form and list area.
    tripsContent.innerHTML = `
        <h3>Your Trip Wishlist</h3>
        <div class="wishlist-container">
            <div id="wishlist-items"></div> <div class="add-wishlist-item">
                <form id="add-trip-form">
                    <input type="text" id="wishlist-destination" placeholder="Where do you want to go?" required>
                    <input type="date" id="wishlist-date" placeholder="When?">
                    <textarea id="wishlist-notes" placeholder="Notes (optional)"></textarea>
                    <button type="submit" class="add-trip-btn">
                        <i class="ri-add-line"></i> Add to Wishlist
                    </button>
                </form>
            </div>
        </div>
    `;
    
    loadWishlistItems(); // Load and display any existing items from localStorage.
    
    const addTripForm = document.getElementById('add-trip-form');
    if (addTripForm) {
        addTripForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent default form submission.
            
            const destination = document.getElementById('wishlist-destination').value;
            const date = document.getElementById('wishlist-date').value;
            const notes = document.getElementById('wishlist-notes').value;
            
            if (!destination) { // Destination is mandatory.
                showNotification('Please enter a destination for your wishlist item.', 'warning');
                return;
            }
            
            addWishlistItem(destination, date, notes); // Add the new item.
            addTripForm.reset(); // Clear the form fields.
        });
    }
}

// Load wishlist items from localStorage and display them.
function loadWishlistItems() {
    const wishlistContainer = document.getElementById('wishlist-items');
    if (!wishlistContainer) return;
    
    let wishlistItems = [];
    try { // Safely parse items from localStorage.
        const savedItems = localStorage.getItem('tripWishlist');
        if (savedItems) {
            wishlistItems = JSON.parse(savedItems);
        }
    } catch (error) {
        console.error('Error loading wishlist from localStorage:', error);
        wishlistItems = []; // Reset to empty array on error.
    }
    
    if (wishlistItems.length === 0) { // If wishlist is empty.
        wishlistContainer.innerHTML = '<p class="no-content-message">Your trip wishlist is empty. Add destinations you dream of visiting!</p>';
        return;
    }
    
    // Sort items by date (if available), pushing items without dates to the end.
    wishlistItems.sort((a, b) => {
        if (!a.date && !b.date) return 0; // If both have no date, keep original order.
        if (!a.date) return 1;  // 'a' without date goes after 'b' with date.
        if (!b.date) return -1; // 'b' without date goes after 'a' with date.
        return new Date(a.date) - new Date(b.date); // Sort by date ascending.
    });
    
    // Create HTML for each wishlist item.
    const itemsHTML = wishlistItems.map((item, index) => `
        <div class="wishlist-item" data-index="${index}"> <div class="wishlist-header">
                <h4>${item.destination}</h4>
                ${item.date ? `<p class="wishlist-date">${new Date(item.date).toLocaleDateString()}</p>` : ''}
            </div>
            ${item.notes ? `<p class="wishlist-notes">${item.notes}</p>` : ''}
            <div class="wishlist-actions">
                <button class="edit-wishlist-btn" data-index="${index}">
                    <i class="ri-edit-line"></i> Edit
                </button>
                <button class="delete-wishlist-btn" data-index="${index}">
                    <i class="ri-delete-bin-line"></i> Remove
                </button>
            </div>
        </div>
    `).join('');
    
    wishlistContainer.innerHTML = itemsHTML; // Display items.
    
    // Add event listeners for edit and delete buttons on wishlist items.
    document.querySelectorAll('.edit-wishlist-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            editWishlistItem(index); // Call edit function.
        });
    });
    
    document.querySelectorAll('.delete-wishlist-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            if (confirm('Are you sure you want to remove this destination from your wishlist?')) {
                deleteWishlistItem(index); // Call delete function.
            }
        });
    });
}

// Add new wishlist item to localStorage.
function addWishlistItem(destination, date, notes) {
    let wishlistItems = [];
    try {
        const savedItems = localStorage.getItem('tripWishlist');
        if (savedItems) wishlistItems = JSON.parse(savedItems);
    } catch (error) { console.error('Error parsing wishlist on add:', error); }
    
    wishlistItems.push({ // Add new item object.
        destination,
        date,
        notes,
        addedOn: new Date().toISOString() // Timestamp for when it was added.
    });
    
    localStorage.setItem('tripWishlist', JSON.stringify(wishlistItems)); // Save updated list.
    showNotification('Destination added to your wishlist!', 'success');
    loadWishlistItems(); // Refresh displayed list.
}

// Edit an existing wishlist item.
function editWishlistItem(index) {
    let wishlistItems = [];
    try {
        const savedItems = localStorage.getItem('tripWishlist');
        if (savedItems) wishlistItems = JSON.parse(savedItems);
    } catch (error) { console.error('Error parsing wishlist on edit:', error); return; }
    
    const item = wishlistItems[index]; // Get the item to be edited.
    if (!item) {
        console.error("Wishlist item not found for editing at index:", index);
        return;
    }
    
    const wishlistItemElement = document.querySelector(`.wishlist-item[data-index="${index}"]`); // Find the item's HTML element.
    if (!wishlistItemElement) return;
    
    // Replace item display with an edit form.
    wishlistItemElement.innerHTML = `
        <form class="edit-wishlist-form">
            <div class="form-group">
                <label>Destination</label>
                <input type="text" class="edit-destination" value="${item.destination}" required>
            </div>
            <div class="form-group">
                <label>When?</label>
                <input type="date" class="edit-date" value="${item.date || ''}">
            </div>
            <div class="form-group">
                <label>Notes</label>
                <textarea class="edit-notes">${item.notes || ''}</textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="cancel-edit-btn">Cancel</button>
                <button type="submit" class="save-wishlist-btn">Save Changes</button>
            </div>
        </form>
    `;
    
    // Setup event listeners for the dynamically created edit form.
    const editForm = wishlistItemElement.querySelector('.edit-wishlist-form');
    const cancelBtn = wishlistItemElement.querySelector('.cancel-edit-btn');
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            loadWishlistItems(); // Reload list to cancel edit and revert display.
        });
    }
    
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const destination = this.querySelector('.edit-destination').value;
            const date = this.querySelector('.edit-date').value;
            const notes = this.querySelector('.edit-notes').value;
            
            if (!destination) { // Destination is still mandatory.
                showNotification('Please enter a destination.', 'warning');
                return;
            }
            
            // Update item in the array.
            wishlistItems[index] = {
                ...item, // Preserve original 'addedOn' timestamp and other potential fields.
                destination,
                date,
                notes,
                updatedOn: new Date().toISOString() // Timestamp for when it was updated.
            };
            
            localStorage.setItem('tripWishlist', JSON.stringify(wishlistItems)); // Save changes.
            showNotification('Wishlist item updated successfully!', 'success');
            loadWishlistItems(); // Refresh displayed list.
        });
    }
}

// Delete wishlist item from localStorage.
function deleteWishlistItem(index) {
    let wishlistItems = [];
    try {
        const savedItems = localStorage.getItem('tripWishlist');
        if (savedItems) wishlistItems = JSON.parse(savedItems);
    } catch (error) { console.error('Error parsing wishlist on delete:', error); return; }
    
    wishlistItems.splice(index, 1); // Remove the item at the specified index.
    
    localStorage.setItem('tripWishlist', JSON.stringify(wishlistItems)); // Save updated list.
    showNotification('Destination removed from your wishlist.', 'success');
    loadWishlistItems(); // Refresh displayed list.
}
