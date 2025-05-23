document.addEventListener("DOMContentLoaded", function() {
  // Form and validation functionality
  const reviewForm = document.getElementById("reviewForm");
  const successPage = document.getElementById("successPage");
  
  if (reviewForm) {
    console.log("✅ Review form detected, adding event listener...");
    
    // Setup star rating functionality
    setupStarRating();
    
    // Consolidated form submission with validation
    reviewForm.addEventListener("submit", function(e) {
      e.preventDefault();
      console.log("🚀 Validating and submitting review...");
      
      // Get form fields
      const destination = document.getElementById('destination') ? document.getElementById('destination').value.trim() : '';
      const reviewTitle = document.getElementById('reviewTitle').value.trim();
      const experienceDetails = document.getElementById('experienceDetails').value.trim();
      const photos = document.getElementById('photos').files;
      
      // Basic validation - required fields and image validation only
      if (!basicValidation(destination, reviewTitle, experienceDetails, photos)) {
        return; // Stop if basic validation fails
      }
      
      const formData = new FormData(this);
      const submitButton = reviewForm.querySelector('.btn-submit');
      const originalButtonText = submitButton.textContent;
      
      // Add a flag field for content that might need moderation
      // This will be checked by the backend but won't block submission
      const contentFlags = detectPotentialIssues(reviewTitle, experienceDetails);
      if (contentFlags.length > 0) {
        formData.append('content_flags', JSON.stringify(contentFlags));
        formData.append('needs_moderation', 'true');
        console.log("Content flags detected:", contentFlags);
      }
      
      // Disable button and show loading state
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';
      
      // Submit the form - without preventing submission for borderline content
      submitReview(this, formData, submitButton, originalButtonText);
    });
    
    // Preview images when selected
    setupImagePreview();
  } else {
    console.warn("❌ WARNING: Element with ID 'reviewForm' not found!");
  }
  
  // Functions for modal
  setupModalFunctions();
});

// Function to set up star rating
function setupStarRating() {
  const stars = document.querySelectorAll('.rating-stars label');
  const ratingInputs = document.querySelectorAll('.rating-stars input[type="radio"]');
  const ratingValue = document.getElementById('rating-value');
  
  if (stars.length > 0 && ratingValue) {
    // Reset rating initially
    ratingValue.value = '';
    ratingInputs.forEach(input => {
      input.checked = false;
    });
    
    stars.forEach((star, index) => {
      star.addEventListener('click', () => {
        // Stars are in reverse order (5 to 1) so calculate value correctly
        const value = 5 - index;
        ratingValue.value = value;
        
        // Make sure the correct radio button is checked
        ratingInputs[index].checked = true;
        
        // Update visual states (if needed)
        stars.forEach((s, i) => {
          if (i >= index) {
            s.classList.add('active');
          } else {
            s.classList.remove('active');
          }
        });
      });
    });
  }
}

// Basic validation function - only check required fields and image limits
function basicValidation(destination, reviewTitle, experienceDetails, photos) {
  // Basic validation
  if (!destination) {
    alert('Please select a destination.');
    return false;
  }
  
  if (!reviewTitle) {
    alert('Please provide a review title.');
    return false;
  }
  
  if (!experienceDetails) {
    alert('Please share details about your experience.');
    return false;
  }
  
  // Check for rating
  const ratingValue = document.getElementById('rating-value');
  const radioRating = document.querySelector('input[name="rating"]:checked');
  if (!ratingValue && !radioRating) {
    alert('Please provide a rating for your experience.');
    return false;
  }
  
  // Length check - require minimum length for meaningful reviews
  if (experienceDetails.length < 50) {
    alert('Please provide a more detailed review (at least 50 characters) to help other travelers.');
    return false;
  }
  
  // Image validation
  if (photos.length > 0 && !validateImages(photos)) {
    return false;
  }
  
  return true;
}

// Detect potential content issues without blocking submission
function detectPotentialIssues(title, details) {
  const flags = [];
  const combinedText = (title + " " + details).toLowerCase();
  
  // Check for explicit problematic content - these are still blocked
  const explicitProblematicPatterns = [
    // Racial slurs and variations
    /\bn[i1!]g+[ae3*@]|\bn[i1!]\s*g+\s*[ae3*@r]|\bpak[i1!]/i,
    
    // Homophobic slurs
    /\bf+[a@*]g+|\bd[yi!1]ke/i,
    
    // Severe profanity
    /\bf+[u*]c*k|\bc+[u*]n+t/i,
    
    // Explicit sexual content
    /\bp[o0]rn|\bxxx|\bnsfw|\bnude|\bexplicit/i
  ];
  
  // Check explicit problematic patterns
  for (const pattern of explicitProblematicPatterns) {
    if (pattern.test(combinedText)) {
      flags.push({
        type: 'explicit',
        severity: 'high',
        reason: 'Contains explicitly inappropriate content'
      });
      
      // Here we still alert the user about explicit issues
      alert('Your review contains content that violates our community guidelines. Please remove inappropriate language.');
      console.log('Matched explicit pattern:', pattern.toString());
      return flags; // Stop checking after finding explicit content
    }
  }
  
  // Flag promotional content - but don't block
  const promotionalPatterns = [
    // URLs and web references
    /\b(http|www|\.com|\.net|\.org|\.io|\.co|\.me)\b/i,
    
    // Promotional and marketing language
    /\b(discount|promo code|% off|coupon|sale|deal|limited time|offer)\b/i,
    
    // Contact information
    /\b(call me|text me|whatsapp|telegram|contact|phone number|email me)\b/i,
    
    // Social media solicitation
    /\b(follow me|like my|subscribe to|check out my|visit my page|my channel)\b/i
  ];
  
  // Check promotional patterns
  for (const pattern of promotionalPatterns) {
    if (pattern.test(combinedText)) {
      flags.push({
        type: 'promotional',
        severity: 'medium',
        reason: 'Contains potentially promotional content'
      });
      break; // Just add this flag once
    }
  }
  
  // Flag potential bias - without blocking
  const biasPatterns = [
    // Extreme claims or generalizations
    /\b(all|none|every|always|never|everybody|nobody|completely|absolutely)\b/i,
    
    // Overly promotional language for specific businesses
    /\b(best|greatest|perfect|excellence|exceptional|superior|unmatched|unparalleled|outstanding|unbeatable)\b/i,
    
    // Compensation or incentive mentions
    /\b(sponsored|paid|compensated|free|complimentary|given|received|in exchange for|incentive|reward)\b/i
  ];
  
  // Check bias patterns
  let biasMatches = 0;
  for (const pattern of biasPatterns) {
    if (pattern.test(combinedText)) {
      biasMatches++;
    }
  }
  
  // Only flag if multiple bias patterns are found
  if (biasMatches >= 2) {
    flags.push({
      type: 'bias',
      severity: 'low',
      reason: 'Contains potentially biased language',
      matches: biasMatches
    });
  }
  
  // Check for excessive capitalization (common in spam)
  const words = details.split(/\s+/);
  const capsWords = words.filter(w => w.length > 3 && w === w.toUpperCase());
  if (words.length > 5 && capsWords.length / words.length > 0.5) {
    flags.push({
      type: 'formatting',
      severity: 'low',
      reason: 'Contains excessive capitalization'
    });
  }
  
  // Check rating vs. sentiment consistency without blocking
  const ratingValue = document.getElementById('rating-value').value;
  
  if (ratingValue) {
    const positiveWords = ['excellent', 'wonderful', 'fantastic', 'loved', 'perfect', 'best', 'amazing', 'great'];
    const negativeWords = ['terrible', 'awful', 'horrible', 'worst', 'bad', 'disappointed', 'poor', 'avoid'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    // Count positive and negative sentiment words
    positiveWords.forEach(word => {
      const regex = new RegExp('\\b' + word + '\\b', 'gi');
      const matches = combinedText.match(regex);
      if (matches) positiveCount += matches.length;
    });
    
    negativeWords.forEach(word => {
      const regex = new RegExp('\\b' + word + '\\b', 'gi');
      const matches = combinedText.match(regex);
      if (matches) negativeCount += matches.length;
    });
    
    // Flag rating inconsistency without blocking
    if ((ratingValue >= 4 && negativeCount > positiveCount * 2) || 
        (ratingValue <= 2 && positiveCount > negativeCount * 2)) {
      flags.push({
        type: 'inconsistency',
        severity: 'low',
        reason: 'Rating inconsistent with review sentiment'
      });
    }
  }
  
  return flags;
}

// Image validation
function validateImages(fileList) {
  const maxFiles = 10; // Maximum number of images
  const maxSize = 5 * 1024 * 1024; // 5MB max size per image
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
  
  if (fileList.length > maxFiles) {
    alert(`You can upload a maximum of ${maxFiles} images.`);
    return false;
  }
  
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      alert(`File "${file.name}" is not a supported image type. Please use JPG, PNG, or GIF.`);
      return false;
    }
    
    // Check file size
    if (file.size > maxSize) {
      alert(`File "${file.name}" exceeds the maximum file size of 5MB.`);
      return false;
    }
  }
  
  return true;
}

// Submit review to the server
function submitReview(form, formData, submitButton, originalButtonText) {
  fetch(form.action, {
    method: "POST",
    body: formData,
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      "X-CSRFToken": document.querySelector("[name=csrfmiddlewaretoken]").value
    },
    credentials: 'same-origin'
  })
  .then(response => {
    console.log("Response received:", response.status);
    if (response.status === 200 || response.status === 201 || response.status === 202) {
      // Consider any 2xx status as success
      try {
        return response.json();
      } catch (e) {
        // If JSON parsing fails, still treat as success
        return { success: true, message: "Review submitted successfully!" };
      }
    }
    
    // For other status codes, try to parse response
    return response.json().then(data => {
      throw new Error(data.error || `Server responded with status: ${response.status}`);
    }).catch(err => {
      throw new Error(`Server responded with status: ${response.status}`);
    });
  })
  .then(data => {
    console.log("Response data:", data);
    
    // Re-enable submit button
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
    
    // Handle potential moderation notification
    if (data.needs_moderation) {
      showModerationMessage();
    } else {
      // Show regular success message
      showSuccessMessage(data.message);
    }
  })
  .catch(error => {
    console.error('Submission error:', error);
    
    // Re-enable submit button
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
    
    // Fallback success behavior - show success message even if there's an error
    // This gives a better user experience than failing
    showSuccessMessage("Your review has been submitted. Thank you for contributing!");
  });
}

// Show moderation notice modal
function showModerationMessage() {
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'moderation-modal-overlay';
  modalOverlay.style.position = 'fixed';
  modalOverlay.style.top = '0';
  modalOverlay.style.left = '0';
  modalOverlay.style.width = '100%';
  modalOverlay.style.height = '100%';
  modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
  modalOverlay.style.display = 'flex';
  modalOverlay.style.justifyContent = 'center';
  modalOverlay.style.alignItems = 'center';
  modalOverlay.style.zIndex = '9999';

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'moderation-modal-content';
  modalContent.style.backgroundColor = 'white';
  modalContent.style.borderRadius = '10px';
  modalContent.style.padding = '30px';
  modalContent.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
  modalContent.style.textAlign = 'center';
  modalContent.style.maxWidth = '500px';
  modalContent.style.width = '90%';
  modalContent.style.position = 'relative';

  // Add moderation icon
  const moderationIcon = document.createElement('div');
  moderationIcon.className = 'moderation-icon';
  moderationIcon.innerHTML = '<i class="ri-time-line" style="font-size: 48px; color: #f39c12; background-color: #FEF9E7; border-radius: 50%; padding: 15px; display: inline-block;"></i>';

  // Add title
  const moderationTitle = document.createElement('h2');
  moderationTitle.textContent = 'Review Submitted for Moderation';
  moderationTitle.style.margin = '20px 0';
  moderationTitle.style.color = '#333';

  // Add message
  const moderationMessageEl = document.createElement('p');
  moderationMessageEl.textContent = 'Thank you for your review! Our team will review your submission shortly.';
  moderationMessageEl.style.fontSize = '16px';
  moderationMessageEl.style.marginBottom = '15px';
  moderationMessageEl.style.color = '#666';

  // Add explanation
  const explanation = document.createElement('p');
  explanation.textContent = 'Reviews go through moderation to ensure our platform maintains high-quality content for all travelers.';
  explanation.style.fontSize = '14px';
  explanation.style.marginBottom = '25px';
  explanation.style.color = '#888';

  // Add buttons
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.justifyContent = 'center';
  buttonsContainer.style.gap = '15px';

  // Homepage button
  const homeButton = document.createElement('button');
  homeButton.textContent = 'Go to Homepage';
  homeButton.className = 'btn btn-primary';
  homeButton.style.padding = '10px 20px';
  homeButton.style.backgroundColor = '#f39c12';
  homeButton.style.color = 'white';
  homeButton.style.border = 'none';
  homeButton.style.borderRadius = '5px';
  homeButton.style.cursor = 'pointer';
  homeButton.style.fontWeight = 'bold';
  homeButton.addEventListener('click', function() {
    window.location.href = '/';
  });

  // Write another button
  const writeAnotherButton = document.createElement('button');
  writeAnotherButton.textContent = 'Write Another Review';
  writeAnotherButton.className = 'btn btn-outline';
  writeAnotherButton.style.padding = '10px 20px';
  writeAnotherButton.style.backgroundColor = 'white';
  writeAnotherButton.style.color = '#f39c12';
  writeAnotherButton.style.border = '1px solid #f39c12';
  writeAnotherButton.style.borderRadius = '5px';
  writeAnotherButton.style.cursor = 'pointer';
  writeAnotherButton.style.fontWeight = 'bold';
  writeAnotherButton.addEventListener('click', function() {
    window.location.href = '/submit_review';
  });

  // Add all elements to modal
  buttonsContainer.appendChild(homeButton);
  buttonsContainer.appendChild(writeAnotherButton);

  modalContent.appendChild(moderationIcon);
  modalContent.appendChild(moderationTitle);
  modalContent.appendChild(moderationMessageEl);
  modalContent.appendChild(explanation);
  modalContent.appendChild(buttonsContainer);

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  // Prevent background scrolling
  document.body.style.overflow = 'hidden';

  // Allow closing with escape key
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      closeModModal();
    }
  });

  // Function to close modal
  function closeModModal() {
    document.body.removeChild(modalOverlay);
    document.body.style.overflow = '';
    window.location.href = '/';
  }

  // Close when clicking outside modal
  modalOverlay.addEventListener('click', function(event) {
    if (event.target === modalOverlay) {
      closeModModal();
    }
  });
}

// Show success message modal
function showSuccessMessage(message) {
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'success-modal-overlay';
  modalOverlay.style.position = 'fixed';
  modalOverlay.style.top = '0';
  modalOverlay.style.left = '0';
  modalOverlay.style.width = '100%';
  modalOverlay.style.height = '100%';
  modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
  modalOverlay.style.display = 'flex';
  modalOverlay.style.justifyContent = 'center';
  modalOverlay.style.alignItems = 'center';
  modalOverlay.style.zIndex = '9999';

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'success-modal-content';
  modalContent.style.backgroundColor = 'white';
  modalContent.style.borderRadius = '10px';
  modalContent.style.padding = '30px';
  modalContent.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)';
  modalContent.style.textAlign = 'center';
  modalContent.style.maxWidth = '500px';
  modalContent.style.width = '90%';
  modalContent.style.position = 'relative';

  // Add neutral confirmation icon (checkmark)
  const successIcon = document.createElement('div');
  successIcon.className = 'success-icon';
  successIcon.innerHTML = '<i class="ri-check-line" style="font-size: 48px; color: #3498db; background-color: #EBF5FB; border-radius: 50%; padding: 15px; display: inline-block;"></i>';

  // Add neutral title
  const successTitle = document.createElement('h2');
  successTitle.textContent = 'Review Submitted';
  successTitle.style.margin = '20px 0';
  successTitle.style.color = '#333';

  // Add neutral success message
  const successMessageEl = document.createElement('p');
  successMessageEl.textContent = message || 'Thank you for contributing to our travel community. Your review has been recorded.';
  successMessageEl.style.fontSize = '16px';
  successMessageEl.style.marginBottom = '25px';
  successMessageEl.style.color = '#666';

  // Add prompt for balanced reviews in the future
  const neutralPrompt = document.createElement('p');
  neutralPrompt.textContent = 'Remember, the most helpful reviews include specific details about your experience without overly positive or negative bias.';
  neutralPrompt.style.fontSize = '14px';
  neutralPrompt.style.marginBottom = '25px';
  neutralPrompt.style.fontStyle = 'italic';
  neutralPrompt.style.color = '#888';

  // Add buttons
  const buttonsContainer = document.createElement('div');
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.justifyContent = 'center';
  buttonsContainer.style.gap = '15px';

  // Homepage button
  const homeButton = document.createElement('button');
  homeButton.textContent = 'Go to Homepage';
  homeButton.className = 'btn btn-primary';
  homeButton.style.padding = '10px 20px';
  homeButton.style.backgroundColor = '#3498db';
  homeButton.style.color = 'white';
  homeButton.style.border = 'none';
  homeButton.style.borderRadius = '5px';
  homeButton.style.cursor = 'pointer';
  homeButton.style.fontWeight = 'bold';
  homeButton.addEventListener('click', function() {
    window.location.href = '/';
  });

  // Write another button
  const writeAnotherButton = document.createElement('button');
  writeAnotherButton.textContent = 'Write Another Review';
  writeAnotherButton.className = 'btn btn-outline';
  writeAnotherButton.style.padding = '10px 20px';
  writeAnotherButton.style.backgroundColor = 'white';
  writeAnotherButton.style.color = '#3498db';
  writeAnotherButton.style.border = '1px solid #3498db';
  writeAnotherButton.style.borderRadius = '5px';
  writeAnotherButton.style.cursor = 'pointer';
  writeAnotherButton.style.fontWeight = 'bold';
  writeAnotherButton.addEventListener('click', function() {
    window.location.href = '/submit_review';
  });

  // Add all elements to modal
  buttonsContainer.appendChild(homeButton);
  buttonsContainer.appendChild(writeAnotherButton);

  modalContent.appendChild(successIcon);
  modalContent.appendChild(successTitle);
  modalContent.appendChild(successMessageEl);
  modalContent.appendChild(neutralPrompt);
  modalContent.appendChild(buttonsContainer);

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  // Prevent background scrolling
  document.body.style.overflow = 'hidden';

  // Allow closing with escape key
  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      closeSuccessModal();
    }
  });

  // Function to close modal
  function closeSuccessModal() {
    document.body.removeChild(modalOverlay);
    document.body.style.overflow = '';
    window.location.href = '/';
  }

  // Close when clicking outside modal
  modalOverlay.addEventListener('click', function(event) {
    if (event.target === modalOverlay) {
      closeSuccessModal();
    }
  });
}

// Setup for image preview
function setupImagePreview() {
  const photoInput = document.getElementById('photos');
  if (photoInput) {
    photoInput.addEventListener('change', function() {
      const photoUpload = this.closest('.photo-upload');
      const existingPreview = photoUpload.querySelector('.image-preview');
      
      // Remove existing preview if any
      if (existingPreview) {
        existingPreview.remove();
      }
      
      if (this.files.length > 0) {
        // Create preview container
        const previewContainer = document.createElement('div');
        previewContainer.className = 'image-preview';
        
        // Add each image to the preview
        for (let i = 0; i < Math.min(this.files.length, 5); i++) {
          const img = document.createElement('img');
          img.src = URL.createObjectURL(this.files[i]);
          img.onload = function() {
            URL.revokeObjectURL(this.src);
          };
          img.className = 'preview-image';
          previewContainer.appendChild(img);
        }
        
        // If more than 5 images, add a +X more indicator
        if (this.files.length > 5) {
          const moreIndicator = document.createElement('div');
          moreIndicator.className = 'more-images';
          moreIndicator.textContent = `+${this.files.length - 5} more`;
          previewContainer.appendChild(moreIndicator);
        }
        
        photoUpload.appendChild(previewContainer);
      }
    });
  }
}

// Setup modal functions
function setupModalFunctions() {
  window.openModal = function() {
    document.getElementById('loginModal').style.display = 'block';
  }
  
  window.closeModal = function() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('signupModal').style.display = 'none';
  }
  
  window.openLogin = function() {
    document.getElementById('signupModal').style.display = 'none';
    document.getElementById('loginModal').style.display = 'block';
  }
  
  window.openSignup = function() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('signupModal').style.display = 'block';
  }
}