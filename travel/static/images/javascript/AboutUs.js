// Wait for the HTML document to be fully loaded and parsed before running the script.
document.addEventListener('DOMContentLoaded', function() {

    // Select all elements on the page that have the class 'counter-container'. These are the elements we want to animate.
    const counters = document.querySelectorAll('.counter-container');

    // If no elements with the 'counter-container' class are found, log an error and stop the script execution.
    if (counters.length === 0) {
        console.error('No counter elements found on the page!');
        return;
    }

    // Define configurations for different types of counters.
    // Each key corresponds to a CSS class that identifies the counter type.
    // 'target' is the final number the counter should reach.
    // 'suffix' is any text (like 'M' for million or 'K' for thousand) to append to the number.
    const counterConfigs = {
        'country-counter': { target: 180, suffix: '' },
        'reviews-counter': { target: 1.5, suffix: 'M' },
        'members-counter': { target: 500, suffix: 'K' },
        'years-counter': { target: 10, suffix: '' }
    };

    // Function responsible for animating a single counter element.
    function animateCounter(counterElement) {
        // Initialize config variable to null.
        let config = null;
        // Loop through the defined configurations.
        for (let className in counterConfigs) {
            // Check if the current counter element has the class name defined in the config key.
            if (counterElement.classList.contains(className)) {
                // If it matches, store the corresponding configuration and exit the loop.
                config = counterConfigs[className];
                break;
            }
        }

        // If no configuration was found for this specific counter element, log a warning and exit the function.
        if (!config) {
            console.warn('No configuration found for counter element:', counterElement);
            return;
        }

        // Destructure the target value and suffix from the found configuration.
        const { target, suffix } = config;
        // Set the total duration for the animation (in milliseconds).
        const duration = 2000; // 2 seconds
        // Define the desired frames per second for the animation.
        const fps = 60;
        // Calculate the time interval between frames.
        const interval = duration / fps; // This calculation isn't strictly needed with requestAnimationFrame
        // Calculate the total number of frames needed to complete the animation.
        const totalFrames = Math.round(duration / (1000 / fps)); // Calculate total frames based on duration and fps

        // Initialize the current frame count.
        let currentFrame = 0;

        // Define the function that updates the counter's display in each animation frame.
        function updateCounter() {
            // Increment the frame count.
            currentFrame++;
            
            // Calculate the current value based on the animation progress (linear interpolation).
            let currentValue;
            // Special handling for the target value 1.5 to display one decimal place.
            if (target === 1.5) {
                currentValue = (target * currentFrame / totalFrames).toFixed(1);
            } else {
                // For other targets, round the value to the nearest whole number.
                currentValue = Math.round(target * currentFrame / totalFrames);
            }

            // Update the text content of the counter element with the current value and its suffix.
            counterElement.textContent = `${currentValue}${suffix}`;

            // If the animation is not yet complete (current frame is less than total frames).
            if (currentFrame < totalFrames) {
                // Request the next animation frame, calling updateCounter again.
                requestAnimationFrame(updateCounter);
            } else {
                // Ensure the counter displays the exact target value upon completion.
                counterElement.textContent = `${target}${suffix}`;
            }
        }

        // Start the animation loop.
        requestAnimationFrame(updateCounter); // Use requestAnimationFrame for smoother animations
    }

    // Iterate over each found counter element to set up its animation trigger.
    counters.forEach(counter => {
        // Check if the browser supports the Intersection Observer API.
        if ('IntersectionObserver' in window) {
            // Create an observer instance.
            const observer = new IntersectionObserver((entries) => {
                // Loop through the observed entries (in this case, usually just one).
                entries.forEach(entry => {
                    // If the counter element is now intersecting (visible) in the viewport.
                    if (entry.isIntersecting) {
                        // Start the animation for this specific counter element.
                        animateCounter(entry.target);
                        // Stop observing this element, so the animation only runs once when it becomes visible.
                        observer.unobserve(entry.target);
                    }
                });
            }, { 
                // Set the threshold: trigger when at least 10% of the element is visible.
                threshold: 0.1 
            });

            // Start observing the current counter element.
            observer.observe(counter);
        } else {
            // If Intersection Observer is not supported (older browsers), animate the counter immediately.
            animateCounter(counter);
        }
    });
});