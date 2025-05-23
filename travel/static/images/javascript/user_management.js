// Ensure all code runs after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded - initializing user management script"); // Confirms script start.

    // --- Helper: Get CSRF Token ---
    // Retrieves CSRF token from cookies, essential for Django POST/DELETE requests.
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
    const csrfToken = getCookie('csrftoken'); // Store token for reuse in API calls.
    if (!csrfToken) {
        console.warn("CSRF Token not found. Some POST actions might fail."); // Warn if token is missing.
    }

    // --- Helper: Show Notification ---
    // (Using the simpler version found in java.js for consistency)
    // Dynamically creates and displays a short-lived notification message on the page.
    function showNotification(message, type) { // type can be 'success', 'error', or 'info'.
        console.log(`[${type}] ${message}`); // Fallback logging.
        const container = document.getElementById('notification-container') || // Get existing or create notification container.
            (() => {
                const div = document.createElement('div');
                div.id = 'notification-container';
                // Basic styling for the notification container.
                div.style.position = 'fixed'; div.style.top = '20px'; div.style.right = '20px'; div.style.zIndex = '9999';
                document.body.appendChild(div); return div;
            })();

        const notification = document.createElement('div');
        notification.className = `dynamic-notification notification-${type}`; // Class for styling.
        notification.textContent = message;
        // Basic inline styling for notification appearance.
        notification.style.padding = '12px 20px'; notification.style.marginBottom = '10px'; notification.style.borderRadius = '4px';
        notification.style.color = 'white'; notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        notification.style.opacity = '0'; notification.style.transition = 'opacity 0.3s ease-in-out'; // For fade effect.
        if (type === 'success') { notification.style.backgroundColor = '#4CAF50'; } // Green for success.
        else if (type === 'error') { notification.style.backgroundColor = '#F44336'; } // Red for error.
        else { notification.style.backgroundColor = '#2196F3'; } // Blue for Info or default.

        container.appendChild(notification);

        // Fade in animation.
        setTimeout(() => { notification.style.opacity = '1'; }, 10); // Slight delay for CSS transition.

        // Remove after 5 seconds with a fade-out effect.
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => { if (notification.parentNode) { notification.parentNode.removeChild(notification); } }, 300); // Remove from DOM after fade.
        }, 5000);
    }

    // --- Chart.js Check ---
    // Verifies if Chart.js library is loaded before attempting to render charts.
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded! User Management charts will not render.');
        showNotification('Error: Chart library not loaded. Charts are unavailable.', 'error');
    } else {
        console.log('Chart.js version:', Chart.version); // Log detected Chart.js version.

        // --- User Demographics Chart ---
        const demographicsCanvas = document.getElementById('userDemographicsChart'); // Canvas element for demographics.
        let userDemographicsChart; // Variable to store the chart instance.

        if (demographicsCanvas) {
            const demographicsCtx = demographicsCanvas.getContext('2d');
            // Initialize chart with placeholder data while real data loads.
            userDemographicsChart = new Chart(demographicsCtx, {
                type: 'doughnut', // Doughnut chart for demographics.
                data: { labels: ['Loading...'], datasets: [{ data: [1], backgroundColor: ['#cccccc'], borderWidth: 1 }] },
                options: { // Chart configuration options.
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'right', labels: { padding: 20, boxWidth: 12, font: { size: 12 } } }, // Legend styling.
                               tooltip: { callbacks: { label: function(context) { // Custom tooltip formatting.
                                   const label = context.label || ''; const value = context.raw;
                                   const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                   const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                   return `${label}: ${percentage}% (${value})`; } } } }, // Shows label, percentage, and raw value.
                    cutout: '60%', animation: { animateScale: true, animateRotate: true } // Doughnut styling and animation.
                }
            });

            // Fetch real data for the demographics chart.
            fetch('/api/user-demographics-data/') // Assumed API endpoint for demographics.
                .then(response => response.ok ? response.json() : Promise.reject('Network error while fetching demographics'))
                .then(data => { // Update chart with fetched data.
                    userDemographicsChart.data.labels = data.labels;
                    userDemographicsChart.data.datasets[0].data = data.values;
                    userDemographicsChart.data.datasets[0].backgroundColor = ['#4caf50', '#2196f3', '#ff9800', '#9e9e9e']; // Predefined colors.
                    userDemographicsChart.update(); // Refresh chart display.
                })
                .catch(error => {
                    console.error('Error fetching demographics data:', error);
                    showNotification('Could not load user demographics chart data.', 'error');
                    // Update chart to show an error state.
                    userDemographicsChart.data.labels = ['Error'];
                    userDemographicsChart.data.datasets[0].data = [1];
                    userDemographicsChart.data.datasets[0].backgroundColor = ['#f44336']; // Red color for error.
                    userDemographicsChart.update();
                });
        } else {
            console.warn("User Demographics Chart canvas element not found.");
        }

        // --- User Activity Chart ---
        const activityCanvas = document.getElementById('userActivityChart'); // Canvas for activity chart.
        let userActivityChart; // Variable for activity chart instance.

        if (activityCanvas) {
            const activityCtx = activityCanvas.getContext('2d');
            // Initialize with placeholder data.
            userActivityChart = new Chart(activityCtx, {
                type: 'line', // Line chart for activity over time.
                data: { labels: ['Loading...'], datasets: [
                    { label: 'Active Users', data: [0], borderColor: '#2196f3', backgroundColor: 'rgba(33, 150, 243, 0.1)', borderWidth: 2, fill: true, tension: 0.4 },
                    { label: 'New Registrations', data: [0], borderColor: '#4caf50', backgroundColor: 'rgba(76, 175, 80, 0.1)', borderWidth: 2, fill: true, tension: 0.4 }
                ] },
                options: { // Chart configuration.
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', labels: { boxWidth: 12, padding: 20, font: { size: 12 } } },
                               tooltip: { mode: 'index', intersect: false } }, // Tooltip shows data for all datasets at that point.
                    scales: { x: { grid: { display: false } }, // X-axis styling.
                              y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' }, // Y-axis styling.
                                   ticks: { callback: function(value) { return value.toLocaleString(); } } } }, // Format Y-axis ticks.
                    interaction: { mode: 'nearest', axis: 'x', intersect: false }, // Interaction settings for tooltips.
                    elements: { point: { radius: 3, hoverRadius: 5 } } // Point styling.
                }
            });

            // Fetch real data for activity chart.
            fetch('/api/user-activity-data/') // Assumed API endpoint for activity.
                .then(response => response.ok ? response.json() : Promise.reject('Network error while fetching activity data'))
                .then(data => { // Update chart with fetched data.
                    userActivityChart.data.labels = data.labels;
                    userActivityChart.data.datasets[0].data = data.active_users;
                    userActivityChart.data.datasets[1].data = data.new_registrations;
                    userActivityChart.update(); // Refresh chart.
                })
                .catch(error => {
                    console.error('Error fetching user activity data:', error);
                    showNotification('Could not load user activity chart data.', 'error');
                    // Update chart to show error state.
                    userActivityChart.data.labels = ['Error'];
                    userActivityChart.data.datasets[0].data = [0];
                    userActivityChart.data.datasets[1].data = [0];
                    userActivityChart.update();
                });
        } else {
            console.warn("User Activity Chart canvas element not found.");
        }
    } // End Chart.js check

    // --- Contribution Diversity ---
    // Loads and displays data related to contribution diversity (language, geography).
    function loadDiversityData() {
        fetch('/api/contribution-diversity-data/') // Assumed API endpoint.
            .then(response => response.ok ? response.json() : Promise.reject('Network error fetching diversity data'))
            .then(data => { // Update UI sections with fetched diversity data.
                updateLanguageDistribution(data.language_distribution);
                updateGeographicDistribution(data.geographic_distribution);
                updateInsight(data.insight);
            })
            .catch(error => {
                console.error('Error fetching contribution diversity data:', error);
                showDiversityErrorState(); // Display error state in UI.
                showNotification('Could not load contribution diversity data.', 'error');
            });
    }

    // Updates the language distribution section with progress bars.
    function updateLanguageDistribution(languageData) {
        const languageContainer = document.querySelector('.diversity-card:nth-child(1) .diversity-content'); // Target specific card.
        if (!languageContainer) return;
        languageContainer.innerHTML = ''; // Clear previous content.
        if (!languageData || Object.keys(languageData).length === 0) { // Handle no data.
            languageContainer.innerHTML = '<p class="no-data">No language distribution data available.</p>'; return;
        }
        const sortedLanguages = Object.entries(languageData).sort((a, b) => b[1] - a[1]); // Sort by percentage.
        sortedLanguages.forEach(([language, percentage]) => { // Create progress bar for each language.
            const item = document.createElement('div'); item.className = 'progress-item';
            item.innerHTML = `
                <div class="progress-label"><span>${language}</span><span>${percentage}%</span></div>
                <div class="progress-bar-container"><div class="progress-bar" style="width: ${percentage}%"></div></div>`;
            languageContainer.appendChild(item);
        });
    }

    // Updates the geographic distribution section with progress bars.
    function updateGeographicDistribution(geoData) {
        const geoContainer = document.querySelector('.diversity-card:nth-child(2) .diversity-content'); // Target specific card.
        if (!geoContainer) return;
        geoContainer.innerHTML = ''; // Clear.
        if (!geoData || Object.keys(geoData).length === 0) { // Handle no data.
            geoContainer.innerHTML = '<p class="no-data">No geographic distribution data available.</p>'; return;
        }
        const sortedRegions = Object.entries(geoData).sort((a, b) => b[1] - a[1]); // Sort by percentage.
        sortedRegions.forEach(([region, percentage]) => { // Create progress bar for each region.
            const item = document.createElement('div'); item.className = 'progress-item';
            item.innerHTML = `
                <div class="progress-label"><span>${region}</span><span>${percentage}%</span></div>
                <div class="progress-bar-container"><div class="progress-bar" style="width: ${percentage}%"></div></div>`;
            geoContainer.appendChild(item);
        });
    }

    // Updates the insight text section.
    function updateInsight(insightText) {
        const insightElement = document.querySelector('.insight-text p');
        if (insightElement) {
            insightElement.innerHTML = insightText ? `<strong>Insight:</strong> ${insightText}` : 'No insights available at this time.';
        }
    }

    // Displays an error state for all diversity data sections.
    function showDiversityErrorState() {
        const containers = document.querySelectorAll('.diversity-content'); // Select all diversity content areas.
        containers.forEach(container => { // Show error message in each.
            container.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i><p>Unable to load diversity data.</p></div>`;
        });
        const insightElement = document.querySelector('.insight-text p');
        if(insightElement) insightElement.textContent = 'Could not load insights due to an error.';
    }

    // Refresh functionality for diversity data.
    const diversitySection = document.querySelector('.diversity-monitoring');
    if (diversitySection) {
        let refreshButton = diversitySection.querySelector('.refresh-button'); // Check if refresh button exists.
        if (!refreshButton) { // If not, create it.
            refreshButton = document.createElement('button');
            refreshButton.className = 'refresh-button';
            refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i>'; // Refresh icon.
            refreshButton.title = 'Refresh diversity data';
            // Basic inline styles for the button.
            refreshButton.style.marginLeft = '10px'; 
            refreshButton.style.cursor = 'pointer';
            refreshButton.style.background = 'none';
            refreshButton.style.border = 'none';
            refreshButton.style.fontSize = '1em';
            refreshButton.style.color = '#555';

            const diversityTitle = diversitySection.querySelector('.diversity-title'); // Find title to append button to.
            if (diversityTitle) {
                diversityTitle.appendChild(refreshButton);
                refreshButton.addEventListener('click', loadDiversityData); // Add click listener.
            }
        }
        // Initial load of diversity data.
        loadDiversityData();
    }


    // --- User Management Table ---
    const userTableBody = document.querySelector('.data-table tbody'); // Table body for user data.
    const paginationContainer = document.querySelector('.pagination'); // Container for pagination controls.
    const showingEntriesElement = document.querySelector('.showing-entries'); // Element to display "Showing X to Y of Z entries".
    let currentFilters = {}; // Stores currently applied filters for pagination.
    let currentPage = 1;    // Stores the current page number.

    // Loads user data for the table, with pagination and filtering.
    function loadUserData(page = 1, filters = {}) {
        currentPage = page; // Update global current page.
        currentFilters = filters; // Update global current filters.

        if (!userTableBody) { console.error("User table body not found. Cannot load user data."); return; }
        // Show loading state in table and info elements.
        userTableBody.innerHTML = '<tr><td colspan="8" class="loading-data"><div class="loading-spinner"></div><p>Loading users data...</p></td></tr>';
        if (showingEntriesElement) showingEntriesElement.textContent = 'Loading entries...';
        if (paginationContainer) paginationContainer.innerHTML = ''; // Clear old pagination.

        const params = new URLSearchParams({ page: page, ...filters }); // Construct query parameters.

        fetch(`/api/users/?${params.toString()}`) // Assumed API endpoint for user list.
            .then(response => response.ok ? response.json() : Promise.reject('Network error fetching user data'))
            .then(data => { // On successful fetch.
                renderUserTable(data.users);         // Populate table with user data.
                updatePagination(data.pagination);   // Create pagination controls.
                updateShowingEntries(data.pagination); // Update "Showing X to Y..." text.
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
                userTableBody.innerHTML = `<tr><td colspan="8" class="error-message"><i class="fas fa-exclamation-triangle"></i> Failed to load user data. Please try again.</td></tr>`;
                if (showingEntriesElement) showingEntriesElement.textContent = 'Failed to load entries';
            });
    }

    // Renders the rows for the user data table.
    function renderUserTable(users) {
        if (!userTableBody) return;
        userTableBody.innerHTML = ''; // Clear previous data or loading message.

        if (!users || users.length === 0) { // If no users match criteria.
            userTableBody.innerHTML = `<tr><td colspan="8" class="no-data">No users found matching your criteria.</td></tr>`;
            return;
        }

        users.forEach(user => { // Create a table row for each user.
            const row = document.createElement('tr');
            row.setAttribute('data-user-id', user.id); // Store user ID on the row.

            // User Avatar/Initials logic.
            let userAvatarHtml;
            if (user.avatar_url) {
                userAvatarHtml = `<img src="${user.avatar_url}" alt="${user.name || user.email}">`;
            } else {
                const nameParts = user.name ? user.name.split(' ') : [user.email || 'U']; // Fallback to email or 'U'.
                let initials = nameParts[0].charAt(0);
                if (nameParts.length > 1) { initials += nameParts[nameParts.length - 1].charAt(0); }
                initials = initials.toUpperCase();
                // Simple color hashing for variety in initial backgrounds.
                const colors = ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#673ab7'];
                const colorIndex = (initials.charCodeAt(0) || 0) % colors.length;
                userAvatarHtml = `<div class="user-avatar-initials" style="background-color: ${colors[colorIndex]}">${initials}</div>`;
            }

            // Status Badge logic.
            const statusClass = user.is_flagged ? 'status-flagged' : (user.is_active ? 'status-active' : 'status-inactive');
            const statusText = user.is_flagged ? 'Flagged' : (user.is_active ? 'Active' : 'Inactive');

            // Approval Rate Badge logic.
            const approvalRate = user.approval_rate || 0; // Default to 0 if undefined.
            let approvalClass = 'medium'; // Default class.
            if (approvalRate >= 75) approvalClass = 'positive'; // High approval.
            else if (approvalRate < 50) approvalClass = 'negative'; // Low approval.

            // Populate row with user data.
            row.innerHTML = `
                <td>
                    <div class="checkbox-wrapper"><input type="checkbox" id="user-${user.id}" class="user-checkbox"><label for="user-${user.id}"></label></div>
                </td>
                <td>
                    <div class="user-cell ${user.is_flagged ? 'flagged-user' : ''}">
                        ${userAvatarHtml}
                        <div class="user-info">
                            <div class="user-name">${user.name || 'N/A'}</div>
                            <div class="user-email">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td>${user.location || 'Not specified'}</td>
                <td>
                    <div class="review-count">
                        <span class="count">${user.review_count || 0}</span>
                        <span class="approval-rate ${approvalClass}">${approvalRate}% approved</span>
                    </div>
                </td>
                <td>${user.language || 'Not specified'}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${formatDate(user.date_joined)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view-user" data-user-id="${user.id}" title="View Profile"><i class="fas fa-eye"></i></button>
                        <button class="action-btn edit-user" data-user-id="${user.id}" title="Edit User"><i class="fas fa-edit"></i></button>
                        <button class="action-btn more-actions" data-user-id="${user.id}" title="More Actions"><i class="fas fa-ellipsis-v"></i></button>
                    </div>
                </td>
            `;
            userTableBody.appendChild(row);
        });

        addActionButtonListeners(); // Re-attach listeners for dynamically created action buttons.
    }

    // Formats a date string into a more readable format.
    function formatDate(dateString) {
        if (!dateString) return 'N/A'; // Handle null or undefined dates.
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) { // Check for invalid date.
                return 'Invalid Date';
            }
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); // e.g., "May 16, 2025"
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return 'Invalid Date'; // Return error string if formatting fails.
        }
    }

    // Updates the pagination controls based on pagination data from the server.
    function updatePagination(pagination) {
        if (!paginationContainer || !pagination || pagination.total_pages <= 1) { // No pagination if 1 page or less.
            if(paginationContainer) paginationContainer.innerHTML = ''; // Clear if not needed.
            return;
        }
        paginationContainer.innerHTML = ''; // Clear existing pagination.

        // Previous button.
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn'; prevBtn.disabled = pagination.current_page === 1;
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.addEventListener('click', () => loadUserData(pagination.current_page - 1, currentFilters));
        paginationContainer.appendChild(prevBtn);

        // Page numbers (simplified logic for display, e.g., 1 ... 3 4 5 ... 10).
        let startPage = Math.max(1, pagination.current_page - 2);
        let endPage = Math.min(pagination.total_pages, startPage + 4);
        if (endPage === pagination.total_pages) startPage = Math.max(1, endPage - 4); // Adjust start if at the end.

        if (startPage > 1) { // Show '1' and ellipsis if not starting from page 1.
            const firstBtn = document.createElement('button'); firstBtn.className = 'pagination-btn'; firstBtn.textContent = '1';
            firstBtn.addEventListener('click', () => loadUserData(1, currentFilters)); paginationContainer.appendChild(firstBtn);
            if (startPage > 2) paginationContainer.insertAdjacentHTML('beforeend', '<span class="pagination-ellipsis">...</span>');
        }

        for (let i = startPage; i <= endPage; i++) { // Render page number buttons.
            const pageBtn = document.createElement('button');
            pageBtn.className = 'pagination-btn'; pageBtn.textContent = i;
            if (i === pagination.current_page) pageBtn.classList.add('active'); // Highlight current page.
            pageBtn.addEventListener('click', () => loadUserData(i, currentFilters));
            paginationContainer.appendChild(pageBtn);
        }

        if (endPage < pagination.total_pages) { // Show ellipsis and last page if not ending at total pages.
            if (endPage < pagination.total_pages - 1) paginationContainer.insertAdjacentHTML('beforeend', '<span class="pagination-ellipsis">...</span>');
            const lastBtn = document.createElement('button'); lastBtn.className = 'pagination-btn'; lastBtn.textContent = pagination.total_pages;
            lastBtn.addEventListener('click', () => loadUserData(pagination.total_pages, currentFilters)); paginationContainer.appendChild(lastBtn);
        }

        // Next button.
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn'; nextBtn.disabled = pagination.current_page === pagination.total_pages;
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.addEventListener('click', () => loadUserData(pagination.current_page + 1, currentFilters));
        paginationContainer.appendChild(nextBtn);
    }

    // Updates the "Showing X to Y of Z entries" text.
    function updateShowingEntries(pagination) {
        if (!showingEntriesElement || !pagination || pagination.total_entries === 0) {
            if(showingEntriesElement) showingEntriesElement.textContent = 'No entries found';
            return;
        }
        const start = (pagination.current_page - 1) * pagination.per_page + 1;
        const end = Math.min(start + pagination.per_page - 1, pagination.total_entries);
        showingEntriesElement.textContent = `Showing ${start} to ${end} of ${pagination.total_entries} entries`;
    }

    // --- Event Listeners Setup ---
    // Sets up initial event listeners for static elements on the page.
    function setupEventListeners() {
        // "Select all" checkbox for user table.
        const selectAllCheckbox = document.getElementById('select-all');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() { // When "select all" is toggled.
                const userCheckboxes = userTableBody ? userTableBody.querySelectorAll('.user-checkbox') : [];
                userCheckboxes.forEach(checkbox => { checkbox.checked = this.checked; }); // Check/uncheck all row checkboxes.
            });
        }

        // Filter button click to show filter dropdown.
        const filterBtn = document.querySelector('.filter-btn');
        if (filterBtn) {
            filterBtn.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent event from closing dropdown immediately if it bubbles.
                showFilterDropdown(this); // Display the filter options.
            });
        }

        // Initial data load for the user table.
        loadUserData(); // Load page 1 with default (empty) filters.
    }

    // Shows or creates and shows the filter dropdown menu.
    function showFilterDropdown(button) {
        const filterContainer = button.closest('.filter-dropdown'); // Assumes button is within a .filter-dropdown container.
        if (!filterContainer) {
            console.warn("Filter button is not within a '.filter-dropdown' container.");
            return;
        }

        let dropdown = filterContainer.querySelector('.filter-dropdown-content'); // Check if dropdown already exists.

        if (dropdown) { // If exists, just toggle its visibility.
            dropdown.classList.toggle('show');
            dropdown.style.display = dropdown.classList.contains('show') ? 'block' : 'none';
            return;
        }

        // Create dropdown if it doesn't exist.
        dropdown = document.createElement('div');
        dropdown.className = 'filter-dropdown-content';
        // Basic inline styles for dropdown. Consider moving to CSS.
        dropdown.style.position = 'absolute';
        dropdown.style.backgroundColor = 'white';
        dropdown.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        dropdown.style.padding = '15px';
        dropdown.style.borderRadius = '5px';
        dropdown.style.zIndex = '100';
        dropdown.style.minWidth = '250px';
        dropdown.style.display = 'none'; // Start hidden.

        // Populate dropdown with filter form HTML.
        dropdown.innerHTML = `
            <form id="filter-form">
                <h4>Filter Users</h4>
                <div class="filter-section">
                    <label>Status</label>
                    <div class="filter-options">
                        <label><input type="checkbox" name="status" value="active"> Active</label>
                        <label><input type="checkbox" name="status" value="inactive"> Inactive</label>
                        <label><input type="checkbox" name="status" value="flagged"> Flagged</label>
                    </div>
                </div>
                <div class="filter-section">
                    <label for="min_reviews_filter">Min Reviews</label>
                    <input type="number" id="min_reviews_filter" name="min_reviews" min="0" placeholder="e.g., 5" style="width: 100%; padding: 5px; border: 1px solid #ccc; border-radius: 3px;">
                </div>
                <div class="filter-section">
                    <label>Joined Date Range</label>
                    <div style="display: flex; gap: 10px;">
                        <input type="date" name="join_date_from" style="flex: 1; padding: 5px; border: 1px solid #ccc; border-radius: 3px;">
                        <input type="date" name="join_date_to" style="flex: 1; padding: 5px; border: 1px solid #ccc; border-radius: 3px;">
                    </div>
                </div>
                <div class="filter-buttons" style="margin-top: 15px; text-align: right;">
                    <button type="button" class="secondary-btn clear-filters" style="margin-right: 5px; padding: 5px 10px;">Clear</button>
                    <button type="submit" class="primary-btn apply-filters" style="padding: 5px 10px;">Apply</button>
                </div>
            </form>
        `;

        filterContainer.appendChild(dropdown); // Add dropdown to container.
        dropdown.classList.add('show'); // Make it visible.
        dropdown.style.display = 'block';

        // Add form submission logic for applying filters.
        const filterForm = dropdown.querySelector('#filter-form');
        filterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const filters = {};
            // Collect status checkboxes (can be multiple).
            const statusValues = formData.getAll('status');
            if (statusValues.length > 0) {
                filters['status'] = statusValues.join(','); // Send as comma-separated string or handle as array in backend.
            }
            // Collect other filter fields.
            ['min_reviews', 'join_date_from', 'join_date_to'].forEach(key => {
                const value = formData.get(key);
                if (value) filters[key] = value; // Add to filters if value exists.
            });

            console.log("Applying filters:", filters);
            loadUserData(1, filters); // Load data with new filters, starting from page 1.
            dropdown.classList.remove('show'); // Hide dropdown.
            dropdown.style.display = 'none';
        });

        // Add clear filters logic.
        dropdown.querySelector('.clear-filters').addEventListener('click', function() {
            filterForm.reset(); // Reset form fields.
            loadUserData(1, {}); // Reload data with no filters.
            // dropdown.classList.remove('show'); // Optionally hide after clearing.
            // dropdown.style.display = 'none';
        });

        // Click outside to close the dropdown.
        setTimeout(() => { // Use timeout to ensure this listener is added after the current event cycle.
            document.addEventListener('click', function closeFilterOnClickOutside(event) {
                // If click is outside the filter button and outside the dropdown itself.
                if (!filterContainer.contains(event.target) && !dropdown.contains(event.target)) {
                    dropdown.classList.remove('show');
                    dropdown.style.display = 'none';
                    document.removeEventListener('click', closeFilterOnClickOutside); // Clean up this specific listener.
                }
            });
        }, 0);
    }

    // --- User Action Button Listeners ---
    // Attaches event listeners for action buttons (view, edit, more) in the user table.
    // Uses event delegation on the table body for efficiency with dynamic content.
    function addActionButtonListeners() {
        if (!userTableBody) return;

        userTableBody.addEventListener('click', function(event) {
            const viewButton = event.target.closest('.view-user'); // Find closest view button.
            const editButton = event.target.closest('.edit-user'); // Find closest edit button.
            const moreButton = event.target.closest('.more-actions'); // Find closest "more actions" button.

            if (viewButton) {
                const userId = viewButton.getAttribute('data-user-id');
                console.log("View user clicked, id:", userId);
                window.location.href = `/users/${userId}/`; // Redirect to user's profile page.
            } else if (editButton) {
                const userId = editButton.getAttribute('data-user-id');
                console.log("Edit user clicked, id:", userId);
                window.location.href = `/users/${userId}/edit/`; // Redirect to user edit page.
            } else if (moreButton) {
                event.stopPropagation(); // Prevent click from bubbling to other listeners (e.g., close dropdown).
                const userId = moreButton.getAttribute('data-user-id');
                showActionsDropdown(moreButton, userId); // Display the "more actions" dropdown.
            }
        });
    }

    // --- More Actions Dropdown ---
    // Creates and displays a dropdown menu for additional user actions.
    function showActionsDropdown(button, userId) {
        // Close any existing dropdowns first to prevent multiple open menus.
        document.querySelectorAll('.actions-dropdown').forEach(dropdown => dropdown.remove());

        const dropdown = document.createElement('div');
        dropdown.className = 'actions-dropdown';
        // Basic inline styles for the dropdown.
        dropdown.style.position = 'absolute';
        dropdown.style.backgroundColor = 'white';
        dropdown.style.border = '1px solid #ccc';
        dropdown.style.boxShadow = '0 2px 5px rgba(0,0,0,0.15)';
        dropdown.style.zIndex = '101'; // Ensure it's above table content.
        dropdown.style.minWidth = '150px';

        // Populate dropdown with action items.
        dropdown.innerHTML = `
            <ul style="list-style: none; margin: 0; padding: 5px 0;">
                <li data-action="flag" data-user-id="${userId}" style="padding: 8px 12px; cursor: pointer;"><i class="fas fa-flag" style="margin-right: 8px;"></i> Flag User</li>
                <li data-action="reset-password" data-user-id="${userId}" style="padding: 8px 12px; cursor: pointer;"><i class="fas fa-key" style="margin-right: 8px;"></i> Reset Password</li>
                <li data-action="toggle-status" data-user-id="${userId}" style="padding: 8px 12px; cursor: pointer;"><i class="fas fa-toggle-on" style="margin-right: 8px;"></i> Toggle Status</li>
                <li class="delete-action" data-action="delete" data-user-id="${userId}" style="padding: 8px 12px; cursor: pointer; color: #dc3545;"><i class="fas fa-trash-alt" style="margin-right: 8px;"></i> Delete User</li>
            </ul>
        `;

        // Position dropdown relative to the clicked "more actions" button.
        const rect = button.getBoundingClientRect(); // Get button's position.
        document.body.appendChild(dropdown); // Append to body to avoid overflow issues from parent containers.
        dropdown.style.top = `${window.scrollY + rect.bottom}px`; // Position below the button.
        dropdown.style.left = `${window.scrollX + rect.left - dropdown.offsetWidth + rect.width}px`; // Align right edge of dropdown with button's right edge.

        // Add event listeners to each item in the dropdown.
        dropdown.querySelectorAll('li').forEach(item => {
            item.addEventListener('click', function() {
                const action = this.getAttribute('data-action');
                const userId = this.getAttribute('data-user-id');
                handleUserAction(action, userId); // Perform the selected action.
                dropdown.remove(); // Close dropdown after action.
            });
        });

        // Click outside to close the dropdown.
        setTimeout(() => { // Use timeout to ensure this listener is added after the current event cycle.
            document.addEventListener('click', function closeActionsDropdown(e) {
                // If click is not on the dropdown itself and not on the button that opened it.
                if (!dropdown.contains(e.target) && e.target !== button) {
                    dropdown.remove();
                    document.removeEventListener('click', closeActionsDropdown); // Clean up listener.
                }
            }, { once: true }); // Listener fires once then removes itself.
        }, 0);
    }

    // --- Handle Specific User Actions ---
    // Central function to dispatch various actions performed on a user.
    function handleUserAction(action, userId) {
        console.log(`Handling action '${action}' for user ID ${userId}`);
        switch (action) {
            case 'flag': // Flag/unflag a user.
                if (confirm('Are you sure you want to toggle the flag status for this user?')) {
                    updateUserStatus(userId, 'flag'); // API call to update status.
                }
                break;
            case 'reset-password': // Send a password reset link.
                if (confirm('Are you sure you want to send a password reset link to this user?')) {
                    fetch(`/api/users/${userId}/reset-password/`, { // Assumed API endpoint.
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken }
                    })
                    .then(response => response.ok ? response.json() : Promise.reject('Network error on password reset'))
                    .then(data => { showNotification(data.message || 'Password reset link sent.', 'success'); })
                    .catch(error => { console.error('Error resetting password:', error); showNotification('Failed to initiate password reset.', 'error'); });
                }
                break;
            case 'toggle-status': // Activate/deactivate a user.
                updateUserStatus(userId, 'toggle'); // API call to update status.
                break;
            case 'delete': // Delete a user.
                if (confirm('DELETE USER? This action is permanent and cannot be undone.')) {
                    fetch(`/api/users/${userId}/`, { // Assumed API endpoint for deletion.
                        method: 'DELETE', // Using DELETE HTTP method.
                        headers: { 'X-CSRFToken': csrfToken }
                    })
                    .then(response => response.ok ? response.json() : Promise.reject('Network error or non-JSON response on delete'))
                    .then(data => {
                        if (data.success) {
                            showNotification('User deleted successfully.', 'success');
                            loadUserData(currentPage, currentFilters); // Reload table to reflect deletion.
                        } else {
                            showNotification(data.error || 'Failed to delete user.', 'error');
                        }
                    })
                    .catch(error => { console.error('Error deleting user:', error); showNotification('An error occurred during user deletion.', 'error'); });
                }
                break;
            default:
                console.warn("Unknown user action requested:", action);
        }
    }

    // --- Update User Status API Call ---
    // Makes an API call to update a user's status (e.g., active, flagged).
    function updateUserStatus(userId, action) { // 'action' could be 'flag', 'toggle_active', etc.
        fetch(`/api/users/${userId}/status/`, { // Assumed API endpoint for status updates.
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken },
            body: JSON.stringify({ action: action }) // Send the specific action to perform.
        })
        .then(response => response.ok ? response.json() : Promise.reject('Network error updating user status'))
        .then(data => {
            if (data.success) {
                showNotification(data.message || 'User status updated successfully.', 'success');
                loadUserData(currentPage, currentFilters); // Reload table to show changes.
            } else {
                showNotification(data.error || 'Failed to update user status.', 'error');
            }
        })
        .catch(error => { console.error('Error updating user status:', error); showNotification('An error occurred while updating user status.', 'error'); });
    }

    // Initialize everything
    setupEventListeners(); // Set up initial event listeners for static elements.

    console.log("User management script initialized successfully.");
}); // End DOMContentLoaded
