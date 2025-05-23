from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator, EmailValidator
import datetime
from django.core.validators import FileExtensionValidator
from django.core.files.storage import default_storage
from PIL import Image
from io import BytesIO
import os
import uuid
from django.core.files.base import ContentFile
from pathlib import Path
import time
from django.utils import timezone
from django.core.exceptions import ValidationError


class UserProfile(AbstractUser): # Custom user model inheriting from Django's AbstractUser.
    bio = models.TextField( # User's biography.
        blank=True,
        null=True,
        max_length=500,
        help_text="Tell us a bit about yourself (max 500 characters)"
    )
    gender = models.CharField( # User's gender identity.
        max_length=10,
        choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')],
        blank=True,
        verbose_name="Gender Identity"
    )
    profile_picture = models.ImageField( # User's profile picture.
        upload_to='profile_pics/', # Subdirectory in MEDIA_ROOT for uploads.
        null=True,
        blank=True,
        validators=[FileExtensionValidator(['png', 'jpg', 'jpeg', 'gif'])],
        help_text="Upload a profile picture (PNG, JPG, or GIF)"
    )
    cover_photo = models.ImageField( # User's cover photo.
        upload_to='cover_photos/', # Subdirectory for cover photo uploads.
        null=True,
        blank=True,
        validators=[FileExtensionValidator(['png', 'jpg', 'jpeg', 'gif'])],
        help_text="Upload a cover photo (PNG, JPG, or GIF)"
    )
    location = models.CharField( # User's current city.
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Current City"
    )
    website = models.URLField( # User's personal website URL.
        blank=True,
        null=True,
        verbose_name="Personal Website"
    )
    
    def __str__(self): # String representation of the UserProfile object.
        return f"{self.username} Profile"

    @property
    def review_count(self): # Calculates the number of reviews by the user.
        """Count the number of reviews written by this user."""
        return self.reviews.count() if hasattr(self, 'reviews') else 0

    def save_profile_picture(self, image): # Method to save and process profile picture.
        """
        Save and optimize the profile picture with enhanced error handling and durability
        """
        if not image:
            return None

        profile_pics_dir = os.path.join(settings.MEDIA_ROOT, 'profile_pics')
        Path(profile_pics_dir).mkdir(parents=True, exist_ok=True) # Create directory if it doesn't exist.
        
        try:
            img = Image.open(image)
            img.thumbnail((500, 500)) # Resize image to max 500x500.
            
            if img.mode not in ('RGB', 'RGBA'): # Ensure RGB format.
                img = img.convert('RGB')
            
            buffer = BytesIO()
            img.save(buffer, format='JPEG', quality=85) # Save image to buffer as JPEG.
            buffer.seek(0)
            
            filename = f'profile_pics/{self.username}_{uuid.uuid4()}.jpg' # Generate a unique filename.
            
            if self.profile_picture and self.profile_picture.name: # If an old profile picture exists.
                try:
                    old_path = self.profile_picture.path
                    if default_storage.exists(old_path): # Check if file exists in storage.
                        default_storage.delete(old_path) # Delete old picture file from storage.
                except Exception as delete_error:
                    print(f"Warning: Could not delete old profile picture: {delete_error}")
            
            self.profile_picture.save(filename, ContentFile(buffer.getvalue()), save=False) # Save new image to ImageField, don't save model yet.
            self.save(update_fields=['profile_picture', 'updated_at'] if hasattr(self, 'updated_at') else ['profile_picture']) # Explicitly save only relevant fields.
            
            # File verification logic
            max_retries = 3
            retry_delay = 0.5
            saved_path = os.path.join(settings.MEDIA_ROOT, filename)

            for attempt in range(max_retries):
                if os.path.exists(saved_path): # Check if file exists at the constructed path.
                    print(f"File saved successfully to {saved_path}")
                    break
                else:
                    print(f"Warning: File not found at {saved_path} after save attempt {attempt+1}, retrying...")
                    time.sleep(retry_delay)
            else: # If loop completes without break (file not found after retries)
                print(f"Error: File {saved_path} could not be verified after {max_retries} attempts.")


            return f"{settings.MEDIA_URL}{filename}?t={uuid.uuid4().hex[:8]}" # Return URL with cache-busting timestamp.
                
        except Exception as e:
            print(f"Error processing profile picture: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return None

    def save_cover_photo(self, image): # Method to save and process cover photo.
        """
        Save and optimize the cover photo with enhanced error handling and durability
        """
        if not image:
            return None

        cover_photos_dir = os.path.join(settings.MEDIA_ROOT, 'cover_photos')
        Path(cover_photos_dir).mkdir(parents=True, exist_ok=True) # Create directory if needed.
        
        try:
            img = Image.open(image)
            img.thumbnail((1500, 500)) # Resize for cover photo.
            
            if img.mode not in ('RGB', 'RGBA'): # Ensure RGB format.
                img = img.convert('RGB')
            
            buffer = BytesIO()
            img.save(buffer, format='JPEG', quality=85) # Save as JPEG.
            buffer.seek(0)
            
            filename = f'cover_photos/{self.username}_{uuid.uuid4()}.jpg' # Unique filename.
            
            if self.cover_photo and self.cover_photo.name: # If old cover photo exists.
                try:
                    old_path = self.cover_photo.path
                    if default_storage.exists(old_path): # Check if file exists in storage
                        default_storage.delete(old_path) # Delete old file from storage
                except Exception as delete_error:
                    print(f"Warning: Could not delete old cover photo: {delete_error}")
            
            self.cover_photo.save(filename, ContentFile(buffer.getvalue()), save=False) # Save to ImageField, don't save model.
            self.save(update_fields=['cover_photo', 'updated_at'] if hasattr(self, 'updated_at') else ['cover_photo']) # Save only relevant fields.
            
            # File verification logic
            max_retries = 3
            retry_delay = 0.5
            saved_path = os.path.join(settings.MEDIA_ROOT, filename)
            for attempt in range(max_retries):
                if os.path.exists(saved_path):
                    print(f"File saved successfully to {saved_path}")
                    break
                else:
                    print(f"Warning: File not found at {saved_path} after save attempt {attempt+1}, retrying...")
                    time.sleep(retry_delay)
            else:
                 print(f"Error: File {saved_path} could not be verified after {max_retries} attempts.")

            return f"{settings.MEDIA_URL}{filename}?t={uuid.uuid4().hex[:8]}" # Return URL with cache buster.
                
        except Exception as e:
            print(f"Error processing cover photo: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return None

    def get_full_name(self): # Returns the user's full name.
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name or self.username

    def get_short_name(self): # Returns the user's short name.
        return self.first_name or self.username
    
    def get_profile_picture_url(self): # Gets URL for profile picture with fallback.
        try:
            if self.profile_picture and hasattr(self.profile_picture, 'url') and self.profile_picture.url:
                return f"{self.profile_picture.url}?v={int(time.time())}" # Cache buster.
        except ValueError: # Can occur if file is missing.
            pass
        return f'{settings.STATIC_URL}images/profile.png' # Default profile picture URL.
        
    def get_cover_photo_url(self): # Gets URL for cover photo with fallback.
        try:
            if self.cover_photo and hasattr(self.cover_photo, 'url') and self.cover_photo.url:
                return f"{self.cover_photo.url}?v={int(time.time())}" # Cache buster.
        except ValueError: # Can occur if file is missing.
            pass
        return f'{settings.STATIC_URL}images/default-cover.jpg' # Default cover photo URL.

class Destination(models.Model): # Model for travel destinations.
    name = models.CharField(max_length=100)
    country = models.CharField(max_length=100, blank=True, null=True) # Optional.
    description = models.TextField(blank=True, null=True) # Optional.
    main_image = models.ImageField(upload_to='destinations/', blank=True, null=True) # Optional.
    created_at = models.DateTimeField(auto_now_add=True) # Auto-set on add.
    updated_at = models.DateTimeField(auto_now=True) # Auto-set on save.
    
    def __str__(self):
        return self.name
    
    def average_rating(self): # Calculates average rating from reviews.
        reviews = self.reviews.all() # Assumes related_name='reviews' on Review.place ForeignKey.
        if reviews:
            return sum(review.rating for review in reviews) / len(reviews)
        return 0

class Country(models.Model): # Model for countries.
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name

class Place(models.Model): # Model for specific places.
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255, default="Unknown location")
    description = models.TextField(default="No description available")
    country = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name="places",
        default=1  # Ensure a Country with ID=1 exists or handle this default more robustly.
    )

    def __str__(self):
        return f"{self.name} - {self.country.name}"

class Moderator(models.Model): # Model for moderators.
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE) # Link to a UserProfile.
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"Moderator: {self.user.username}"

class Review(models.Model): # Model for user reviews.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='reviews' # Reverse relation from UserProfile.
    )
    place = models.ForeignKey( # Reviewed destination.
        'Destination', 
        on_delete=models.CASCADE, 
        related_name="reviews" # Reverse relation from Destination.
    )
    title = models.CharField(max_length=200, default="Untitled")
    content = models.TextField()
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)]) # 1-5 stars.
    visit_date = models.DateField(null=True, blank=True) # Optional.
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)
    moderated = models.BooleanField(default=True) # Approved by default, can be changed.
    thumbs_up_count = models.PositiveIntegerField(default=0)
    thumbs_down_count = models.PositiveIntegerField(default=0)
    flagged = models.BooleanField(default=False) # Flagged for moderation.
    has_bias = models.BooleanField(default=False) # Suspected of bias.
    
    class Meta:
        ordering = ['-created_at'] # Newest reviews first.
    
    def __str__(self):
        return f"{self.title} - {self.place.name} by {self.user.username}"
    
    def needs_moderation(self): # Checks if review needs moderation attention.
        return self.flagged or self.thumbs_down_count >= 15
    
    def save(self, *args, **kwargs): # Custom save method.
        if not self.created_at: # Ensure created_at is set on first save.
            self.created_at = timezone.now()
        super().save(*args, **kwargs)

class ReviewImage(models.Model): # Images associated with a review.
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='review_images/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Image for {self.review.title}"

class ReviewInteraction(models.Model): # User interactions (thumbs up/down) with reviews.
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="interactions")
    session_id = models.CharField(max_length=255)  # Unique session/device identifier.
    action = models.CharField(max_length=11, choices=[('thumbs_up', 'Thumbs Up'), ('thumbs_down', 'Thumbs Down')])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('review', 'session_id') # One interaction per review per session.

class ModerationLog(models.Model): # Logs moderation actions on reviews.
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="moderation_logs")
    moderator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE) # The moderator (User).
    action = models.CharField(max_length=10, choices=[('approve', 'Approve'), ('reject', 'Reject')])
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True) # Optional notes.

class Flag(models.Model): # User-submitted flags on reviews.
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="flags")
    user = models.ForeignKey( # User who flagged (optional, can be anonymous).
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    reason = models.TextField()
    moderator = models.ForeignKey( # Moderator assigned to this flag (optional).
        "Moderator", null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_flags"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        user_display = self.user.username if self.user else 'Anonymous'
        return f"Flag for {self.review} by {user_display}"
    

class ReviewEditLog(models.Model): # Logs edits made to reviews.
    review = models.ForeignKey('Review', on_delete=models.CASCADE, related_name='edit_logs')
    editor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='review_edits') # User who edited.
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        editor_name = self.editor.username if self.editor else 'Unknown Editor'
        return f"Review {self.review.id} edited by {editor_name} at {self.timestamp}"


class Conversation(models.Model): # Stores conversations (e.g., with an AI).
    user_query = models.TextField()
    ai_response = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Query: {self.user_query[:30]}..."
    

    
class PlatformSetting(models.Model): # Global platform settings (singleton).
    platform_name = models.CharField(
        max_length=100,
        default='Travel Reviews',
        help_text="The public name of the platform."
    )
    default_reviews_per_page = models.PositiveIntegerField(
        default=10,
        validators=[MinValueValidator(5), MaxValueValidator(50)],
        help_text="Default number of reviews shown per page (5-50)."
    )
    enable_user_registration = models.BooleanField(
        default=True,
        help_text="Allow new users to register accounts."
    )
    minimum_review_length = models.PositiveIntegerField(
        default=50,
        validators=[MinValueValidator(10)],
        help_text="Minimum number of characters required for review content."
    )
    allow_anonymous_reviews = models.BooleanField(
        default=False,
        help_text="Allow users who are not logged in to submit reviews (requires careful moderation)."
    )
    support_contact_email = models.EmailField(
        max_length=254, 
        blank=True, 
        null=True,
        validators=[EmailValidator()],
        help_text="Public contact email address for support inquiries (optional)."
    )
    # Bias Prevention Settings
    secondary_review_non_english = models.BooleanField(default=False, help_text="Enable secondary review for content detected as non-English.")
    admin_decision_tracking = models.BooleanField(default=True, help_text="Track moderator decisions for consistency analysis.")
    require_rejection_reason = models.BooleanField(default=True, help_text="Mandate moderators to provide a reason when rejecting reviews.")
    fairness_alert_threshold = models.CharField(
        max_length=3,
        choices=[('10', '10%'), ('15', '15%'), ('20', '20%')],
        default='15',
        help_text="Threshold for triggering fairness alerts based on rejection rate differences."
    )

    def __str__(self):
        return "Platform Settings"

    def save(self, *args, **kwargs): # Enforce singleton pattern.
        if not self.pk and PlatformSetting.objects.exists():
            existing = PlatformSetting.objects.first()
            self.pk = existing.pk # Update the existing instance instead of creating a new one.
        super().save(*args, **kwargs)

class ReasonCode(models.Model): # Predefined reasons for moderation actions.
    """Model to store predefined reasons for review rejection or other actions."""
    code = models.CharField(max_length=20, unique=True, help_text="Short, unique code (e.g., SPAM, HATE_SPEECH).")
    label = models.CharField(max_length=100, help_text="User-friendly label for the reason (e.g., Spam/Irrelevant Content).")
    description = models.TextField(blank=True, help_text="Detailed description of the reason code.") # Optional.
    is_active = models.BooleanField(default=True, help_text="Whether this reason code is currently active and usable.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.label}"
