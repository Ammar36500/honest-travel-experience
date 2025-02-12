from django.contrib.auth.models import AbstractUser
from django.db import models
from django.contrib.auth.models import User
from django.conf import settings
from django.db import models


class UserProfile(AbstractUser):
    bio = models.TextField(blank=True, null=True)
    gender = models.CharField(
        max_length=10,
        choices=[('male', 'Male'), ('female', 'Female'), ('other', 'Other')],
        blank=True
    )
    profile_picture = models.ImageField(upload_to='profile_images/', blank=True, null=True)
    location = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.username

    @property
    def review_count(self):
        """Count the number of reviews written by this user."""
        return self.reviews.count()  # Leverage related_name='reviews' in the Review model



class Country(models.Model):
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name

class Place(models.Model):
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255, default="Unknown location")
    description = models.TextField(default="No description available")  # Ensure this is a string
    country = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name="places",
        default=1  # Default to a Country with ID=1
    )

    def __str__(self):
        return f"{self.name} - {self.country.name}"



class Moderator(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True)
    

    def __str__(self):
        return f"Moderator: {self.user.username}"


class Review(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews')
    place = models.ForeignKey('Place', on_delete=models.CASCADE, related_name="reviews")
    content = models.TextField()
    rating = models.PositiveIntegerField()  # Add this field for rating
    created_at = models.DateTimeField(auto_now_add=True)
    moderated = models.BooleanField(default=True)  # Automatically approved
    thumbs_up_count = models.PositiveIntegerField(default=0)
    thumbs_down_count = models.PositiveIntegerField(default=0)
    flagged = models.BooleanField(default=False)  # Flagged reviews go to moderation

    def __str__(self):
        return f"Review by {self.user.username} on {self.place.name}"

    def needs_moderation(self):
        return self.flagged or self.thumbs_down_count >= 15



class ReviewInteraction(models.Model):
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="interactions")
    session_id = models.CharField(max_length=255)  # Unique session identifier for a device
    action = models.CharField(max_length=11, choices=[('thumbs_up', 'Thumbs Up'), ('thumbs_down', 'Thumbs Down')])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('review', 'session_id')


class ModerationLog(models.Model):
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="moderation_logs")
    moderator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    action = models.CharField(max_length=10, choices=[('approve', 'Approve'), ('reject', 'Reject')])
    created_at = models.DateTimeField(auto_now_add=True)


class Flag(models.Model):
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="flags")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    reason = models.TextField()
    moderator = models.ForeignKey(
        "Moderator", null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_flags"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Flag for {self.review} by {self.user.username if self.user else 'Anonymous'}"


