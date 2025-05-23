// Ensure all code runs after the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded - initializing moderator dashboard script");

    // --- Helper: Get CSRF Token ---
    // Retrieves CSRF token from cookies, essential for Django POST requests.
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
    const csrfToken = getCookie('csrftoken'); // Store token for reuse.
    if (!csrfToken) {
        console.error("CSRF Token not found. POST requests (like delete) might fail.");
        // Consider showing a persistent error to the user if CSRF is critical for page functionality.
    }

    // --- Helper: Show Notification ---
    // Dynamically creates and displays a short-lived notification message on the page.
    function showNotification(message, type) { // type can be 'success', 'error', or 'info' (default).
        console.log(`[${type}] ${message}`); // Fallback logging.
        const container = document.getElementById('notification-container') || // Get existing container or create one.
            (() => {
                const div = document.createElement('div');
                div.id = 'notification-container';
                // Basic fixed positioning for the notification container.
                div.style.position = 'fixed'; div.style.top = '20px'; div.style.right = '20px'; div.style.zIndex = '9999';
                document.body.appendChild(div); return div;
            })();

        const notification = document.createElement('div');
        notification.className = `dynamic-notification notification-${type}`; // Base class + type-specific class.
        notification.textContent = message;
        // Basic inline styling for the notification appearance.
        notification.style.padding = '12px 20px'; notification.style.marginBottom = '10px'; notification.style.borderRadius = '4px';
        notification.style.color = 'white'; notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        notification.style.opacity = '0'; notification.style.transition = 'opacity 0.3s ease-in-out'; // For fade effect.
        if (type === 'success') { notification.style.backgroundColor = '#4CAF50'; } // Green for success.
        else if (type === 'error') { notification.style.backgroundColor = '#F44336'; } // Red for error.
        else { notification.style.backgroundColor = '#2196F3'; } // Blue for Info or default.

        container.appendChild(notification);

        // Fade in animation.
        setTimeout(() => { notification.style.opacity = '1'; }, 10); // Slight delay to trigger transition.

        // Remove after 5 seconds with a fade-out effect.
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => { if (notification.parentNode) { notification.parentNode.removeChild(notification); } }, 300); // Remove from DOM after fade out.
        }, 5000);
    }

    // --- Chart.js Check ---
    // Verifies if Chart.js library is loaded before attempting to render charts.
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded! Dashboard charts will not render.');
        showNotification('Error: Chart library not loaded. Charts unavailable.', 'error');
        // Optionally disable chart sections or show placeholder messages in the HTML here.
    } else {
        console.log('Chart.js version:', Chart.version); // Log detected Chart.js version.

        // --- Review Trends Chart ---
        const reviewTrendsCtx = document.getElementById('reviewTrendsChart'); // Canvas element for the trends chart.
        let reviewTrendsChart; // Variable to store the chart instance for updates/destruction.

        // Function to update chart with new data or create it if it doesn't exist.
        function updateTrendsChart(data) {
            if (!reviewTrendsCtx) return; // Do nothing if canvas element isn't found.
            if (reviewTrendsChart) { reviewTrendsChart.destroy(); } // Destroy existing chart instance to prevent conflicts.

            reviewTrendsChart = new Chart(reviewTrendsCtx, {
                type: 'line', // Line chart for trends.
                data: {
                    labels: data.labels, // X-axis labels (e.g., dates, months).
                    datasets: [{
                        label: 'Total Reviews',
                        data: data.allReviews, // Data points for total reviews.
                        borderColor: '#3490dc', backgroundColor: 'rgba(52, 144, 220, 0.1)', // Styling.
                        borderWidth: 2, tension: 0.4, fill: true // Line styling options.
                    }, {
                        label: 'Approved',
                        data: data.approvedReviews, // Data points for approved reviews.
                        borderColor: '#38c172', backgroundColor: 'rgba(56, 193, 114, 0.1)',
                        borderWidth: 2, tension: 0.4, fill: true
                    }, {
                        label: 'Flagged',
                        data: data.flaggedReviews, // Data points for flagged reviews.
                        borderColor: '#e3342f', backgroundColor: 'rgba(227, 52, 47, 0.1)',
                        borderWidth: 2, tension: 0.4, fill: true
                    }]
                },
                options: { // Chart configuration options.
                    responsive: true, maintainAspectRatio: false, // Make chart responsive.
                    plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } }, // Legend and tooltip settings.
                    scales: { // Axis configurations.
                        y: { beginAtZero: true, grid: { display: true, color: 'rgba(0,0,0,0.1)' },
                             ticks: { callback: function(value) { return value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value; } } }, // Y-axis starts at zero, formats large numbers.
                        x: { grid: { display: false } } // X-axis grid lines hidden.
                    },
                    elements: { point: { radius: 3, hoverRadius: 5 } }, // Point styling.
                    animation: { duration: 1000, easing: 'easeOutQuart' } // Animation settings.
                }
            });
        }

        // Function to generate fallback trend data if API call fails.
        function generateFallbackTrendData(period = 'daily') { // Default period is daily.
            // Basic fallback structure - provides some data for chart rendering.
            let labels = Array.from({length: 14}, (_, i) => `Day ${i+1}`); // Example: 14 days.
            let all = Array.from({length: 14}, () => Math.floor(Math.random() * 50) + 10); // Random data.
            let approved = all.map(v => Math.floor(v * (0.7 + Math.random() * 0.2))); // Derived from 'all'.
            let flagged = all.map(v => Math.floor(v * (0.05 + Math.random() * 0.1))); // Derived from 'all'.
            return { labels: labels, allReviews: all, approvedReviews: approved, flaggedReviews: flagged };
        }

        // Fetch and initialize trends chart data.
        if (reviewTrendsCtx) {
            fetch('/api/dashboard-trends/?period=daily') // API endpoint for daily trend data.
                .then(response => response.ok ? response.json() : Promise.reject('Network response was not ok')) // Check for successful response.
                .then(data => { updateTrendsChart(data); }) // Update chart with fetched data.
                .catch(error => {
                    console.error('Error fetching dashboard trends:', error);
                    updateTrendsChart(generateFallbackTrendData()); // Use fallback data on API error.
                    showNotification('Could not load trend data. Displaying sample data.', 'error');
                });
        } else {
            console.error("Review Trends Chart canvas not found. Chart cannot be initialized.");
        }

        // --- Review Distribution Chart ---
        const reviewDistributionCtx = document.getElementById('reviewDistributionChart'); // Canvas for distribution chart.
        let distributionChart; // Variable for the distribution chart instance.

        function updateDistributionChart(data) { // Updates or creates the distribution chart.
            if (!reviewDistributionCtx) return; // Exit if canvas not found.
            if (distributionChart) { distributionChart.destroy(); } // Destroy old instance.

            distributionChart = new Chart(reviewDistributionCtx, {
                type: 'doughnut', // Doughnut chart type.
                data: {
                    labels: ['Approved', 'Pending', 'Rejected', 'Flagged'], // Segments of the doughnut.
                    datasets: [{
                        data: [ data.approved, data.pending, data.rejected, data.flagged ], // Data values for each segment.
                        backgroundColor: [ '#3490dc', '#a0e0d1', '#ffe082', '#f8a5a3' ], // Colors for segments.
                        borderWidth: 0 // No border for doughnut segments.
                    }]
                },
                options: { // Chart configuration.
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, // Custom legend might be handled in HTML.
                               tooltip: { callbacks: { label: function(context) { // Custom tooltip label.
                                   const label = context.label || ''; const value = context.raw || 0;
                                   const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                   const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                   return `${label}: ${value} (${percentage}%)`; } } } }, // Shows label, value, and percentage.
                    cutout: '60%', animation: { animateScale: true, animateRotate: true } // Doughnut cutout and animation.
                }
            });
        }

        // Fetch and initialize distribution chart data.
        if (reviewDistributionCtx) {
            fetch('/api/review-distribution/') // API endpoint for distribution data.
                .then(response => response.ok ? response.json() : Promise.reject('Network response was not ok'))
                .then(realData => {
                    console.log('Received real distribution data:', realData);
                    updateDistributionChart(realData); // Update with fetched data.
                })
                .catch(error => {
                    console.error('Error fetching distribution data:', error);
                    // Use placeholder data on API error.
                    updateDistributionChart({ approved: 65, pending: 25, rejected: 10, flagged: 15 });
                    showNotification('Could not load distribution data. Displaying sample data.', 'error');
                });
        } else {
            console.error("Review Distribution Chart canvas not found. Chart cannot be initialized.");
        }
    } // End of Chart.js check

    // --- Recent Reviews Table Actions ---
    // Event delegation for action buttons within the recent reviews table.
    const recentReviewsTable = document.querySelector('.recent-reviews .review-table');

    if (recentReviewsTable) {
        recentReviewsTable.addEventListener('click', function(event) {
            const viewButton = event.target.closest('.view-review-btn'); // Check if view button was clicked.
            const editButton = event.target.closest('.edit-review-btn'); // Check if edit button was clicked.
            const deleteButton = event.target.closest('.delete-review-btn'); // Check if delete button was clicked.

            if (viewButton) {
                const reviewId = viewButton.getAttribute('data-review-id');
                viewReview(reviewId);
            } else if (editButton) {
                const reviewId = editButton.getAttribute('data-review-id');
                editReview(reviewId);
            } else if (deleteButton) {
                const reviewId = deleteButton.getAttribute('data-review-id');
                handleDeleteClick(event, deleteButton, reviewId); // Pass event and button for context.
            }
        });
    } else {
        console.warn("Recent reviews table not found. Action listeners not attached.");
    }

    // Action Functions (View, Edit, Delete)
    function viewReview(reviewId) { // Placeholder for viewing review details.
        console.log('Viewing review:', reviewId);
        alert(`Placeholder: View action for review ${reviewId}. Implement actual view logic (e.g., modal or redirect).`);
    }

    function editReview(reviewId) { // Redirects to the review edit page.
        console.log('Editing review:', reviewId);
        window.location.href = `/reviews/${reviewId}/edit/`; // Assumes this URL pattern.
    }

    function handleDeleteClick(e, buttonElement, reviewId) { // Confirms deletion before proceeding.
        e.preventDefault(); // Prevent default if the button is a link/submit.
        if (reviewId && confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
            deleteReview(reviewId, buttonElement); // Proceed with deletion.
        }
    }

    function deleteReview(reviewId, buttonElement) { // Handles the actual review deletion via API.
        if (!reviewId) { console.error("No review ID provided for deletion."); return; }
        if (!csrfToken) { showNotification("Error: Missing security token for deletion.", "error"); return; }

        const deleteUrl = `/delete-review/${reviewId}/`; // API endpoint for deleting a review.
        showNotification('Deleting review...', 'info'); // Inform user action is in progress.

        fetch(deleteUrl, {
            method: 'POST', // Using POST for deletion as it changes server state.
            headers: { 'X-CSRFToken': csrfToken, 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
        })
        .then(response => {
            console.log('Delete response status:', response.status);
            if (response.redirected && response.url.includes('/login/')) { // Handle potential session expiry.
                window.location.href = response.url; 
                throw new Error('Authentication required'); 
            }
            if (!response.ok) { // Handle non-successful HTTP responses.
                return response.text().then(text => { throw new Error(`Failed to delete: ${response.status} ${text || response.statusText}`); }); 
            }
            return response.json().catch(() => ({ status: 'success', message: 'Review deleted successfully.' })); // Assume success if JSON parsing fails but status was OK.
        })
        .then(data => {
            console.log('Delete server response:', data);
            if (data.status === 'success' || data.success === true) { // Check for success indicator from backend.
                showNotification(data.message || 'Review deleted successfully', 'success');
                const tableRow = buttonElement ? buttonElement.closest('tr') : document.querySelector(`tr[data-review-id="${reviewId}"]`); // Find table row to remove.
                if (tableRow) {
                    tableRow.style.opacity = '0'; // Fade out effect.
                    tableRow.style.transition = 'opacity 0.3s ease-out';
                    setTimeout(() => {
                        tableRow.remove(); // Remove row from DOM.
                        // Check if table body is empty and add a placeholder message.
                        const tbody = recentReviewsTable ? recentReviewsTable.querySelector('tbody') : null;
                        if (tbody && tbody.children.length === 0) {
                            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color: #777;">No recent reviews found.</td></tr>';
                        }
                    }, 300); // Delay removal for fade-out effect.
                } else { console.warn("Could not find table row to remove after deletion."); }
            } else { showNotification(data.message || 'Error deleting review. Please try again.', 'error'); }
        })
        .catch(error => {
            console.error('Error deleting review:', error);
            if (error.message !== 'Authentication required') { // Don't show generic error if it was an auth redirect.
                showNotification(`Failed to delete review: ${error.message}`, 'error'); 
            }
        });
    }

    // --- End Review Actions ---

    console.log("Moderator dashboard script initialized successfully");
});
