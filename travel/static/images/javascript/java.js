// Ensure all code runs after DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
  /* ------------------------------------------- Login/Signup Modal ------------------------------------------------*/
  // Select the modal and its related components
  const container = document.querySelector('.modal-content .container'); // Main container for login/signup forms within the modal.
  const signupButton = document.querySelector('.signup-section header'); // Clickable header to switch to signup form.
  const loginButton = document.querySelector('.login-section header'); // Clickable header to switch to login form.

  // Open modal and default to login
  function openModal() {
      const modal = document.getElementById("loginModal"); // Get the modal element.
      if (modal) {
          modal.style.display = "block"; // Make the modal visible.
          showLogin(); // Default to login form (or ensure it's correctly displayed).
      } else {
          console.error("Modal element with ID 'loginModal' not found.");
      }
  }

  // Close modal
  function closeModal() {
      const modal = document.getElementById("loginModal");
      if (modal) {
          modal.style.display = "none"; // Hide the modal.
      } else {
          console.error("Modal element with ID 'loginModal' not found.");
      }
  }

  // Ensure `showLogin` is defined before calling it
  function showLogin() { // Placeholder or function to ensure login form is active/visible.
      console.log("Login form displayed."); // Logs that the login form should be active.
      // Actual logic to switch to login form might be handled by 'active' class on container.
  }

  // Toggle between login and signup containers
  if (loginButton && signupButton && container) { // Check if all toggle elements are present.
      loginButton.addEventListener('click', () => {
          container.classList.add('active'); // 'active' class might show login and hide signup.
      });

      signupButton.addEventListener('click', () => {
          container.classList.remove('active'); // Removing 'active' might show signup and hide login.
      });
  } else {
      console.warn("One or more elements (container, loginButton, signupButton) are missing for modal toggle.");
  }

  // Export functions to global scope for HTML onclick attributes
  window.openModal = openModal; // Makes openModal callable directly from HTML.
  window.closeModal = closeModal; // Makes closeModal callable directly from HTML.

  // Handle login form submission
  document.getElementById("loginForm")?.addEventListener("submit", function (e) { // Optional chaining in case form doesn't exist.
      e.preventDefault(); // Prevent default browser form submission.

      const formData = new FormData(this); // Collect form data.
      const loginUrl = this.getAttribute('data-login-url'); // Get login endpoint URL from form's data attribute.

      if (!loginUrl) { // Guard clause if the login URL is not set.
          console.error("Login URL not found on the form.");
          alert("Login configuration error. Please contact support.");
          return;
      }

      fetch(loginUrl, {
          method: "POST",
          body: formData,
          headers: { // CSRF token is crucial for Django POST requests.
              "X-CSRFToken": document.querySelector("[name=csrfmiddlewaretoken]").value,
          },
      })
          .then((response) => {
              if (!response.ok) { // Check for HTTP errors (e.g., 400, 401, 403, 500).
                  // Attempt to parse error from JSON response if possible, otherwise generic error.
                  return response.json().catch(() => { // If error response is not JSON.
                      throw new Error(`HTTP error ${response.status}. Login failed.`);
                  }).then(errorData => {
                      throw new Error(errorData.error || "Login failed. Check your credentials.");
                  });
              }
              return response.json(); // Parse successful JSON response.
          })
          .then((data) => {
              if (data.success) {
                  closeModal();

                  // Redirect based on user role
                  if (data.is_moderator) {
                      window.location.href = "/moderator-dashboard/"; // Redirect moderator.
                  } else {
                      window.location.href = data.redirect_url || "/"; // Redirect regular user or to specified URL.
                  }

                  updateUIAfterLogin(data.username, data.profile_picture_url || data.profile_picture); // Update UI with user info.
              } else {
                  // Use the new showNotification function for errors
                  showNotification(data.error || "Login failed. Please try again.", "error");
              }
          })
          .catch((error) => {
              console.error("Error during login:", error);
              // Use the new showNotification function for errors
              showNotification(error.message || "An error occurred during login. Please try again.", "error");
          });
  });

  // Handle signup form submission
  document.getElementById("signupForm1")?.addEventListener("submit", function (e) { // Optional chaining.
      e.preventDefault();

      const formData = new FormData(this);
      const signupUrl = this.getAttribute('data-signup-url'); // Get signup endpoint URL.

      if (!signupUrl) { // Guard clause if the signup URL is not set.
          console.error("Signup URL not found on the form.");
          alert("Signup configuration error. Please contact support.");
          return;
      }

      fetch(signupUrl, {
          method: "POST",
          body: formData,
          headers: {
              "X-CSRFToken": document.querySelector("[name=csrfmiddlewaretoken]").value,
          },
      })
          .then((response) => {
              if (!response.ok) { // Check for HTTP errors.
                  return response.json().catch(() => {
                      throw new Error(`HTTP error ${response.status}. Signup failed.`);
                  }).then(errorData => {
                      throw new Error(errorData.error || "Signup failed. Check your input.");
                  });
              }
              return response.json();
          })
          .then((data) => {
              if (data.success) {
                  closeModal();
                  // Use the new showNotification function for success
                  showNotification("Signup successful! Please log in.", "success");
                  showLogin(); // Switch to the login form.
              } else {
                  // Use the new showNotification function for errors
                  showNotification(data.error || "Signup failed. Please try again.", "error");
              }
          })
          .catch((error) => {
              console.error("Error during signup:", error);
               // Use the new showNotification function for errors
              showNotification(error.message || "An error occurred during signup. Please try again.", "error");
          });
  });

  // Function to dynamically update the UI after login
  function updateUIAfterLogin(username, profilePictureUrl) {
      // Hide the login button
      const loginBtn = document.querySelector('.login-btn'); // Selects the main login button in the header.
      if (loginBtn) {
          loginBtn.style.display = 'none'; // Makes the login button disappear.
      }

      // Remove any existing profile menu to prevent duplicates
      const existingProfileMenu = document.querySelector(".profile-menu");
      if (existingProfileMenu) {
          existingProfileMenu.remove();
      }

      // Create a profile menu container
      const profileMenu = document.createElement("div");
      profileMenu.classList.add("profile-menu"); // Adds class for styling.

      // Create welcome text
      const welcomeText = document.createElement("p");
      welcomeText.textContent = `Welcome, ${username}!`; // Personalized welcome message.

      // Create profile link with image
      const profileLink = document.createElement("a");
      profileLink.href = "/profile/"; // Link to the user's profile page.

      const profileImage = document.createElement("img");
      profileImage.src = profilePictureUrl || "/static/images/default-profile.png"; // User's avatar or default.
      profileImage.alt = "Profile";
      profileImage.classList.add("profile-icon"); // Class for styling the icon.
      profileImage.style.width = "40px"; // Inline styles for quick setup.
      profileImage.style.height = "40px";
      profileImage.style.borderRadius = "50%"; // Circular image.

      profileLink.appendChild(profileImage); // Add image to the link.

      // Create logout button
      const logoutBtn = document.createElement("a");
      logoutBtn.href = "/logout/"; // Link to the logout endpoint.
      logoutBtn.classList.add("logout-btn"); // Class for styling.
      logoutBtn.textContent = "Logout";

      // Append elements to profile menu
      profileMenu.appendChild(welcomeText);
      profileMenu.appendChild(profileLink);
      profileMenu.appendChild(logoutBtn);

      // Append profile menu to header
      const header = document.querySelector("header"); // Assumes there's a single <header> element.
      if (header) {
          header.appendChild(profileMenu); // Add the new profile menu to the page header.
      } else {
          console.error("Header element not found for appending profile menu.");
      }
  }

  // ** Actual Notification Function **
  function showNotification(message, type = "info") { // type can be "info", "success", "error", "warning"
      const notificationArea = document.getElementById('notification-area');
      if (!notificationArea) {
          console.error("Notification area not found. Please add an element with id='notification-area'.");
          alert(message); // Fallback to alert if notification area is missing
          return;
      }

      const note = document.createElement('div');
      note.textContent = message;

      // Basic styling - consider moving to a CSS file for more complex styling
      note.style.padding = '10px 20px';
      note.style.margin = '10px';
      note.style.borderRadius = '5px';
      note.style.color = 'white';
      note.style.fontFamily = 'Arial, sans-serif';
      note.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
      note.style.opacity = '0.9';
      note.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out'; // For fade-out effect
      note.style.transform = 'translateY(-20px)'; // Initial position for slide-in effect


      switch (type) {
          case 'success':
              note.style.backgroundColor = '#28a745'; // Green
              break;
          case 'error':
              note.style.backgroundColor = '#dc3545'; // Red
              break;
          case 'warning':
              note.style.backgroundColor = '#ffc107'; // Yellow
              note.style.color = 'black'; // Ensure text is readable on yellow
              break;
          case 'info':
          default:
              note.style.backgroundColor = '#17a2b8'; // Blue
              break;
      }

      notificationArea.appendChild(note);

      // Trigger slide-in animation
      setTimeout(() => {
          note.style.opacity = '1';
          note.style.transform = 'translateY(0)';
      }, 10); // Short delay to allow CSS transition to apply

      // Auto-remove after 5 seconds
      setTimeout(() => {
          note.style.opacity = '0';
          note.style.transform = 'translateY(-20px)';
          setTimeout(() => {
              if (note.parentNode === notificationArea) { // Check if still child before removing
                   notificationArea.removeChild(note);
              }
          }, 500); // Wait for fade-out animation to complete
      }, 5000);
  }
}); 
/* ------------------------------------------- moderator ------------------------------------------------*/

document.addEventListener("DOMContentLoaded", () => { // Separate DOMContentLoaded for moderator script.
  console.log("DOM loaded - initializing moderation script");
  
  // Get CSRF token once for reuse in multiple fetch calls.
  const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]")?.value; // Optional chaining.
  console.log("CSRF Token available:", !!csrfToken); // Logs true if token found, false otherwise.

  // Centralized event delegation for buttons and forms within the document body.
  document.body.addEventListener("click", function (event) {
      // Handle thumbs-up, thumbs-down, and flag actions using matches for efficient delegation.
      if (event.target.matches(".thumbs-up, .thumbs-down, .flag-review")) {
          handleReviewAction(event.target); // Call handler for these specific actions.
      }

      // Handle other actions like dropdown buttons (example, can be expanded).
      if (event.target.matches(".more-btn, .dropdown-btn")) {
          console.log("Other button clicked (e.g., dropdown):", event.target);
          // Add specific logic for these buttons here if needed.
      }
  });

  // Handle thumbs up/down and flag actions
  function handleReviewAction(button) {
      const reviewId = button.dataset.id; // Get review ID from data-id attribute.
      const action = button.classList.contains("thumbs-up") // Determine action based on button's class.
          ? "thumbs_up"
          : button.classList.contains("thumbs-down")
          ? "thumbs_down"
          : "flag"; // Default to "flag" if not thumbs up/down.

      console.log(`Handling ${action} for review ${reviewId}`);
  
      if (!csrfToken) { // Check if CSRF token is available before fetching.
          console.error("CSRF token not found. Action aborted.");
          showNotification("⚠️ Action failed due to a configuration error.", "error"); // Use new notification
          return;
      }

      fetch("/review-action/", { // API endpoint for review actions.
          method: "POST",
          headers: {
              "Content-Type": "application/json", // Sending JSON data.
              "X-CSRFToken": csrfToken,
          },
          body: JSON.stringify({ review_id: reviewId, action: action }), // Send review ID and action.
      })
          .then((response) => response.json()) // Expect JSON response.
          .then((data) => {
              if (data.success) {
                  const thumbsUpButton = document.querySelector(`.thumbs-up[data-id="${reviewId}"]`);
                  const thumbsDownButton = document.querySelector(`.thumbs-down[data-id="${reviewId}"]`);
  
                  if (action === "thumbs_up" || action === "thumbs_down") { // Update counts for like/dislike.
                      if (thumbsUpButton) thumbsUpButton.textContent = `👍 ${data.thumbs_up}`;
                      if (thumbsDownButton) thumbsDownButton.textContent = `👎 ${data.thumbs_down}`;
                      showNotification("Vote recorded!", "success"); // Use new notification
                  } else if (action === "flag") {
                      button.textContent = "🚩 Flagged"; // Update flag button text.
                      button.disabled = true; // Disable button after flagging.
                      showNotification("Review flagged successfully! Assigning moderator...", "success"); // Use new notification
  
                      assignReviewToModerator(reviewId); // Trigger assignment to a moderator.
                  }
              } else {
                  showNotification(data.error || "⚠️ Action failed. Please try again.", "error"); // Use new notification
              }
          })
          .catch((error) => {
              console.error("Error in handleReviewAction:", error);
              showNotification("⚠️ An error occurred. Please try again.", "error"); // Use new notification
          });
  }
  
  // Function to assign review to moderator
  function assignReviewToModerator(reviewId) {
      if (!csrfToken) { // Ensure CSRF token is available.
          console.error("CSRF token not found. Assignment aborted.");
          showNotification("⚠️ Assignment failed due to a configuration error.", "error"); // Use new notification
          return;
      }
      fetch("/assign-flagged-review/", { // API endpoint for assigning flagged reviews.
          method: "POST",
          headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": csrfToken,
          },
          body: JSON.stringify({ review_id: reviewId }), // Send review ID.
      })
          .then((response) => response.json())
          .then((data) => {
              if (data.success) {
                  showNotification(`Review assigned to moderator: ${data.moderator}`, "success"); // Use new notification
              } else {
                  showNotification(data.error || "⚠️ Failed to assign moderator.", "error"); // Use new notification
              }
          })
          .catch((error) => {
              console.error("Error in assignReviewToModerator:", error);
              showNotification("⚠️ An error occurred while assigning a moderator.", "error"); // Use new notification
          });
  }
})

/* ------------------------------------------- COUNTRY REVIEWS ------------------------------------------------*/

// JavaScript for country reviews carousel and interactions
document.addEventListener('DOMContentLoaded', function() { // Separate DOMContentLoaded for country reviews.
  // Set up review carousel navigation
  const carousel = document.querySelector('.reviews-carousel'); // Country reviews carousel container.
  const prevButton = document.querySelector('.carousel-control.prev'); // Previous button.
  const nextButton = document.querySelector('.carousel-control.next'); // Next button.
  
  if (carousel && prevButton && nextButton) { // Check if all carousel elements are present.
      // Calculate the scroll amount (fixed or based on card width + gap).
      const scrollAmount = 370; // Fixed scroll amount. Consider making this dynamic.
      
      nextButton.addEventListener('click', function() {
          carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' }); // Scroll right.
      });
      
      prevButton.addEventListener('click', function() {
          carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' }); // Scroll left.
      });
  }
  
  // Set up review action buttons (thumbs up, thumbs down, flag)
  function setupReviewActions() {
      // Get CSRF token (utility function to read cookie).
      function getCookie(name) {
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
      const csrfToken = getCookie('csrftoken'); // Fetch CSRF token for POST requests.

      if (!csrfToken) { // If CSRF token is missing, log an error.
          console.error("CSRF token not found for country review actions.");
          // Optionally, disable action buttons or show a general error to the user.
      }
      
      // Handle thumbs up/down
      document.querySelectorAll('.action-btn.thumbs-up, .action-btn.thumbs-down').forEach(button => {
          button.addEventListener('click', function(e) {
              e.preventDefault(); // Prevent default link behavior if buttons are <a> tags.
              const reviewId = this.dataset.id; // Review ID from data-id attribute.
              const action = this.classList.contains('thumbs-up') ? 'thumbs_up' : 'thumbs_down';
              
              if (!csrfToken) { // Abort if no CSRF token.
                  // Use showNotification if available globally, otherwise alert.
                  if (typeof showNotification === "function") {
                      showNotification("Action cannot be performed. Missing security token.", "error");
                  } else {
                      alert("Action cannot be performed. Missing security token.");
                  }
                  return;
              }

              fetch("/review-action/", { // Endpoint for review interactions.
                  method: "POST",
                  headers: {
                      "Content-Type": "application/json",
                      "X-CSRFToken": csrfToken,
                  },
                  body: JSON.stringify({ review_id: reviewId, action: action }),
              })
              .then(response => response.json())
              .then(data => {
                  if (data.success) {
                      // Update the UI for both thumbs-up and thumbs-down buttons.
                      const thumbsUpBtn = document.querySelector(`.thumbs-up[data-id="${reviewId}"]`);
                      const thumbsDownBtn = document.querySelector(`.thumbs-down[data-id="${reviewId}"]`);
                      
                      if (thumbsUpBtn) { // Update thumbs-up button display.
                          thumbsUpBtn.innerHTML = `<i class="ri-thumb-up-${data.user_action === 'thumbs_up' ? 'fill' : 'line'}"></i> ${data.thumbs_up}`;
                          thumbsUpBtn.classList.toggle('active', data.user_action === 'thumbs_up');
                      }
                      
                      if (thumbsDownBtn) { // Update thumbs-down button display.
                          thumbsDownBtn.innerHTML = `<i class="ri-thumb-down-${data.user_action === 'thumbs_down' ? 'fill' : 'line'}"></i> ${data.thumbs_down}`;
                          thumbsDownBtn.classList.toggle('active', data.user_action === 'thumbs_down');
                      }
                       if (typeof showNotification === "function") showNotification("Vote updated!", "success");

                  } else {
                       if (typeof showNotification === "function") {
                          showNotification(data.error || "Action failed. Please try again.", "error");
                      } else {
                          alert(data.error || "Action failed. Please try again.");
                      }
                  }
              })
              .catch(error => {
                  console.error("Error during review action:", error);
                  if (typeof showNotification === "function") {
                      showNotification("An error occurred. Please try again.", "error");
                  } else {
                      alert("An error occurred. Please try again.");
                  }
              });
          });
      });
      
      // Handle flag button
      document.querySelectorAll('.action-btn.flag-review').forEach(button => {
          button.addEventListener('click', function(e) {
              e.preventDefault();
              const reviewId = this.dataset.id;
              
              const reason = prompt("Please provide a reason for flagging this review:"); // Prompt user for reason.
              if (!reason) return; // User cancelled or entered no reason.
              
              if (!csrfToken) { // Abort if no CSRF token.
                   if (typeof showNotification === "function") {
                      showNotification("Action cannot be performed. Missing security token.", "error");
                  } else {
                      alert("Action cannot be performed. Missing security token.");
                  }
                  return;
              }

              fetch("/flag-review/", { // Endpoint for flagging a review.
                  method: "POST",
                  headers: {
                      "Content-Type": "application/json",
                      "X-CSRFToken": csrfToken,
                  },
                  body: JSON.stringify({ 
                      review_id: reviewId,
                      reason: reason // Include the reason in the request.
                  }),
              })
              .then(response => response.json())
              .then(data => {
                  if (data.success) {
                      // Update UI for the flag button.
                      this.innerHTML = `<i class="ri-flag-fill"></i>`; // Change icon to filled.
                      this.classList.add('active'); // Mark as active/flagged.
                      this.disabled = true; // Disable further flagging.
                      if (typeof showNotification === "function") {
                          showNotification("Review flagged successfully. A moderator will review it shortly.", "success");
                      } else {
                           alert("Review flagged successfully. A moderator will review it shortly.");
                      }
                      
                      if (data.moderator) { // If server responds with assigned moderator.
                          console.log(`Review assigned to moderator: ${data.moderator}`);
                      }
                  } else {
                      if (typeof showNotification === "function") {
                          showNotification(data.error || "Flagging failed. Please try again.", "error");
                      } else {
                          alert(data.error || "Flagging failed. Please try again.");
                      }
                  }
              })
              .catch(error => {
                  console.error("Error during flag action:", error);
                  if (typeof showNotification === "function") {
                      showNotification("An error occurred. Please try again.", "error");
                  } else {
                      alert("An error occurred. Please try again.");
                  }
              });
          });
      });
  }
  
  // Call setup function for review actions
  setupReviewActions();
});

document.addEventListener('DOMContentLoaded', function() { // Separate DOMContentLoaded for rating bars.
  
  // Get percentage values from data attributes for rating bars.
  const excellentBar = document.querySelector('.excellent-bar');
  const veryGoodBar = document.querySelector('.very-good-bar');
  const averageBar = document.querySelector('.average-bar');
  const poorBar = document.querySelector('.poor-bar');
  const terribleBar = document.querySelector('.terrible-bar');
  
  // Set inline styles programmatically to reflect rating percentages.
  // This allows dynamic widths based on data passed from the backend.
  if (excellentBar) excellentBar.style.width = excellentBar.getAttribute('data-percent') + '%';
  if (veryGoodBar) veryGoodBar.style.width = veryGoodBar.getAttribute('data-percent') + '%';
  if (averageBar) averageBar.style.width = averageBar.getAttribute('data-percent') + '%';
  if (poorBar) poorBar.style.width = poorBar.getAttribute('data-percent') + '%';
  if (terribleBar) terribleBar.style.width = terribleBar.getAttribute('data-percent') + '%';
});
