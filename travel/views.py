from django.shortcuts import render,redirect
from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required, user_passes_test
import logging
from django.urls import reverse
from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from django.contrib import messages
from django.http import JsonResponse
import random
from django.shortcuts import render, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
import json
from django.utils.decorators import method_decorator
from .models import Review, ReviewInteraction
from django.http import HttpResponseForbidden
from .models import UserProfile
from django.db.models import Count
from .models import Flag
from random import choice
from django.views.decorators.csrf import csrf_protect
import os
from django.conf import settings
from .models import Country, Place, Review, Moderator, ReviewImage, ReviewInteraction, UserProfile, Flag, Destination
from django.contrib.auth import logout
from datetime import datetime
from django.db.models import Q
from django.db.models import Avg
from datetime import datetime, timedelta
import re
import string
from collections import Counter
import imghdr
import traceback
from PIL import Image
from io import BytesIO
import hashlib
from .models import Review, Flag, Moderator, ReviewImage, ModerationLog
from django.utils import timezone
from django.views.decorators.http import require_POST
import time
from django.shortcuts import render, get_object_or_404, redirect
from django.views.decorators.http import require_http_methods
from .form import ReviewForm
from dateutil.relativedelta import relativedelta
from django.core.paginator import Paginator
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
import django
import unicodedata
from .models import Review, ReviewEditLog
from django.views.decorators.http import require_GET
from django.db.models import Count, F, Value, CharField
from .models import ReviewEditLog # Import your edit log model
from django.contrib.auth import get_user_model # To get user info
import logging # For logging errors
from django.http import JsonResponse, Http404
from django.views.decorators.http import require_http_methods, require_POST, require_GET
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from .models import (
    Review, ReviewInteraction, UserProfile, Flag, Moderator, Destination,
    ReviewImage, ModerationLog, Country, Place, PlatformSetting, ReasonCode
)

logger = logging.getLogger(__name__)


def home(request):
    # Get all reviews with prefetched images and related user, filtering out flagged reviews.
    # Annotate each review's user with the count of their approved reviews.
    # The annotation names the resulting attribute 'user_approved_review_count'.
    all_reviews = Review.objects.filter(flagged=False).select_related('user').prefetch_related('images').annotate(
        user_approved_review_count=Count('user__reviews', filter=Q(user__reviews__moderated=True, user__reviews__flagged=False))
    )

    # Filter out reviews with problematic visit_date values and attach annotated count
    filtered_reviews = []
    for review in all_reviews:
        try:
            # This will trigger any conversion errors individually
            # Ensure visit_date is handled safely, possibly check if it's not None before access if applicable
            if review.visit_date is not None:
                 _ = review.visit_date # Access to trigger potential ValueError

            review.user.approved_review_count = review.user_approved_review_count

            filtered_reviews.append(review)
        except ValueError as e:
            print(f"Skipping review {review.id}: Invalid visit_date - {e}")
        # Catch other potential exceptions during processing if necessary
        except Exception as e:
            print(f"Skipping review {review.id} due to processing error: {e}")


    # Check if the logged-in user is a moderator
    is_moderator = request.user.groups.filter(name="Moderators").exists() if request.user.is_authenticated else False

    # Pass the filtered reviews (with annotated approved count on user) and moderator status to the template
    return render(request, 'home.html', {'reviews': filtered_reviews, 'is_moderator': is_moderator})


def terms_page_view(request):
    """Renders the static terms of service page."""
    return render(request, 'terms.html')

def destinations(request):
    """Renders the 'destinations.html' template."""
    return render(request, 'destinations.html') # Renders 'destinations.html' with the request object.

def submit_review(request):
    return render(request, 'submit_review.html')

def about(request):
    return render(request, 'about.html')

def contact(request):
    return render(request, 'contact.html')

def greece(request):
    return render(request, 'greece.html')

def switzerland(request):
    return render(request, 'switzerland.html')

def New_Zealand(request):
    return render(request, 'New_Zealand.html')

def California(request):
    return render(request, 'California.html')

def London(request):
    return render(request, 'London.html')

def Tokyo(request):
    return render(request, 'Tokyo.html')

def Rome(request):
    return render(request, 'Rome.html')

def New_York(request):
    return render(request, 'New_York.html')

def Sydney(request):
    return render(request, 'Sydney.html')

def Japan(request):
    return render(request, 'Japan.html')

def Italy(request):
    return render(request, 'italy.html')

def Peru(request):
    return render(request, 'Peru.html')

def China(request):
    return render(request, 'China.html')

def Australia(request):
    return render(request, 'Australia.html')

def Iceland(request):
    return render(request, 'Iceland.html')

def India(request):
    return render(request, 'India.html')

def Egypt(request):
    return render(request, 'Egypt.html')

def Brazil(request):
    return render(request, 'Brazil.html')

def Paris(request):
    return render(request, 'Paris.html')

def Morocco(request):
    return render(request, 'Morocco.html')

def Indonesia(request):
    return render(request, 'Indonesia.html')

def Mumbai(request):
    return render(request, 'Mumbai.html')

def Backpacking(request):
    return render(request, 'Backpacking.html')

def FoodAdventure(request):
    return render(request, 'food.html')

def TravelBudget(request):
    return render(request, 'Budget.html')

def PhotoGraphyGuide(request):
    return render(request, 'PhotoGraphy.html')


def SignUp(request):
    return render(request, 'Signup.html')

    
def Logon(request):
    return render(request, 'logon.html')


def User_management(request):
    return render(request, 'User_Management.html')

def Settings(request):
    return render(request, 'Settings.html')

def Appeal_review(request):
    return render(request, 'Appeal_review.html')


def Navagio_Beach(request):
    return render(request, 'Navagio_Beach.html')


def Maya_Bay(request):
    return render(request, 'Maya_Bay.html')


def Seven_Mile_Beach(request):
    return render(request, 'Seven_Mile_Beach.html')

def Matira_Beach(request):
    return render(request, 'matira-beach.html')


def Worlds_Beach(request):
    return render(request, 'worlds_beaches.html')

def Europe_Beach(request):
    return render(request, 'Europe_beach.html')

def Asia_Beach(request):
    return render(request, 'Asia_Beach.html')

def South_Pacific_Beach(request):
    return render(request, 'South_Pacific_beach.html')

def Caribbean_beach(request):
    return render(request, 'Caribbean_beach.html')


def Great_Barrier_Reef(request):
    return render(request, 'Great_Barrier_Reef.html')


def Sydney_Opera_House(request):
    return render(request, 'Sydney_Opera_House.html')

def Uluru(request):
    return render(request, 'Uluru.html')

def Twelve_Apostles(request):
    return render(request, 'Twelve_Apostles.html')

def Rio_de_Janeiro(request):
    return render(request, 'Rio_de_Janeiro.html')

def Amazon_Rainforest(request):
    return render(request, 'Amazon_Rainforest.html')

def Iguazu_Falls(request):
    return render(request, 'Iguazu_Falls.html')

def Salvador(request):
    return render(request, 'Salvador.html')

def San_Francisco(request):
    return render(request, 'San_Francisco.html')

def Los_Angeles(request):
    return render(request, 'Los_Angeles.html')

def Yosemite(request):
    return render(request, 'Yosemite.html')

def Napa_Valley(request):
    return render(request, 'Napa_Valley.html')


def explore_country(request, country_name):
    """
    Generic view for exploring country pages
    """
    display_name = country_name.capitalize()
    
    
    context = {
        'country': display_name,
    }
    
    return render(request, 'explore_destination.html', context)


# ------------------------------------------- Login/Singup ------------------------------------------------#


logger = logging.getLogger(__name__)

def login_view(request):
    # Handle GET requests: typically to display the login form.
    if request.method == 'GET':
        next_url = request.GET.get('next', '') # Get 'next' parameter for redirection after login.
        return render(request, 'logon.html', {'next': next_url}) # Render the login page template.
    
    # Handle POST requests: for processing login form submission.
    if request.method == 'POST':
        username = request.POST.get('username') # Get username from POST data.
        password = request.POST.get('password') # Get password from POST data.

        try:
            # Validate if the username exists before attempting authentication.
            if not User.objects.filter(username=username).exists():
                return JsonResponse({'success': False, 'error': 'Username does not exist.'}, status=400)

            # Authenticate the user with provided credentials.
            user = authenticate(request, username=username, password=password)

            if user: # If authentication is successful.
                login(request, user) # Log the user in, creating a session.
                is_moderator = user.groups.filter(name="Moderators").exists() # Check if user belongs to "Moderators" group.

                # Prepare JSON response for successful login.
                return JsonResponse({
                    'success': True,
                    # Determine redirect URL based on moderator status.
                    'redirect_url': reverse('moderator_dashboard') if is_moderator else reverse('home'),
                    'is_moderator': is_moderator,
                    'username': user.username,
                    # Safely access profile picture URL.
                    'profile_picture': user.profile.profile_picture.url if hasattr(user, 'profile') and hasattr(user.profile, 'profile_picture') and user.profile.profile_picture else "/static/images/default-profile.png"
                })
            else: # If authentication fails (e.g., invalid password).
                return JsonResponse({'success': False, 'error': 'Invalid password. Please try again.'}, status=400)
        except Exception as e: # Catch any other unexpected errors during the login process.
            # logger.error(f"Login error: {str(e)}") # Log the error (assuming logger is configured).
            print(f"Login error: {str(e)}") # Fallback to print if logger not set up.
            return JsonResponse({'success': False, 'error': 'An unexpected error occurred. Please try again.'}, status=500)

    # If the request method is neither GET nor POST.
    return JsonResponse({'success': False, 'error': 'Invalid request method.'}, status=405)



def logout_view(request):
    logout(request)
    return redirect('home') 

User = get_user_model()  # Get the custom user model

def register_view(request):
    try: # Catch unexpected errors during registration.
        if request.method == 'POST':
            # Get and strip form data.
            username = request.POST.get('username', '').strip()
            full_name = request.POST.get('full_name', '').strip()
            email = request.POST.get('email', '').strip()
            password = request.POST.get('password', '').strip() # Password will be hashed by create_user.

            # Validate required fields.
            if not username or not email or not password or not full_name:
                return JsonResponse({'success': False, 'error': 'All fields are required.'}, status=400)

            if User.objects.filter(username=username).exists():
                return JsonResponse({'success': False, 'error': 'Username already exists.'}, status=400)
            if User.objects.filter(email=email).exists():
                return JsonResponse({'success': False, 'error': 'Email already exists.'}, status=400)

            # Create user (handles password hashing).
            user = User.objects.create_user(username=username, password=password, email=email)

            if " " in full_name:
                user.first_name, user.last_name = full_name.split(' ', 1)
            else:
                user.first_name = full_name

            user.save() # Save user with populated name fields.

            return JsonResponse({'success': True, 'message': 'User registered successfully. Please log in.', 'redirect_url': '/logon/'})

        return JsonResponse({'success': False, 'error': 'Invalid request method.'}, status=405)

    except Exception as e:
        import traceback # For detailed error logging.
        # Log detailed error traceback.
        # logger.error(f"Exception during registration: {traceback.format_exc()}") # Use if logger is configured.
        print(f"Exception during registration: {traceback.format_exc()}") # Print to console as a fallback.
        # Return generic 500 error.
        return JsonResponse({'success': False, 'error': f'Internal Server Error: An unexpected error occurred.'}, status=500)

    
@login_required # Ensures that only logged-in users can access this view.
def some_view(request):
    """
    A simple view that renders 'home.html' and passes the authenticated user
    to the template context.
    """
    return render(request, 'home.html', {'user': request.user}) # Renders 'home.html' with user data.



# ------------------------------------------- Profile ------------------------------------------------#

@login_required
def profile_view(request):
    """
    Main profile view - displays user profile and handles profile updates
    via form submission
    """
    # Add timestamp for cache busting
    context = {
        'user': request.user,
        'timestamp': int(time.time()),
    }
    
    return render(request, 'profile.html', context)

@login_required # Ensures that only logged-in users can access this view.
@require_POST # Ensures that this view can only be accessed via POST requests.
def update_profile(request):
    """
    AJAX endpoint for updating profile information.
    Handles POST requests to modify user and profile fields.
    """
    user = request.user # Get the currently authenticated user instance.
    
    try:
        # Update standard User model fields if present in POST data.
        if 'first_name' in request.POST:
            user.first_name = request.POST.get('first_name', '').strip() # Get and strip first name.
        
        if 'last_name' in request.POST:
            user.last_name = request.POST.get('last_name', '').strip() # Get and strip last name.
        
        if 'username' in request.POST:
            new_username = request.POST.get('username', '').strip()
            # Check if the new username is different and if it's already taken by another user.
            if new_username != user.username and \
               UserProfile.objects.filter(username=new_username).exclude(pk=user.pk).exists(): # Assumes UserProfile model for username check.
                return JsonResponse({
                    'status': 'error',
                    'message': 'That username is already taken.'
                }, status=400) # Bad request if username is taken.
            user.username = new_username # Update username.
        
        # Update custom profile fields (assuming these are on the user model or a related UserProfile model).
        # If using a separate UserProfile model, you'd fetch it e.g., profile = user.userprofile
        if 'bio' in request.POST:
            user.bio = request.POST.get('bio', '').strip() # Get and strip bio. Assumes 'bio' is an attribute of 'user'.
        
        if 'location' in request.POST:
            user.location = request.POST.get('location', '').strip() # Get and strip location. Assumes 'location' is an attribute of 'user'.
        
        if 'website' in request.POST:
            user.website = request.POST.get('website', '').strip() # Get and strip website. Assumes 'website' is an attribute of 'user'.
        
        user.save() # Save all changes made to the user object (and its related profile if applicable).
        
        # Return a success response with updated user information.
        return JsonResponse({
            'status': 'success',
            'message': 'Profile updated successfully',
            'user': { # Send back some updated user details for potential UI updates.
                'username': user.username,
                'full_name': user.get_full_name(),
                'bio': user.bio if hasattr(user, 'bio') else '', # Check if attribute exists.
                'location': user.location if hasattr(user, 'location') else '',
                'website': user.website if hasattr(user, 'website') else '',
                'profile_picture_url': user.get_profile_picture_url() if hasattr(user, 'get_profile_picture_url') else None, # Call method if exists.
                'cover_photo_url': user.get_cover_photo_url() if hasattr(user, 'get_cover_photo_url') else None,
            }
        })
        
    except Exception as e: # Catch any unexpected errors during the update process.
        # Log the error for debugging.
        print(f"Error updating profile for user {user.username}: {str(e)}")
        print(traceback.format_exc()) # Print full traceback.
        
        # Return a generic error response to the client.
        return JsonResponse({
            'status': 'error',
            'message': 'An error occurred while updating your profile. Please try again.'
        }, status=500) # Internal Server Error.

@login_required
@require_POST
def upload_profile_image(request):
    """
    View to handle profile and cover image uploads
    """
    print("=" * 50)
    print(f"UPLOAD IMAGE REQUEST RECEIVED for user {request.user.username}")
    
    if 'image' not in request.FILES:
        print("ERROR: No image file in request")
        return JsonResponse({'error': 'No image provided'}, status=400)
        
    image = request.FILES['image']
    image_type = request.POST.get('type')
    
    print(f"Processing {image_type} image upload: {image.name}, size: {image.size} bytes")
    
    try:
        user = request.user
        print(f"User object: {user}, ID: {user.id}, Username: {user.username}")
        
        if image_type == 'profile':
            # Debug user object before saving
            print(f"Before save - User has profile picture: {bool(user.profile_picture)}")
            if hasattr(user, 'profile_picture') and user.profile_picture:
                print(f"Current profile picture path: {user.profile_picture.path}")
                print(f"Current profile picture URL: {user.profile_picture.url}")
            
            # Use the save method from UserProfile model
            image_url = user.save_profile_picture(image)
            
            # Debug user object after saving
            print(f"After save - User has profile picture: {bool(user.profile_picture)}")
            if hasattr(user, 'profile_picture') and user.profile_picture:
                print(f"New profile picture path: {user.profile_picture.path}")
                print(f"New profile picture URL: {user.profile_picture.url}")
            
            if image_url:
                print(f"Successfully saved profile image: {image_url}")
                
                # Verify the file exists on disk
                try:
                    if os.path.exists(user.profile_picture.path):
                        print(f"File exists on disk at {user.profile_picture.path}")
                    else:
                        print(f"WARNING: File does not exist on disk at {user.profile_picture.path}")
                except Exception as e:
                    print(f"Error checking file existence: {str(e)}")
                
                return JsonResponse({
                    'status': 'success',
                    'imageUrl': image_url
                })
            else:
                print(f"Failed to process profile image")
                return JsonResponse({'error': 'Failed to process profile image'}, status=500)
                
        elif image_type == 'cover':
            # Similar debugging for cover photo
            print(f"Before save - User has cover photo: {bool(user.cover_photo)}")
            
            # Use the save method from UserProfile model
            image_url = user.save_cover_photo(image)
            
            print(f"After save - User has cover photo: {bool(user.cover_photo)}")
            
            if image_url:
                print(f"Successfully saved cover image: {image_url}")
                return JsonResponse({
                    'status': 'success',
                    'imageUrl': image_url
                })
            else:
                print(f"Failed to process cover image")
                return JsonResponse({'error': 'Failed to process cover image'}, status=500)
        else:
            print(f"Invalid image type provided: {image_type}")
            return JsonResponse({'error': 'Invalid image type'}, status=400)
    
    except Exception as e:
        # Log the error for debugging
        import traceback
        print(f"ERROR uploading {image_type} image: {str(e)}")
        print(traceback.format_exc())
        
        return JsonResponse({'error': str(e)}, status=500)
    finally:
        print("=" * 50)


# ------------------------------------------- Search Function ------------------------------------------------#


# API to get places based on a search query
def get_places(request):
    """
    Handles GET requests to search places by query parameter.
    Returns JSON with matching places or an error.
    """
    # Get 'search' query param, default to empty, strip whitespace.
    search_query = request.GET.get('search', '').strip() 
    
    # Validate: search query must be provided.
    if not search_query:
        # Return 400 error if no query.
        return JsonResponse({'success': False, 'error': 'No search query provided.'}, status=400)

    # Filter Place objects by name (case-insensitive contains).
    # Assumes 'Place' model has a 'name' field.
    places = Place.objects.filter(name__icontains=search_query) 
    
    # Format matching places into a list of dictionaries.
    results = [
        {
            'id': place.id,
            'name': place.name,
            'location': place.location, # Assumes 'location' field.
            'description': place.description, # Assumes 'description' field.
        }
        for place in places # Iterate over filtered places.
    ]
    
    # Return success response with results.
    return JsonResponse({'success': True, 'results': results})




# Fetch search results for places
def search_results(request):
    query = request.GET.get("query", "")
    if query:
        results = Place.objects.filter(name__icontains=query)
        return JsonResponse({
            "results": [
                {"name": place.name, "location": place.location} for place in results
            ]
        })
    return JsonResponse({"results": []})

def search(request):
    query = request.GET.get('q', '').strip()
    results = []
    if query:
        # Search for any Place object whose name contains the query
        results = Place.objects.filter(name__icontains=query)

    # If there is exactly ONE match, redirect directly to that page
    if results.count() == 1:
        single_place = results.first()
        place_name_lower = single_place.name.lower()

        # Map of place.name -> URL name from urls.py
        # Make sure the strings match exactly what you have in your url name=...
        place_map = {
            'japan': 'Japan',
            'california': 'California',
            'greece': 'greece',
            'switzerland': 'switzerland',
            'new zealand': 'New_Zealand',
            'london': 'London',
            'tokyo': 'Tokyo',
            'rome': 'Rome',
            'new york': 'New_York',
            'sydney': 'Sydney',
            'italy': 'Italy',
            'peru': 'Peru',
            'china': 'China',
            'australia': 'Australia',
            'iceland': 'Iceland',
            'india': 'India',
            'egypt': 'Egypt',
            'brazil': 'Brazil',
            'paris': 'Paris',
            'morocco': 'Morocco',
            'indonesia': 'Indonesia',
            'mumbai' : 'Mumbai',
            'navagio beach' : 'Navagio_Beach',
            'maya bay' : 'Maya_Bay',
            'seven mile beach':'Seven_Mile_Beach',
            'Matira Beach' :'Matira_Beach',
            'great barrier reef' :'Great_Barrier_Reef',
            'sydney opera house' :'Sydney_Opera_House',
            'uluru' :'Uluru',
            'twelve apostles' :'Twelve_Apostles',
            'rio de janeiro' :'Rio_de_Janeiro',
            'amazon rainforest' :'Amazon_Rainforest',
            'iguazu falls' :'Iguazu_Falls',
            'salvador' :'Salvador',
            'san francisco' :'San_Francisco',
            'los angeles' :'Los_Angeles',
            'yosemite' :'Yosemite',
            'napa valley' :'Napa_Valley',


        }

        # If our place name is in the dictionary, redirect to its page
        if place_name_lower in place_map:
            return redirect(place_map[place_name_lower])

    # Otherwise, show the standard search results page
    return render(request, 'search_results.html', {
        'query': query,
        'results': results,
    })



# API for retrieving places with a minimum search query length
def api_places(request):
    search_query = request.GET.get('search', '').strip()
    if len(search_query) < 2:
        return JsonResponse({"results": []})

    places = Place.objects.filter(name__icontains=search_query)
    results = [
        {"id": place.id, "name": place.name, "location": place.location}
        for place in places
    ]
    return JsonResponse({"results": results})


# ------------------------------------------- Moderators ------------------------------------------------#

def is_moderator(user):
    return user.groups.filter(name='Moderators').exists()

@login_required
@user_passes_test(lambda u: u.groups.filter(name='Moderators').exists())
def moderator_dashboard(request):
    # Get current date for comparing with last week
    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    
    # Get current stats
    total_reviews = Review.objects.count()
    pending_reviews = Review.objects.filter(moderated=False).count()
    active_users = UserProfile.objects.filter(is_active=True).count()
    flagged_content = Review.objects.filter(flagged=True).count()
    
    # Get stats from a week ago for comparison
    total_reviews_week_ago = Review.objects.filter(created_at__date__lt=week_ago).count()
    pending_reviews_week_ago = Review.objects.filter(moderated=False, created_at__date__lt=week_ago).count()
    active_users_week_ago = UserProfile.objects.filter(is_active=True, date_joined__date__lt=week_ago).count()
    flagged_content_week_ago = Review.objects.filter(flagged=True, created_at__date__lt=week_ago).count()
    
    # Calculate percentage changes
    def calc_percent_change(current, previous):
        if previous == 0:
            return 100 if current > 0 else 0
        return ((current - previous) / previous) * 100
    
    total_reviews_change = calc_percent_change(total_reviews, total_reviews_week_ago)
    pending_reviews_change = calc_percent_change(pending_reviews, pending_reviews_week_ago)
    active_users_change = calc_percent_change(active_users, active_users_week_ago)
    flagged_content_change = calc_percent_change(flagged_content, flagged_content_week_ago)
    
    # Get data for review trends chart (last 7 days)
    trend_dates = [(today - timedelta(days=i)) for i in range(6, -1, -1)]
    trend_data = []
    
    for date in trend_dates:
        daily_count = Review.objects.filter(created_at__date=date).count()
        trend_data.append({
            'date': date.strftime('%a'),  # Day abbreviation
            'count': daily_count
        })
    
    # Get data for review distribution chart
    approved = Review.objects.filter(moderated=True, flagged=False).count()
    pending = Review.objects.filter(moderated=False).count()
    rejected = ModerationLog.objects.filter(action='reject').count()
    flagged = Review.objects.filter(flagged=True).count()
    
    # Prepare data for bias metrics
    english_reviews = Review.objects.filter(place__name__regex=r'^[A-Za-z\s]+$')  # Simple filter for English titles
    non_english_reviews = Review.objects.exclude(place__name__regex=r'^[A-Za-z\s]+$')
    
    # Calculate rejection rates
    english_rejection_count = ModerationLog.objects.filter(
        action='reject', 
        review__in=english_reviews
    ).count()
    
    non_english_rejection_count = ModerationLog.objects.filter(
        action='reject', 
        review__in=non_english_reviews
    ).count()
    
    english_rejection_rate = (english_rejection_count / english_reviews.count()) * 100 if english_reviews.count() > 0 else 0
    non_english_rejection_rate = (non_english_rejection_count / non_english_reviews.count()) * 100 if non_english_reviews.count() > 0 else 0
    
   
    admin_consistency = 72 
    
    # Recent reviews
    recent_reviews = Review.objects.all().prefetch_related('user', 'place').order_by('-created_at')[:5]
    
    context = {
        'stats': {
            'total_reviews': {
                'value': total_reviews,
                'change': total_reviews_change,
                'is_positive': total_reviews_change >= 0
            },
            'pending_reviews': {
                'value': pending_reviews,
                'change': pending_reviews_change,
                'is_positive': pending_reviews_change < 0  # Fewer pending reviews is positive
            },
            'active_users': {
                'value': active_users,
                'change': active_users_change,
                'is_positive': active_users_change >= 0
            },
            'flagged_content': {
                'value': flagged_content,
                'change': flagged_content_change,
                'is_positive': flagged_content_change < 0  # Fewer flagged content is positive
            }
        },
        'trend_data': trend_data,
        'distribution': {
            'approved': approved,
            'pending': pending,
            'rejected': rejected,
            'flagged': flagged
        },
        'bias_metrics': {
            'english_rate': english_rejection_rate,
            'non_english_rate': non_english_rejection_rate,
            'admin_consistency': admin_consistency,
            'has_bias_alert': abs(english_rejection_rate - non_english_rejection_rate) > 15
        },
        'recent_reviews': recent_reviews
    }
    
    return render(request, 'moderator_dashboard.html', context)


@login_required
@require_POST
def direct_update_review(request, review_id):
    """
    Simple endpoint to directly update a review without form validation.
    This bypasses the issues with the place field.
    """
    # Find the review and ensure it belongs to the current user
    review = get_object_or_404(Review, id=review_id, user=request.user)
    
    # Update only the allowed fields
    review.title = request.POST.get('title', review.title)
    review.content = request.POST.get('content', review.content)
    
    # Handle rating - ensure it's a valid integer
    try:
        rating = int(request.POST.get('rating', review.rating))
        if 1 <= rating <= 5:  # ratings are 1-5
            review.rating = rating
    except ValueError:
        pass  # Keep the existing rating if invalid
    
    # Save the review 
    review.save(update_fields=['title', 'content', 'rating'])
    
    # Return appropriate response based on request type
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return JsonResponse({'success': True, 'message': 'Review updated successfully'})
    else:
        messages.success(request, 'Your review has been updated successfully!')
        return redirect('profile')  # 'profile' is the name of your profile URL pattern


@login_required
def edit_review(request, review_id):
    """
    Handles editing a review, including logging the edit action.
    """
    print(f"Processing review edit for ID: {review_id}")
    review = get_object_or_404(Review, id=review_id)
    print(f"Found review: {review.title}")

    if request.method == 'POST':
        print("POST request received with data:", request.POST)
        is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest' # Check if AJAX early

        # --- Direct Save Path (Bypassing Form Validation) ---
        if 'direct_save' in request.POST:
            print("Processing direct save request (bypassing form validation)")

            # Update review fields directly from POST data
            review.title = request.POST.get('title', review.title)
            review.content = request.POST.get('content', review.content)

            # Handle rating safely
            try:
                rating = int(request.POST.get('rating', review.rating))
                if 1 <= rating <= 5:  # Assuming ratings are 1-5 stars
                    review.rating = rating
            except (ValueError, TypeError):
                pass  # Keep existing rating if invalid

            # Save the updated fields
            review.save(update_fields=['title', 'content', 'rating'])

            # --- Log the Edit Action (Direct Save) ---
            try:
                ReviewEditLog.objects.create(
                    review=review,
                    editor=request.user # The user performing the edit
                )
                print(f"Logged direct edit for review {review.id} by user {request.user.username}")
            except Exception as log_error:
                # Log failure but don't stop the response
                logger.error(f"Failed to log direct edit for review {review.id}: {log_error}", exc_info=True)
            # --- End Logging ---

            # Respond based on request type
            if is_ajax:
                print("Returning JSON success response for AJAX request (direct save)")
                return JsonResponse({'success': True, 'message': 'Review updated successfully'})
            else:
                print("Adding success message and redirecting (direct save)")
                messages.success(request, 'Review updated successfully')
                # Choose appropriate redirect based on user role or context
                return redirect('home')

        # --- Regular Form Submission Path ---
        else:
            form = ReviewForm(request.POST, instance=review) # Initialize form with POST data and existing review instance

            if form.is_valid():
                print("Form is valid, saving...")
                saved_review = form.save() # Save the valid form data
                print(f"Review saved with title: {saved_review.title}, content: {saved_review.content[:30]}...")

                # --- Log the Edit Action (Form Save) ---
                try:
                    ReviewEditLog.objects.create(
                        review=saved_review, # Use the saved instance
                        editor=request.user # The user performing the edit
                    )
                    print(f"Logged form edit for review {saved_review.id} by user {request.user.username}")
                except Exception as log_error:
                    # Log failure but don't stop the response
                    logger.error(f"Failed to log form edit for review {saved_review.id}: {log_error}", exc_info=True)
                # --- End Logging ---

                # Respond based on request type
                if is_ajax:
                    print("Returning JSON response for AJAX request (form save)")
                    return JsonResponse({'success': True, 'message': 'Review updated successfully'})
                else:
                    print("Adding success message and redirecting (form save)")
                    messages.success(request, 'Review updated successfully')
                    # Choose appropriate redirect
                    return redirect('home') # Example redirect
            else:
                # Form validation failed
                print("Form validation failed with errors:", form.errors)
                if is_ajax:
                    print("Returning JSON error response for AJAX request (form invalid)")
                    # Return form errors for client-side display
                    return JsonResponse({'success': False, 'errors': form.errors.get_json_data()}, status=400)
                else:
                    print("Rendering form with errors for regular request")
                    messages.error(request, 'Please correct the errors below.')
                    # Re-render the form with errors (fall through to GET request handling below)

    # --- GET Request Handling (or if POST form was invalid for non-AJAX) ---
    if request.method != 'POST' or not is_ajax: # Handles GET and invalid non-AJAX POST
        print("GET request received or non-AJAX invalid POST, initializing form with review data")
        form = ReviewForm(instance=review) # Initialize form with existing review data

        print("Rendering edit review template")
        rating_range = range(1, 6)  # For rating dropdown/stars
        context = {
            'form': form,
            'review': review,
            'rating_range': rating_range
        }
        return render(request, 'edit_review.html', context)
    

@csrf_exempt
def review_distribution_api(request):
    """API endpoint for review distribution chart"""
    try:
        # Get distribution data
        approved = Review.objects.filter(moderated=True, flagged=False).count()
        pending = Review.objects.filter(moderated=False).count() 
        rejected = Review.objects.filter(moderated=True, flagged=True).count()
        flagged = Review.objects.filter(flagged=True).count()
        
        return JsonResponse({
            'approved': approved,
            'pending': pending,
            'rejected': rejected,
            'flagged': flagged
        })
    except Exception as e:
        print(f"Error in review distribution API: {str(e)}")
        # Return sample data
        return JsonResponse({
            'approved': 65,
            'pending': 25,
            'rejected': 10,
            'flagged': 15
        })

# ------------------------------------------- Moderators Reviews ------------------------------------------------#

@login_required # Ensure user is logged in, adjust permissions if needed
@require_GET    # Only allow GET requests
def get_review_details_api(request, review_id):
    """
    API endpoint to fetch details for a single review.
    """
    try:
        # Fetch review and related data efficiently
        review = get_object_or_404(
            Review.objects.select_related('user', 'place'),
            pk=review_id
        )

        # Prepare data for JSON response
        review_data = {
            'id': review.id,
            'title': review.title,
            'content': review.content,
            'rating': review.rating,
            'user': review.user.username if review.user else 'Unknown User',
            'place_name': review.place.name if review.place else 'Unknown Place',
            'country': review.place.country if review.place else 'N/A',
            'visit_date': review.visit_date.strftime('%Y-%m-%d') if review.visit_date else 'N/A',
            'created_at': review.created_at.isoformat(),
            'moderated': review.moderated,
            'flagged': review.flagged,
            # Add image URLs if needed
            # 'images': [img.image.url for img in review.images.all()]
        }
        return JsonResponse({'success': True, 'review': review_data})

    except Http404:
        logger.warning(f"Review details requested for non-existent ID: {review_id}")
        return JsonResponse({'success': False, 'error': 'Review not found.'}, status=404)
    except Exception as e:
        logger.error(f"Error fetching review details for ID {review_id}: {e}", exc_info=True)
        return JsonResponse({'success': False, 'error': 'An error occurred.'}, status=500)



@login_required
@user_passes_test(lambda u: u.groups.filter(name='Moderators').exists())
def moderator_reviews(request, review_id=None):
    """
    View for moderating reviews with bias prevention features
    """
    # Handle POST requests for moderation actions
    if review_id is not None and request.method == "POST":
        success_message = "" # Variable to store the success message
        try:
            review = Review.objects.get(id=review_id)
            action = request.POST.get("action")

            if action not in ["approve", "reject", "highlight", "assign"]:
                messages.error(request, "Invalid action.")
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return JsonResponse({'success': False, 'error': 'Invalid action'}, status=400)
                return redirect('moderator_reviews') # Redirect to the list view

            # --- Action Logic ---
            if action == "approve":
                review.flagged = False
                review.moderated = True
                review.save()
                Flag.objects.filter(review=review).delete()
                ModerationLog.objects.create(
                    review=review,
                    moderator=request.user,
                    action="approve" # Log correct action
                 )
                success_message = "Review approved successfully."
                messages.success(request, success_message)

            elif action == "reject":
                rejection_reason = request.POST.get("rejection_reason", "Not specified")
                rejection_notes = request.POST.get("notes", "")
                ModerationLog.objects.create(
                    review=review,
                    moderator=request.user,
                    action="reject",
                    notes=f"Reason: {rejection_reason}, Notes: {rejection_notes}"
                )
                review.delete()
                success_message = "Review rejected and removed."
                messages.success(request, success_message)

            elif action == "highlight":
                review.highlighted = not getattr(review, 'highlighted', False)
                review.save()
                status = "highlighted" if review.highlighted else "unhighlighted"
                success_message = f"Review {status} for further review."
                messages.success(request, success_message)

            elif action == "assign":
                try:
                    moderator = Moderator.objects.get(user=request.user)
                except Moderator.DoesNotExist:
                    moderator = Moderator.objects.create(user=request.user)

                flags = Flag.objects.filter(review=review)
                if flags.exists():
                    for flag in flags:
                        flag.moderator = moderator
                        flag.save()
                else:
                    Flag.objects.create(
                        review=review,
                        moderator=moderator,
                        reason="Assigned to moderator"
                    )
                success_message = "Review assigned to you."
                messages.success(request, success_message)

            # --- AJAX Response ---
            # If it's an AJAX request, return the success message directly
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    # Use the success_message variable directly
                    'message': success_message
                })

            # For regular (non-AJAX) requests, redirect after action
            return redirect('moderator_reviews') # Redirect to the list view

        except Review.DoesNotExist:
            error_message = "Review not found."
            messages.error(request, error_message)
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': False, 'error': error_message}, status=404)
            return redirect('moderator_reviews') # Redirect to the list view

        except Exception as e:
            error_message = f"An error occurred: {str(e)}"
            logger.error(f"Error in moderation action for review {review_id}: {e}", exc_info=True) # Log full traceback
            messages.error(request, error_message)
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': False, 'error': error_message}, status=500)
            return redirect('moderator_reviews') # Redirect to the list view

    # --- Handle GET requests (displaying the list) ---
    filter_type = request.GET.get('filter', 'assigned')
    sort_by = request.GET.get('sort', 'newest')

    try:
        moderator = Moderator.objects.get(user=request.user)
    except Moderator.DoesNotExist:
        moderator = Moderator.objects.create(user=request.user)

    reviews = Review.objects.filter(flagged=True)

    if filter_type == 'assigned':
        reviews = reviews.filter(flags__moderator=moderator)
    elif filter_type == 'unassigned':
        reviews = reviews.filter(Q(flags__isnull=True) | Q(flags__moderator__isnull=True))

    if sort_by == 'oldest':
        reviews = reviews.order_by('created_at')
    elif sort_by == 'most_flags':
        reviews = reviews.annotate(flag_count=Count('flags')).order_by('-flag_count')
    else: # newest (default)
        reviews = reviews.order_by('-created_at')

    reviews = reviews.distinct().prefetch_related(
        'user', 'place', 'images', 'flags', 'flags__moderator'
    )

    # Calculate counts for filter tabs
    assigned_count = Review.objects.filter(flagged=True, flags__moderator=moderator).distinct().count()
    unassigned_count = Review.objects.filter(Q(flagged=True) & (Q(flags__isnull=True) | Q(flags__moderator__isnull=True))).distinct().count()
    all_flagged_count = Review.objects.filter(flagged=True).distinct().count()

    # Add fairness indicators (keep this logic)
    for review in reviews:
        if review.place and hasattr(review.place, 'country'):
            english_speaking = ['United States', 'United Kingdom', 'Australia', 'Canada', 'New Zealand']
            review.non_english_country = review.place.country not in english_speaking
        else:
            review.non_english_country = False

        if review.place:
            similar_reviews = Review.objects.filter(place=review.place)
            total_similar = similar_reviews.count()
            if total_similar > 0:
                rejected_similar = ModerationLog.objects.filter(review__in=similar_reviews, action='reject').count()
                review.similar_rejections_rate = round((rejected_similar / total_similar) * 100) if rejected_similar > 0 else 0
            else:
                review.similar_rejections_rate = 0
        else:
             review.similar_rejections_rate = 0

        review.highlighted = getattr(review, 'highlighted', False)

    context = {
        'reviews': reviews,
        'filter_type': filter_type,
        'sort_by': sort_by,
        'counts': {
            'assigned': assigned_count,
            'unassigned': unassigned_count,
            'all': all_flagged_count
        }
    }

    return render(request, 'moderator_reviews.html', context)

# ------------------------------------------- Moderators User Management ------------------------------------------------#

User = get_user_model()

@login_required
@user_passes_test(lambda u: u.groups.filter(name='Moderators').exists())
def User_management(request):
    # --- Date Setup ---
    # Get current date and calculate dates for the previous one and two weeks.
    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    two_weeks_ago = week_ago - timedelta(days=7) # Used for comparing new users week over week.
    
    # --- Helper Function ---
    # Calculates the percentage change between two values.
    def calc_percent_change(current, previous):
        if previous == 0: # Avoid division by zero.
            return 100 if current > 0 else 0 # If previous was 0, any current value is a 100% increase (or 0% if current is also 0).
        return ((current - previous) / previous) * 100

    # --- User Statistics Calculation ---
    # Total users count.
    total_users = User.objects.count()
    total_users_week_ago = User.objects.filter(date_joined__date__lt=week_ago).count() # Total users before last week.
    
    # New users registered in the last week.
    new_users = User.objects.filter(
        date_joined__date__gte=week_ago, 
        date_joined__date__lte=today
    ).count()
    # New users registered in the week before last.
    new_users_week_ago = User.objects.filter(
        date_joined__date__gte=two_weeks_ago,
        date_joined__date__lt=week_ago
    ).count()
    
    # Active users (logged in within the last 30 days).
    active_users = User.objects.filter(
        last_login__date__gte=today - timedelta(days=30)
    ).count()
    # Active users in the 30 days leading up to a week ago.
    active_users_week_ago = User.objects.filter(
        last_login__date__gte=week_ago - timedelta(days=30), # Active in the 30 days before 'week_ago'.
        last_login__date__lt=week_ago # Ensure they were active *before* the start of the current week's comparison period.
    ).count()
    
    # Flagged users (inactive users are considered flagged here).
    flagged_users = User.objects.filter(is_active=False).count()
    # Placeholder for flagged users a week ago; requires historical data or different logic for accurate comparison.
    flagged_users_week_ago = flagged_users # This is a simplification; real comparison would need historical flagging status.
    
    # --- Percentage Change Calculation ---
    # Calculate week-over-week percentage changes for each metric.
    total_users_change = calc_percent_change(total_users, total_users_week_ago)
    new_users_change = calc_percent_change(new_users, new_users_week_ago)
    active_users_change = calc_percent_change(active_users, active_users_week_ago)
    flagged_users_change = calc_percent_change(flagged_users, flagged_users_week_ago)
    
    # --- Context Preparation ---
    # Prepare context data to be passed to the template.
    context = {
        'user_stats': { # Group user statistics.
            'total_users': {
                'value': total_users,
                'change': total_users_change,
                'is_positive': total_users_change >= 0 # True if change is non-negative.
            },
            'new_users': {
                'value': new_users,
                'change': new_users_change,
                'is_positive': new_users_change >= 0
            },
            'active_users': {
                'value': active_users,
                'change': active_users_change,
                'is_positive': active_users_change >= 0
            },
            'flagged_users': {
                'value': flagged_users,
                'change': flagged_users_change,
                'is_positive': flagged_users_change < 0 # Positive change for flagged users is generally bad.
            }
        }
    }
    
    print("User Management Context:", context) # For debugging purposes.
    # Render the template with the calculated context.
    return render(request, 'User_Management.html', context)

@login_required
@user_passes_test(lambda u: u.groups.filter(name='Moderators').exists())
def user_demographics_data(request):
    """
    API endpoint to provide data for a user demographics chart.
    Calculates counts for new, regular, premium, and inactive users.
    """
    try:
        # --- User Category Counts ---
        # New users: registered in the last 30 days.
        new_users = User.objects.filter(date_joined__gte=timezone.now() - timedelta(days=30)).count()
        
        # Regular users: logged in recently (last 30 days) but are not new users.
        regular_users = User.objects.filter(
            last_login__gte=timezone.now() - timedelta(days=30)
        ).exclude(
            date_joined__gte=timezone.now() - timedelta(days=30) # Exclude users who also count as 'new'.
        ).count()
        
        # Premium users: count based on a 'profile.subscription_type' attribute.
        # This section safely checks if the necessary profile attributes exist.
        premium_users = 0 # Default to 0 if profile/subscription_type attributes don't exist.
        if hasattr(User, 'profile') and hasattr(User.profile, 'subscription_type'): # Check if 'profile' and 'subscription_type' exist.
            premium_users = User.objects.filter(profile__subscription_type='premium').count()
        
        # Inactive users: active accounts not logged in for 90 days.
        inactive_users = User.objects.filter(
            is_active=True, # Only count users who are marked as active.
            last_login__lt=timezone.now() - timedelta(days=90) # Last login more than 90 days ago.
        ).count()

        # --- Data Preparation ---
        # Structure data for JSON response, suitable for charting libraries.
        data = {
            'labels': ['New Users', 'Regular Users', 'Premium Users', 'Inactive Users'],
            'values': [new_users, regular_users, premium_users, inactive_users]
        }
        return JsonResponse(data) # Return the demographic data.

    except Exception as e: # Catch any unexpected errors during data retrieval.
        print(f"Error generating user demographics data: {e}") # Log the error to the console/server logs.
        # Return a JSON response indicating an error, for client-side handling.
        return JsonResponse({
            'labels': ['Error'], # Placeholder data for the chart on error.
            'values': [1],
            'error': str(e) # Include the error message.
        }, status=500) # HTTP 500 Internal Server Error.

@login_required
@user_passes_test(lambda u: u.groups.filter(name='Moderators').exists())
def user_activity_data(request):
    """
    API endpoint for user activity chart data.
    Calculates active users and new registrations for the last 7 months.
    """
    # Initialize lists for chart data.
    months = [] 
    active_users = [] 
    new_registrations = [] 
    
    # Get current aware datetime.
    now = timezone.now() 
    # Determine the start of the current month.
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Loop through the last 7 months (current + 6 previous).
    for i in range(6, -1, -1): # Iterate from 6 months ago to current month.
        # Calculate start of the target month.
        month_start = current_month_start - relativedelta(months=i)
        # Calculate start of the next month (for range end).
        next_month_start = month_start + relativedelta(months=1)
        
        # Add abbreviated month name to labels list.
        months.append(month_start.strftime('%b')) 
        
        # Count active users: last login within the target month.
        month_active_users = User.objects.filter(
            last_login__gte=month_start, 
            last_login__lt=next_month_start  
        ).count()
        active_users.append(month_active_users) # Add count to list.
        
        # Count new users: joined within the target month.
        month_new_users = User.objects.filter(
            date_joined__gte=month_start, 
            date_joined__lt=next_month_start 
        ).count()
        new_registrations.append(month_new_users) # Add count to list.
    
    # Prepare data for JSON response.
    data = {
        'labels': months, 
        'active_users': active_users, 
        'new_registrations': new_registrations 
    }
    return JsonResponse(data) # Return activity data.


@login_required
@user_passes_test(lambda u: u.groups.filter(name='Moderators').exists())
def contribution_diversity_data(request):
    """
    API endpoint for contribution diversity data.
    Calculates language and geographic distribution of recent reviews.
    """
    try:
        # --- Timeframe & Total Reviews ---
        # Define lookback period (last 90 days).
        timeframe = timezone.now() - timedelta(days=90)
        # Count total reviews in this period.
        total_reviews = Review.objects.filter(created_at__gte=timeframe).count()
        
        # --- Language Distribution ---
        # Count reviews by country of the reviewed place.
        language_counts = Review.objects.filter(
            created_at__gte=timeframe 
        ).values('place__country').annotate( 
            count=Count('id') 
        ).order_by('-count') 
        
        # Map country codes to broader language groups.
        country_language_map = {
            'US': 'English', 'UK': 'English', 'AU': 'English', 'CA': 'English',
            'ES': 'Spanish', 'MX': 'Spanish', 'AR': 'Spanish', 'CO': 'Spanish',
            'FR': 'French', 'CA-QC': 'French', 'BE': 'French', 
            'DE': 'German', 'AT': 'German', 'CH': 'German',
            # Add more mappings as needed.
        }
        
        language_distribution = {} # Stores raw language percentages.
        # Aggregate counts by mapped language.
        for item in language_counts:
            country = item['place__country']
            # Map to language, default to country code or 'Unspecified'.
            language = country_language_map.get(country, country) if country else 'Unspecified'
            count = item['count']
            # Calculate percentage of total reviews for this language group.
            percentage = round((count / total_reviews) * 100) if total_reviews > 0 else 0
            # Sum percentages if multiple countries map to the same language.
            language_distribution[language] = language_distribution.get(language, 0) + percentage
        
        # Group small language percentages into 'Other'.
        threshold = 5  # Languages below this percentage are grouped.
        filtered_languages = {} # Stores final language distribution for response.
        other_total = 0 # Accumulator for 'Other' category.
        for lang, percentage in language_distribution.items():
            if percentage >= threshold:
                filtered_languages[lang] = percentage
            else:
                other_total += percentage
        if other_total > 0: # Add 'Other' category if it has contributions.
            filtered_languages['Other'] = other_total
        
        # --- Geographic Distribution ---
        # Count reviews by country (similar to language data collection).
        geo_data = Review.objects.filter(
            created_at__gte=timeframe
        ).values('place__country').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Map country codes to geographic regions.
        region_mapping = {
            'US': 'North America', 'CA': 'North America', 'MX': 'North America',
            'GB': 'Europe', 'UK': 'Europe', 'FR': 'Europe', 'DE': 'Europe', 'ES': 'Europe', 'IT': 'Europe',
            'NL': 'Europe', 'BE': 'Europe', 'CH': 'Europe', 'AT': 'Europe', 'SE': 'Europe',
            'NO': 'Europe', 'DK': 'Europe', 'FI': 'Europe', 'PT': 'Europe', 'GR': 'Europe',
            'CN': 'Asia', 'JP': 'Asia', 'KR': 'Asia', 'IN': 'Asia', 'SG': 'Asia',
            'ID': 'Asia', 'MY': 'Asia', 'TH': 'Asia', 'VN': 'Asia', 'PH': 'Asia',
            'BR': 'South America', 'AR': 'South America', 'CO': 'South America',
            'CL': 'South America', 'PE': 'South America', 'VE': 'South America',
            'ZA': 'Africa', 'EG': 'Africa', 'NG': 'Africa', 'KE': 'Africa', 'MA': 'Africa',
            'AU': 'Oceania', 'NZ': 'Oceania', 'FJ': 'Oceania'
            # Add more mappings as needed.
        }
        
        region_counts = {} # Stores raw review counts per region.
        # Aggregate counts by mapped region.
        for item in geo_data:
            country = item['place__country']
            # Map to region, default to 'Other' or 'Unspecified'.
            region = region_mapping.get(country, 'Other') if country else 'Unspecified'
            count = item['count']
            region_counts[region] = region_counts.get(region, 0) + count # Sum counts for region.
        
        # Calculate percentage distribution for geographic regions.
        geo_distribution = {region: round((count / total_reviews) * 100) if total_reviews > 0 else 0
                            for region, count in region_counts.items()}
        
        # --- Generate Insight ---
        # Create a textual insight based on the calculated distributions.
        insight = generate_diversity_insight(filtered_languages, geo_distribution)
        
        # --- JSON Response ---
        # Return the calculated diversity data and insight.
        return JsonResponse({
            'language_distribution': filtered_languages,
            'geographic_distribution': geo_distribution,
            'insight': insight
        })
        
    except Exception as e: # Catch any unexpected errors during processing.
        print(f"Error generating contribution diversity data: {e}") # Log the error.
        # Return an error response to the client.
        return JsonResponse({
            'error': str(e),
            'message': 'An error occurred while retrieving diversity data.'
        }, status=500) # HTTP 500 Internal Server Error.

def generate_diversity_insight(language_data, geo_data):
    """
    Generates a textual insight based on language and geographic distribution data.
    """
    try:
        # Identify underrepresented geographic regions (less than 15% contribution).
        underrepresented_regions = [region for region, percentage in geo_data.items() 
                                    if percentage < 15 and region not in ['Other', 'Unspecified']]
        
        if underrepresented_regions: # If there are underrepresented regions.
            regions_text = ", ".join(underrepresented_regions)
            total_percentage = sum(geo_data.get(r, 0) for r in underrepresented_regions)
            # Determine dominant language for context.
            dominant_language = max(language_data.items(), key=lambda x: x[1])[0] if language_data else "primary language"
            dominant_percentage = language_data.get(dominant_language, 0)
            
            if dominant_percentage > 50: # If one language is very dominant.
                return f"Consider reaching out to underrepresented regions ({regions_text}) to increase review diversity. These regions currently make up only {total_percentage}% of contributions compared to {dominant_percentage}% from {dominant_language} content."
            else: # General message for underrepresented regions.
                return f"Reviews from {regions_text} make up only {total_percentage}% of all contributions but often provide unique perspectives. Consider strategies to increase participation from these regions."
        
        # Check if any single language is overly dominant.
        max_lang_pct = max(language_data.values()) if language_data else 0
        if max_lang_pct > 70: # If one language constitutes over 70%.
            dominant_language = max(language_data.items(), key=lambda x: x[1])[0]
            return f"Content is heavily skewed toward {dominant_language} ({max_lang_pct}%). Consider outreach efforts to increase linguistic diversity."
        
        # General message if diversity seems reasonable.
        top_region = max(geo_data.items(), key=lambda x: x[1])[0] if geo_data else "leading region"
        top_pct = geo_data.get(top_region, 0)
        return f"Current distribution shows good diversity. {top_region} leads with {top_pct}% of contributions, but multiple regions are well-represented."
    
    except Exception as e: # Catch errors during insight generation.
        print(f"Error generating insight: {e}") # Log error.
        # Fallback insight message.
        return "Consider strategies to increase diversity in underrepresented regions to improve global coverage of reviews."
    


@login_required
@user_passes_test(lambda u: u.groups.filter(name='Moderators').exists())
def users_api(request):
    """
    API endpoint to fetch a paginated and filtered list of users.
    """
    try:
        # --- Request Parameters ---
        # Get pagination and filter parameters from GET request.
        page = int(request.GET.get('page', 1)) # Current page number.
        per_page = int(request.GET.get('per_page', 10)) # Items per page.
        status_filters = request.GET.getlist('status') # List of status filters (e.g., 'active', 'inactive').
        join_date_from = request.GET.get('join_date_from') # Start of join date range.
        join_date_to = request.GET.get('join_date_to') # End of join date range.
        min_reviews = request.GET.get('min_reviews') # Minimum number of reviews.
        
        # --- Base Query ---
        # Start with all users.
        users_query = User.objects.all()
        
        # --- Status Filtering ---
        # Apply status filters if any are provided.
        if status_filters:
            status_conditions = Q() # Initialize Q object for OR conditions.
            for status in status_filters:
                if status == 'active':
                    # Active users who are not flagged (assumes 'profile.flagged' field).
                    status_conditions |= Q(is_active=True) & ~Q(profile__flagged=True) 
                elif status == 'inactive':
                    status_conditions |= Q(is_active=False) # Inactive users.
                elif status == 'flagged':
                    status_conditions |= Q(profile__flagged=True) # Flagged users.
            users_query = users_query.filter(status_conditions) # Apply combined status filters.
        
        # --- Date Filtering ---
        # Filter by join date range, converting string dates to aware datetimes.
        if join_date_from:
            try:
                naive_from_date = datetime.strptime(join_date_from, '%Y-%m-%d')
                # Make datetime timezone-aware using current timezone.
                from_date = timezone.make_aware(naive_from_date, timezone.get_current_timezone())
                users_query = users_query.filter(date_joined__gte=from_date) # Joined on or after from_date.
            except ValueError:
                pass # Ignore invalid date format.
        
        if join_date_to:
            try:
                naive_to_date = datetime.strptime(join_date_to, '%Y-%m-%d')
                # Include the entire 'to' day by setting time to end of day.
                naive_to_date = datetime.combine(naive_to_date, datetime.max.time())
                to_date = timezone.make_aware(naive_to_date, timezone.get_current_timezone())
                users_query = users_query.filter(date_joined__lte=to_date) # Joined on or before to_date.
            except ValueError:
                pass # Ignore invalid date format.
        
        # --- Min Reviews Filtering ---
        # Filter users by a minimum number of reviews.
        if min_reviews and min_reviews.isdigit():
            # Annotate query with review count, then filter.
            users_query = users_query.annotate(review_count=Count('reviews')).filter(review_count__gte=int(min_reviews))
        
        # --- Ordering & Pagination ---
        # Order users by join date, newest first.
        users_query = users_query.order_by('-date_joined')
        # Paginate the filtered and ordered queryset.
        paginator = Paginator(users_query, per_page)
        page_obj = paginator.get_page(page) # Get the requested page object.
        
        # --- Data Serialization ---
        # Prepare user data for JSON response.
        users_data = []
        for user in page_obj: # Iterate over users in the current page.
            # Calculate review count and approval rate for each user.
            review_count = user.reviews.count() # Assumes 'reviews' related name.
            if review_count > 0:
                approved_reviews = user.reviews.filter(moderated=True, flagged=False).count()
                approval_rate = int((approved_reviews / review_count) * 100)
            else:
                approval_rate = 0
            
            # Safely access profile attributes (location, language, flagged status, avatar).
            location = getattr(user.profile, 'location', None) if hasattr(user, 'profile') else None
            language = getattr(user.profile, 'language', None) if hasattr(user, 'profile') else None
            is_flagged = getattr(user.profile, 'flagged', False) if hasattr(user, 'profile') else False
            avatar_url = user.profile.avatar.url if hasattr(user, 'profile') and hasattr(user.profile, 'avatar') and user.profile.avatar else None
            
            # Ensure date_joined is timezone-aware before formatting.
            dt_joined = user.date_joined
            if timezone.is_naive(dt_joined): # If date is naive.
                dt_joined = timezone.make_aware(dt_joined, timezone.get_current_timezone()) # Make it aware.
            date_joined_str = dt_joined.strftime('%Y-%m-%d') # Format date as string.
            
            # Construct dictionary for the current user.
            user_data = {
                'id': user.id,
                'name': f"{user.first_name} {user.last_name}".strip() or user.username, # Full name or username.
                'email': user.email,
                'avatar_url': avatar_url,
                'location': location,
                'review_count': review_count,
                'approval_rate': approval_rate,
                'language': language,
                'is_active': user.is_active,
                'is_flagged': is_flagged,
                'date_joined': date_joined_str
            }
            users_data.append(user_data)
        
        # --- Pagination Info ---
        # Prepare pagination details for the response.
        pagination_data = {
            'current_page': page_obj.number,
            'total_pages': paginator.num_pages,
            'per_page': per_page,
            'total_entries': paginator.count
        }
        
        # --- JSON Response ---
        # Return paginated user data and pagination info.
        return JsonResponse({
            'users': users_data,
            'pagination': pagination_data
        })
        
    except Exception as e: # Catch any unexpected errors.
        print(f"Error in users API: {e}") # Log the error.
        # Return an error response.
        return JsonResponse({
            'error': str(e),
            'message': 'An error occurred while retrieving user data.'
        }, status=500) # HTTP 500.


@login_required
@user_passes_test(lambda u: u.groups.filter(name='Moderators').exists())
def user_status_api(request, user_id):
    """
    API endpoint to update a user's status (flag or toggle active status).
    Expects a JSON request body with an 'action'.
    """
    try:
        # Load data from the JSON request body.
        data = json.loads(request.body)
        action = data.get('action') # Get the requested action ('flag' or 'toggle').
        
        # Retrieve the target user by ID.
        user = User.objects.get(id=user_id)
        
        if action == 'flag': # Handle 'flag' action.
            # Assumes user has a related 'profile' object with a 'flagged' field.
            if hasattr(user, 'profile'):
                user.profile.flagged = True # Set flagged status.
                user.profile.save() # Save the profile changes.
            return JsonResponse({'success': True, 'message': 'User has been flagged'})
        
        elif action == 'toggle': # Handle 'toggle' active status action.
            user.is_active = not user.is_active # Invert the user's active status.
            user.save() # Save the user model changes.
            status = 'activated' if user.is_active else 'deactivated' # Determine status message.
            return JsonResponse({'success': True, 'message': f'User has been {status}'})
        
        else: # Handle invalid actions.
            return JsonResponse({'success': False, 'error': 'Invalid action specified.'}, status=400)
            
    except User.DoesNotExist: # Handle case where the user_id does not exist.
        return JsonResponse({'success': False, 'error': 'User not found.'}, status=404) # Not Found.
        
    except Exception as e: # Catch any other unexpected errors.
        # logger.error(f"Error updating user status for user_id {user_id}: {e}") # Log the error.
        print(f"Error updating user status for user_id {user_id}: {e}") # Fallback print.
        return JsonResponse({'success': False, 'error': str(e)}, status=500) # Internal Server Error.

# Decorators: ensure user is logged in and is a moderator.
@login_required
@user_passes_test(lambda u: u.groups.filter(name='Moderators').exists())
def reset_password_api(request, user_id):
    """
    API endpoint to simulate sending a password reset link.
    In a real application, this would trigger an email with a reset token.
    """
    try:
        # Retrieve the target user by their ID.
        user = User.objects.get(id=user_id)
        # This is a placeholder: actual implementation would involve token generation and email sending.
        return JsonResponse({
            'success': True,
            'message': f'Password reset link has been sent to {user.email}' # Confirmation message.
        })
    except User.DoesNotExist: # If user with the given ID is not found.
        return JsonResponse({'success': False, 'error': 'User not found'}, status=404) # HTTP 404 Not Found.
    except Exception as e: # Catch any other unexpected errors during the process.
        print(f"Error resetting password for user {user_id}: {e}") # Log the error for debugging.
        return JsonResponse({'success': False, 'error': str(e)}, status=500) # HTTP 500 Internal Server Error.

# Decorators: ensure user is logged in, a moderator, and request is POST.
@login_required
@require_POST # Restrict this view to POST requests only.
def delete_review(request, review_id):
    """
    Deletes a specific review identified by review_id.
    Accessible only by moderators via POST request.
    """
    # Retrieve the review object or return a 404 error if not found.
    review = get_object_or_404(Review, id=review_id) # Assuming Review model is imported.
    
    try:
        # Store the review ID before deletion for the JSON response.
        deleted_id = review.id
        review.delete() # Delete the review object from the database.
        
        # Check if the request is an AJAX request.
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            # Return a JSON response for AJAX calls.
            return JsonResponse({
                'status': 'success', 
                'message': 'Review deleted successfully',
                'id': deleted_id # Include deleted ID for client-side updates.
            })
        else:
            # For non-AJAX requests, show a success message and redirect.
            messages.success(request, "Review deleted successfully!")
            return redirect('moderator_reviews') # Redirect to a relevant page.
            
    except Exception as e: # Catch any unexpected errors during deletion.
        # Log the error for server-side diagnosis.
        print(f"Error deleting review ID {review_id}: {str(e)}")
        traceback.print_exc() # Print the full traceback for debugging.
        
        # Return an appropriate error response.
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            # JSON error response for AJAX.
            return JsonResponse({
                'status': 'error', 
                'message': str(e) # Send error message.
            }, status=500) # HTTP 500 Internal Server Error.
        else:
            # Message and redirect for non-AJAX error.
            messages.error(request, f"Error deleting review: {str(e)}")
            return redirect('moderator_reviews') # Redirect on error.

# Decorator: ensure user is logged in and request is POST.
@login_required
@require_POST # Restrict this view to POST requests only.
def user_delete_review(request, review_id):
    """
    Allows authenticated users to delete their own reviews.
    Requires POST request.
    """
    # Retrieve the review or return 404 if not found.
    review = get_object_or_404(Review, id=review_id) # Assuming Review model is imported.
    
    # Verify that the review belongs to the currently authenticated user.
    if review.user != request.user:
        # If not the owner, return a permission denied error.
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest': # AJAX request.
            return JsonResponse({"error": "You don't have permission to delete this review"}, status=403) # HTTP 403 Forbidden.
        else: # Standard request.
            messages.error(request, "You don't have permission to delete this review.")
            return redirect('profile') # Redirect to user's profile or another appropriate page.
    
    try:
        # Store review ID before actual deletion for response.
        deleted_review_id = review.id 
        review.delete() # Delete the review from the database.
        
        # Return appropriate response based on request type (AJAX or standard).
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest': # AJAX request.
            return JsonResponse({
                "success": True, 
                "message": "Review deleted successfully", 
                "id": deleted_review_id # Send back ID for client-side UI update.
            })
        else: # Standard request.
            messages.success(request, "Your review has been deleted successfully.")
            return redirect('profile') # Redirect after successful deletion.
            
    except Exception as e: # Catch any unexpected errors during deletion.
        # Log the error (optional, but good for debugging).
        print(f"Error deleting own review (ID: {review_id}) by user {request.user.username}: {str(e)}")
        traceback.print_exc()

        # Handle exceptions and return an error response.
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest': # AJAX request.
            return JsonResponse({"success": False, "error": str(e)}, status=500) # HTTP 500 Internal Server Error.
        else: # Standard request.
            messages.error(request, f"Error deleting review: {str(e)}")
            return redirect('profile') # Redirect on error.

            
@csrf_exempt 
def dashboard_trends_api(request):
    """Simplified API endpoint for dashboard chart data (e.g., review trends)."""
    try:
        # Get current date for time-based filtering.
        today = timezone.now().date()
        
        # Initialize lists for chart data (labels and datasets).
        labels = []
        all_reviews = []
        approved = []
        flagged = []
        
        # Loop through the last 14 days (current day and 13 previous days).
        for i in range(13, -1, -1): # Iterate from 13 days ago up to today.
            date = today - timedelta(days=i) # Calculate the specific date.
            date_str = date.strftime('%b %d') # Format date as "Mon DD" (e.g., "May 17").
            labels.append(date_str) # Add formatted date to labels.
            
            # Query reviews created on this specific date.
            day_reviews = Review.objects.filter(created_at__date=date) # Assuming Review model is imported.
            all_reviews.append(day_reviews.count()) # Total reviews for the day.
            # Count approved reviews (moderated and not flagged).
            approved.append(day_reviews.filter(moderated=True, flagged=False).count())
            # Count flagged reviews.
            flagged.append(day_reviews.filter(flagged=True).count())
        
        # Return the structured data for the chart.
        return JsonResponse({
            'labels': labels,
            'allReviews': all_reviews,
            'approvedReviews': approved,
            'flaggedReviews': flagged
        })
    except Exception as e: # Catch any unexpected errors.
        print(f"Error in dashboard trends API: {str(e)}") # Log the error.
        # Return sample/random data as a fallback in case of an error.
        # This helps the chart on the frontend to still render something.
        return JsonResponse({
            'labels': [f"Day {i}" for i in range(1, 15)], # Sample labels.
            'allReviews': [random.randint(10, 50) for _ in range(14)], # Sample data.
            'approvedReviews': [random.randint(5, 40) for _ in range(14)],
            'flaggedReviews': [random.randint(1, 10) for _ in range(14)]
        })


@csrf_exempt
def review_trends_api(request):
    """API endpoint for review trends chart data"""
    try:
        # Get period parameter (daily, weekly, monthly)
        period = request.GET.get('period', 'daily').lower()
        
        # Get current date
        today = timezone.now().date()
        
        # Define period configuration
        if period == 'weekly':
            # Last 10 weeks
            num_periods = 10
            delta = timedelta(weeks=1)
            format_str = '%b %d'  # e.g., "Jan 01"
        elif period == 'monthly':
            # Last 12 months
            num_periods = 12
            delta = timedelta(days=30)
            format_str = '%b'  # e.g., "Jan"
        else:  # daily
            # Last 14 days
            num_periods = 14
            delta = timedelta(days=1)
            format_str = '%b %d'  # e.g., "Jan 01"
        
        # Generate date ranges
        date_ranges = []
        for i in range(num_periods - 1, -1, -1):
            end_date = today - (delta * i)
            if period == 'weekly':
                start_date = end_date - timedelta(days=6)
                label = f"{start_date.strftime('%b %d')} - {end_date.strftime('%b %d')}"
            elif period == 'monthly':
                start_date = end_date - timedelta(days=29)
                label = end_date.strftime('%b')
            else:  # daily
                start_date = end_date
                label = end_date.strftime('%b %d')
            
            date_ranges.append({
                'start': start_date,
                'end': end_date,
                'label': label
            })
        
        # Collect data for each range
        labels = []
        all_reviews_data = []
        approved_reviews_data = []
        flagged_reviews_data = []
        
        for date_range in date_ranges:
            labels.append(date_range['label'])
            
            # Filter reviews for this date range
            if period == 'daily':
                # For daily, we just want reviews on that specific day
                reviews = Review.objects.filter(
                    created_at__date=date_range['start']
                )
            else:
                # For weekly/monthly, get reviews between start and end dates
                reviews = Review.objects.filter(
                    created_at__date__gte=date_range['start'],
                    created_at__date__lte=date_range['end']
                )
            
            # Count total reviews for this period
            all_reviews_count = reviews.count()
            all_reviews_data.append(all_reviews_count)
            
            # Count approved reviews
            approved_count = reviews.filter(moderated=True, flagged=False).count()
            approved_reviews_data.append(approved_count)
            
            # Count flagged reviews
            flagged_count = reviews.filter(flagged=True).count()
            flagged_reviews_data.append(flagged_count)
        
        # Prepare response
        response_data = {
            'labels': labels,
            'allReviews': all_reviews_data,
            'approvedReviews': approved_reviews_data,
            'flaggedReviews': flagged_reviews_data,
            # Include single dataset for simple charts
            'data': all_reviews_data  
        }
        
        return JsonResponse(response_data)
    
    except Exception as e:
        print(f"Error in review_trends_api: {str(e)}")
        # Return sample data on error
        return JsonResponse(get_sample_trends_data(period))

def get_sample_trends_data(period='daily'):
    """Return sample trends data based on the requested period"""
    if period == 'weekly':
        return {
            'labels': ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8', 'Week 9', 'Week 10'],
            'data': [65, 78, 90, 115, 135, 157, 178, 184, 192, 201],
            'allReviews': [65, 78, 90, 115, 135, 157, 178, 184, 192, 201],
            'approvedReviews': [60, 70, 82, 105, 120, 140, 160, 165, 175, 180],
            'flaggedReviews': [5, 8, 8, 10, 15, 17, 18, 19, 17, 21]
        }
    elif period == 'monthly':
        return {
            'labels': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            'data': [220, 254, 290, 315, 335, 357, 378, 384, 410, 430, 450, 480],
            'allReviews': [220, 254, 290, 315, 335, 357, 378, 384, 410, 430, 450, 480],
            'approvedReviews': [200, 230, 260, 280, 300, 320, 340, 350, 370, 390, 410, 430],
            'flaggedReviews': [20, 24, 30, 35, 35, 37, 38, 34, 40, 40, 40, 50]
        }
    else:  # daily
        return {
            'labels': ['Mar 17', 'Mar 18', 'Mar 19', 'Mar 20', 'Mar 21', 'Mar 22', 'Mar 23', 'Mar 24', 'Mar 25', 'Mar 26', 'Mar 27', 'Mar 28', 'Mar 29', 'Mar 30'],
            'data': [25, 28, 30, 35, 40, 45, 50, 48, 55, 60, 58, 64, 70, 65],
            'allReviews': [25, 28, 30, 35, 40, 45, 50, 48, 55, 60, 58, 64, 70, 65],
            'approvedReviews': [22, 25, 27, 32, 36, 40, 45, 43, 50, 54, 52, 58, 65, 58],
            'flaggedReviews': [3, 3, 3, 3, 4, 5, 5, 5, 5, 6, 6, 6, 5, 7]
        }
    


@login_required
@user_passes_test(lambda u: u.groups.filter(name='Moderators').exists())
def user_profile_view(request, user_id):
    """View to display detailed information about a specific user"""
    try:
        # Get user object
        user = User.objects.get(id=user_id)
        
        # Get user profile
        profile = None
        if hasattr(user, 'profile'):
            profile = user.profile
        
        # Get user reviews
        reviews = Review.objects.filter(user=user).order_by('-created_at')
        
        # Calculate user stats
        total_reviews = reviews.count()
        approved_reviews = reviews.filter(moderated=True, flagged=False).count()
        approval_rate = round((approved_reviews / total_reviews) * 100) if total_reviews > 0 else 0
        
        # Calculate average rating
        avg_rating = reviews.aggregate(Avg('rating'))['rating__avg'] or 0
        
        # Get recent activity
        recent_activity = reviews.order_by('-created_at')[:5]
        
        # Get locations reviewed
        locations_reviewed = reviews.values('place__name', 'place__country').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        context = {
            'profile_user': user,
            'user_profile': profile,
            'total_reviews': total_reviews,
            'approval_rate': approval_rate,
            'avg_rating': round(avg_rating, 1),
            'recent_activity': recent_activity,
            'locations_reviewed': locations_reviewed,
            'reviews': reviews[:10],  # Show first 10 reviews
            'join_date': user.date_joined,
            'last_active': user.last_login,
            'is_active': user.is_active,
            'is_flagged': profile.flagged if profile and hasattr(profile, 'flagged') else False
        }
        
        return render(request, 'user_profile.html', context)
        
    except User.DoesNotExist:
        messages.error(request, "User not found")
        return redirect('user_management')
    

@login_required
@user_passes_test(lambda u: u.groups.filter(name='Moderators').exists())
def user_edit_view(request, user_id):
    """View to edit user information"""
    try:
        # Get user object (which is also the profile since UserProfile extends AbstractUser)
        user = UserProfile.objects.get(id=user_id)
        
        if request.method == 'POST':
            # Handle form submission
            # Basic user info
            user.first_name = request.POST.get('first_name', '')
            user.last_name = request.POST.get('last_name', '')
            user.email = request.POST.get('email', '')
            user.is_active = request.POST.get('is_active') == 'on'
            
            # Profile-specific fields
            user.location = request.POST.get('location', '')
            user.bio = request.POST.get('bio', '')
            user.gender = request.POST.get('gender', '')
            user.website = request.POST.get('website', '')
            
            # Handle profile picture upload
            if 'profile_picture' in request.FILES:
                user.save_profile_picture(request.FILES['profile_picture'])
            
            # Handle cover photo upload
            if 'cover_photo' in request.FILES:
                user.save_cover_photo(request.FILES['cover_photo'])
            else:
                # If no new files are submitted, just save the user object
                user.save()
            
            messages.success(request, f"User {user.username} has been updated successfully!")
            return redirect('user_profile', user_id=user.id)
        
        context = {
            'edit_user': user,
        }
        
        return render(request, 'user_edit.html', context)
        
    except UserProfile.DoesNotExist:
        messages.error(request, "User not found")
        return redirect('user_management')
    
# ------------------------------------------- Moderator Analytics ------------------------------------------------#
def Analytics(request):
    """
    View for the analytics dashboard showing key metrics about review system
    """
    # Debugging: Check destinations and reviews
    total_destinations = Destination.objects.count()
    total_reviews = Review.objects.count()
    print(f"🔍 Total Destinations: {total_destinations}")
    print(f"🔍 Total Reviews: {total_reviews}")

    # Get date ranges for current and previous periods
    today = timezone.now().date()
    current_period_start = today - timedelta(days=30)
    previous_period_start = current_period_start - timedelta(days=30)
    
    # Current period stats
    current_reviews = Review.objects.filter(created_at__gte=current_period_start)
    previous_reviews = Review.objects.filter(
        created_at__gte=previous_period_start,
        created_at__lt=current_period_start
    )
    
    # New Reviews
    current_review_count = current_reviews.count()
    previous_review_count = previous_reviews.count()
    review_change = calculate_percentage_change(current_review_count, previous_review_count)
    
    # Approval Rate (non-flagged reviews as a percentage)
    current_moderated = current_reviews.filter(moderated=True).count()
    current_approval_rate = (current_moderated / current_review_count * 100) if current_review_count > 0 else 0
    
    previous_moderated = previous_reviews.filter(moderated=True).count()
    previous_approval_rate = (previous_moderated / previous_review_count * 100) if previous_review_count > 0 else 0
    approval_rate_change = calculate_percentage_change(current_approval_rate, previous_approval_rate)
    
    # Average Rating
    current_avg_rating = current_reviews.aggregate(avg=Avg('rating'))['avg'] or 0
    previous_avg_rating = previous_reviews.aggregate(avg=Avg('rating'))['avg'] or 0
    avg_rating_change = current_avg_rating - previous_avg_rating
    
    # Active Users (users who have written at least one review)
    current_active_users = UserProfile.objects.filter(
        reviews__created_at__gte=current_period_start
    ).distinct().count()
    
    previous_active_users = UserProfile.objects.filter(
        reviews__created_at__gte=previous_period_start,
        reviews__created_at__lt=current_period_start
    ).distinct().count()
    
    active_users_change = calculate_percentage_change(current_active_users, previous_active_users)
    
    # Prepare all stats
    stats = {
        'new_reviews': {
            'value': current_review_count,
            'change': review_change,
            'is_positive': review_change > 0
        },
        'approval_rate': {
            'value': current_approval_rate,
            'change': approval_rate_change,
            'is_positive': approval_rate_change > 0
        },
        'avg_rating': {
            'value': current_avg_rating,
            'change': avg_rating_change,
            'is_positive': avg_rating_change > 0
        },
        'active_users': {
            'value': current_active_users,
            'change': active_users_change,
            'is_positive': active_users_change > 0
        }
    }
    
    # Get review distribution data
    review_distribution = get_review_distribution_data()
    
    # Add distribution data to stats
    stats.update(review_distribution)
    
    # Get top destinations with additional analytics data
    try:
        top_destinations = get_top_destinations(5)
        print("Top Destinations in View:", top_destinations)
        
        # Safely extract places sample
        places_sample = [
            dest.get('name', '') for dest in top_destinations[:3]
        ] if top_destinations else []
        
        # Debug information
        debug_info = {
            'total_places': Destination.objects.count(),
            'places_provided': len(top_destinations),
            'places_sample': places_sample
        }
    except Exception as e:
        print(f"❌ Error retrieving top destinations: {e}")
        top_destinations = []
        places_sample = []
        debug_info = {
            'total_places': Destination.objects.count(),
            'places_provided': 0,
            'places_sample': []
        }
    
    # Get admin performance data with session persistence
    admin_performance = get_admin_performance_data(request)
    
    # Additional context data for charts and tables
    recent_flags = Flag.objects.select_related('review', 'user').order_by('-created_at')[:10]
    
    # Chart data for Review Trends
    review_trends_data = {
        'labels': generate_date_labels(30),  # Last 30 days
        'allReviews': generate_review_data(30),
        'approvedReviews': generate_approved_review_data(30),
        'flaggedReviews': generate_flagged_review_data(30)
    }
    if not current_reviews.exists():  # If no reviews exist
        review_trends_data = {
            'labels': ['No data'],
            'allReviews': [0],
            'approvedReviews': [0],
            'flaggedReviews': [0]
        }
    
    # Add data to a session variable for persistence through refreshes
    if 'reviewTrendsData' not in request.session:
        request.session['reviewTrendsData'] = review_trends_data
    
    context = {
        'stats': stats,
        'top_destinations': top_destinations,
        'places_sample': places_sample,
        'admin_performance': admin_performance,
        'recent_flags': recent_flags,
        'period_start': current_period_start,
        'period_end': today,
        'debug_info': debug_info,
        'reviewTrendsData': request.session.get('reviewTrendsData', review_trends_data)
    }
    
    return render(request, 'Analytics.html', context)


def is_moderator(user):
    return user.groups.filter(name='Moderators').exists()

@login_required
@user_passes_test(is_moderator)
@require_GET
def analytics_edit_stats_api(request):
    """
    API endpoint for fetching aggregated and detailed review edit statistics.
    """
    logger.info(f"Edit stats API request received. GET params: {request.GET}")
    limit_details = 20 # How many recent edit details to return

    try:
        # --- Date Range Processing ---
        range_param = request.GET.get('range', 'last-30-days')
        start_date_str = request.GET.get('start_date')
        end_date_str = request.GET.get('end_date')
        today = timezone.now().date()
        period_start, period_end = None, None # Initialize

        # Simplified date range logic
        if range_param == 'last-7-days': period_start, period_end = today - timedelta(days=6), today
        elif range_param == 'last-90-days': period_start, period_end = today - timedelta(days=89), today
        elif range_param == 'last-year': period_start, period_end = today - timedelta(days=364), today
        elif range_param == 'custom' and start_date_str and end_date_str:
            try:
                period_start = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                period_end = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                if period_end < period_start: raise ValueError("End date before start date")
            except ValueError:
                logger.warning(f"Invalid custom date format: {start_date_str}, {end_date_str}. Falling back.")
                range_param = 'last-30-days'
                period_start, period_end = today - timedelta(days=29), today
        else: # Default 'last-30-days'
            period_start, period_end = today - timedelta(days=29), today

        logger.info(f"Querying edit logs from {period_start} to {period_end}")
        period_start_dt = timezone.make_aware(datetime.combine(period_start, datetime.min.time()))
        period_end_dt = timezone.make_aware(datetime.combine(period_end, datetime.max.time()))

        # --- Query Base ---
        edit_logs_query = ReviewEditLog.objects.filter(
            timestamp__gte=period_start_dt,
            timestamp__lte=period_end_dt
        ).select_related('editor', 'review', 'review__place') # Select related for efficiency

        # --- Aggregate Stats ---
        total_edits = edit_logs_query.count()
        edits_per_mod_data = edit_logs_query.exclude(
            editor__isnull=True
        ).values(
            'editor__username', 'editor__first_name', 'editor__last_name'
        ).annotate(
            edit_count=Count('id')
        ).order_by('-edit_count')

        edits_per_moderator = [
            {
                'moderator_name': f"{item['editor__first_name']} {item['editor__last_name']}".strip() or item['editor__username'],
                'edit_count': item['edit_count']
            } for item in edits_per_mod_data
        ]

        # --- Detailed Edit Log (Recent 'limit_details' entries) ---
        detailed_logs = edit_logs_query.order_by('-timestamp')[:limit_details] # Get newest first

        edit_log_details = []
        for log in detailed_logs:
            review_title = getattr(log.review, 'title', f"Review ID {log.review_id}") # Handle missing title
            place_name = getattr(log.review.place, 'name', None) if log.review and log.review.place else None
            review_identifier = review_title or place_name or f"Review ID {log.review_id}" # Choose best identifier

            edit_log_details.append({
                "log_id": log.id,
                # Format timestamp for consistency (ISO 8601 is good for JS)
                "timestamp": log.timestamp.isoformat(),
                "editor_name": log.editor.get_full_name() if log.editor else 'System/Unknown',
                "review_id": log.review_id,
                "review_identifier": review_identifier # Send a useful identifier
                # "reason": log.reason # Add this if you implement the 'reason' field
            })

        # --- Prepare JSON Response ---
        response_data = {
            'status': 'success',
            'total_edits': total_edits,
            'edits_per_moderator': edits_per_moderator,
            'edit_log_details': edit_log_details, # Include the details
            'meta': {
                 'period_start': period_start.strftime('%Y-%m-%d'),
                 'period_end': period_end.strftime('%Y-%m-%d'),
                 'details_limit': limit_details
            }
        }

        logger.info(f"Successfully generated edit stats and details: {total_edits} total edits.")
        return JsonResponse(response_data)

    except Exception as e:
        logger.error(f"Error in analytics_edit_stats_api: {e}", exc_info=True)
        return JsonResponse({
            'status': 'error',
            'message': 'An unexpected error occurred while fetching edit statistics.'
        }, status=500)
    


def analytics_data_api(request):
    """
    API endpoint for fetching analytics dashboard data with date range filtering
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Log the request for debugging
        logger.info(f"Analytics data request received. GET params: {request.GET}")
        
        # Get range parameter (default to 30 days if not specified)
        range_param = request.GET.get('range', 'last-30-days')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        
        logger.debug(f"Range param: {range_param}, Start date: {start_date}, End date: {end_date}")
        
        # Determine the date range based on the parameter
        today = timezone.now().date()
        
        if range_param == 'last-7-days':
            period_start = today - timedelta(days=7)
            period_end = today
        elif range_param == 'last-90-days':
            period_start = today - timedelta(days=90)
            period_end = today
        elif range_param == 'last-year':
            period_start = today - timedelta(days=365)
            period_end = today
        elif range_param == 'custom' and start_date and end_date:
            try:
                # Convert string dates to datetime objects with timezone awareness
                period_start = datetime.strptime(start_date, '%Y-%m-%d').date()
                period_end = datetime.strptime(end_date, '%Y-%m-%d').date()
                
                # Validate date range
                if period_end < period_start:
                    logger.warning(f"Invalid date range: end date {period_end} before start date {period_start}")
                    return JsonResponse({
                        'status': 'error',
                        'message': 'End date cannot be before start date'
                    }, status=400)
                    
                # Limit custom ranges to 2 years max
                max_range = timedelta(days=730)
                if period_end - period_start > max_range:
                    logger.warning(f"Date range too large: {period_end - period_start} exceeds maximum of {max_range}")
                    return JsonResponse({
                        'status': 'error',
                        'message': 'Date range cannot exceed 2 years'
                    }, status=400)
                    
            except ValueError as e:
                logger.error(f"Date parsing error: {str(e)} for start_date={start_date}, end_date={end_date}")
                # Fall back to 30 days if date parsing fails
                period_start = today - timedelta(days=30)
                period_end = today
        else:  # Default to last-30-days
            period_start = today - timedelta(days=30)
            period_end = today
        
        logger.info(f"Selected date range: {period_start} to {period_end}")
        
        # Convert date objects to timezone-aware datetime objects for database queries
        try:
            period_start_dt = timezone.make_aware(
                datetime.combine(period_start, datetime.min.time())
            )
            # End date should include the entire day
            period_end_dt = timezone.make_aware(
                datetime.combine(period_end, datetime.max.time())
            )
        except Exception as e:
            logger.error(f"Error creating timezone-aware datetime: {str(e)}")
            return JsonResponse({
                'status': 'error',
                'message': 'Error processing date range'
            }, status=500)
        
        # Previous period for comparison (same duration)
        period_duration = (period_end - period_start).days
        previous_end = period_start - timedelta(days=1)
        previous_start = previous_end - timedelta(days=period_duration)
        
        # Convert previous period dates to timezone-aware datetime objects
        try:
            previous_start_dt = timezone.make_aware(
                datetime.combine(previous_start, datetime.min.time())
            )
            previous_end_dt = timezone.make_aware(
                datetime.combine(previous_end, datetime.max.time())
            )
        except Exception as e:
            logger.error(f"Error creating previous period datetime: {str(e)}")
            return JsonResponse({
                'status': 'error',
                'message': 'Error processing comparison date range'
            }, status=500)
        
        # Try to fetch data with error handling for database errors
        try:
            # Current period stats using timezone-aware datetime objects
            current_reviews = Review.objects.filter(
                created_at__gte=period_start_dt,
                created_at__lte=period_end_dt
            )
            
            # Previous period for comparison using timezone-aware datetime objects
            previous_reviews = Review.objects.filter(
                created_at__gte=previous_start_dt,
                created_at__lte=previous_end_dt
            )
            
            # Calculate stats
            current_review_count = current_reviews.count()
            previous_review_count = previous_reviews.count()
            review_change = calculate_percentage_change(current_review_count, previous_review_count)
            
            # Approval Rate
            current_moderated = current_reviews.filter(moderated=True).count()
            current_approval_rate = (current_moderated / current_review_count * 100) if current_review_count > 0 else 0
            
            previous_moderated = previous_reviews.filter(moderated=True).count()
            previous_approval_rate = (previous_moderated / previous_review_count * 100) if previous_review_count > 0 else 0
            approval_rate_change = calculate_percentage_change(current_approval_rate, previous_approval_rate)
            
            # Average Rating
            current_avg_rating = current_reviews.aggregate(avg=Avg('rating'))['avg'] or 0
            previous_avg_rating = previous_reviews.aggregate(avg=Avg('rating'))['avg'] or 0
            avg_rating_change = current_avg_rating - previous_avg_rating
            
            # Active Users using timezone-aware datetime objects
            current_active_users = UserProfile.objects.filter(
                reviews__created_at__gte=period_start_dt,
                reviews__created_at__lte=period_end_dt
            ).distinct().count()
            
            previous_active_users = UserProfile.objects.filter(
                reviews__created_at__gte=previous_start_dt,
                reviews__created_at__lte=previous_end_dt
            ).distinct().count()
            
            active_users_change = calculate_percentage_change(current_active_users, previous_active_users)
        except Exception as e:
            logger.error(f"Database query error: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return JsonResponse({
                'status': 'error',
                'message': 'Error retrieving data from database'
            }, status=500)
        
        # Prepare stats
        stats = {
            'new_reviews': {
                'value': current_review_count,
                'change': review_change,
                'is_positive': review_change > 0
            },
            'approval_rate': {
                'value': current_approval_rate,
                'change': approval_rate_change,
                'is_positive': approval_rate_change > 0
            },
            'avg_rating': {
                'value': current_avg_rating,
                'change': avg_rating_change,
                'is_positive': avg_rating_change > 0
            },
            'active_users': {
                'value': current_active_users,
                'change': active_users_change,
                'is_positive': active_users_change > 0
            }
        }
        
        # Choose appropriate interval and number of data points based on date range
        days_diff = (period_end - period_start).days
        
        if days_diff <= 14:  # Two weeks or less
            interval = 'daily'
            num_points = min(days_diff + 1, 14)  # Cap at 14 points
        elif days_diff <= 90:  # 3 months or less
            interval = 'weekly'
            num_points = min(days_diff // 7 + 1, 13)  # Cap at 13 weeks
        else:  # More than 3 months
            interval = 'monthly'
            num_points = min(days_diff // 30 + 1, 24)  # Cap at 24 months
        
        # Generate chart data with error handling
        try:
            # Generate time-based labels based on interval
            if interval == 'daily':
                labels = [(period_end - timedelta(days=i)).strftime('%b %d') 
                         for i in range(num_points - 1, -1, -1)]
            elif interval == 'weekly':
                labels = []
                for i in range(num_points - 1, -1, -1):
                    week_end = period_end - timedelta(days=i * 7)
                    week_start = week_end - timedelta(days=6)
                    labels.append(f"{week_start.strftime('%b %d')} - {week_end.strftime('%b %d')}")
            else:  # monthly
                labels = []
                for i in range(num_points - 1, -1, -1):
                    month_date = period_end - timedelta(days=i * 30)
                    labels.append(month_date.strftime('%b %Y'))
            
            # Get actual review data for the chart based on the interval
            review_data = generate_review_data_for_period(
                period_start_dt, period_end_dt, interval, num_points)
            
            # Generate chart data
            review_trends = {
                'labels': labels,
                'allReviews': review_data['all_reviews'],
                'approvedReviews': review_data['approved_reviews'],
                'flaggedReviews': review_data['flagged_reviews'],
                'interval': interval
            }
        except Exception as e:
            logger.error(f"Error generating chart data: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            # Provide fallback chart data rather than failing
            review_trends = {
                'labels': [d.strftime('%b %d') for d in [period_end - timedelta(days=i) for i in range(7)]],
                'allReviews': [0] * 7,
                'approvedReviews': [0] * 7,
                'flaggedReviews': [0] * 7,
                'interval': 'daily'
            }
        
        # Get additional data with error handling
        try:
            # Get top destinations for the selected period
            top_destinations = get_top_destinations_for_period(period_start_dt, period_end_dt, 5)
            
            # Get admin performance data for the selected period
            admin_performance = get_admin_performance_for_period(period_start_dt, period_end_dt)
        except Exception as e:
            logger.error(f"Error retrieving additional data: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            
            # Provide fallback data
            top_destinations = []
            admin_performance = get_demo_admin_data()
        
        # Return metadata about the response
        meta = {
            'period_start': period_start.strftime('%Y-%m-%d'),
            'period_end': period_end.strftime('%Y-%m-%d'),
            'period_duration': period_duration,
            'previous_period_start': previous_start.strftime('%Y-%m-%d'),
            'previous_period_end': previous_end.strftime('%Y-%m-%d'),
            'generated_at': timezone.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        logger.info("Successfully generated analytics data")
        
        # Return all data in a single JSON response
        return JsonResponse({
            'status': 'success',
            'meta': meta,
            'stats': stats,
            'review_trends': review_trends,
            'top_destinations': top_destinations,
            'admin_performance': admin_performance
        })
        
    except Exception as e:
        # Catch-all for any unexpected errors
        logger.error(f"Unexpected error in analytics_data_api: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return JsonResponse({
            'status': 'error',
            'message': 'An unexpected error occurred. Please try again or contact support.'
        }, status=500)

    
@login_required
@user_passes_test(lambda u: u.groups.filter(name='Moderators').exists())
def view_review(request, review_id):
    # Fetch the review, ensuring it exists
    review = get_object_or_404(Review.objects.select_related('user', 'place').prefetch_related('images'), id=review_id)

    # --- Fetch Edit History ---
    # Get all edit logs for this specific review, ordered by the most recent first
    edit_logs = ReviewEditLog.objects.filter(review=review).select_related('editor').order_by('-timestamp')
    # --- End Fetch Edit History ---

    # If it's an AJAX request (e.g., from a modal), return JSON
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        # (Keep your existing AJAX response logic here if needed)
        # For simplicity, the AJAX part is omitted here as the main goal is the HTML page
        return JsonResponse({
            'id': review.id,
            'title': review.title,
            'content': review.content,
            'rating': review.rating,
            'place': review.place.name if review.place else 'N/A',
            'user': review.user.username if review.user else 'N/A',
            'created_at': review.created_at.isoformat(),
            'status': 'Flagged' if review.flagged else 'Approved' if review.moderated else 'Pending',
            
        })

    # --- Prepare Context for HTML Template ---
    context = {
        'review': review,
        'edit_logs': edit_logs # Add the fetched logs to the context
    }
    # --- End Prepare Context ---

    # Render the detail page HTML template with the context
    return render(request, 'review_detail.html', context)



def generate_review_data_for_period(start_date, end_date, interval, num_points):
    # Initialize containers for data
    all_reviews = []
    approved_reviews = []
    flagged_reviews = []
    
    # Determine the time interval in days
    if interval == 'daily':
        days_per_point = 1
    elif interval == 'weekly':
        days_per_point = 7
    else:  # monthly
        days_per_point = 30
    
    # Get date components for calculations (remove time part)
    start_date_only = start_date.date()
    end_date_only = end_date.date()
    
    # Process each data point
    for i in range(num_points):
        # Calculate the date range for this data point
        point_end_date = end_date_only - timedelta(days=i * days_per_point)
        point_start_date = max(
            start_date_only,  # Don't go before the overall start date
            point_end_date - timedelta(days=days_per_point - 1)
        )
        
        # Convert to timezone-aware datetime objects
        point_start = timezone.make_aware(
            datetime.combine(point_start_date, datetime.min.time())
        )
        point_end = timezone.make_aware(
            datetime.combine(point_end_date, datetime.max.time())
        )
        
        # Query reviews for this time period
        period_reviews = Review.objects.filter(
            created_at__gte=point_start,
            created_at__lte=point_end
        )
        
        # Count all reviews
        all_count = period_reviews.count()
        
        # Count approved reviews
        approved_count = period_reviews.filter(moderated=True).count()
        
        # Count flagged reviews
        flagged_count = period_reviews.filter(flagged=True).count()
        
        # Add counts to our data arrays (in reverse order to match labels)
        all_reviews.insert(0, all_count)
        approved_reviews.insert(0, approved_count)
        flagged_reviews.insert(0, flagged_count)
    
    return {
        'all_reviews': all_reviews,
        'approved_reviews': approved_reviews,
        'flagged_reviews': flagged_reviews
    }


def get_top_destinations_for_period(start_date, end_date, limit=5):
    """
    Get top destinations with analytics data for the specified period,
    ensuring they have reviews within that period.

    Parameters:
    start_date (datetime): timezone-aware start datetime
    end_date (datetime): timezone-aware end datetime
    limit (int): maximum number of destinations to return

    Returns:
    list: Top destinations with analytics data
    """
    logger.info(f"Fetching top destinations for period: {start_date} to {end_date}")

    # --- Define the date range filter for annotations ---
    date_filter = Q(
        reviews__created_at__gte=start_date,
        reviews__created_at__lte=end_date
    )

    # --- Annotate and Filter Destinations ---
    top_destinations_query = Destination.objects.annotate(
        # Count reviews *within the date range*
        review_count=Count('reviews', filter=date_filter),
        # Calculate average rating *within the date range*
        avg_rating=Avg('reviews__rating', filter=date_filter)
    ).filter(
        review_count__gt=0 # ***** ADD THIS FILTER *****
    ).order_by(
        '-review_count', '-avg_rating' # Order by most reviews first, then highest rating
    )[:limit] # Apply limit after filtering

    logger.info(f"Found {top_destinations_query.count()} top destinations with reviews in the period.")

    # --- Format results (rest of the function remains largely the same) ---
    result = []
    for destination in top_destinations_query:
        # Make sure avg_rating is never None, default to 0.0
        avg_rating = destination.avg_rating if destination.avg_rating is not None else 0.0
        avg_rating = float(avg_rating) # Ensure it's a float

        # Calculate sentiment based on average rating
        # (Keep your existing sentiment calculation logic)
        if avg_rating >= 4.5:
            sentiment, sentiment_class, sentiment_icon = "Very Positive", "very-positive", "fa-laugh"
        elif avg_rating >= 4.0:
            sentiment, sentiment_class, sentiment_icon = "Positive", "positive", "fa-smile"
        elif avg_rating >= 3.0:
            sentiment, sentiment_class, sentiment_icon = "Neutral", "neutral", "fa-meh"
        elif avg_rating >= 2.0:
            sentiment, sentiment_class, sentiment_icon = "Negative", "negative", "fa-frown"
        else: # Covers 0.0 to < 2.0
            sentiment, sentiment_class, sentiment_icon = "Very Negative", "very-negative", "fa-angry"

        # --- Calculate trending data (Keep your existing logic) ---
        # (You might need to adjust the previous period calculation slightly if needed)
        period_duration_days = (end_date.date() - start_date.date()).days
        previous_end_dt = start_date - timedelta(microseconds=1) # End right before current period starts
        previous_start_dt = previous_end_dt - timedelta(days=period_duration_days)

        previous_avg_data = Destination.objects.filter(
            id=destination.id
        ).aggregate(
            prev_avg=Avg('reviews__rating', filter=Q(
                reviews__created_at__gte=previous_start_dt,
                reviews__created_at__lte=previous_end_dt
            ))
        )
        previous_rating = previous_avg_data.get('prev_avg') if previous_avg_data.get('prev_avg') is not None else 0.0
        previous_rating = float(previous_rating)

        trending_value = 0.0
        if previous_rating > 0:
            trending_value = ((avg_rating - previous_rating) / previous_rating) * 100
        elif avg_rating > 0:
            trending_value = 100.0 # If previous was 0 and current is positive, show 100% increase

        trending_direction = "up" if trending_value >= 0 else "down"
        # --- End Trending Calculation ---

        destination_data = {
            'name': destination.name,
            'country': destination.country or "Not specified",
            'review_count': destination.review_count, # This count is already filtered by date
            'avg_rating': avg_rating, # Use the calculated float value
            'sentiment': sentiment,
            'sentiment_class': sentiment_class,
            'sentiment_icon': sentiment_icon,
            'trending_direction': trending_direction,
            'trending_value': abs(round(trending_value)) # Use integer %
        }
        result.append(destination_data)
    if not result:
        logger.warning(f"No destinations found with reviews > 0 for period {start_date} to {end_date}.")

    return result


def get_admin_performance_for_period(start_date, end_date):
    """
    Get admin performance data for the specified period
    
    Parameters:
    start_date (datetime): timezone-aware start datetime
    end_date (datetime): timezone-aware end datetime
    
    Returns:
    list: Admin performance data for the period
    """
    # Get all staff users (moderators)
    admin_users = UserProfile.objects.filter(is_staff=True)
    
    admin_performance = []
    
    for admin in admin_users:
        # Get moderation logs for this period
        moderation_logs = ModerationLog.objects.filter(
            moderator=admin,
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        
        # Count unique reviews processed
        processed_reviews_ids = moderation_logs.values_list('review_id', flat=True).distinct()
        reviews_count = len(processed_reviews_ids)
        
        # Skip admins with no activity
        if reviews_count == 0:
            continue
        
        # Calculate approval rate
        approved_count = moderation_logs.filter(action='approve').count()
        approval_rate = (approved_count / moderation_logs.count() * 100) if moderation_logs.count() > 0 else 0
        
        # Calculate average response time (in hours)
        avg_response_time = 0
        if reviews_count > 0:
            total_response_time = 0
            for log in moderation_logs:
                review = log.review
                # Calculate time difference in hours between review creation and moderation
                if log.created_at and review.created_at:
                    time_diff = (log.created_at - review.created_at).total_seconds() / 3600
                    total_response_time += time_diff
            
            avg_response_time = round(total_response_time / moderation_logs.count(), 1) if moderation_logs.count() > 0 else 0
        
        # Generate a consistent consistency score based on admin's username
        # This ensures same admin always gets same score between sessions
        hash_base = sum(ord(c) for c in admin.username)
        consistency_score = (hash_base % 36) + 60  # Range 60-95
        
        # Build the admin performance data
        admin_data = {
            'name': admin.get_full_name() or admin.username,
            'avatar': admin.profile_picture.url if admin.profile_picture else None,
            'reviews_processed': reviews_count,
            'avg_response_time': f"{avg_response_time}h",
            'approval_rate': round(approval_rate),
            'approval_rate_class': get_status_class(approval_rate),
            'consistency_score': consistency_score,
            'consistency_class': get_status_class(consistency_score),
            'languages': "English"  # Default language
        }
        
        admin_performance.append(admin_data)
    
    # If no admins with activity, add demo data
    if not admin_performance:
        admin_performance = get_demo_admin_data()
    
    return admin_performance

def get_review_distribution_data():
    """
    Get data for the review distribution chart with additional debug info
    """
    # Get all reviews
    all_reviews = Review.objects.all()
    total_reviews = all_reviews.count()
    
    # Debug information
    debug_info = {
        'total_reviews': total_reviews,
        'query_performed': True
    }
    
    # If no reviews, return some demo data
    if total_reviews == 0:
        return {
            'approved': 65,
            'pending': 25,
            'rejected': 10,
            'flagged': 15,
            'distribution_debug': debug_info
        }
    
    # Count reviews by status
    approved = all_reviews.filter(moderated=True, flagged=False).count()
    pending = all_reviews.filter(moderated=False, flagged=False).count()
    flagged = all_reviews.filter(flagged=True).count()
    
    # Include raw counts for debugging
    debug_info.update({
        'approved_count': approved,
        'pending_count': pending,
        'flagged_count': flagged
    })
    
    # For actual visualization, use the absolute counts rather than percentages
    # This makes the chart more meaningful and prevents the dummy data from appearing
    return {
        'approved': approved,
        'pending': pending,
        'rejected': total_reviews - approved - pending - flagged,
        'flagged': flagged,
        'distribution_debug': debug_info
    }


def get_top_destinations(limit=5, min_rating=2.0):
    """
    Enhanced method to retrieve top destinations with comprehensive debugging
    """
    from django.db.models import Count, Avg, F
    from django.db.models.functions import Coalesce
    
    print("🔍 Debugging Top Destinations Retrieval")
    
    # Detailed logging of initial database state
    total_destinations = Destination.objects.count()
    total_reviews = Review.objects.count()
    print(f"📊 Total Destinations: {total_destinations}")
    print(f"📊 Total Reviews: {total_reviews}")
    
    # Annotate destinations with review counts and avg ratings
    # Use Coalesce to handle potential null values
    destinations_query = Destination.objects.annotate(
        review_count=Count('reviews'),
        avg_rating=Coalesce(Avg('reviews__rating'), 0.0)
    )
    
    # Filter destinations with reviews or use all destinations if none have reviews
    destinations_with_reviews = destinations_query.filter(review_count__gt=0)
    
    # Logging
    print(f"📊 Destinations with Reviews: {destinations_with_reviews.count()}")
    
    # If no destinations with reviews, log details about existing destinations
    if destinations_with_reviews.count() == 0:
        print("🚨 No destinations found with reviews. Checking all destinations:")
        for dest in Destination.objects.all()[:10]:  # Show first 10
            print(f"  Destination: {dest.name}")
            print(f"    Total Reviews: {dest.reviews.count()}")
        
        # Fallback: use all destinations if no reviews exist
        destinations_with_reviews = destinations_query
    
    # Order by review count and average rating
    # Lower the minimum rating if no destinations meet the criteria
    current_min_rating = min_rating
    while current_min_rating > 0:
        top_destinations = destinations_with_reviews.filter(
            avg_rating__gte=current_min_rating
        ).order_by('-review_count', '-avg_rating')[:limit]
        
        if top_destinations.count() > 0:
            break
        
        # Gradually lower the minimum rating
        current_min_rating -= 0.5
    
    # Enrich destinations with additional metadata
    enriched_destinations = []
    for destination in top_destinations:
        # Calculate sentiment and other details
        avg_rating = float(destination.avg_rating or 0)
        
        # Sentiment mapping
        if avg_rating >= 4.5:
            sentiment = 'Very Positive'
            sentiment_class = 'very-positive'
            sentiment_icon = 'fa-laugh'
        elif avg_rating >= 4.0:
            sentiment = 'Positive'
            sentiment_class = 'positive'
            sentiment_icon = 'fa-smile'
        elif avg_rating >= 3.0:
            sentiment = 'Neutral'
            sentiment_class = 'neutral'
            sentiment_icon = 'fa-meh'
        elif avg_rating >= 2.0:
            sentiment = 'Negative'
            sentiment_class = 'negative'
            sentiment_icon = 'fa-frown'
        else:
            sentiment = 'Very Negative'
            sentiment_class = 'very-negative'
            sentiment_icon = 'fa-angry'
        
        # Calculate trending data
        enriched_dest = {
            'name': destination.name,
            'country': destination.country or 'Not specified',
            'review_count': destination.review_count,
            'avg_rating': avg_rating,
            'sentiment': sentiment,
            'sentiment_class': sentiment_class,
            'sentiment_icon': sentiment_icon,
            'trending_direction': 'up',  # Simulated for now
            'trending_value': 20  # Simulated for now
        }
        
        enriched_destinations.append(enriched_dest)
    
    # Extensive logging of retrieved destinations
    print("🌍 Top Destinations Retrieved:")
    for dest in enriched_destinations:
        print(f"  • {dest['name']} (Country: {dest['country']}, "
              f"Reviews: {dest['review_count']}, "
              f"Rating: {dest['avg_rating']:.1f}, "
              f"Sentiment: {dest['sentiment']})")
    
    # If no destinations found, create sample data
    if not enriched_destinations:
        print("🚨 No destinations found. Creating sample destinations.")
        ensure_destination_data()
        # Recursively call the function to retrieve the newly created destinations
        return get_top_destinations(limit, min_rating)
    
    return enriched_destinations

def ensure_destination_data():
    """
    Creates sample destinations and reviews if none exist.
    Useful for initial setup or testing.
    """
    
    # Ensure at least one user exists to associate with reviews.
    try:
        sample_user = User.objects.first() # Get the first user.
        if not sample_user: # If no user exists.
            # Create a default system user.
            sample_user = User.objects.create_user(
                username='system_user', 
                email='system@example.com', 
                password='temp_password123' # Use a secure password in production.
            )
    except Exception as e: # Catch errors during user creation.
        print(f"Error creating/finding sample user: {e}")
        return # Stop if no user can be established.
    
    # Define sample destination data.
    sample_destinations = [
        {'name': 'Paris', 'country': 'France', 'rating': 4.5},
        {'name': 'Tokyo', 'country': 'Japan', 'rating': 4.2},
        {'name': 'New York', 'country': 'United States', 'rating': 4.0},
        {'name': 'Sydney', 'country': 'Australia', 'rating': 3.8},
        {'name': 'Cairo', 'country': 'Egypt', 'rating': 3.5}
    ]
    
    # Create destinations and associated reviews if they don't already exist.
    # This check can be enhanced to prevent duplicate creation if run multiple times.
    if not Destination.objects.exists(): # Check if any destinations exist before creating.
        for dest_data in sample_destinations:
            try:
                # Create the Destination object.
                destination = Destination.objects.create(
                    name=dest_data['name'], 
                    country=dest_data['country']
                    # Add other fields like description, main_image if needed.
                )
                
                # Create multiple sample reviews for each destination.
                for i in range(3):  # Create 3 reviews per destination.
                    Review.objects.create(
                        user=sample_user, # Associate review with the sample user.
                        place=destination, # Link review to the created destination.
                        title=f"Review {i+1} for {destination.name}",
                        content=f"Sample review content for {destination.name}. This is review number {i+1}.",
                        # Vary ratings slightly for realism.
                        rating=min(5, max(1, dest_data['rating'] + (0.5 - (i * 0.2)))), 
                        moderated=True # Assume sample reviews are pre-moderated.
                        # Add visit_date or other fields if necessary.
                    )
                
                print(f"✅ Created destination and reviews for: {destination.name}")
            except Exception as e: # Catch errors during creation of a specific destination/reviews.
                print(f"❌ Error creating destination {dest_data['name']}: {e}")
    else:
        print("ℹ️ Sample destinations already exist or Destination table is not empty. Skipping creation.")

            

@login_required 
@user_passes_test(lambda u: u.is_staff) 
def analytics_with_fixed_destinations(request):
    """
    Temporary fixed version of an analytics view.
    It fetches original context and replaces 'top_destinations' with new data.
    """
    original_context = Analytics(request, render_response=False) # Assumes Analytics can return context.
    
    # --- Top Destinations Override ---
    # Query top 5 destinations, annotating with review count and average rating.
    destinations = Destination.objects.annotate(
        review_count=Count('reviews'), # Count of related reviews.
        avg_rating=Avg('reviews__rating') # Average of ratings from related reviews.
    ).order_by('-avg_rating', '-review_count')[:5] # Order by rating then review count, take top 5.
    
    # Manually add/calculate required attributes for each destination object.
    for dest in destinations:
        # Ensure avg_rating has a default value if null (e.g., no reviews).
        dest.avg_rating = dest.avg_rating or 0 
        
        # Determine sentiment based on average rating.
        if dest.avg_rating >= 4.5:
            dest.sentiment = "Very Positive"
            dest.sentiment_class = "very-positive" # CSS class for styling.
            dest.sentiment_icon = "fa-laugh" # Font Awesome icon class.
        # Add more sentiment conditions as needed (e.g., Positive, Negative).
        else: # Default sentiment.
            dest.sentiment = "Neutral"
            dest.sentiment_class = "neutral"
            dest.sentiment_icon = "fa-meh"
        
        # Add placeholder trending data for each destination.
        dest.trending_direction = "up" # Example: 'up', 'down', 'stable'.
        dest.trending_value = 20 # Example: percentage or count.
    
    # Replace 'top_destinations' in the original context with the new processed list.
    original_context['top_destinations'] = destinations
    
    # Render the 'analytics.html' template with the modified context.
    return render(request, 'analytics.html', original_context)



def calculate_percentage_change(current, previous):
    """Calculate percentage change between two values"""
    if previous == 0:
        return 100 if current > 0 else 0
    return ((current - previous) / previous) * 100

def generate_date_labels(days):
    """Generate date labels for charts"""
    today = timezone.now().date()
    return [(today - timedelta(days=i)).strftime('%b %d') for i in range(days-1, -1, -1)]

def generate_review_data(days):
    """Generate sample review data for charts"""
    base = 50  # Base number of reviews
    data = []
    for i in range(days):
        # Generate a random value with an upward trend
        value = base + i * 2 + random.randint(-10, 20)
        data.append(max(0, value))  # Ensure no negative values
    return data

def generate_approved_review_data(days):
    """Generate sample approved review data"""
    base = 40  # Base number of approved reviews
    data = []
    for i in range(days):
        value = base + i * 1.5 + random.randint(-8, 15)
        data.append(max(0, value))
    return data

def generate_flagged_review_data(days):
    """Generate sample flagged review data"""
    base = 5  # Base number of flagged reviews
    data = []
    for i in range(days):
        value = base + random.randint(-2, 5)
        data.append(max(0, value))
    return data


def analytics_stats_api(request):
    """
    API endpoint for refreshing analytics stats via AJAX
    """
    # Get date ranges for current and previous periods
    today = timezone.now().date()
    current_period_start = today - timedelta(days=30)
    previous_period_start = current_period_start - timedelta(days=30)
    
    # Current period stats
    current_reviews = Review.objects.filter(created_at__gte=current_period_start)
    previous_reviews = Review.objects.filter(
        created_at__gte=previous_period_start,
        created_at__lt=current_period_start
    )
    
    # New Reviews
    current_review_count = current_reviews.count()
    previous_review_count = previous_reviews.count()
    review_change = calculate_percentage_change(current_review_count, previous_review_count)
    
    # Approval Rate (non-flagged reviews as a percentage)
    current_moderated = current_reviews.filter(moderated=True).count()
    current_approval_rate = (current_moderated / current_review_count * 100) if current_review_count > 0 else 0
    
    previous_moderated = previous_reviews.filter(moderated=True).count()
    previous_approval_rate = (previous_moderated / previous_review_count * 100) if previous_review_count > 0 else 0
    approval_rate_change = calculate_percentage_change(current_approval_rate, previous_approval_rate)
    
    # Average Rating
    current_avg_rating = current_reviews.aggregate(avg=Avg('rating'))['avg'] or 0
    previous_avg_rating = previous_reviews.aggregate(avg=Avg('rating'))['avg'] or 0
    avg_rating_change = current_avg_rating - previous_avg_rating
    
    # Active Users (users who have written at least one review)
    current_active_users = UserProfile.objects.filter(
        reviews__created_at__gte=current_period_start
    ).distinct().count()
    
    previous_active_users = UserProfile.objects.filter(
        reviews__created_at__gte=previous_period_start,
        reviews__created_at__lt=current_period_start
    ).distinct().count()
    
    active_users_change = calculate_percentage_change(current_active_users, previous_active_users)
    
    # Prepare all stats
    stats = {
        'new_reviews': {
            'value': current_review_count,
            'change': review_change,
            'is_positive': review_change > 0
        },
        'approval_rate': {
            'value': current_approval_rate,
            'change': approval_rate_change,
            'is_positive': approval_rate_change > 0
        },
        'avg_rating': {
            'value': current_avg_rating,
            'change': avg_rating_change,
            'is_positive': avg_rating_change > 0
        },
        'active_users': {
            'value': current_active_users,
            'change': active_users_change,
            'is_positive': active_users_change > 0
        }
    }
    
    return JsonResponse({'stats': stats})


def get_admin_performance_data(request):
    """
    Get performance data for admin/moderator users, always including all admins
    regardless of activity
    """
    # Force refresh - always get current admin data
    if 'admin_performance' in request.session:
        del request.session['admin_performance']
    
    # Get all staff users (moderators/admins)
    admin_users = User.objects.filter(is_staff=True)
    
    print(f"Found {admin_users.count()} staff users in the system")
    
    admin_performance = []
    
    for admin in admin_users:
        # Debug info
        print(f"Processing admin: {admin.username}, ID: {admin.id}")
        
        # Basic info for all admins, even if they have no activity
        admin_data = {
            'name': admin.get_full_name() or admin.username,
            'avatar': admin.profile_picture.url if hasattr(admin, 'profile_picture') and admin.profile_picture else None,
            'reviews_processed': 0,
            'avg_response_time': "0h",
            'approval_rate': 0,
            'approval_rate_class': "bg-info",
            'consistency_score': 70,  # Default value
            'consistency_class': "bg-info",
            'languages': "English"  # Default language
        }
        
        # Try to get moderation data if it exists
        try:
            # Look for any moderation logs for this admin
            if hasattr(ModerationLog, 'moderator'):
                moderation_logs = ModerationLog.objects.filter(moderator=admin)
                
                if moderation_logs.exists():
                    print(f"Found {moderation_logs.count()} moderation logs for {admin.username}")
                    
                    # Calculate actual performance metrics
                    processed_reviews_ids = moderation_logs.values_list('review_id', flat=True).distinct()
                    admin_data['reviews_processed'] = len(processed_reviews_ids)
                    
                    approved_count = moderation_logs.filter(action='approve').count()
                    if moderation_logs.count() > 0:
                        admin_data['approval_rate'] = round((approved_count / moderation_logs.count()) * 100)
                        admin_data['approval_rate_class'] = get_status_class(admin_data['approval_rate'])
                    
                    # Calculate consistency score based on username hash
                    hash_base = sum(ord(c) for c in admin.username)
                    admin_data['consistency_score'] = (hash_base % 36) + 60  # Range 60-95
                    admin_data['consistency_class'] = get_status_class(admin_data['consistency_score'])
        except Exception as e:
            print(f"Error getting moderation data for {admin.username}: {str(e)}")
        
        # Always add the admin to the list
        admin_performance.append(admin_data)
    
    # Important: Only use demo data if there are absolutely no staff users
    if not admin_performance:
        print("No staff users found, using demo data")
        admin_performance = get_demo_admin_data()
    else:
        print(f"Using actual admin data for {len(admin_performance)} admins")
    
    # Make sure data is serializable for session storage
    serializable_data = []
    for admin in admin_performance:
        admin_dict = {}
        for key, value in admin.items():
            if isinstance(value, (str, int, float, bool, list, dict, type(None))):
                admin_dict[key] = value
            else:
                admin_dict[key] = str(value)
        serializable_data.append(admin_dict)
    
    # Store in session
    request.session['admin_performance'] = serializable_data
    
    return admin_performance

def get_status_class(value):
    """Helper function to determine CSS class based on value"""
    if value >= 80:
        return "bg-success"
    elif value >= 70:
        return "bg-info"
    elif value >= 60:
        return "bg-warning"
    else:
        return "bg-danger"

def get_demo_admin_data():
    """Generate demo admin data if real data is unavailable"""
    return [
        {
            'name': "Sarah Johnson",
            'avatar': None,
            'reviews_processed': 1254,
            'avg_response_time': "6.2h",
            'approval_rate': 76,
            'approval_rate_class': "bg-success",
            'consistency_score': 92,
            'consistency_class': "bg-success",
            'languages': "English, French"
        },
        {
            'name': "David Chen",
            'avatar': None,
            'reviews_processed': 987,
            'avg_response_time': "5.8h",
            'approval_rate': 62,
            'approval_rate_class': "bg-warning",
            'consistency_score': 88,
            'consistency_class': "bg-success",
            'languages': "English, Mandarin"
        },
        {
            'name': "Maria Rodriguez",
            'avatar': None,
            'reviews_processed': 1432,
            'avg_response_time': "7.1h",
            'approval_rate': 78,
            'approval_rate_class': "bg-success",
            'consistency_score': 75,
            'consistency_class': "bg-warning",
            'languages': "English, Spanish, Portuguese"
        },
        {
            'name': "James Wilson",
            'avatar': None,
            'reviews_processed': 856,
            'avg_response_time': "8.7h",
            'approval_rate': 54,
            'approval_rate_class': "bg-danger",
            'consistency_score': 62,
            'consistency_class': "bg-danger",
            'languages': "English"
        }
    ]

@login_required
def user_reviews(request):
    # Fetch reviews for the current user
    reviews = Review.objects.filter(user=request.user).values(
        'id', 
        'title', 
        'content', 
        'rating', 
        'created_at',
    )
    
    return JsonResponse({
        'reviews': list(reviews)
    })


# ------------------------------------------- Moderator Settings ------------------------------------------------#

    
@login_required
@user_passes_test(is_moderator)
@require_GET
def get_settings_data(request):
    """
    API endpoint to fetch current settings data, including general, bias, and reason codes.
    """
    try:
        settings_obj, created = PlatformSetting.objects.get_or_create(pk=1)
        if created:
            logger.warning("Created default PlatformSetting object.")

        platform_data = {
            # General
            'platform_name': settings_obj.platform_name,
            'default_reviews_per_page': settings_obj.default_reviews_per_page,
            'enable_user_registration': settings_obj.enable_user_registration,
            'minimum_review_length': settings_obj.minimum_review_length,
            'allow_anonymous_reviews': settings_obj.allow_anonymous_reviews,
            'support_contact_email': settings_obj.support_contact_email or '', # Ensure string
            # Bias Prevention
            'secondary_review_non_english': settings_obj.secondary_review_non_english,
            'admin_decision_tracking': settings_obj.admin_decision_tracking,
            'require_rejection_reason': settings_obj.require_rejection_reason,
            'fairness_alert_threshold': settings_obj.fairness_alert_threshold,
        }

        reason_codes = list(ReasonCode.objects.filter(is_active=True).values(
            'id', 'code', 'label', 'description'
        ).order_by('code'))

        data = {**platform_data, 'reason_codes': reason_codes}

        return JsonResponse({'success': True, 'settings': data})

    except Exception as e:
        logger.error(f"Error fetching settings: {e}", exc_info=True)
        return JsonResponse({'success': False, 'error': 'Could not load settings.'}, status=500)


@login_required
@user_passes_test(is_moderator)
@require_POST
def save_settings_data(request):
    """
    API endpoint to save updated platform settings data (general + bias).
    """
    try:
        data = json.loads(request.body)
        logger.info(f"Received settings data to save: {data}")

        # --- Data Validation ---
        allowed_keys = [
            'platform_name', 'default_reviews_per_page', 'enable_user_registration',
            'minimum_review_length', 'allow_anonymous_reviews', 'support_contact_email',
            'secondary_review_non_english', 'admin_decision_tracking',
            'require_rejection_reason', 'fairness_alert_threshold'
        ]
        validated_data = {}
        errors = {}

        for key in allowed_keys:
            if key not in data:
                 # Handle missing keys - maybe less strict for optional fields like email
                 if key == 'support_contact_email':
                     validated_data[key] = None # Treat missing optional email as null
                     continue
                 else:
                     errors[key] = 'This field is required.'
                     continue # Skip further validation for this key

            value = data[key]

            # --- Specific Validations ---
            if key == 'platform_name':
                 if not isinstance(value, str): errors[key] = 'Must be a string.'
                 else: validated_data[key] = value.strip()[:100]
            elif key == 'default_reviews_per_page':
                 try:
                     int_val = int(value)
                     if not 5 <= int_val <= 50: errors[key] = 'Must be between 5 and 50.'
                     else: validated_data[key] = int_val
                 except (ValueError, TypeError): errors[key] = 'Must be a valid integer.'
            elif key == 'minimum_review_length':
                 try:
                     int_val = int(value)
                     if int_val < 10: errors[key] = 'Must be 10 or greater.'
                     else: validated_data[key] = int_val
                 except (ValueError, TypeError): errors[key] = 'Must be a valid integer.'
            elif key == 'support_contact_email':
                 if value: # Only validate if not empty
                     try:
                         validate_email(value)
                         validated_data[key] = value.strip()
                     except ValidationError: errors[key] = 'Enter a valid email address.'
                 else:
                     validated_data[key] = None # Store empty as None
            elif key == 'fairness_alert_threshold':
                if value not in ['10', '15', '20']: errors[key] = 'Invalid threshold value.'
                else: validated_data[key] = value
            elif key in ['enable_user_registration', 'allow_anonymous_reviews', 'secondary_review_non_english', 'admin_decision_tracking', 'require_rejection_reason']:
                 if not isinstance(value, bool): errors[key] = 'Must be a boolean (true/false).'
                 else: validated_data[key] = value
            else:
                 # Should not happen if allowed_keys is correct
                 logger.warning(f"Unexpected key '{key}' encountered during settings save.")


        if errors:
            logger.warning(f"Validation errors saving settings: {errors}")
            # Return specific errors if possible
            error_message = "; ".join([f"{k}: {v}" for k, v in errors.items()])
            return JsonResponse({'success': False, 'error': f'Validation failed: {error_message}'}, status=400)


        # --- Save the data ---
        settings_obj, _ = PlatformSetting.objects.get_or_create(pk=1)

        # Update fields using validated data, falling back to existing value if key wasn't sent 
        settings_obj.platform_name = validated_data.get('platform_name', settings_obj.platform_name)
        settings_obj.default_reviews_per_page = validated_data.get('default_reviews_per_page', settings_obj.default_reviews_per_page)
        settings_obj.enable_user_registration = validated_data.get('enable_user_registration', settings_obj.enable_user_registration)
        settings_obj.minimum_review_length = validated_data.get('minimum_review_length', settings_obj.minimum_review_length)
        settings_obj.allow_anonymous_reviews = validated_data.get('allow_anonymous_reviews', settings_obj.allow_anonymous_reviews)
        settings_obj.support_contact_email = validated_data.get('support_contact_email', settings_obj.support_contact_email) # Handles None correctly
        settings_obj.secondary_review_non_english = validated_data.get('secondary_review_non_english', settings_obj.secondary_review_non_english)
        settings_obj.admin_decision_tracking = validated_data.get('admin_decision_tracking', settings_obj.admin_decision_tracking)
        settings_obj.require_rejection_reason = validated_data.get('require_rejection_reason', settings_obj.require_rejection_reason)
        settings_obj.fairness_alert_threshold = validated_data.get('fairness_alert_threshold', settings_obj.fairness_alert_threshold)

        settings_obj.save()

        logger.info(f"Platform settings updated successfully.")
        return JsonResponse({'success': True, 'message': 'Settings saved successfully!'})

    except json.JSONDecodeError:
        logger.warning("Invalid JSON received for saving settings.")
        return JsonResponse({'success': False, 'error': 'Invalid JSON data received.'}, status=400)
    except Exception as e:
        logger.error(f"Error saving settings: {e}", exc_info=True)
        return JsonResponse({'success': False, 'error': 'An unexpected error occurred while saving settings.'}, status=500)


# --- Reason Code CRUD Views  ---
@login_required
@user_passes_test(is_moderator)
@require_GET
def list_reason_codes(request):
    """ API endpoint to list all active reason codes. """
    try:
        codes = list(ReasonCode.objects.filter(is_active=True).values(
            'id', 'code', 'label', 'description'
        ).order_by('code'))
        return JsonResponse({'success': True, 'reason_codes': codes})
    except Exception as e:
        logger.error(f"Error listing reason codes: {e}", exc_info=True)
        return JsonResponse({'success': False, 'error': 'Could not retrieve reason codes.'}, status=500)

@login_required
@user_passes_test(is_moderator)
@require_POST
def add_reason_code(request):
    """ API endpoint to add a new reason code. """
    try:
        data = json.loads(request.body)
        code = data.get('code', '').strip().upper()
        label = data.get('label', '').strip()
        description = data.get('description', '').strip()

        # Basic Validation
        if not code or not label:
            return JsonResponse({'success': False, 'error': 'Code and Label are required.'}, status=400)
        if ReasonCode.objects.filter(code=code).exists():
            return JsonResponse({'success': False, 'error': f'Reason code "{code}" already exists.'}, status=400)

        # Create new ReasonCode
        new_code = ReasonCode.objects.create(
            code=code,
            label=label,
            description=description,
            is_active=True # New codes are active by default
        )
        logger.info(f"Reason code '{new_code.code}' added successfully.")
        return JsonResponse({
            'success': True,
            'message': 'Reason code added successfully.',
            'reason_code': { # Return the newly created code data
                 'id': new_code.id,
                 'code': new_code.code,
                 'label': new_code.label,
                 'description': new_code.description
            }
        }, status=201) # HTTP 201 Created

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON data received.'}, status=400)
    except Exception as e:
        logger.error(f"Error adding reason code: {e}", exc_info=True)
        return JsonResponse({'success': False, 'error': 'An unexpected error occurred.'}, status=500)


@login_required
@user_passes_test(is_moderator)
@require_http_methods(["PUT"]) # Use PUT for updates
def update_reason_code(request, code_id):
    """ API endpoint to update an existing reason code. """
    try:
        reason_code = get_object_or_404(ReasonCode, pk=code_id)
        data = json.loads(request.body)

        # Get updated data (allow partial updates if using PATCH, but PUT requires all)
        code = data.get('code', reason_code.code).strip().upper()
        label = data.get('label', reason_code.label).strip()
        description = data.get('description', reason_code.description).strip()
        is_active = data.get('is_active', reason_code.is_active) # Allow updating active status

        # Basic Validation
        if not code or not label:
            return JsonResponse({'success': False, 'error': 'Code and Label are required.'}, status=400)
        # Check if code is being changed to one that already exists (excluding itself)
        if ReasonCode.objects.filter(code=code).exclude(pk=code_id).exists():
            return JsonResponse({'success': False, 'error': f'Reason code "{code}" already exists.'}, status=400)
        if not isinstance(is_active, bool):
             return JsonResponse({'success': False, 'error': 'Invalid value for is_active.'}, status=400)


        # Update the ReasonCode object
        reason_code.code = code
        reason_code.label = label
        reason_code.description = description
        reason_code.is_active = is_active
        reason_code.save()

        logger.info(f"Reason code ID {code_id} updated successfully.")
        return JsonResponse({
            'success': True,
            'message': 'Reason code updated successfully.',
             'reason_code': { # Return the updated code data
                 'id': reason_code.id,
                 'code': reason_code.code,
                 'label': reason_code.label,
                 'description': reason_code.description,
                 'is_active': reason_code.is_active
             }
        })

    except ReasonCode.DoesNotExist:
         return JsonResponse({'success': False, 'error': 'Reason code not found.'}, status=404)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON data received.'}, status=400)
    except Exception as e:
        logger.error(f"Error updating reason code {code_id}: {e}", exc_info=True)
        return JsonResponse({'success': False, 'error': 'An unexpected error occurred.'}, status=500)


@login_required
@user_passes_test(is_moderator)
@require_http_methods(["DELETE"]) # Use DELETE for deletion
def delete_reason_code(request, code_id):
    """ API endpoint to delete a reason code. """
    try:
        reason_code = get_object_or_404(ReasonCode, pk=code_id)
        code_repr = reason_code.code # Get representation before deleting
        reason_code.delete()
        message = f'Reason code "{code_repr}" deleted successfully.'

        logger.info(f"Reason code ID {code_id} deleted/deactivated.")
        return JsonResponse({'success': True, 'message': message})

    except ReasonCode.DoesNotExist:
         return JsonResponse({'success': False, 'error': 'Reason code not found.'}, status=404)
    except Exception as e:
        logger.error(f"Error deleting reason code {code_id}: {e}", exc_info=True)
        # Consider database constraints (e.g., if the code is in use)
        if 'constraint' in str(e).lower():
             return JsonResponse({'success': False, 'error': 'Cannot delete reason code as it might be in use.'}, status=409) # Conflict
        return JsonResponse({'success': False, 'error': 'An unexpected error occurred.'}, status=500)

# ------------------------------------------- Review Actions ------------------------------------------------#

import logging
logger = logging.getLogger(__name__)

@csrf_exempt # Keep csrf_exempt for handling CSRF differently, otherwise consider standard protection
def review_action(request):
    if request.method == "POST":
        try:
            print("📌 review_action triggered!") # Keep for debugging if needed
            print("📌 Raw request body:", request.body.decode("utf-8")) # Keep for debugging if needed

            data = json.loads(request.body)
            review_id = data.get("review_id")
            action = data.get("action") # 'thumbs_up', 'thumbs_down', 'flag'

            if not review_id or not action:
                print("❌ Missing review_id or action!")
                return JsonResponse({'success': False, 'error': 'Missing review_id or action'}, status=400)

            review = get_object_or_404(Review, id=review_id) # Use get_object_or_404

            # Ensure session key exists
            session_id = request.session.session_key
            if not session_id:
                request.session.create()
                session_id = request.session.session_key

            # Initialize variables for response
            final_thumbs_up = review.thumbs_up_count
            final_thumbs_down = review.thumbs_down_count
            final_flagged = review.flagged

            # --- Logic ---
            if action == "flag":
                # Flag logic using update_or_create (from previous correction)
                if not review.flagged:
                   review.flagged = True
                   review.save(update_fields=['flagged'])
                   interaction, created = ReviewInteraction.objects.update_or_create(
                       review=review, session_id=session_id, defaults={'action': 'flag'}
                   )
                   if not created and interaction.action != 'flag':
                       if interaction.action == 'thumbs_up': review.thumbs_up_count = F('thumbs_up_count') - 1
                       elif interaction.action == 'thumbs_down': review.thumbs_down_count = F('thumbs_down_count') - 1
                       interaction.action = 'flag'
                       interaction.save(update_fields=['action'])
                       review.save() # Save count changes if any
                   final_flagged = True
                   # Assign to moderator logic... (keep your existing code here)
                   print("✅ Flag Action successful (created or updated)")
                else:
                     interaction, created = ReviewInteraction.objects.update_or_create(
                         review=review, session_id=session_id, defaults={'action': 'flag'}
                     )
                     if not created and interaction.action != 'flag':
                          if interaction.action == 'thumbs_up': review.thumbs_up_count = F('thumbs_up_count') - 1
                          elif interaction.action == 'thumbs_down': review.thumbs_down_count = F('thumbs_down_count') - 1
                          interaction.action = 'flag'
                          interaction.save(update_fields=['action'])
                          review.save() # Save count changes if any
                     final_flagged = True
                     print(f"ℹ️ Review {review.id} was already flagged globally, session interaction recorded/updated.")

            elif action in ["thumbs_up", "thumbs_down"]:
                # *** Corrected Thumbs Up/Down Logic ***
                interaction = ReviewInteraction.objects.filter(review=review, session_id=session_id).first()
                needs_saving = False # Flag to check if review counts need saving

                if interaction:
                    # Interaction exists
                    if interaction.action == action:
                        # Clicked the same button again - Current behavior: DO NOTHING
                        # If I want to enable UN-VOTING, uncomment and adjust the block below
                        print(f"❌ User clicked {action} again. No change.")
                        # --- Optional Un-vote Logic ---
                        # print(f"✅ Un-voting {action}")
                        # if action == "thumbs_up":
                        #     review.thumbs_up_count = F('thumbs_up_count') - 1
                        # elif action == "thumbs_down":
                        #     review.thumbs_down_count = F('thumbs_down_count') - 1
                        # interaction.delete() # Remove the interaction record
                        # needs_saving = True 
                        

                    elif interaction.action == "flag":
                        # Changing from flag to like/dislike
                        print(f"✅ Changed from flag to {action}")
                        interaction.action = action
                        if action == "thumbs_up":
                            review.thumbs_up_count = F('thumbs_up_count') + 1
                        elif action == "thumbs_down":
                            review.thumbs_down_count = F('thumbs_down_count') + 1
                        interaction.save(update_fields=['action'])
                        needs_saving = True

                    else:
                        # Toggling vote (e.g., from thumbs_up to thumbs_down)
                        print(f"✅ Toggling vote: from {interaction.action} to {action}")
                        if interaction.action == "thumbs_up": # Was up, now down
                            review.thumbs_up_count = F('thumbs_up_count') - 1
                            review.thumbs_down_count = F('thumbs_down_count') + 1
                        else: # Was down, now up
                            review.thumbs_down_count = F('thumbs_down_count') - 1
                            review.thumbs_up_count = F('thumbs_up_count') + 1
                        interaction.action = action
                        interaction.save(update_fields=['action'])
                        needs_saving = True
                else:
                    # No interaction exists - Create a new one
                    print(f"✅ New interaction: {action}")
                    ReviewInteraction.objects.create(review=review, session_id=session_id, action=action)
                    if action == "thumbs_up":
                        review.thumbs_up_count = F('thumbs_up_count') + 1
                    elif action == "thumbs_down":
                        review.thumbs_down_count = F('thumbs_down_count') + 1
                    needs_saving = True

                # Save review counts if they were changed
                if needs_saving:
                    review.save()

            else:
                 print("❌ Invalid action type provided!")
                 return JsonResponse({'success': False, 'error': 'Invalid action specified.'}, status=400)

            # Refresh review from DB to get final counts after F() expressions
            review.refresh_from_db()
            final_thumbs_up = review.thumbs_up_count
            final_thumbs_down = review.thumbs_down_count
            # final_flagged is updated within the flag logic block

            # Return success response for all valid actions
            return JsonResponse({
                'success': True,
                'thumbs_up': final_thumbs_up,
                'thumbs_down': final_thumbs_down,
                'flagged': review.flagged, # Get the latest status after potential changes
            })

        except Review.DoesNotExist:
             print("❌ Review not found during processing!")
             logger.warning(f"Review action requested for non-existent review ID: {review_id}")
             return JsonResponse({'success': False, 'error': 'Review not found'}, status=404)
        except json.JSONDecodeError:
            print("❌ Invalid JSON received!")
            logger.warning("Invalid JSON received for review action.")
            return JsonResponse({'success': False, 'error': 'Invalid JSON data received.'}, status=400)
        except Exception as e:
            print(f"🔥 Error in review_action: {type(e).__name__} - {e}")
            import traceback
            traceback.print_exc() # Print full traceback for debugging
            logger.error(f"Error processing review action for review {review_id}: {e}", exc_info=True) # Log the error
            return JsonResponse({'success': False, 'error': 'An internal server error occurred.'}, status=500) # Avoid sending raw error

    # Handle non-POST requests
    return JsonResponse({'success': False, 'error': 'Invalid request method. Only POST is allowed.'}, status=405)


@login_required
def moderate_flagged_review(request, review_id):
    """
    Handles moderator actions (approve/reject) on a flagged review.
    Requires POST request with an 'action'.
    """
    # Check if the user has moderator privileges.
    # Assumes 'is_moderator' is a boolean attribute on the user model or a custom check.
    if not request.user.is_moderator: # Replace with your actual moderator check if different.
        return JsonResponse({'error': 'Access denied. User is not a moderator.'}, status=403) # HTTP 403 Forbidden.

    # Retrieve the specific flagged review or return 404 if not found or not flagged.
    review = get_object_or_404(Review, id=review_id, flagged=True)

    # Process only POST requests.
    if request.method == 'POST':
        action = request.POST.get('action') # Get 'action' from POST data ("approve" or "reject").

        if action == 'approve': # If action is to approve.
            review.flagged = False # Unflag the review.
            review.moderated = True # Mark as moderated (approved).
            review.save() # Save changes to the review.
            return JsonResponse({'success': True, 'message': 'Review approved and unflagged.'})
        
        elif action == 'reject': # If action is to reject.
            # Consider if rejected reviews should be soft-deleted or archived instead of hard delete.
            review.delete() # Delete the review from the database.
            return JsonResponse({'success': True, 'message': 'Review rejected and deleted.'})
        
        else: # If action is not 'approve' or 'reject'.
            return JsonResponse({'error': 'Invalid action specified.'}, status=400) # HTTP 400 Bad Request.

    # If request method is not POST.
    return JsonResponse({'error': 'Invalid request method. Please use POST.'}, status=405) # HTTP 405 Method Not Allowed.



def user_review_count(request, user_id):
    """
    API endpoint to get the review count for a specific user.
    Returns username and their total review count as JSON.
    """
    # Retrieve UserProfile by ID, or return 404 if not found.
    user = get_object_or_404(UserProfile, id=user_id) # Assumes UserProfile model.
    # Get review count (assumes 'review_count' is a property or method on UserProfile).
    review_count = user.review_count 
    # Return username and review count in JSON format.
    return JsonResponse({'username': user.username, 'review_count': review_count})


def reviews_list(request):
    """
    Renders a page displaying a list of reviews.
    Each review is annotated with the total review count of its author.
    """
    # Fetch all reviews.
    reviews = Review.objects.select_related('user', 'place').annotate(
        # Counts all reviews associated with the user of the current review.
        review_count=Count('user__reviews') 
    )
    # Render 'home.html' template, passing the list of reviews (with counts) to the context.
    return render(request, 'home.html', {'reviews': reviews})



def latest_reviews_view(request):
    """
    Fetches and displays a list of reviews, each annotated with its author's total review count.
    Includes a debugging print statement for review counts.
    """
    # Fetch all reviews.
    reviews = Review.objects.select_related('user', 'place').annotate(
        # Counts all reviews associated with the user of the current review.
        review_count=Count('user__reviews') 
    )
    
    # Debugging: Print username and their calculated review count for each review's author.
    for review in reviews:
        print(f"User: {review.user.username}, Review Count: {review.review_count}")
        
    # Render 'home.html' template, passing the list of reviews to the context.
    return render(request, 'home.html', {'reviews': reviews})


@csrf_exempt 
@login_required 
@user_passes_test(lambda u: u.groups.filter(name='Moderators').exists()) 
def assign_flagged_review(request):
    """
    API endpoint to assign a flagged review to an active moderator.
    Expects a POST request with 'review_id'.
    """
    if request.method == "POST": # Process only POST requests.
        try:
            # Load data from the JSON request body.
            data = json.loads(request.body)
            review_id = data.get("review_id") # Get the ID of the review to be assigned.

            # Validate review: ensure it exists and is currently flagged.
            review = Review.objects.filter(id=review_id, flagged=True).first()
            if not review: # If review not found or not flagged.
                return JsonResponse({"success": False, "error": "Review not found or not currently flagged."}, status=400)

            # Get a list of all active moderators.
            moderators = list(Moderator.objects.filter(is_active=True)) # Assumes Moderator model.
            if not moderators: # If no active moderators are available.
                return JsonResponse({"success": False, "error": "No active moderators available for assignment."}, status=400)

            # Randomly select one moderator from the list of active moderators.
            assigned_moderator = random.choice(moderators)

            # Create or update a Flag entry for the review, assigning the selected moderator.
            flag, created = Flag.objects.get_or_create(
                review=review, 
                defaults={"reason": "Auto-Assigned by system", "moderator": assigned_moderator}
            )
            # If the flag already existed but had no moderator, or to update the moderator:
            if not created and flag.moderator != assigned_moderator:
                flag.moderator = assigned_moderator
                flag.reason = flag.reason or "Re-assigned by system" # Update reason if it was empty.
                flag.save()


            # Return a success response with the assigned moderator's username.
            return JsonResponse({
                "success": True,
                "message": f"Review successfully assigned to moderator {assigned_moderator.user.username}",
                "moderator": assigned_moderator.user.username # Username of the assigned moderator.
            })

        except json.JSONDecodeError: # Handle errors if request body is not valid JSON.
             return JsonResponse({"success": False, "error": "Invalid JSON format in request body."}, status=400)
        except Exception as e: # Catch any other unexpected errors.
            print(f"Error in assign_flagged_review API: {str(e)}") # Log the error.
            return JsonResponse({"success": False, "error": str(e)}, status=500) # Internal Server Error.

    # If request method is not POST.
    return JsonResponse({"success": False, "error": "Invalid request method. Please use POST."}, status=400)



@csrf_exempt 
def flag_review(request):
    """
    API endpoint for users to flag a review.
    Assigns the flagged review to a random active moderator.
    Expects a POST request with 'review_id' and optional 'reason'.
    """
    if request.method == "POST": # Process only POST requests.
        try:
            # Load data from the JSON request body.
            data = json.loads(request.body)
            review_id = data.get("review_id") # ID of the review to be flagged.
            # Reason for flagging, defaults if not provided.
            reason = data.get("reason", "User flagged review") 

            # Validate review: ensure it exists and is not already flagged.
            review = Review.objects.filter(id=review_id, flagged=False).first()
            if not review: # If review not found or already flagged.
                return JsonResponse({"success": False, "error": "Review not found or already flagged."}, status=400)

            # Get a list of all active moderators.
            moderators = list(Moderator.objects.filter(is_active=True)) # Assumes Moderator model.
            if not moderators: # If no active moderators are available.
                return JsonResponse({"success": False, "error": "No moderators available to assign flag."}, status=400)

            # Randomly select one moderator from the list of active moderators.
            assigned_moderator = random.choice(moderators)

            # Create a Flag entry, assigning the moderator and reason.
            flag, created = Flag.objects.get_or_create(
                review=review, 
                # If a Flag object for this review already exists, 'created' will be False.
                defaults={"reason": reason, "user": request.user if request.user.is_authenticated else None, "moderator": assigned_moderator}
            )

            if not created: # If get_or_create found an existing Flag object for this review.
                return JsonResponse({"success": False, "error": "Review is already associated with a flag entry."}, status=400)

            # Mark the review itself as flagged.
            review.flagged = True
            review.save() # Save the change to the Review object.

            # Return a success response.
            return JsonResponse({
                "success": True,
                "message": f"✅ Review flagged and assigned to {assigned_moderator.user.username}.",
                "moderator": assigned_moderator.user.username # Username of the assigned moderator.
            })

        except json.JSONDecodeError: # Handle errors if request body is not valid JSON.
             return JsonResponse({"success": False, "error": "Invalid JSON format in request body."}, status=400)
        except Exception as e: # Catch any other unexpected errors.
            print(f"Error in flag_review API: {str(e)}") # Log the error.
            return JsonResponse({"success": False, "error": str(e)}, status=500) # Internal Server Error.

    # If request method is not POST.
    return JsonResponse({"success": False, "error": "Invalid request method. Please use POST."}, status=400)

# ------------------------------------------- COUNTRY REVIEWS ------------------------------------------------#

def get_country_reviews(country_name, rating_filter=None, date_from=None):
    print(f"Looking for reviews with country name: {country_name}")
    
    # SPECIAL DEBUGGING FOR SWITZERLAND
    if country_name.lower() == "switzerland":
        print("=== SWITZERLAND SPECIFIC DEBUG ===")
        # Check all destinations that might be related
        swiss_destinations = Destination.objects.filter(
            Q(name__icontains="swiss") | 
            Q(country__icontains="swiss") |
            Q(name__iexact="Switzerland") |
            Q(country__iexact="Switzerland")
        )
        print(f"Found {swiss_destinations.count()} Swiss-related destinations:")
        for dest in swiss_destinations:
            print(f"- ID: {dest.id}, Name: {dest.name}, Country: {dest.country}")
        
        # Check all reviews that might be related to Switzerland
        swiss_reviews = Review.objects.filter(
            Q(place__name__icontains="swiss") | 
            Q(place__country__icontains="swiss") |
            Q(place__name__iexact="Switzerland") |
            Q(place__country__iexact="Switzerland") |
            Q(title__icontains="swiss") |
            Q(content__icontains="swiss")
        )
        print(f"Found {swiss_reviews.count()} Switzerland-related reviews:")
        for rev in swiss_reviews:
            print(f"- ID: {rev.id}, Title: {rev.title}")
            print(f"  Place: {rev.place.name}, Country: {rev.place.country}")
            print(f"  Moderated: {rev.moderated}, Flagged: {rev.flagged}")
        print("=== END SWITZERLAND DEBUG ===")
    
    # Get all destinations for this country - use case-insensitive query
    country_destinations = Destination.objects.filter(
        Q(name__iexact=country_name) | 
        Q(country__iexact=country_name)
    )
    
    print(f"Found {country_destinations.count()} matching destinations")
    for dest in country_destinations:
        print(f"- Destination: {dest.name}, Country: {dest.country}")
    
    # Base query filters
    base_filters = Q(moderated=True, flagged=False)
    
    if rating_filter and rating_filter in [1, 2, 3, 4, 5]:
        base_filters &= Q(rating=rating_filter)
    
    
    if date_from:
        base_filters &= Q(created_at__gte=date_from)
    
    # SPECIAL CASE FOR SWITZERLAND
    if country_name.lower() == "switzerland":
        print("Using special case query for Switzerland")
        country_reviews = Review.objects.filter(
            base_filters & (
                Q(place__name__iexact="Switzerland") | 
                Q(place__country__iexact="Switzerland") |
                Q(place__name__icontains="swiss") | 
                Q(place__country__icontains="swiss")
            )
        ).prefetch_related('images', 'user').order_by('-created_at')
    else:
        # Standard query for other countries
        country_reviews = Review.objects.filter(
            base_filters & (
                Q(place__name__iexact=country_name) | 
                Q(place__country__iexact=country_name)
            )
        ).prefetch_related('images', 'user').order_by('-created_at')
    
    # If no reviews found, try with destinations
    if not country_reviews.exists() and country_destinations.exists():
        country_reviews = Review.objects.filter(
            base_filters & Q(place__in=country_destinations)
        ).prefetch_related('images', 'user').order_by('-created_at')
    
    # If still no reviews, try keyword search
    if not country_reviews.exists():
        country_reviews = Review.objects.filter(
            base_filters & (
                Q(title__icontains=country_name) | 
                Q(content__icontains=country_name)
            )
        ).prefetch_related('images', 'user').order_by('-created_at')
    
    print(f"Found {country_reviews.count()} reviews for {country_name}")
    for review in country_reviews[:3]:
        print(f"- Review: {review.title} (Place: {review.place.name}, Country: {review.place.country})")
    
    # Get metrics for all reviews (not filtered by rating)
    # Create a separate query for metrics to ensure we have correct counts regardless of rating filter
    all_reviews_query = Q(moderated=True, flagged=False) & (
        Q(place__name__iexact=country_name) | 
        Q(place__country__iexact=country_name)
    )
    
    # If the primary query returned no results, use the same fallback logic for metrics
    all_reviews = Review.objects.filter(all_reviews_query)
    
    if not all_reviews.exists() and country_destinations.exists():
        all_reviews = Review.objects.filter(
            Q(moderated=True, flagged=False) & 
            Q(place__in=country_destinations)
        )
    
    if not all_reviews.exists():
        all_reviews = Review.objects.filter(
            Q(moderated=True, flagged=False) & (
                Q(title__icontains=country_name) | 
                Q(content__icontains=country_name)
            )
        )
    
    # Get raw counts for each rating
    total_count = all_reviews.count()
    excellent_count = all_reviews.filter(rating=5).count()
    very_good_count = all_reviews.filter(rating=4).count()
    average_count = all_reviews.filter(rating=3).count()
    poor_count = all_reviews.filter(rating=2).count()
    terrible_count = all_reviews.filter(rating=1).count()
    
    # Calculate average rating
    avg_rating = all_reviews.aggregate(avg=Avg('rating'))['avg'] or 0
    
    # Find the maximum count for relative width calculation
    max_count = max([excellent_count, very_good_count, average_count, poor_count, terrible_count]) if total_count > 0 else 1
    
    # Calculate percentages and round to integer values to avoid template issues
    excellent_percent = round((excellent_count / max_count) * 100) if max_count > 0 else 0
    very_good_percent = round((very_good_count / max_count) * 100) if max_count > 0 else 0
    average_percent = round((average_count / max_count) * 100) if max_count > 0 else 0
    poor_percent = round((poor_count / max_count) * 100) if max_count > 0 else 0
    terrible_percent = round((terrible_count / max_count) * 100) if max_count > 0 else 0
    
    # Create final metrics dictionary
    review_metrics = {
        'total_count': total_count,
        'avg_rating': avg_rating,
        'rating_distribution': {
            'excellent': excellent_count,
            'very_good': very_good_count,
            'average': average_count,
            'poor': poor_count,
            'terrible': terrible_count,
            # Integer percentages for template
            'excellent_percent': excellent_percent,
            'very_good_percent': very_good_percent,
            'average_percent': average_percent,
            'poor_percent': poor_percent,
            'terrible_percent': terrible_percent
        }
    }
    
    return country_reviews, review_metrics


def Tokyo(request):
    # Define the specific country/destination name for this view.
    country_name = "Tokyo" 
    # This promotes reusability if destination_view handles common logic for all destinations.
    return destination_view(request, country_name) # Assumes destination_view is defined.

# Function for Japan
def Japan(request):
    country_name = "Japan"
    return destination_view(request, country_name)

# Function for Greece
def greece(request):
    country_name = "Greece"
    return destination_view(request, country_name)

# Function for Turkey
def Turkey(request):
    country_name = "Turkey"
    return destination_view(request, country_name)

# Function for California
def California(request):
    country_name = "California"
    return destination_view(request, country_name)

# Function for Switzerland
def switzerland(request):
    country_name = "Switzerland"
    return destination_view(request, country_name)

# Function for New Zealand
def New_Zealand(request):
    country_name = "New Zealand"
    return destination_view(request, country_name)

# Function for London
def London(request):
    country_name = "London"
    return destination_view(request, country_name)

# Function for Rome
def Rome(request):
    country_name = "Rome"
    return destination_view(request, country_name)

# Function for New York
def New_York(request):
    country_name = "New York"
    return destination_view(request, country_name)

# Function for Sydney
def Sydney(request):
    country_name = "Sydney"
    return destination_view(request, country_name)

# Function for Italy
def Italy(request):
    country_name = "Italy"
    return destination_view(request, country_name)

# Function for Peru
def Peru(request):
    country_name = "Peru"
    return destination_view(request, country_name)

# Function for China
def China(request):
    country_name = "China"
    return destination_view(request, country_name)

# Function for Australia
def Australia(request):
    country_name = "Australia"
    return destination_view(request, country_name)

# Function for Iceland
def Iceland(request):
    country_name = "Iceland"
    return destination_view(request, country_name)

# Function for Egypt
def Egypt(request):
    country_name = "Egypt"
    return destination_view(request, country_name)

# Function for Brazil
def Brazil(request):
    country_name = "Brazil"
    return destination_view(request, country_name)

# Function for Paris
def Paris(request):
    country_name = "Paris"
    return destination_view(request, country_name)

# Function for Morocco
def Morocco(request):
    country_name = "Morocco"
    return destination_view(request, country_name)

# Function for Indonesia
def Indonesia(request):
    country_name = "Indonesia"
    return destination_view(request, country_name)

def India(request):
    country_name = "India"
    return destination_view(request, country_name)

# Function for Mumbai
def Mumbai(request):
    country_name = "Mumbai"
    return destination_view(request, country_name)

# Function for Navagio Beach
def Navagio_Beach(request):
    beach_name = "Navagio Beach"
    return destination_view(request, beach_name)

# Function for Maya Bay
def Maya_Bay(request):
    beach_name = "Maya Bay"
    return destination_view(request, beach_name)

# Function for Seven Mile Beach
def Seven_Mile_Beach(request):
    beach_name = "Seven Mile Beach"
    return destination_view(request, beach_name)


def Matira_Beach(request):
    beach_name = "Matira Beach"
    return destination_view(request, beach_name)


def Great_Barrier_Reef(request):
    Reef_name = "Great Barrier Reef"
    return destination_view(request, Reef_name)


def Sydney_Opera_House(request):
    Opera_name = "Sydney Opera House"
    return destination_view(request, Opera_name)

def Uluru(request):
    Desert_name = "Uluru"
    return destination_view(request, Desert_name)


def Twelve_Apostles(request):
    Sea_stack_name = "Twelve Apostles"
    return destination_view(request, Sea_stack_name)

def Rio_de_Janeiro(request):
    City_name = "Rio de Janeiro"
    return destination_view(request, City_name)

def Amazon_Rainforest(request):
    Rainforest_name = "Amazon Rainforest"
    return destination_view(request, Rainforest_name)

def Iguazu_Falls(request):
    WaterFall_name = "Iguazu Falls"
    return destination_view(request, WaterFall_name)

def Salvador(request):
    City_name = "Salvador"
    return destination_view(request, City_name)

def San_Francisco(request):
    City_name = "San Francisco"
    return destination_view(request, City_name)

def Los_Angeles(request):
    City_name = "Los Angeles"
    return destination_view(request, City_name)

def Yosemite(request):
    National_Park_name = "Yosemite"
    return destination_view(request, National_Park_name)

def Napa_Valley(request):
    City_name = "Napa Valley"
    return destination_view(request, City_name)



def destination_view(request, country_name):
    # Normalize the country_name
    display_country_name = country_name.replace("_", " ").title()
    
    # Special case for Switzerland - ensure consistent naming
    if display_country_name.lower() in ["switzerland", "swiss"]:
        display_country_name = "Switzerland"
        
    # Special case for Rome - ensure we maintain working functionality
    if display_country_name.lower() == "rome":
        display_country_name = "Rome"
    
    print(f"Processing request for country: {display_country_name}")
    
    # Get filter parameters from request
    rating_filter = request.GET.get('rating')
    if rating_filter:
        try:
            rating_filter = int(rating_filter)
            if rating_filter not in [1, 2, 3, 4, 5]:
                rating_filter = None
        except ValueError:
            rating_filter = None
    
    date_filter = request.GET.get('date_from')
    date_from = None
    
    # Handle date filter with simpler string values
    if date_filter:
        today = datetime.now().date()
        if date_filter == 'today':
            date_from = today
        elif date_filter == 'week':
            date_from = today - timedelta(days=7)
        elif date_filter == 'month':
            date_from = today - timedelta(days=30)
        elif date_filter == 'three_months':
            date_from = today - timedelta(days=90)
        elif date_filter == 'year':
            date_from = today - timedelta(days=365)
        else:
            # Try to parse as YYYY-MM-DD
            try:
                date_from = datetime.strptime(date_filter, '%Y-%m-%d').date()
            except ValueError:
                pass
    
    # Get the reviews and metrics
    country_reviews, review_metrics = get_country_reviews(
        display_country_name, 
        rating_filter=rating_filter,
        date_from=date_from
    )
    
    # Check if the current user is a moderator
    is_moderator = request.user.groups.filter(name="Moderators").exists() if request.user.is_authenticated else False
    
    context = {
        'country_name': display_country_name,
        'country_reviews': country_reviews,
        'review_metrics': review_metrics,
        'is_moderator': is_moderator,
        'current_rating_filter': rating_filter,
        'current_date_filter': date_filter,
    }
    
    # Debug output
    print(f"Context for template: country_name={display_country_name}")
    print(f"Review count: {len(country_reviews)}")
    
    # Debug the first few reviews in the context
    for i, review in enumerate(country_reviews[:3]):
        print(f"Review {i+1}: ID={review.id}, Title={review.title}")
        print(f"  Place: {review.place.name}, Country: {review.place.country}")
    
    # Use the original country_name parameter for the template name
    template_name = f'{country_name.replace(" ", "_")}.html'
    print(f"Rendering template: {template_name}")
    
    return render(request, template_name, context)



# ------------------------------------------- SUBMITTING REVIEWS ------------------------------------------------#



@csrf_protect
@login_required(login_url='/SignUp/')
def submit_review(request):
    # Initialize our content filter and image validator
    content_filter = ContentFilter()
    image_validator = ImageValidator()
    
    if request.method == 'POST':
        try:
            # Check if request is AJAX (fetch) or standard form submit
            is_ajax = request.headers.get('X-Requested-With') == 'XMLHttpRequest'
            
            # Get form data
            destination_name = request.POST.get('destination')
            country_name = request.POST.get('country', '')  # Get country name if available
            
            # Normalize destination and country names
            destination_name = destination_name.strip().title()
            country_name = country_name.strip().title() or destination_name
            
            visit_date_str = request.POST.get('visitDate')
            review_title = request.POST.get('reviewTitle')
            rating = request.POST.get('rating')
            experience_details = request.POST.get('experienceDetails')
            
            # Check for inappropriate content in text fields
            title_check = content_filter.check_content(review_title)
            # Pass rating to content check for bias detection
            content_check = content_filter.check_content(experience_details, rating=int(rating) if rating and rating.isdigit() else None)
            
            is_title_problematic, title_reasons = title_check
            is_content_problematic, content_reasons = content_check
            
            # If content is problematic, flag for moderation
            auto_flag = False
            flag_reason = ""
            
            if is_title_problematic:
                auto_flag = True
                flag_reason += f"Title flagged for: {title_reasons}. "
            
            if is_content_problematic:
                auto_flag = True
                flag_reason += f"Content flagged for: {content_reasons}. "
            
            # Check specifically for bias
            bias_detected = False
            if 'bias' in content_reasons and content_reasons['bias']:
                bias_detected = True
                bias_types = []
                
                # Format bias detection for better readability
                if 'extreme_generalizations' in content_reasons['bias']:
                    bias_types.append(f"Extreme generalizations: {', '.join(content_reasons['bias']['extreme_generalizations'])}")
                    
                if 'superlatives' in content_reasons['bias']:
                    bias_types.append(f"Excessive superlatives: {', '.join(content_reasons['bias']['superlatives'])}")
                    
                if 'compensation' in content_reasons['bias']:
                    bias_types.append(f"Potential compensation language: {', '.join(content_reasons['bias']['compensation'])}")
                    
                if 'rating_mismatch' in content_reasons['bias']:
                    bias_types.append("Rating inconsistent with review sentiment")
                
                # Add bias details to flag reason if detected
                if bias_types:
                    flag_reason += f"Bias detected: {'; '.join(bias_types)}. "
            
            # Validate images
            photos = request.FILES.getlist('photos')
            invalid_images = []
            
            for i, photo in enumerate(photos):
                is_valid, error_message = image_validator.validate_image(photo)
                if not is_valid:
                    invalid_images.append(f"Image {i+1}: {error_message}")
            
            if invalid_images:
                if is_ajax:
                    return JsonResponse({
                        'success': False,
                        'error': "Some images failed validation",
                        'image_errors': invalid_images
                    }, status=400)
                else:
                    messages.error(request, "Some images failed validation: " + ", ".join(invalid_images))
                    return redirect('submit_review')
            
            # Convert visit_date string to date object
            try:
                visit_date = datetime.strptime(visit_date_str, '%Y-%m-%d').date()
            except ValueError:
                if is_ajax:
                    return JsonResponse({
                        'success': False,
                        'error': "Invalid date format. Please use YYYY-MM-DD format."
                    }, status=400)
                else:
                    messages.error(request, "Invalid date format. Please use YYYY-MM-DD format.")
                    return redirect('submit_review')
                
            # Try to get or create destination with country
            destination, created = Destination.objects.get_or_create(
                name=destination_name,
                defaults={
                    'country': country_name
                }
            )
            
            # Update country if it's not set or is generic
            if not destination.country or destination.country in ['Not specified', 'None']:
                destination.country = country_name
                destination.save()
            
            # Debugging print
            print(f"Destination created/retrieved: {destination.name}, Country: {destination.country}")
            
            # Create review with additional bias flag
            review = Review.objects.create(
                user=request.user,
                place=destination,
                title=review_title,
                content=experience_details,
                rating=int(rating),
                visit_date=visit_date,
                flagged=auto_flag,  # Flag based on content check
                moderated=not auto_flag,  # Only mark as moderated if not flagged
                has_bias=bias_detected  # Add this field to your Review model
            )
            
            # Save images
            for photo in photos:
                ReviewImage.objects.create(
                    review=review,
                    image=photo
                )
            
            # If flagged, assign to a moderator
            if auto_flag:
                # Assign to a random moderator
                moderators = list(Moderator.objects.filter(is_active=True))
                if moderators:
                    assigned_moderator = random.choice(moderators)
                    Flag.objects.create(
                        review=review,
                        reason=flag_reason,
                        moderator=assigned_moderator
                    )
                    print(f"Review {review.id} auto-flagged and assigned to {assigned_moderator.user.username}")
                else:
                    print(f"Review {review.id} was flagged but no moderators are available")
            
            success_message = 'Your review has been submitted and ' + \
                           ('will be reviewed by a moderator before publishing.' if auto_flag else 'published successfully!')
            
            if is_ajax:
                return JsonResponse({
                    'success': True,
                    'message': success_message
                })
            else:
                # For regular form submission, add a message and redirect
                messages.success(request, success_message)
                return redirect('home')  # Redirect to home page after successful review
                
        except Exception as e:
            print(f"Error submitting review: {str(e)}")
            if is_ajax:
                return JsonResponse({
                    'success': False,
                    'error': str(e)
                }, status=500)
            else:
                messages.error(request, f"Error: {str(e)}")
                return redirect('submit_review')
    
    # If not POST, render the form page
    return render(request, 'submit_review.html')
    


class ContentFilter:
    def __init__(self):
        # Words lists renamed properly to avoid conflicts with method names
        self.inappropriate_words = [
            # General profanity and obscenities
            'obscenity', 'profanity', 'explicit', 'offensive', 
            
            # Adult content related
            'pornographic', 'xxx', 'nsfw', 'adult', 'nudity', 'escort', 'webcam',
            
            # Common swear words and profanities
            'ass', 'asshole', 'bastard', 'bitch', 'bitching', 'bullshit', 'bullshitting', 'crap', 'damn', 'dick',
            'douchebag', 'fuck', 'fucking', 'fucker', 'jackass', 'jerk', 'motherfucker', 'piss',
            'shit', 'shitty', 'tits', 'twat', 'wanker', 'whore', 'cunt', 'cock',
            'pussy', 'prick', 'slut', 'bollocks', 'bloody', 'bugger', 'choad',
            'dammit', 'dickhead', 'goddamn', 'horseshit', 'motherfucking', 'retard',
            'dipshit', 'dumbass', 'fag', 'faggot', 'homo', 'queer', 'suck',
            'sucker', 'screwed', 'shitter', 'shithead', 'slag', 'skank',
            
            # Hateful content
            'racist', 'bigot', 'discrimination', 'hateful', 'supremacist', 'derogatory',
            
            # Violence related
            'gore', 'murder', 'torture', 'abuse', 'graphic', 'violent', 'brutal',
            
            # Drugs and substances
            'narcotic', 'drug', 'cocaine', 'heroin', 'meth', 'illegal substance','weed',
            
            # Spam related
            'spam', 'scam', 'phishing', 'unwanted', 'unsolicited', 'advertisement',
            
            # Financial scams
            'lottery', 'jackpot', 'get rich', 'quick money', 'pyramid scheme', 'ponzi',
            
            # Pharmaceutical spam
            'viagra', 'cialis', 'pill', 'medication', 'pharmacy', 'prescription',
            
            # Fraudulent claims
            'miracle', 'instant cure', 'guaranteed', 'amazing result', 'secret trick',
            
            # Malicious
            'malware', 'virus', 'trojan', 'spyware', 'keylogger', 'ransomware',
            
            # Gambling
            'betting', 'casino', 'gamble', 'wager', 'slot', 'poker', 'blackjack',
            
            # Weapons
            'firearm', 'weapon', 'gun', 'explosive', 'ammunition', 'bomb',
            
            # Political extremism
            'extremist', 'terrorism', 'radical', 'jihad', 'militant',
            
            # Suspicious solicitation
            'urgent', 'act now', 'limited time', 'exclusive offer', 'once in a lifetime',
            
            # Promotional
            'discount', 'coupon', 'promo code', 'sale', 'free trial', 'limited offer',
            
            # Contact solicitation
            'contact me', 'call now', 'text me', 'email me', 'direct message',
            
            # MLM and schemes
            'mlm', 'downline', 'upline', 'recruit', 'network marketing', 'multi-level',
            
            # Counterfeit
            'fake', 'replica', 'knockoff', 'counterfeit', 'imitation', 'clone',
            
            # Intellectual property
            'pirated', 'cracked', 'keygen', 'warez', 'torrent', 'copyright infringement',
        ]
        
        # Patterns for promotional content
        self.promotional_patterns = [
            r'discount code',
            r'promo code',
            r'(\d+)% off',
            r'special offer',
            r'limited time',
            r'click here',
            r'sign up',
            r'subscribe',
            r'buy now',
            r'for sale',
            r'www\.',
            r'http',
            r'\.com',
            r'\.net',
            r'\.org',
            r'coupon',
        ]
        
        # Spam detection patterns
        self.spam_patterns = [
            r'viagra',
            r'cialis',
            r'free money',
            r'earn from home',
            r'make money fast',
            r'work from home',
            r'easy cash',
            r'investment opportunity',
        ]
        
        # Security threat patterns
        self.security_threat_patterns = [
            r'hack',
            r'crack',
            r'keygen',
            r'serial\s+key',
            r'password\s+list',
            r'phishing',
            r'ddos',
            r'malware',
            r'ransomware',
            r'breach',
            r'exploit',
            r'vulnerability',
            r'sql\s+injection',
            r'xss',
            r'cross\s+site',
            r'session\s+hijack',
            r'trojan',
            r'virus',
            r'botnet',
            r'spyware',
            r'keylogger',
            r'backdoor',
            r'zero-?day',
        ]
        
        # patterns for bias detection
        self.bias_patterns = {
            # Extreme generalizations
            'extreme_generalizations': [
                r'\ball\b', r'\bnone\b', r'\bevery\b', r'\balways\b', r'\bnever\b', 
                r'\beverybody\b', r'\bnobody\b', r'\bcompletely\b', r'\babsolutely\b', 
                r'\bdefinitely\b', r'\bimpossible\b'
            ],
            
            # Overly promotional superlatives
            'superlatives': [
                r'\bbest\b', r'\bgreatest\b', r'\bperfect\b', r'\bexcellence\b', 
                r'\bexceptional\b', r'\bsuperior\b', r'\bunmatched\b', r'\bunparalleled\b', 
                r'\boutstanding\b', r'\bunbeatable\b', r'\bfantastic\b', 
                r'\bflawless\b', r'\bbrilliant\b', r'\bincredible\b', r'\bultimate\b'
            ],
            
            # Compensation or incentive mentions
            'compensation': [
                r'\bsponsored\b', r'\bpaid\b', r'\bcompensated\b', r'\bfree\b', 
                r'\bcomplimentary\b', r'\bgiven\b', r'\breceived\b', r'in exchange for', 
                r'\bincentive\b', r'\breward\b', r'\bupgrade\b', r'\bspecial access\b', 
                r'\bvip\b', r'\bexclusive\b'
            ]
        }
    
    def is_inappropriate(self, text):
        """Check if text contains inappropriate content with enhanced detection"""
        if not text:
            return False, []
            
        # Normalize text - lowercase and remove extra spaces
        text_lower = text.lower()
        text_normalized = ' ' + re.sub(r'\s+', ' ', text_lower) + ' '
        
        # Check for inappropriate words with better pattern matching
        found_words = []
        
        # 1. Standard check with word boundaries
        for word in self.inappropriate_words:
            pattern = r'\b' + re.escape(word) + r'\b'
            if re.search(pattern, text_lower):
                found_words.append(word)
        
        # 2. Enhanced detection for disguised words
        disguise_patterns = {
            # Racial slurs with letter substitutions or spaces
            r'n[i!1]+g+[a@*]+': 'racial slur',
            r'n[i!1]+g+[e3*]+r+': 'racial slur',
            r'n\s*[i!1]\s*g+\s*[a@]\s*': 'racial slur (spaced)',
            r'f+\s*[a@*]\s*g+': 'homophobic slur',
            
            # Profanity with common disguises
            r'f+\s*[u\*]+\s*c+\s*k+': 'profanity',
            r'b+\s*[i!1]+\s*t+\s*c+\s*h+': 'profanity',
            r's+\s*h+\s*[i!1]+\s*t+': 'profanity',
            
            # Weapons and violence with letter substitution
            r'g+\s*[u\*]+\s*n+': 'weapon',
            r'b+\s*[o0\*]+\s*m+\s*b+': 'weapon',
            r'k+\s*[i!1]+\s*l+\s*l+': 'violence',
            
            # Common promotional tricks
            r'c+\s*l+\s*[i!1]+\s*c+\s*k+\s*h+\s*[e3]+\s*r+\s*[e3]+': 'promotional',
            r'f+\s*r+\s*[e3]+\s*[e3]+': 'promotional',
            r'v+\s*[i!1]+\s*[a@]+\s*g+\s*r+\s*[a@]+': 'inappropriate med',
        }
        
        for pattern, label in disguise_patterns.items():
            if re.search(pattern, text_normalized):
                found_words.append(label)
        
        # 3. Check for hidden inappropriate words using leet speak
        leet_conversions = {
            '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's'
        }
        
        # Create a de-leeted version of the text
        deleet_text = text_lower
        for leet, char in leet_conversions.items():
            deleet_text = deleet_text.replace(leet, char)
        
        # Check the de-leeted text against the inappropriate words
        for word in self.inappropriate_words:
            pattern = r'\b' + re.escape(word) + r'\b'
            if re.search(pattern, deleet_text) and word not in found_words:
                found_words.append(word + ' (leet)')
        
        # 4. Check for unicode character substitutions
        unicode_normalized = unicodedata.normalize('NFKD', text_lower)
        for word in self.inappropriate_words:
            pattern = r'\b' + re.escape(word) + r'\b'
            if re.search(pattern, unicode_normalized) and word not in found_words:
                found_words.append(word + ' (unicode)')
        
        return len(found_words) > 0, found_words

    def is_promotional(self, text):
        """Check if text contains promotional content"""
        if not text:
            return False, []
        
        text_lower = text.lower()
        
        # Check for promotional patterns
        found_patterns = []
        for pattern in self.promotional_patterns:
            if re.search(pattern, text_lower):
                found_patterns.append(pattern)
        
        # Check for excessive linking
        link_count = text_lower.count('http') + text_lower.count('www.') + text_lower.count('.com')
        if link_count > 2:  # Threshold for excessive links
            found_patterns.append('excessive_links')
            
        return len(found_patterns) > 0, found_patterns

    def is_spam(self, text):
        """Check if text is likely spam"""
        if not text:
            return False, []
            
        text_lower = text.lower()
        
        # Check for spam patterns
        found_patterns = []
        for pattern in self.spam_patterns:
            if re.search(pattern, text_lower):
                found_patterns.append(pattern)
        
        # Check for repetitive characters (common in spam)
        for char in string.ascii_lowercase:
            if char*4 in text_lower:  # Four or more repeating characters
                found_patterns.append(f'repetitive_{char}')
                break
        
        # Check for ALL CAPS sections (common in spam)
        words = text.split()
        caps_words = sum(1 for word in words if len(word) > 3 and word.isupper())
        if caps_words > len(words) * 0.3:  # If more than 30% are all caps
            found_patterns.append('excessive_caps')
        
        # Check text coherence (spam often has poor coherence)
        word_count = len(text_lower.split())
        unique_words = len(set(text_lower.split()))
        if word_count > 20 and unique_words / word_count < 0.4:
            # If text is longer than 20 words but uses less than 40% unique words
            found_patterns.append('low_word_diversity')
            
        return len(found_patterns) > 0, found_patterns

    def is_security_threat(self, text):
        """Check if text contains security threats"""
        if not text:
            return False, []
            
        text_lower = text.lower()
        
        # Check for security threat patterns
        found_patterns = []
        for pattern in self.security_threat_patterns:
            if re.search(pattern, text_lower):
                found_patterns.append(pattern)
        
        return len(found_patterns) > 0, found_patterns

    def is_biased(self, text, rating=None):
        """Check if text contains biased content"""
        if not text:
            return False, []
            
        text_lower = text.lower()
        
        # Check for various bias patterns
        bias_indicators = {}
        
        for category, patterns in self.bias_patterns.items():
            matches = []
            for pattern in patterns:
                found = re.findall(pattern, text_lower, re.IGNORECASE)
                if found:
                    matches.extend(found)
            
            if matches:
                bias_indicators[category] = matches
        
        # Check for rating inconsistency if rating is provided
        if rating is not None:
            # Define sentiment words
            positive_words = ['excellent', 'wonderful', 'fantastic', 'great', 
                             'loved', 'perfect', 'best',]
            negative_words = ['terrible', 'awful', 'horrible', 'worst', 'bad', 
                             'disappointed', 'poor', 'avoid', 'dislike', 'mediocre']
            
            # Count positive and negative sentiment words
            positive_count = sum(text_lower.count(word) for word in positive_words)
            negative_count = sum(text_lower.count(word) for word in negative_words)
            
            # Check for mismatch between rating and sentiment
            if (rating >= 4 and negative_count > positive_count * 2):
                bias_indicators['rating_mismatch'] = ['High rating with negative language']
                
            if (rating <= 2 and positive_count > negative_count * 2):
                bias_indicators['rating_mismatch'] = ['Low rating with positive language']
        
        is_biased = len(bias_indicators) > 0
        
        return is_biased, bias_indicators
        
    def check_content(self, text, rating=None):
        """Comprehensive check of text content"""
        inappropriate, inappropriate_reasons = self.is_inappropriate(text)
        promotional, promotional_reasons = self.is_promotional(text)
        spam, spam_reasons = self.is_spam(text)
        security_threat, security_reasons = self.is_security_threat(text)
        biased, bias_reasons = self.is_biased(text, rating)
        
        is_problematic = inappropriate or promotional or spam or security_threat or biased
        all_reasons = {
            'inappropriate': inappropriate_reasons,
            'promotional': promotional_reasons,
            'spam': spam_reasons,
            'security_threat': security_reasons,
            'bias': bias_reasons
        }
        
        return is_problematic, all_reasons



class ImageValidator:
    def __init__(self):
        self.max_size = 10 * 1024 * 1024  # 10MB
        self.allowed_types = ['jpeg', 'jpg', 'png', 'gif']
        self.min_dimensions = (200, 200)  # Minimum width, height
        self.max_dimensions = (4000, 4000)  # Maximum width, height
        
        # A collection of known inappropriate image md5 hashes
        # In a real-world scenario, this would be loaded from a database
        self.blocked_hashes = set()
    
    def validate_image_type(self, image_file):
        """Validate image file type and ensure it's a real image"""
        # Seek to beginning of file
        image_file.seek(0)
        
        # Try to open with PIL
        try:
            img = Image.open(image_file)
            img.verify()  # Verify it's a valid image
            image_file.seek(0)
        except Exception as e:
            return False, "Invalid image file"
        
        # Get the file extension
        file_ext = os.path.splitext(image_file.name)[1].lower()[1:]
        
        # Check if extension is allowed
        if file_ext not in self.allowed_types:
            return False, f"Image extension '{file_ext}' not allowed"
        
        # Try to get the actual image format
        image_file.seek(0)
        actual_ext = imghdr.what(image_file)
        image_file.seek(0)
        
        if actual_ext not in self.allowed_types:
            return False, f"Image type '{actual_ext}' not allowed"
        
        return True, None
    
    def validate_image_size(self, image_file):
        """Validate image file size"""
        if image_file.size > self.max_size:
            return False, f"Image too large. Maximum size is {self.max_size // (1024 * 1024)}MB"
        
        return True, None
    
    def validate_image_dimensions(self, image_file):
        """Validate image dimensions"""
        try:
            image_file.seek(0)
            img = Image.open(image_file)
            width, height = img.size
            
            if width < self.min_dimensions[0] or height < self.min_dimensions[1]:
                return False, f"Image dimensions too small. Minimum is {self.min_dimensions[0]}x{self.min_dimensions[1]}"
            
            if width > self.max_dimensions[0] or height > self.max_dimensions[1]:
                return False, f"Image dimensions too large. Maximum is {self.max_dimensions[0]}x{self.max_dimensions[1]}"
            
            return True, None
        except Exception as e:
            return False, f"Error validating image dimensions: {str(e)}"
    
    def check_image_hash(self, image_file):
        """Check if image matches known inappropriate image hashes"""
        try:
            image_file.seek(0)
            md5_hash = hashlib.md5(image_file.read()).hexdigest()
            image_file.seek(0)
            
            if md5_hash in self.blocked_hashes:
                return False, "Image matches a known inappropriate image"
            
            return True, None
        except Exception as e:
            return False, f"Error checking image hash: {str(e)}"
    
    def validate_image(self, image_file):
        """Comprehensive image validation"""
        # Check file size
        valid, message = self.validate_image_size(image_file)
        if not valid:
            return False, message
        
        # Check file type
        valid, message = self.validate_image_type(image_file)
        if not valid:
            return False, message
        
        # Check dimensions
        valid, message = self.validate_image_dimensions(image_file)
        if not valid:
            return False, message
        
        # Check against known inappropriate images
        valid, message = self.check_image_hash(image_file)
        if not valid:
            return False, message
        
        # Reset file pointer for future use
        image_file.seek(0)
        return True, None