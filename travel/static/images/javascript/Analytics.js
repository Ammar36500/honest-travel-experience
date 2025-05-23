// Analytics.js
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded - initializing analytics dashboard script"); // Log script initialization.

    // --- Globals & Initial Setup ---
    // Variables to hold chart instances, current state, and cached data.
    let reviewTrendsChart; 
    let currentRange = 'last-30-days'; // Default date range for fetching data.
    let dateRangeModal = null; // DOM element for custom date range modal.
    let startDateInput = null; // Input field for custom start date.
    let endDateInput = null;   // Input field for custom end date.
    let adminPerformanceDataCache = []; // Cache for admin performance data (for export).
    let isRefreshing = false; // Flag to prevent multiple concurrent refreshes.
    let refreshIntervalId = null; // ID for the auto-refresh interval.

    // --- Helper: Get CSRF Token ---
    // Retrieves CSRF token from cookies, necessary for Django POST requests if any.
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
    const csrfToken = getCookie('csrftoken'); // Store token

    // --- Helper: Show Notification ---
    // Displays a temporary notification message to the user.
    function showNotification(message, type = 'info') { // type can be 'info', 'success', 'error'.
        console.log(`[${type}] ${message}`); // Log notification for debugging.
        const existingNotification = document.querySelector('.dynamic-analytics-notification');
        if (existingNotification) { existingNotification.remove(); } // Remove any previous notification.
        
        const notification = document.createElement('div');
        notification.className = `dynamic-analytics-notification notification-${type}`; // Apply CSS classes.
        // Notification HTML structure with icon and close button.
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}" style="margin-right: 8px;"></i>
            <span>${message}</span>
            <button class="close-btn" aria-label="Close notification" style="background:none; border:none; color:inherit; font-size:1.2em; margin-left:auto; padding: 0 5px; cursor:pointer;">&times;</button>
        `;
        // Inline styles for the notification element.
        notification.style.cssText = `position: fixed; top: 20px; right: 20px; z-index: 10000; padding: 15px 20px; border-radius: 5px; color: white; box-shadow: 0 5px 15px rgba(0,0,0,0.2); opacity: 0; transition: opacity 0.3s ease; font-family: sans-serif; font-size: 14px; max-width: 400px; display: flex; align-items: center; background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};`;
        document.body.appendChild(notification); // Add notification to the page.
        
        setTimeout(() => { notification.style.opacity = '1'; }, 10); // Fade in.
        
        // Auto-hide notification after 7 seconds.
        const autoHideTimeout = setTimeout(() => {
            if (notification.parentNode) { // Check if still in DOM.
                notification.style.opacity = '0';
                setTimeout(() => { if (notification.parentNode) { notification.remove(); } }, 300); // Remove after fade out.
            }
        }, 7000);
        
        // Allow manual closing of the notification.
        notification.querySelector('.close-btn').addEventListener('click', () => {
            clearTimeout(autoHideTimeout); // Clear auto-hide if closed manually.
            notification.style.opacity = '0';
            setTimeout(() => { if (notification.parentNode) { notification.remove(); } }, 300);
        });
    }

    // --- Helper: Loading State ---
    // Displays a full-page loading overlay.
     function showLoadingState(text = "Loading data...") {
        hideLoadingState(); // Remove any existing overlay.
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay'; // For CSS targeting.
        // Inline styles for the overlay and spinner.
        loadingOverlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(255, 255, 255, 0.85); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 9999; transition: opacity 0.3s ease; opacity: 0;`;
        loadingOverlay.innerHTML = `<div class="spinner" style="font-size: 40px; color: #3498db; margin-bottom: 15px;"><i class="fas fa-circle-notch fa-spin"></i></div><div class="loading-text" style="color: #555; font-size: 18px;">${text}</div>`;
        document.body.appendChild(loadingOverlay);
        setTimeout(() => { loadingOverlay.style.opacity = '1'; }, 10); // Fade in.
    }
    // Hides the loading overlay.
    function hideLoadingState() {
        const existingOverlay = document.querySelector('.loading-overlay');
        if (existingOverlay) {
             existingOverlay.style.opacity = '0'; // Fade out.
             setTimeout(() => { existingOverlay.remove(); }, 300); // Remove after fade.
        }
    }

    // --- Helper: Format Date for Display ---
    // Formats a date string (YYYY-MM-DD) into a more readable format (e.g., "April 10, 2025").
    function formatDisplayDate(dateString) {
         if (!dateString) return 'N/A'; // Handle null or empty dates.
        try {
            const date = new Date(dateString + 'T00:00:00Z'); // Assume UTC date string from server, parse as UTC.
            if (isNaN(date.getTime())) throw new Error('Invalid date object'); // Validate date.
            // Format to locale string, ensuring UTC is considered for display consistency if needed.
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
        } catch (e) {
            console.error('Error formatting date:', dateString, e);
            return dateString; // Return original string on error.
        }
    }

    // --- Chart.js Check ---
    // Verifies if the Chart.js library is loaded.
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded! Analytics charts will not render.');
        showNotification('Error: Chart library not loaded. Charts are unavailable.', 'error');
    } else {
        console.log('Chart.js version:', Chart.version); // Log detected version.
    }

    // --- Review Trends Chart ---
    const reviewTrendsCtx = document.getElementById('reviewTrendsChart'); // Canvas element for the chart.

    // Updates the review trends chart with new data or displays 'no data' message.
    function updateReviewTrendsChart(chartData) {
        if (!reviewTrendsCtx) { console.warn("Review Trends Chart canvas not found."); return; }
        if (typeof Chart === 'undefined') return; // Don't proceed if Chart.js isn't loaded.
        console.log('Updating Review Trends Chart with data:', chartData);
        
        if (reviewTrendsChart) { reviewTrendsChart.destroy(); reviewTrendsChart = null; } // Destroy existing chart instance.

        // Check for valid and non-empty data.
        if (!chartData || !chartData.labels || !chartData.labels.length || !chartData.allReviews) {
            console.warn("Invalid or empty data received for review trends chart:", chartData);
            const ctx = reviewTrendsCtx.getContext('2d');
            ctx.clearRect(0, 0, reviewTrendsCtx.width, reviewTrendsCtx.height); // Clear canvas.
            // Display a "no data" message on the canvas.
            ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#888'; ctx.font = '16px sans-serif';
            ctx.fillText('No trend data available for the selected period.', reviewTrendsCtx.width / 2, reviewTrendsCtx.height / 2);
            ctx.restore();
            return;
        }

        // Create new Chart.js instance for review trends.
        reviewTrendsChart = new Chart(reviewTrendsCtx, {
            type: 'line', // Line chart.
            data: { 
                labels: chartData.labels, // X-axis labels (dates).
                datasets: [ // Datasets for different review categories.
                { label: 'Total Reviews', data: chartData.allReviews || [], borderColor: '#3490dc', backgroundColor: 'rgba(52, 144, 220, 0.1)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 2, pointHoverRadius: 5 },
                { label: 'Approved', data: chartData.approvedReviews || [], borderColor: '#38c172', backgroundColor: 'rgba(56, 193, 114, 0.1)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 2, pointHoverRadius: 5 },
                { label: 'Flagged', data: chartData.flaggedReviews || [], borderColor: '#e3342f', backgroundColor: 'rgba(227, 52, 47, 0.1)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 2, pointHoverRadius: 5 }
            ]},
             options: { // Chart configuration options.
                 responsive: true, maintainAspectRatio: false, // Responsiveness.
                 plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { mode: 'index', intersect: false, titleFont: {weight: 'bold'} } }, // Legend and tooltip.
                 scales: { // Axis configuration.
                     y: { beginAtZero: true, grid: { display: true, color: 'rgba(0,0,0,0.05)' }, ticks: { precision: 0, callback: function(v) { return v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v; } } }, // Y-axis.
                     x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, autoSkipPadding: 20 } } // X-axis.
                 },
                 elements: { line: { borderWidth: 1.5 } }, animation: { duration: 500, easing: 'easeOutQuad' } // Styling and animation.
             }
        });
    }

    // --- Stat Card Auto-Refresh ---
    const autoRefreshCheckbox = document.getElementById('auto-refresh'); // Checkbox to enable/disable auto-refresh.
    const manualRefreshButton = document.getElementById('refresh-stats'); // Button for manual refresh.

    // Refreshes all dashboard data.
    function refreshStatsData() {
        if (isRefreshing) { console.log("Refresh already in progress."); return; } // Prevent concurrent refreshes.
        console.log("Refreshing all dashboard data...");
        isRefreshing = true; // Set refreshing flag.
        if(manualRefreshButton) manualRefreshButton.disabled = true; // Disable manual refresh button.
        const loadingIndicator = document.getElementById('loading-indicator'); // General loading indicator.
        if(loadingIndicator) loadingIndicator.style.display = 'flex'; // Show indicator.

        // Determine current active date range.
        const activeRangeButton = document.querySelector('.date-range-btn.active');
        const currentRangeValue = activeRangeButton?.dataset.range || 'last-30-days'; // Default if none active.
        let startDate = null, endDate = null;

         if (currentRangeValue === 'custom') { // If custom range is active.
            const customButton = document.querySelector('.date-range-btn.custom');
            startDate = customButton?.dataset.startDate; // Get custom start date.
            endDate = customButton?.dataset.endDate;   // Get custom end date.
            if (!startDate || !endDate) { // Validate custom dates.
                 isRefreshing = false; if(manualRefreshButton) manualRefreshButton.disabled = false; if(loadingIndicator) loadingIndicator.style.display = 'none';
                 showNotification("Could not refresh custom range: Start or end date missing.", "error"); return;
            }
         }

        // Fetch data for the determined range.
        fetchDataForRange(currentRangeValue, startDate, endDate)
            .then(() => { showNotification("Dashboard data has been refreshed.", "success"); })
            .catch((error) => { console.error("Error during manual data refresh:", error); showNotification("Failed to refresh dashboard data.", "error");})
            .finally(() => { // Reset refreshing state.
                 isRefreshing = false;
                 if(manualRefreshButton) manualRefreshButton.disabled = false;
                 if(loadingIndicator) loadingIndicator.style.display = 'none';
            });
    }
    // Event listener for auto-refresh checkbox.
    if (autoRefreshCheckbox) {
        autoRefreshCheckbox.addEventListener('change', function() {
            if (this.checked) { // If auto-refresh is enabled.
                const interval = 300000; // 5 minutes in milliseconds.
                refreshStatsData(); // Refresh immediately.
                refreshIntervalId = setInterval(refreshStatsData, interval); // Start interval.
                console.log(`Auto-refresh enabled: Interval ${interval/60000} minutes.`);
            } else { clearInterval(refreshIntervalId); refreshIntervalId = null; console.log("Auto-refresh disabled"); } // Disable auto-refresh.
        });
    }
    // Event listener for manual refresh button.
    if (manualRefreshButton) { manualRefreshButton.addEventListener('click', refreshStatsData); }

    // --- Progress Bar Widths ---
    // Updates the width of progress bars based on their 'data-width' attribute.
    function updateProgressBars() {
        const progressBars = document.querySelectorAll('.data-table .progress-bar[data-width]'); // Select all relevant progress bars.
        progressBars.forEach(bar => {
            const widthValue = bar.getAttribute('data-width');
            const numericWidth = parseFloat(widthValue);
            if (!isNaN(numericWidth)) { // If width is a valid number.
                 const clampedWidth = Math.max(0, Math.min(100, numericWidth)); // Ensure width is between 0 and 100.
                 bar.style.width = `${clampedWidth}%`; // Set style.
                 const span = bar.nextElementSibling; // Update accompanying percentage text if present.
                 if (span?.tagName === 'SPAN') { span.textContent = `${Math.round(clampedWidth)}%`; }
            } else { bar.style.width = '0%'; const span = bar.nextElementSibling; if (span?.tagName === 'SPAN') { span.textContent = '0%'; } } // Default to 0% on invalid data.
        });
    }

    // --- Date Range Filtering ---
    const dateRangeButtons = document.querySelectorAll('.date-range-btn'); // All date range selection buttons.
    const customDateBtn = document.querySelector('.date-range-btn.custom'); // Specific button for custom range.

    // Fetches ALL dashboard data (Main stats + Edit stats) for a given date range.
    function fetchDataForRange(range, startDate = null, endDate = null) {
        showLoadingState("Fetching latest analytics data..."); // Show full-page loader.
        let mainApiUrl = `/api/analytics-data/?range=${range}`; // Base URL for main analytics.
        let editApiUrl = `/api/analytics-edit-stats/?range=${range}`; // Base URL for edit statistics.

        if (range === 'custom') { // If custom range, append start and end dates.
             if (startDate && endDate) {
                 const dateParams = `&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;
                 mainApiUrl += dateParams;
                 editApiUrl += dateParams;
             } else { // Error if custom range selected but dates are missing.
                 hideLoadingState(); showNotification('Custom date range selected, but dates are missing.', 'error');
                 return Promise.reject(new Error("Missing custom dates for API call"));
             }
        }

        console.log(`Fetching data for range: ${range}`);
        console.log(`Main API URL: ${mainApiUrl}`);
        console.log(`Edit Stats API URL: ${editApiUrl}`);

        const fetchOptions = { method: 'GET', headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' } };

        // Fetch main analytics data.
        const fetchMainData = fetch(mainApiUrl, fetchOptions).then(response => {
             if (!response.ok) { // Handle HTTP errors for main data.
                 return response.json().then(err => Promise.reject(err.message || `Main analytics data fetch failed: ${response.status}`)).catch(() => Promise.reject(`Main analytics data fetch failed: ${response.status} ${response.statusText}`)); 
             }
             return response.json();
        });

        // Fetch edit statistics data.
        const fetchEditData = fetch(editApiUrl, fetchOptions).then(response => {
            if (!response.ok) { // Handle HTTP errors for edit stats.
                return response.json().then(err => Promise.reject(err.message || `Review edit stats fetch failed: ${response.status}`)).catch(() => Promise.reject(`Review edit stats fetch failed: ${response.status} ${response.statusText}`)); 
            }
            return response.json();
        }).catch(error => { // Catch network or parsing errors specifically for edit stats.
             console.error('⚠️ Error fetching edit stats (will use default/empty structure):', error.message || error);
             showNotification('Could not load review edit statistics. Some data may be missing.', 'warning');
             // Return a default structure so Promise.all doesn't fail completely.
             return { status: 'error', total_edits: null, edits_per_moderator: [], edit_log_details: [] };
        });

        // Process both promises concurrently.
        return Promise.all([fetchMainData, fetchEditData])
            .then(([mainData, editData]) => {
                console.log('✅ Main analytics data received:', mainData);
                console.log('✅ Edit statistics received:', editData);

                if (!mainData || mainData.status !== 'success') { // Validate main data structure.
                    throw new Error('Received main analytics data in an unexpected format or status was not success.');
                }

                // Combine data: main data is primary, edit_stats is added.
                const combinedData = { ...mainData, edit_stats: editData };

                updateDashboard(combinedData); // Update all dashboard sections.
                console.log('📈 Dashboard updated with combined data from both APIs.');

                // Update displayed date range and last updated time from mainData's metadata.
                const dateRangeStartEl = document.getElementById('date-range-start');
                const dateRangeEndEl = document.getElementById('date-range-end');
                const lastUpdatedEl = document.getElementById('last-updated-time');

                if(mainData.meta) { // If metadata exists.
                    if(dateRangeStartEl && mainData.meta.period_start) dateRangeStartEl.textContent = formatDisplayDate(mainData.meta.period_start);
                    if(dateRangeEndEl && mainData.meta.period_end) dateRangeEndEl.textContent = formatDisplayDate(mainData.meta.period_end);
                    if(lastUpdatedEl && mainData.meta.generated_at) { // Format and display last updated time.
                        try { lastUpdatedEl.textContent = new Date(mainData.meta.generated_at).toLocaleString(); }
                        catch (e) { lastUpdatedEl.textContent = mainData.meta.generated_at; } // Fallback.
                    }
                } else {
                     console.warn("Main analytics data is missing 'meta' field for date range display.");
                }
            })
            .catch(error => { // Catch errors from Promise.all or data processing.
                console.error('❌ Error processing fetched dashboard data:', error);
                showNotification(`Failed to load complete dashboard data: ${error.message || 'An unknown error occurred'}`, 'error');
            })
            .finally(() => { hideLoadingState(); }); // Hide loader regardless of outcome.
    }


    // --- Custom Date Range Modal Functions ---
    // Creates the modal for selecting a custom date range if it doesn't exist.
     function createDateRangeModal() { if (dateRangeModal) return; /* Prevent multiple modals */ dateRangeModal = document.createElement('div'); dateRangeModal.id = 'customDateModal'; dateRangeModal.className = 'date-modal'; dateRangeModal.style.cssText = `display: none; position: fixed; z-index: 10001; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.6); justify-content: center; align-items: center; font-family: sans-serif;`; dateRangeModal.innerHTML = `<div class="modal-content" style="background-color: #fff; padding: 25px; border-radius: 8px; width: auto; min-width: 350px; max-width: 450px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); text-align: left;"><h2 style="margin-top: 0; margin-bottom: 25px; font-size: 1.4em; color: #333; text-align: center;">Select Custom Date Range</h2><div class="date-inputs" style="margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px;"><div><label for="startDate" style="display: block; margin-bottom: 5px; font-size: 0.9em; color: #555;">Start Date:</label><input type="date" id="startDate" name="startDate" style="padding: 10px; border: 1px solid #ccc; border-radius: 4px; width: 100%; box-sizing: border-box;"></div><div><label for="endDate" style="display: block; margin-bottom: 5px; font-size: 0.9em; color: #555;">End Date:</label><input type="date" id="endDate" name="endDate" style="padding: 10px; border: 1px solid #ccc; border-radius: 4px; width: 100%; box-sizing: border-box;"></div></div><p id="date-error-message" style="color: #D8000C; background-color: #FFD2D2; border: 1px solid #FFB8B8; padding: 8px 12px; border-radius: 4px; margin-top: 10px; font-size: 0.9em; display: none;"></p><div class="modal-actions" style="margin-top: 25px; display: flex; justify-content: flex-end; gap: 10px;"><button id="cancelDate" class="secondary-btn" style="padding: 10px 18px; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px; cursor: pointer; font-weight: 600;">Cancel</button><button id="applyDate" class="primary-btn" style="padding: 10px 18px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Apply</button></div></div>`; document.body.appendChild(dateRangeModal); startDateInput = dateRangeModal.querySelector('#startDate'); endDateInput = dateRangeModal.querySelector('#endDate'); dateRangeModal.querySelector('#applyDate').addEventListener('click', applyCustomDateRange); dateRangeModal.querySelector('#cancelDate').addEventListener('click', closeModal); dateRangeModal.addEventListener('click', function(event) { if (event.target === dateRangeModal) { closeModal(); } }); console.log("Custom date range modal element created."); }
    // Opens the custom date range modal, pre-filling dates if available.
     function openCustomDateModal() { if (!dateRangeModal) createDateRangeModal(); const customButton = document.querySelector('.date-range-btn.custom'); const todayStr = formatDateForInput(new Date()); /* Get today's date in YYYY-MM-DD */ startDateInput.value = customButton?.dataset.startDate || todayStr; /* Pre-fill with stored or today */ endDateInput.value = customButton?.dataset.endDate || todayStr; /* Pre-fill with stored or today */ startDateInput.max = todayStr; /* Prevent future start dates */ endDateInput.max = todayStr; /* Prevent future end dates */ const errorMessageEl = dateRangeModal.querySelector('#date-error-message'); if(errorMessageEl) errorMessageEl.style.display = 'none'; /* Clear previous errors */ dateRangeModal.style.display = 'flex'; console.log("Custom date range modal opened."); }
    // Closes the custom date range modal.
     function closeModal() { if (dateRangeModal) dateRangeModal.style.display = 'none'; console.log("Custom date range modal closed."); }
    // Applies the selected custom date range and fetches data.
     function applyCustomDateRange() { const startDate = startDateInput.value; const endDate = endDateInput.value; const errorMessageEl = dateRangeModal?.querySelector('#date-error-message'); if (!startDate || !endDate) { if(errorMessageEl) { errorMessageEl.textContent = 'Please select both start and end dates.'; errorMessageEl.style.display = 'block'; } return; } if (new Date(startDate) > new Date(endDate)) { if(errorMessageEl) { errorMessageEl.textContent = 'Start date cannot be after the end date.'; errorMessageEl.style.display = 'block'; } return; } if (new Date(endDate) > new Date()) { if(errorMessageEl) { errorMessageEl.textContent = 'End date cannot be in the future.'; errorMessageEl.style.display = 'block'; } return; } if(errorMessageEl) errorMessageEl.style.display = 'none'; console.log(`Applying custom date range: ${startDate} to ${endDate}`); dateRangeButtons.forEach(btn => btn.classList.remove('active')); if(customDateBtn) customDateBtn.classList.add('active'); if(customDateBtn) { try { customDateBtn.innerHTML = `<i class="fas fa-calendar"></i> ${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`; } catch(e){ customDateBtn.innerHTML = `<i class="fas fa-calendar"></i> ${startDate} to ${endDate}`; } customDateBtn.dataset.startDate = startDate; customDateBtn.dataset.endDate = endDate; } currentRange = 'custom'; fetchDataForRange('custom', startDate, endDate); closeModal(); }
    // Formats a Date object into YYYY-MM-DD string for date input fields.
     function formatDateForInput(date) { try { const d = new Date(date); let m = ''+(d.getMonth()+1); let day = ''+d.getDate(); const y = d.getFullYear(); if (m.length < 2) m='0'+m; if (day.length < 2) day='0'+day; return [y,m,day].join('-'); } catch (e) { /* Fallback to today if input date is invalid */ const today=new Date(); let m = ''+(today.getMonth()+1); let day=''+today.getDate(); const y=today.getFullYear(); if (m.length < 2)m='0'+m; if (day.length < 2)day='0'+day; return [y,m,day].join('-'); } }

    // --- Add listeners to date range buttons ---
    // Sets up event listeners for predefined and custom date range buttons.
    if (dateRangeButtons.length > 0) { dateRangeButtons.forEach(button => { button.addEventListener('click', function(e) { e.preventDefault(); const range = this.dataset.range; if (range === 'custom') { openCustomDateModal(); } else if (!this.classList.contains('active')) { /* If not already active */ dateRangeButtons.forEach(btn => btn.classList.remove('active')); this.classList.add('active'); if (customDateBtn && customDateBtn.innerHTML.includes('-')) { /* Reset custom button text if a predefined range is clicked */ customDateBtn.innerHTML = '<i class="fas fa-calendar"></i> Custom'; delete customDateBtn.dataset.startDate; delete customDateBtn.dataset.endDate; } currentRange = range; fetchDataForRange(range); } }); }); const initialButton = document.querySelector(`.date-range-btn[data-range="${currentRange}"]`) || document.querySelector('.date-range-btn'); /* Select initial active button */ if(initialButton) initialButton.classList.add('active'); else console.warn(`Initial active button not found for range: ${currentRange}.`); } else { console.warn("No date range buttons found on the page."); }

    // --- Main Dashboard Update Function ---
    // Central function to update all sections of the dashboard with new data.
    function updateDashboard(data) {
         console.log("Updating all dashboard sections with new data...", data);
        // Update standard sections if data is available.
        if(data.stats) updateStatCards(data.stats);
        if(data.review_trends) updateReviewTrendsChart(data.review_trends);
        if(data.top_destinations) updateTopDestinations(data.top_destinations);
        if(data.admin_performance) updateAdminPerformance(data.admin_performance);

        // Update Edit Stats Section (Aggregate counts + Detailed log table).
        if(data.edit_stats) {
            // Check if edit stats loaded correctly (status might be 'error' from the catch block in fetchDataForRange).
            if (data.edit_stats.status !== 'error') {
                 updateEditAnalytics(data.edit_stats); // Handles aggregate counts like total_edits.
                 updateEditLogDetails(data.edit_stats.edit_log_details); // Handles the detailed edit log table.
            } else {
                 // Handle case where edit stats fetch failed but returned the default error object.
                 updateEditAnalytics(null); // Call with null to show N/A or 0 in aggregates.
                 updateEditLogDetails(null); // Call with null to show an empty table message for details.
            }
        } else {
             // Handle case where edit_stats might be missing entirely from the response.
             console.warn("Edit statistics data ('edit_stats') missing from API response.");
             updateEditAnalytics(null); // Show N/A or 0.
             updateEditLogDetails(null); // Show empty table message.
        }

        updateProgressBars(); // Update progress bar widths after tables are potentially rebuilt.
         console.log("All dashboard sections have been updated.");
    }

    // --- Functions to update specific dashboard sections ---
    // Updates the main statistic cards (e.g., total reviews, approval rate).
    function updateStatCards(stats) { console.log("Updating statistic cards:", stats); Object.keys(stats).forEach(statName => { const statData = stats[statName]; const card = document.querySelector(`.stat-card[data-stat="${statName}"]`); if (!card) { console.warn(`Statistic card not found for: ${statName}`); return; } const valueEl = card.querySelector('.stat-value'); const changeEl = card.querySelector('.stat-change'); if (!statData || typeof statData.value === 'undefined' || typeof statData.change === 'undefined') { /* Handle missing or incomplete data */ if(valueEl) valueEl.textContent = 'N/A'; if(changeEl) changeEl.innerHTML = '<i class="fas fa-minus"></i> --%'; return; } if (valueEl) { let displayValue = 'N/A'; try { const numValue = parseFloat(statData.value); if (isNaN(numValue)) throw new Error("Value is not a number"); /* Format specific stats differently */ if (statName === 'approval_rate') displayValue = `${numValue.toFixed(1)}%`; else if (statName === 'avg_rating') displayValue = numValue.toFixed(1); else displayValue = new Intl.NumberFormat().format(Math.round(numValue)); /* General number formatting */ } catch(e) { console.error(`Error formatting value for stat ${statName}:`, e); } valueEl.textContent = displayValue; } if (changeEl) { const iconEl = changeEl.querySelector('i'); let changeText = '--'; let changeClass = 'neutral'; try { const numChange = parseFloat(statData.change); if(isNaN(numChange)) throw new Error("Change value is not a number"); const isPositive = typeof statData.is_positive === 'boolean' ? statData.is_positive : numChange >= 0; /* Determine if change is positive trend */ if (numChange !== 0) { changeClass = isPositive ? 'positive' : 'negative'; const changeSuffix = (statName !== 'avg_rating') ? '%' : ''; /* Suffix for non-rating changes */ const sign = (isPositive && numChange !== 0) ? '+' : ''; changeText = `${sign}${Math.abs(numChange).toFixed(1)}${changeSuffix}`; } else { changeText = `0.0${(statName !== 'avg_rating') ? '%' : ''}`; changeClass = 'neutral'; } if (iconEl) { iconEl.className = `fas fa-arrow-${numChange === 0 ? 'minus' : (isPositive ? 'up' : 'down')}`; } /* Update icon */ } catch (e) { console.error(`Error formatting change for stat ${statName}:`, e); if (iconEl) iconEl.className = 'fas fa-question-circle'; /* Error icon */ } changeEl.classList.remove('positive', 'negative', 'neutral'); changeEl.classList.add(changeClass); /* Apply style class */ if(iconEl && iconEl.nextSibling?.nodeType === Node.TEXT_NODE) { iconEl.nextSibling.textContent = ` ${changeText}`; } else if(iconEl) { changeEl.appendChild(document.createTextNode(` ${changeText}`));} else { changeEl.innerHTML = `<i class="fas fa-question-circle"></i> ${changeText}`; } } }); }

    // Generates HTML for star rating display.
    function generateStarRating(rating) { if (typeof rating !== 'number' || isNaN(rating)) rating = 0; /* Default to 0 if invalid */ const maxStars = 5; let starsHtml = ''; const full = Math.floor(rating); const half = rating % 1 >= 0.4; /* Threshold for half star */ const empty = maxStars - full - (half ? 1 : 0); for (let i = 0; i < full; i++) starsHtml += '<i class="fas fa-star"></i>'; if (half) starsHtml += '<i class="fas fa-star-half-alt"></i>'; for (let i = 0; i < empty; i++) starsHtml += '<i class="far fa-star"></i>'; return `<div class="rating">${starsHtml} <span style="margin-left: 5px; font-weight: bold;">${rating.toFixed(1)}</span></div>`; }

    // Updates the "Top Destinations" table.
    function updateTopDestinations(destinations) {
        console.log("Updating top destinations table:", destinations);
        const tableBody = document.getElementById('top-destinations-tbody'); 
        if (!tableBody) { console.warn('Top destinations table body (#top-destinations-tbody) not found.'); return; }
        tableBody.innerHTML = ''; // Clear previous rows.
        if (destinations && destinations.length > 0) { // If data exists.
            destinations.forEach(dest => { const row = document.createElement('tr'); /* Extract and format data for each cell */ const name = dest.name || 'N/A'; const country = dest.country || 'N/A'; const count = typeof dest.review_count === 'number' ? new Intl.NumberFormat().format(dest.review_count) : '0'; const rating = typeof dest.avg_rating === 'number' ? parseFloat(dest.avg_rating) : 0; const sentiment = dest.sentiment || 'Neutral'; const s_class = dest.sentiment_class || 'neutral'; const s_icon = dest.sentiment_icon || 'fa-meh'; const t_dir = dest.trending_direction || 'neutral'; const t_val = typeof dest.trending_value === 'number' ? Math.abs(dest.trending_value).toFixed(0) : '0'; let t_icon = 'fa-arrow-right'; let t_class = 'neutral'; if (t_dir === 'up') { t_icon = 'fa-arrow-up'; t_class = 'positive'; } else if (t_dir === 'down') { t_icon = 'fa-arrow-down'; t_class = 'negative'; } row.innerHTML = `<td>${name}</td><td>${country}</td><td style="text-align: right; padding-right: 15px;">${count}</td><td>${generateStarRating(rating)}</td><td><div class="sentiment ${s_class}"><i class="fas ${s_icon}"></i><span>${sentiment}</span></div></td><td><div class="trend ${t_class}"><i class="fas ${t_icon}"></i><span>${t_val}%</span></div></td>`; tableBody.appendChild(row); });
        } else { tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No top destination data available for this period.</td></tr>'; } // Message for no data.
    }

    // Updates the "Admin Performance" table.
     function updateAdminPerformance(adminData) { console.log("Updating admin performance table:", adminData); adminPerformanceDataCache = Array.isArray(adminData) ? adminData : []; /* Cache data for export */ const tableBody = document.querySelector('.content-card:has(.fairness-insight-panel) .data-table tbody'); /* More specific selector */ if (!tableBody) { console.warn('Admin performance table body not found.'); return; } tableBody.innerHTML = ''; if (adminPerformanceDataCache.length > 0) { adminPerformanceDataCache.forEach(admin => { const row = document.createElement('tr'); /* Extract and format admin data */ const name = admin.name || 'Unknown Admin'; const avatar = admin.avatar || '/static/images/admin-avatar-placeholder.png'; /* Default avatar */ const processed = typeof admin.reviews_processed === 'number' ? new Intl.NumberFormat().format(admin.reviews_processed) : '0'; const responseTime = admin.avg_response_time || 'N/A'; const approval = typeof admin.approval_rate === 'number' ? Math.max(0, Math.min(100, admin.approval_rate)) : 0; const consistency = typeof admin.consistency_score === 'number' ? Math.max(0, Math.min(100, admin.consistency_score)) : 0; const langs = admin.languages || 'N/A'; let approvalClass = admin.approval_rate_class || get_status_class(approval); /* Get CSS class for progress bar */ let consistencyClass = admin.consistency_class || get_status_class(consistency); row.innerHTML = `<td><div class="user-cell"><img src="${avatar}" alt="${name}" class="admin-avatar" onerror="this.onerror=null; this.src='/static/images/admin-avatar-placeholder.png';"><div class="user-info"><div class="user-name">${name}</div></div></div></td><td class="numeric">${processed}</td><td class="numeric">${responseTime}</td><td><div class="progress-bar-container"><div class="progress-bar ${approvalClass}" data-width="${approval.toFixed(0)}"></div><span>${approval.toFixed(0)}%</span></div></td><td><div class="progress-bar-container"><div class="progress-bar ${consistencyClass}" data-width="${consistency.toFixed(0)}"></div><span>${consistency.toFixed(0)}%</span></div></td><td>${langs}</td>`; tableBody.appendChild(row); }); } else { tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No admin performance data available for this period.</td></tr>'; } /* Progress bars are updated by the separate updateProgressBars() function */ }
     // Helper function to determine status class for progress bars based on value.
     function get_status_class(value) { if (value >= 80) return "bg-success"; else if (value >= 70) return "bg-info"; else if (value >= 60) return "bg-warning"; else return "bg-danger"; }

    // Updates the aggregate edit statistics (e.g., total edits card, edits per moderator table).
    function updateEditAnalytics(editStats) {
        console.log("Updating aggregate review edit analytics:", editStats);

        // Update "Total Edits" stat card value.
        const totalEditsValueEl = document.getElementById('total-edits-value');
        if (totalEditsValueEl) {
             if (editStats && typeof editStats.total_edits === 'number') { // If valid data.
                totalEditsValueEl.textContent = new Intl.NumberFormat().format(editStats.total_edits);
             } else {
                 totalEditsValueEl.textContent = 'N/A'; // Show N/A if no data or error.
             }
        } else { console.warn("Element with ID 'total-edits-value' not found."); }
        
        // Update "Edits per Moderator" table.
        const tableBody = document.querySelector('#moderator-edits-table tbody');
        if (!tableBody) { console.warn("Table body for '#moderator-edits-table' not found."); return; }
        tableBody.innerHTML = ''; // Clear previous rows.

        if (editStats && Array.isArray(editStats.edits_per_moderator) && editStats.edits_per_moderator.length > 0) { // If data exists.
            editStats.edits_per_moderator.forEach(mod => { // Create row for each moderator.
                const row = document.createElement('tr');
                const modName = mod.moderator_name || 'Unknown Moderator';
                const editCount = typeof mod.edit_count === 'number' ? new Intl.NumberFormat().format(mod.edit_count) : '0';
                row.innerHTML = `<td>${modName}</td><td style="text-align: right; padding-right: 15px;">${editCount}</td>`;
                tableBody.appendChild(row);
            });
        } else if (editStats && editStats.total_edits === null) { // Specifically handle case where data load failed.
             tableBody.innerHTML = '<tr><td colspan="2" class="text-center">Could not load review edit data.</td></tr>';
        } else { // No edits found for the period.
            tableBody.innerHTML = '<tr><td colspan="2" class="text-center">No review edits found for this period.</td></tr>';
        }
    }

    // Updates the detailed "Edit Log" table.
    function updateEditLogDetails(logDetails) {
        console.log("Updating detailed edit log table with entries:", logDetails);
        const tableBody = document.getElementById('edit-log-details-tbody'); // Table body for detailed logs.
        if (!tableBody) { console.warn("Table body for '#edit-log-details-tbody' not found."); return; }
        tableBody.innerHTML = ''; // Clear previous log entries.

        if (logDetails && Array.isArray(logDetails) && logDetails.length > 0) { // If log entries exist.
            logDetails.forEach(log => { // Create a row for each log entry.
                const row = document.createElement('tr');
                let formattedTimestamp = 'N/A'; // Format timestamp.
                if (log.timestamp) {
                    try { formattedTimestamp = new Date(log.timestamp).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
                    catch (e) { formattedTimestamp = log.timestamp; } // Fallback to raw timestamp.
                }
                const editor = log.editor_name || 'Unknown';
                // Create a link to the review if review_id is available.
                const reviewLink = log.review_id ? `<a href="/reviews/${log.review_id}/" target="_blank" title="View Review">${log.review_id}</a>` : 'N/A';
                const reviewIdentifier = log.review_identifier || 'N/A'; // Display review title/place as identifier.

                // Construct the table row HTML.
                row.innerHTML = `
                    <td>${formattedTimestamp}</td>
                    <td>${editor}</td>
                    <td>${reviewLink}</td> <td>${reviewIdentifier}</td>
                `;
                tableBody.appendChild(row);
            });
        } else { // No log details found.
             let colspan = 4; // Number of columns in the detail table.
             tableBody.innerHTML = `<tr><td colspan="${colspan}" class="text-center">No recent edit details found for this period.</td></tr>`;
        }
    }


    // --- Export Admin Performance Data  ---
    // Exports the cached admin performance data to a CSV file.
    function exportAdminPerformanceData() { console.log("Attempting to export admin performance data..."); if (!adminPerformanceDataCache || adminPerformanceDataCache.length === 0) { showNotification("No admin performance data available to export.", "info"); return; } const headers = [ "Name", "Reviews Processed", "Avg Response Time (h)", "Approval Rate (%)", "Consistency Score (%)", "Languages" ]; const csvRows = [ headers.join(',') ]; /* Header row */ adminPerformanceDataCache.forEach(admin => { /* Sanitize and format each field for CSV */ const name = `"${(admin.name || '').replace(/"/g, '""')}"`; const reviews = admin.reviews_processed || 0; const responseTime = (admin.avg_response_time || 'N/A').replace('h', ''); const approval = admin.approval_rate || 0; const consistency = admin.consistency_score || 0; const languages = `"${(admin.languages || 'N/A').replace(/"/g, '""')}"`; csvRows.push([name, reviews, responseTime, approval, consistency, languages].join(',')); }); const csvString = csvRows.join('\r\n'); /* Join rows */ const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' }); /* Create Blob */ try { const link = document.createElement("a"); const url = URL.createObjectURL(blob); const timestamp = new Date().toISOString().slice(0, 10); /* Timestamp for filename */ link.setAttribute("href", url); link.setAttribute("download", `admin_performance_report_${timestamp}.csv`); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); /* Trigger download */ document.body.removeChild(link); URL.revokeObjectURL(url); /* Clean up */ showNotification("Admin performance data export started.", "success"); } catch (error) { console.error("CSV export process error:", error); showNotification("CSV export failed due to an error.", "error"); } }

    // --- Export Button Listener ---
    const exportButton = document.getElementById('exportAdminPerformanceBtn'); // Button to trigger CSV export.
    if (exportButton) {
        exportButton.addEventListener('click', exportAdminPerformanceData);
        console.log("Admin performance export button listener attached.");
    } else {
        console.warn("Export button ('#exportAdminPerformanceBtn') not found.");
    }

    // --- View Detailed Report Button Listener ---
    const viewDetailedReportButton = document.querySelector('.fairness-insight-panel .primary-btn'); // Button to view detailed bias report.
    if (viewDetailedReportButton) {
        viewDetailedReportButton.addEventListener('click', function(e) {
            console.log("View Detailed Report button clicked by user.");
            showNotification("The detailed bias report view is not yet implemented.", "info");
            // Example navigation: window.location.href = '/analytics/detailed-bias-report/';
        });
        console.log("View Detailed Report button listener attached.");
    } else {
         console.warn("View Detailed Report button ('.fairness-insight-panel .primary-btn') not found.");
    }


    // --- Initial Data Load ---
    fetchDataForRange(currentRange); // Fetch data for the default range on page load.

    console.log("Analytics dashboard script initialized successfully.");
});
