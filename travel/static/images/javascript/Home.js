document.addEventListener("DOMContentLoaded", function() { // Ensures script runs after HTML is fully loaded.
    // Slide Show Functionality
    function initializeSlideShow() {
        const slides = document.getElementsByClassName("mySlides"); // Gets all slide elements.
        const dots = document.getElementsByClassName("dot"); // Gets all dot indicator elements.
        
        if (slides.length === 0) { // Checks if any slides exist.
            console.log("No slides found");
            return; // Exits if no slides.
        }

        let slideIndex = 1; // Sets initial slide index.

        // Expose functions to global scope for HTML onclick attributes
        window.plusSlides = function(n) { // For next/previous slide navigation.
            showSlides(slideIndex += n);
        };

        window.currentSlide = function(n) { // For direct slide navigation via dots.
            showSlides(slideIndex = n);
        };

        function showSlides(n) { // Manages displaying the correct slide.
            const currentSlides = document.getElementsByClassName("mySlides"); // Re-fetch slides.
            // const currentDots = document.getElementsByClassName("dot"); // Re-fetch dots if used for active state.
            
            if (currentSlides.length === 0) return; // Exit if no slides.

            if (n > currentSlides.length) { slideIndex = 1; } // Loop to first slide if past the end.
            if (n < 1) { slideIndex = currentSlides.length; } // Loop to last slide if before the beginning.

            for (let i = 0; i < currentSlides.length; i++) {
                currentSlides[i].style.display = "none"; // Hide all slides.
            }
            currentSlides[slideIndex - 1].style.display = "block"; // Display the target slide.
        }

        showSlides(slideIndex); // Show the initial slide.

        // Optional: Auto-advance slides every 5 seconds
        setInterval(() => { // Sets interval for automatic slide advancement.
            plusSlides(1); // Advance to the next slide.
        }, 5000); // Interval time: 5 seconds.
    }

    // Destinations Carousel Functionality
    function initializeDestinationsCarousel() {
        const prevBtn = document.getElementById('prevDestination'); // Previous button for destinations.
        const nextBtn = document.getElementById('nextDestination'); // Next button for destinations.
        const carousel = document.querySelector('.destinations-carousel'); // Carousel container.

        if (!prevBtn || !nextBtn || !carousel) { // Check if essential elements exist.
            console.log("Destinations carousel elements not found");
            return;
        }

        const destinationsRow = carousel.querySelector('.destinations-row'); // Row containing carousel items.
        const firstCard = carousel.querySelector('.destination'); // Get a sample card to measure width.
        if (!firstCard) {
            console.log("No .destination card found in carousel for width calculation.");
            return;
        }
        const cardWidth = firstCard.offsetWidth; // Width of a single card.
        const gap = 20; // Assumed gap between cards.

        prevBtn.addEventListener('click', () => { // Event listener for previous button.
            carousel.scrollBy({
                left: -(cardWidth + gap), // Scroll left by one card width plus gap.
                behavior: 'smooth' // Smooth scroll animation.
            });
        });

        nextBtn.addEventListener('click', () => { // Event listener for next button.
            carousel.scrollBy({
                left: cardWidth + gap, // Scroll right by one card width plus gap.
                behavior: 'smooth'
            });
        });
    }

    // Seaside Carousel Functionality
    function initializeSeasideCarousel() {
        const carousel = document.querySelector('.seaside-carousel'); // Seaside carousel container.
        const nextBtn = document.querySelector('.seaside-next-btn'); // Next button for seaside carousel.

        if (!carousel || !nextBtn) { // Check if essential elements exist.
            console.log("Seaside carousel elements not found");
            return;
        }
        
        const firstCard = carousel.querySelector('.seaside-card'); // Get a sample card.
        if (!firstCard) {
            console.log("No .seaside-card found in carousel for width calculation.");
            return;
        }
        const cardWidth = firstCard.offsetWidth; // Width of a single card.
        const gap = 20; // Assumed gap.

        nextBtn.addEventListener('click', () => { // Event listener for next button.
            carousel.scrollBy({
                left: cardWidth + gap, // Scroll right.
                behavior: 'smooth'
            });

            // If we've reached the end, scroll back to the beginning (looping effect).
            if (carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - cardWidth) { // Check if near the end.
                setTimeout(() => { // Delay before snapping back.
                    carousel.scrollTo({
                        left: 0, // Scroll to start.
                        behavior: 'smooth'
                    });
                }, 500); // Delay of 0.5 seconds.
            }
        });
    }

    // Chat Widget Initialization
    function initializeChatWidget() {
        const chatToggle = document.getElementById('chatToggle'); // Button to show/hide chat.
        const chatContainer = document.getElementById('chatContainer'); // Main chat widget container.
        const closeChat = document.getElementById('closeChat'); // Button to close chat.
        const userMessage = document.getElementById('userMessage'); // Input field for user's message.
        const sendMessage = document.getElementById('sendMessage'); // Button to send message.
        const chatMessages = document.getElementById('chatMessages'); // Area where messages are displayed.
        const suggestedResponses = document.getElementById('suggestedResponses'); // Container for suggested quick replies.

        if (!chatToggle || !chatContainer || !closeChat || !userMessage || !sendMessage || !chatMessages) { // Check for essential chat elements.
            console.log("Chat widget elements not fully found");
            return;
        }

        // Add event listeners to initial suggested response buttons
        if (suggestedResponses) { // Check if the suggested responses container exists.
            suggestedResponses.querySelectorAll('.suggested-response-button').forEach(button => {
                button.addEventListener('click', function() { // When a suggested response is clicked.
                    userMessage.value = this.textContent; // Populate input with the suggestion.
                    sendMessage.click(); // Simulate clicking the send button.
                });
            });
        }


        // Toggle chat widget
        chatToggle.addEventListener('click', function() {
            chatContainer.classList.toggle('hidden'); // Show/hide chat container.
        });

        // Close chat widget
        closeChat.addEventListener('click', function() {
            chatContainer.classList.add('hidden'); // Hide chat container.
        });

        // Send message functionality
        sendMessage.addEventListener('click', function() {
            const message = userMessage.value.trim(); // Get and trim user's message.
            if (message) { // If message is not empty.
                // Add user message to chat
                const userMessageElement = document.createElement('div');
                userMessageElement.className = 'message user-message';
                userMessageElement.textContent = message;
                chatMessages.appendChild(userMessageElement);

                // Clear input
                userMessage.value = '';

                // Placeholder for assistant's response
                const responseElement = document.createElement('div');
                responseElement.className = 'message assistant-message';
                responseElement.textContent = "I'm processing your request..."; // Example response.
                chatMessages.appendChild(responseElement);

                // Scroll to bottom
                chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to the latest message.
            }
        });

        // Send on Enter key
        userMessage.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') { // If Enter key is pressed in message input.
                sendMessage.click(); // Simulate send button click.
            }
        });
    }

    // Initialize all functionalities
    initializeSlideShow();
    initializeDestinationsCarousel();
    initializeSeasideCarousel();
    initializeChatWidget();
});
