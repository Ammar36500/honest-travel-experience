// Ensure all code runs after DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
    /* ------------------------------------------- Login/Signup Modal ------------------------------------------------*/
    // Select the modal and its related components
    const container = document.querySelector('.modal-content .container');
    const signupButton = document.querySelector('.signup-section header');
    const loginButton = document.querySelector('.login-section header');

    // Open modal and default to login
    function openModal() {
        const modal = document.getElementById("loginModal");
        if (modal) {
            modal.style.display = "block";
            showLogin(); // Default to login form
        } else {
            console.error("Modal element with ID 'loginModal' not found.");
        }
    }

    // Close modal
    function closeModal() {
        const modal = document.getElementById("loginModal");
        if (modal) {
            modal.style.display = "none";
        } else {
            console.error("Modal element with ID 'loginModal' not found.");
        }
    }

    // Ensure `showLogin` is defined before calling it
    function showLogin() {
        console.log("Login form displayed.");
    }

    // Toggle between login and signup containers
    if (loginButton && signupButton && container) {
        loginButton.addEventListener('click', () => {
            container.classList.add('active');
        });

        signupButton.addEventListener('click', () => {
            container.classList.remove('active');
        });
    } else {
        console.warn("One or more elements (container, loginButton, signupButton) are missing.");
    }

    // Export functions to global scope for HTML onclick attributes
    window.openModal = openModal;
    window.closeModal = closeModal;

    // Handle login form submission
    document.getElementById("loginForm")?.addEventListener("submit", function (e) {
        e.preventDefault(); // Prevent default form submission

        const formData = new FormData(this);
        const loginUrl = this.getAttribute('data-login-url'); // Fetch the login URL

        fetch(loginUrl, {
            method: "POST",
            body: formData,
            headers: {
                "X-CSRFToken": document.querySelector("[name=csrfmiddlewaretoken]").value,
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Login failed. Check your credentials.");
                }
                return response.json();
            })
            .then((data) => {
                if (data.success) {
                    closeModal(); // Close the login modal

                    // Redirect based on user role
                    if (data.is_moderator) {
                        window.location.href = "/moderator-dashboard/";
                    } else {
                        window.location.href = "/";
                    }

                    updateUIAfterLogin(data.username, data.profile_picture); // Update the UI dynamically
                } else {
                    alert(data.error || "Login failed. Please try again.");
                }
            })
            .catch((error) => {
                console.error("Error during login:", error);
                alert("An error occurred during login. Please try again.");
            });
    });

    // Handle signup form submission
    document.getElementById("signupForm1")?.addEventListener("submit", function (e) {
        e.preventDefault(); // Prevent default form submission

        const formData = new FormData(this);
        const signupUrl = this.getAttribute('data-signup-url'); // Fetch the signup URL

        fetch(signupUrl, {
            method: "POST",
            body: formData,
            headers: {
                "X-CSRFToken": document.querySelector("[name=csrfmiddlewaretoken]").value,
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Signup failed. Check your input.");
                }
                return response.json();
            })
            .then((data) => {
                if (data.success) {
                    closeModal(); // Close the signup modal
                    alert("Signup successful! Please log in.");
                    showLogin(); // Switch to the login form
                } else {
                    alert(data.error || "Signup failed. Please try again.");
                }
            })
            .catch((error) => {
                console.error("Error during signup:", error);
                alert("An error occurred during signup. Please try again.");
            });
    });

    // Function to dynamically update the UI after login
    function updateUIAfterLogin(username, profilePictureUrl) {
        // Hide the login button
        const loginBtn = document.querySelector('.login-btn');
        if (loginBtn) {
            loginBtn.style.display = 'none';
        }

        // Remove existing profile menu if it exists
        const existingProfileMenu = document.querySelector(".profile-menu");
        if (existingProfileMenu) {
            existingProfileMenu.remove();
        }

        // Create a profile menu container
        const profileMenu = document.createElement("div");
        profileMenu.classList.add("profile-menu");

        // Create welcome text
        const welcomeText = document.createElement("p");
        welcomeText.textContent = `Welcome, ${username}!`;

        // Create profile link with image
        const profileLink = document.createElement("a");
        profileLink.href = "/profile/";

        const profileImage = document.createElement("img");
        profileImage.src = profilePictureUrl || "/static/images/default-profile.png";
        profileImage.alt = "Profile";
        profileImage.classList.add("profile-icon");
        profileImage.style.width = "40px";
        profileImage.style.height = "40px";
        profileImage.style.borderRadius = "50%";

        profileLink.appendChild(profileImage);

        // Create logout button
        const logoutBtn = document.createElement("a");
        logoutBtn.href = "/logout/";
        logoutBtn.classList.add("logout-btn");
        logoutBtn.textContent = "Logout";

        // Append elements to profile menu
        profileMenu.appendChild(welcomeText);
        profileMenu.appendChild(profileLink);
        profileMenu.appendChild(logoutBtn);

        // Append profile menu to header
        const header = document.querySelector("header");
        if (header) {
            header.appendChild(profileMenu);
        } else {
            console.error("Header element not found.");
        }
    }

   
    /* ------------------------------------------- Dynamic Search ------------------------------------------------*/

    const searchInput = document.querySelector("#searchInput");
    const resultsContainer = document.getElementById("searchResults");

    if (searchInput && resultsContainer) {
        searchInput.addEventListener("input", function () {
            const query = this.value.trim();
            console.log("User typed:", query);

            // Clear the dropdown if the query is too short
            if (query.length < 2) {
                resultsContainer.innerHTML = ""; // Clear previous results
                resultsContainer.style.display = "none"; // Hide dropdown
                return;
            }

            // Fetch results from the API
            fetch(`/api/places?search=${query}`)
                .then((response) => response.json())
                .then((data) => {
                    console.log("API Response:", data);

                    resultsContainer.innerHTML = ""; // Clear previous results

                    if (data.results && data.results.length > 0) {
                        resultsContainer.style.display = "block"; // Show dropdown
                        data.results.forEach((place) => {
                            const resultItem = document.createElement("div");
                            resultItem.className = "search-result-item";
                            resultItem.innerHTML = `
                                <strong>${place.name}</strong><br>
                                <span>${place.location}</span>
                            `;
                            resultItem.addEventListener("click", () => {
                                console.log(`Redirecting to: /submit-review/${place.id}/`);
                                window.location.href = `/submit-review/${place.id}/`; // Redirect to review submission page
                            });
                            resultsContainer.appendChild(resultItem);
                        });
                    } else {
                        resultsContainer.innerHTML = "<p>No places found.</p>";
                        resultsContainer.style.display = "block"; // Show "No places found"
                    }
                })
                .catch((error) => {
                    console.error("Error fetching search results:", error);
                });
        });
    }

    /* ------------------------------------------- Review Submission ------------------------------------------------*/

    document.addEventListener("DOMContentLoaded", function () {
        const reviewForm = document.getElementById("reviewForm");
    
        if (reviewForm) {
            reviewForm.addEventListener("submit", function (e) {
                e.preventDefault();
                const formData = new FormData(this);
    
                fetch(this.action, {
                    method: "POST",
                    body: formData,
                    headers: {
                        "X-CSRFToken": document.querySelector("[name=csrfmiddlewaretoken]").value,
                    },
                })
                .then((response) => response.json())
                .then((data) => {
                    if (data.success) {
                        alert(data.message);
                        location.reload(); // Reload the page to show the review
                    } else {
                        alert(data.error || "Submission failed.");
                    }
                })
                .catch((error) => {
                    console.error("Error:", error);
                    alert("An error occurred while submitting the review.");
                });
            });
        } else {
            console.warn("Element with ID 'reviewForm' not found.");
        }
    });
    
    

    /* ------------------------------------------- Profile Menu ------------------------------------------------*/

    const isAuthenticated = "{{ user.is_authenticated|yesno:'true,false' }}";
    if (isAuthenticated === "true") {
        const username = "{{ user.username }}"; // Ensure this is rendered properly
        const profilePictureUrl = "{{ user.profile.profile_image.url|default:'/static/images/default-profile.png' }}";

        const header = document.querySelector("header");
        if (header) {
            const profileMenu = `
                <div class="profile-menu">
                    <p>Welcome, ${username}!</p>
                    <a href="{% url 'profile' %}">
                        <img src="${profilePictureUrl}" alt="Profile" class="profile-icon" style="width: 40px; height: 40px; border-radius: 50%;">
                    </a>
                    <a href="{% url 'logout' %}" class="logout-btn">Logout</a>
                </div>`;
            header.insertAdjacentHTML('beforeend', profileMenu);
        }
    }
});


/* ------------------------------------------- moderator ------------------------------------------------*/

document.addEventListener("DOMContentLoaded", () => {
    const csrfToken = document.querySelector("[name=csrfmiddlewaretoken]")?.value;

    // Centralized event delegation for buttons and forms
    document.body.addEventListener("click", function (event) {
        // Handle thumbs-up, thumbs-down, and flag actions
        if (event.target.matches(".thumbs-up, .thumbs-down, .flag-review")) {
            handleReviewAction(event.target);
        }

        // Handle approve/reject actions
        if (event.target.matches(".approve-btn, .reject-btn")) {
            handleModerationAction(event.target);
        }
    });

    document.body.addEventListener("submit", function (event) {
        // Handle form submission for moderation actions
        if (event.target.matches(".moderation-form")) {
            event.preventDefault(); // Prevent default form submission
            handleFormSubmission(event.target);
        }
    });

    function handleReviewAction(button) {
        const reviewId = button.dataset.id;
        const action = button.classList.contains("thumbs-up")
            ? "thumbs_up"
            : button.classList.contains("thumbs-down")
            ? "thumbs_down"
            : "flag";

        fetch("/review-action/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrfToken,
            },
            body: JSON.stringify({ review_id: reviewId, action: action }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    const thumbsUpButton = document.querySelector(`.thumbs-up[data-id="${reviewId}"]`);
                    const thumbsDownButton = document.querySelector(`.thumbs-down[data-id="${reviewId}"]`);

                    if (action === "thumbs_up") {
                        thumbsUpButton.textContent = `👍 ${data.thumbs_up}`;
                        thumbsDownButton.textContent = `👎 ${data.thumbs_down}`;
                    } else if (action === "thumbs_down") {
                        thumbsUpButton.textContent = `👍 ${data.thumbs_up}`;
                        thumbsDownButton.textContent = `👎 ${data.thumbs_down}`;
                    } else if (action === "flag") {
                        button.textContent = "🚩 Flagged";
                        button.disabled = true; // Disable flag button after flagging
                        alert("Review flagged successfully.");
                    }
                } else {
                    alert(data.error || "Action failed. Please try again.");
                }
            })
            .catch((error) => {
                console.error("Error:", error);
                alert("An error occurred. Please try again.");
            });
    }

    // Handle approve/reject actions for flagged reviews
    function handleModerationAction(button) {
        const reviewId = button.dataset.id;
        const action = button.classList.contains("approve-btn") ? "approve" : "reject";

        fetch(`/moderate-review/${reviewId}/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-CSRFToken": csrfToken,
            },
            body: `action=${action}`,
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    const reviewElement = document.getElementById(`review-${reviewId}`);
                    if (reviewElement) {
                        reviewElement.remove();
                    }

                    // If no reviews are left, show the "No flagged reviews" message dynamically
                    if (!document.querySelector(".review-item")) {
                        document.querySelector("main").innerHTML =
                            '<p class="no-reviews">No flagged reviews to moderate!</p>';
                    }

                    alert(data.message);
                } else {
                    alert(data.error || "Failed to moderate the review.");
                }
            })
            .catch((error) => {
                console.error("Error during moderation:", error);
                alert("An error occurred. Please try again.");
            });
    }

    // Handle moderation form submission (backup method)
    function handleFormSubmission(form) {
        const action = new FormData(form).get("action");
        const reviewId = form.dataset.id;

        fetch(`/moderate-review/${reviewId}/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-CSRFToken": csrfToken,
            },
            body: `action=${action}`,
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    const reviewElement = document.getElementById(`review-${reviewId}`);
                    if (reviewElement) {
                        reviewElement.remove();
                    }

                    // If no reviews are left, show the "No flagged reviews" message dynamically
                    if (!document.querySelector(".review-item")) {
                        document.querySelector("main").innerHTML =
                            '<p class="no-reviews">No flagged reviews to moderate!</p>';
                    }

                    alert(data.message);
                } else {
                    alert(data.error || "Failed to process the moderation.");
                }
            })
            .catch((error) => {
                console.error("Error during form submission:", error);
                alert("An error occurred. Please try again.");
            });
    }
});
