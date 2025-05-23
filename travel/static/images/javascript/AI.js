document.addEventListener('DOMContentLoaded', function() {
    // Select various elements that make up the chat widget interface
    const chatToggle = document.getElementById('chatToggle');
    const chatContainer = document.getElementById('chatContainer');
    const closeChat = document.getElementById('closeChat');
    const userMessage = document.getElementById('userMessage');
    const sendMessage = document.getElementById('sendMessage');
    const chatMessages = document.getElementById('chatMessages');
    const suggestedResponsesContainer = document.getElementById('suggestedResponses');

    // Variable to store the unique session ID for the current chat conversation, provided by the backend.
    let chatSessionId = null;

    // Define an array of essential HTML elements required for the chat widget to function.
    const requiredElements = [
        chatToggle, 
        chatContainer, 
        closeChat, 
        userMessage, 
        sendMessage, 
        chatMessages, 
        suggestedResponsesContainer
    ];

    // Check if any of the essential elements were not found in the DOM.
    // .some() returns true if the callback function returns true for at least one element.
    if (requiredElements.some(el => !el)) {
        console.error('One or more critical chat widget elements are missing');
        // Stop script execution if essential elements are missing.
        return; 
    }

    // Add event listeners to any pre-existing suggested response buttons in the HTML.
    suggestedResponsesContainer.querySelectorAll('.suggested-response-button').forEach(button => {
        button.addEventListener('click', function() {
            // When a button is clicked, set its text content as the value of the input field.
            userMessage.value = this.textContent;
            // Automatically send the message.
            sendUserMessage();
        });
    });

    // Function to show or hide the chat widget container.
    function toggleChat(event) {
        // Prevent the event from bubbling up and stop default browser actions (like following a link if it was an anchor).
        event.stopPropagation();
        event.preventDefault();
        
        // Add or remove the 'hidden' class to toggle visibility.
        chatContainer.classList.toggle('hidden');
        
        // If the chat is now visible, ensure the suggested responses container is also visible.
        if (!chatContainer.classList.contains('hidden')) {
            suggestedResponsesContainer.classList.remove('hidden');
        }
    }

    // Attach the toggleChat function to multiple events on the chat toggle button 
    // to improve responsiveness across different devices and interactions (click, mouse down, touch start).
    chatToggle.addEventListener('click', toggleChat);
    chatToggle.addEventListener('mousedown', toggleChat);
    chatToggle.addEventListener('touchstart', toggleChat);

    // Add listener to the close button to hide the chat container.
    closeChat.addEventListener('click', function() {
        chatContainer.classList.add('hidden');
    });

    // Add a listener to the whole document to close the chat when clicking outside of it.
    document.addEventListener('click', function(e) {
        // Check if the click target is neither the chat container (nor inside it) 
        // NOR the chat toggle button itself.
        if (!chatContainer.contains(e.target) && !chatToggle.contains(e.target)) {
            // If the click was outside, hide the chat container.
            chatContainer.classList.add('hidden');
        }
    });

    // Function to dynamically create suggested response buttons based on data from the backend.
    function createSuggestedResponseButtons(suggestions) {
        // Basic validation to ensure suggestions is a non-empty array.
        if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
            suggestedResponsesContainer.innerHTML = ''; // Clear any existing buttons.
            suggestedResponsesContainer.classList.add('hidden'); // Hide the container.
            return;
        }

        // Clear any previously existing suggestion buttons.
        suggestedResponsesContainer.innerHTML = '';

        // Loop through the suggestions provided by the backend.
        suggestions.forEach(suggestion => {
            const button = document.createElement('button');
            button.textContent = suggestion;
            button.className = 'suggested-response-button';
            // Add listener to each new button: sets input value and sends message on click.
            button.addEventListener('click', () => {
                userMessage.value = suggestion;
                sendUserMessage();
            });
            suggestedResponsesContainer.appendChild(button);
        });

        // Make the suggestions container visible.
        suggestedResponsesContainer.classList.remove('hidden');
    }

    // Add listener to the send button.
    sendMessage.addEventListener('click', sendUserMessage);
    // Add listener to the input field to send message on pressing Enter key.
    userMessage.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendUserMessage();
        }
    });

    // Function to handle sending the user's message to the backend API.
    function sendUserMessage() {
        // Get the message text and remove leading/trailing whitespace.
        const message = userMessage.value.trim();
        // Proceed only if the message is not empty.
        if (message) {
            // Display the user's message in the chat window immediately.
            appendMessage('user', message);
            // Clear the input field.
            userMessage.value = '';
            
            // Create and display a 'Typing...' indicator for the assistant.
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'message assistant-message typing-indicator';
            typingIndicator.textContent = 'Typing...';
            chatMessages.appendChild(typingIndicator);
            // Scroll chat window to the bottom to show the indicator.
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Send the message data to the backend chat API endpoint using the Fetch API.
            fetch('/api/chat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Include the CSRF token required by Django for POST requests to prevent cross-site request forgery.
                    'X-CSRFToken': getCookie('csrftoken') 
                },
                // Send the user's query and the current session ID (if any) in the request body.
                body: JSON.stringify({ 
                    query: message,
                    session_id: chatSessionId 
                })
            })
            // Handle the initial response status.
            .then(response => {
                // Check if the response status indicates success (e.g., 2xx status code).
                if (!response.ok) {
                    // If not okay, throw an error to be caught by the .catch block.
                    throw new Error('Network response was not ok');
                }
                // Parse the JSON data from the response body.
                return response.json();
            })
            // Process the received JSON data.
            .then(data => {
                // Remove the 'Typing...' indicator if it still exists in the DOM.
                // document.body.contains() checks if an element is still part of the document.
                if (document.body.contains(typingIndicator)) {
                    chatMessages.removeChild(typingIndicator);
                }
                
                // Update the chat session ID if the backend provided one (for context tracking).
                if (data.session_id) {
                    chatSessionId = data.session_id;
                }
                
                // Display the assistant's response message. Provide a default if none received.
                appendMessage('assistant', data.response || 'I am processing your request.');

                // Create new suggested response buttons based on backend data, or use defaults.
                if (data.suggested_responses && data.suggested_responses.length > 0) {
                    createSuggestedResponseButtons(data.suggested_responses);
                } else {
                    // Provide default suggestions if the backend doesn't send any.
                    createSuggestedResponseButtons([
                        "Popular destinations", 
                        "Best beaches", 
                        "Top countries to visit"
                    ]);
                }
            })
            // Handle any errors during the fetch operation (network issues, server errors).
            .catch(error => {
                // Ensure the typing indicator is removed even if there's an error.
                if (document.body.contains(typingIndicator)) {
                    chatMessages.removeChild(typingIndicator);
                }
                
                // Display a generic error message to the user in the chat window.
                appendMessage('assistant', 'Sorry, I encountered an error. Please try again later.');
                // Log the actual error to the browser console for debugging.
                console.error('Chat API Error:', error);
            });
        }
    }

    // Function to add a new message (from user or assistant) to the chat display area.
    function appendMessage(sender, message) {
        const messageElement = document.createElement('div');
        // Apply appropriate CSS classes based on who sent the message.
        messageElement.className = `message ${sender}-message`;
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
        // Automatically scroll the chat window to the bottom to show the latest message.
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Utility function to retrieve a specific cookie value by its name (used here for CSRF token).
    function getCookie(name) {
        // Get the cookie string, split it into individual cookies, find the one starting with the required name.
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith(name + '='))
            // If found, split by '=' and get the value part.
            ?.split('=')[1]; 
        // Return the value or null if not found.
        return cookieValue || null;
    }
});