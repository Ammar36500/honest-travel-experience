from django.shortcuts import render,redirect
from django.contrib.auth import authenticate, login
from django.contrib.auth.decorators import login_required, user_passes_test
import logging
from django.urls import reverse
from django.contrib.auth.models import User
from django.contrib.auth import get_user_model
from django.contrib import messages
from django.http import JsonResponse
from .models import Country, Place, Review, Moderator
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



def home(request):
    # Fetch only moderated reviews, ordered by the most recent
    reviews = Review.objects.filter(moderated=True).order_by('-created_at')
    
    # Check if the user is part of the "Moderators" group
    is_moderator = request.user.groups.filter(name="Moderators").exists() if request.user.is_authenticated else False

    # Render the home template with the reviews and moderator status
    return render(request, 'home.html', {'reviews': reviews, 'is_moderator': is_moderator})


def destinations(request):
    return render(request, 'destinations.html')

def submit_review(request):
    return render(request, 'submit_review.html')

def profile(request):
    return render(request, 'profile.html')

def about(request):
    return render(request, 'about.html')

def contact(request):
    return render(request, 'contact.html')



logger = logging.getLogger(__name__)

def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')

        try:
            # Check if username exists
            if not User.objects.filter(username=username).exists():
                return JsonResponse({'success': False, 'error': 'Username does not exist.'}, status=400)

            user = authenticate(request, username=username, password=password)

            if user:
                login(request, user)
                is_moderator = user.groups.filter(name="Moderators").exists()  # Check if user is a moderator

                return JsonResponse({
                    'success': True,
                    'redirect_url': reverse('moderator_dashboard') if is_moderator else reverse('home'),
                    'is_moderator': is_moderator,
                    'username': user.username,
                    'profile_picture': user.profile.profile_picture.url if hasattr(user, 'profile') and user.profile.profile_picture else "/static/images/default-profile.png"
                })
            else:
                return JsonResponse({'success': False, 'error': 'Invalid password. Please try again.'}, status=400)
        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            return JsonResponse({'success': False, 'error': 'An unexpected error occurred. Please try again.'}, status=500)

    return JsonResponse({'success': False, 'error': 'Invalid request method.'}, status=405)







User = get_user_model()  # Get the custom user model

def register_view(request):
    try:
        if request.method == 'POST':
            username = request.POST.get('username', '').strip()
            full_name = request.POST.get('full_name', '').strip()
            email = request.POST.get('email', '').strip()
            password = request.POST.get('password', '').strip()

            if not username or not email or not password or not full_name:
                return JsonResponse({'success': False, 'error': 'All fields are required.'}, status=400)

            if User.objects.filter(username=username).exists():
                return JsonResponse({'success': False, 'error': 'Username already exists.'}, status=400)
            if User.objects.filter(email=email).exists():
                return JsonResponse({'success': False, 'error': 'Email already exists.'}, status=400)

            user = User.objects.create_user(username=username, password=password, email=email)

            if " " in full_name:
                user.first_name, user.last_name = full_name.split(' ', 1)
            else:
                user.first_name = full_name

            user.save()

            return JsonResponse({'success': True, 'message': 'User registered successfully. Please log in.', 'redirect_url': '/login/'})

        return JsonResponse({'success': False, 'error': 'Invalid request method.'}, status=405)

    except Exception as e:
        import traceback
        logger.error(f"Exception during registration: {traceback.format_exc()}")
        return JsonResponse({'success': False, 'error': f'Internal Server Error: {str(e)}'}, status=500)

    
@login_required
def some_view(request):
    return render(request, 'home.html', {'user': request.user})

@login_required
def profile_view (request):
    return render(request, 'profile.html', {"user": request.user})

@login_required
def profile_view(request):
    if request.method == 'POST':
        user = request.user
        # Update fields
        user.first_name = request.POST.get('first_name', user.first_name)
        user.last_name = request.POST.get('last_name', user.last_name)
        user.profile.nickname = request.POST.get('nickname', user.profile.nickname)
        user.profile.gender = request.POST.get('gender', user.profile.gender)
        user.profile.headline = request.POST.get('headline', user.profile.headline)
        user.profile.interests = request.POST.get('interests', user.profile.interests)

        # Update profile picture if provided
        if 'profile_picture' in request.FILES:
            user.profile.profile_picture = request.FILES['profile_picture']

        user.save()
        user.profile.save()
        messages.success(request, 'Profile updated successfully!')
        return redirect('profile')

    return render(request, 'profile.html', {'user': request.user})

@login_required
def update_profile_picture(request):
    if request.method == 'POST':
        if 'profile_picture' in request.FILES:
            request.user.profile.profile_picture = request.FILES['profile_picture']
            request.user.profile.save()
            messages.success(request, 'Profile picture updated successfully!')
        else:
            messages.error(request, 'No file was uploaded. Please try again.')
        return redirect('profile')

    return render(request, 'profile.html')



# Utility function to assign a moderator to a review
def assign_moderator(review):
    moderators = Moderator.objects.filter(is_active=True)
    if moderators.exists():
        assigned_moderator = random.choice(moderators)
        # Add logic to log or notify the moderator
        print(f"Review assigned to moderator: {assigned_moderator.user.username}")
    else:
        print("No active moderators available.")


# API to get places based on a search query
def get_places(request):
    search_query = request.GET.get('search', '').strip()
    if not search_query:
        return JsonResponse({'success': False, 'error': 'No search query provided.'}, status=400)

    places = Place.objects.filter(name__icontains=search_query)
    results = [
        {
            'id': place.id,
            'name': place.name,
            'location': place.location,
            'description': place.description,
        }
        for place in places
    ]
    return JsonResponse({'success': True, 'results': results})


@login_required
def submit_place_review(request, place_id):
    place = get_object_or_404(Place, id=place_id)
    if request.method == 'POST':
        content = request.POST.get("content")
        rating = request.POST.get("rating")

        # Debugging: Print the received data
        print("Content:", content)
        print("Rating:", rating)

        if not content or not rating:
            return JsonResponse({"success": False, "error": "Content and rating are required."}, status=400)

        try:
            # Automatically approve the review
            Review.objects.create(
                user=request.user,
                place=place,
                content=content,
                rating=int(rating),  # Ensure the rating is an integer
                moderated=True
            )
            return JsonResponse({"success": True, "message": "Review submitted successfully!"})
        except Exception as e:
            # Debugging: Print the exception details
            print("Error:", e)
            return JsonResponse({"success": False, "error": "An error occurred while submitting the review."}, status=500)

    return render(request, 'review_submission.html', {'place': place})




@csrf_exempt
@login_required
def moderate_review(request, review_id):
    if request.method == "POST":
        action = request.POST.get("action")

        try:
            review = Review.objects.get(id=review_id)

            if action == "approve":
                review.flagged = False  # Unflag the review
                review.moderated = True  # Mark as moderated
                review.save()
                Flag.objects.filter(review=review).delete()  # Remove flag entry

                return JsonResponse({"success": True, "message": "Review approved successfully."})

            elif action == "reject":
                review.delete()  # ❌ Delete the review from the database
                return JsonResponse({"success": True, "message": "Review rejected and removed."})

        except Review.DoesNotExist:
            return JsonResponse({"success": False, "error": "Review not found."})

    return JsonResponse({"success": False, "error": "Invalid request."})





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


# Submit a review for a place
@login_required
def review_place(request, place_id):
    place = get_object_or_404(Place, id=place_id)

    if request.method == "POST":
        rating = request.POST.get("rating")
        comment = request.POST.get("comment")

        if not (rating and comment):
            return JsonResponse({"success": False, "error": "Rating and comment are required."}, status=400)

        Review.objects.create(
            place=place,
            user=request.user,
            rating=rating,
            comment=comment,
        )
        return JsonResponse({"success": True, "message": "Review submitted successfully!"})

    return render(request, "review_place.html", {"place": place})


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


@method_decorator(csrf_exempt, name="dispatch")
def review_action(request):
    if request.method == "POST":
        data = json.loads(request.body)
        review_id = data.get("review_id")
        action = data.get("action")  # 'thumbs_up', 'thumbs_down', 'flag'

        # Fetch the review
        review = Review.objects.filter(id=review_id).first()
        if not review:
            return JsonResponse({'success': False, 'error': 'Review not found'}, status=404)

        # Identify session or logged-in user
        session_id = request.session.session_key
        if not session_id:
            request.session.create()  # Create a session if it doesn't exist
            session_id = request.session.session_key

        # Ensure only one reaction per user/device
        interaction = ReviewInteraction.objects.filter(review=review, session_id=session_id).first()

        if interaction:
            if interaction.action == action:
                return JsonResponse({'success': False, 'error': f'You have already performed this action.'}, status=400)

            # Toggle between thumbs_up and thumbs_down
            if action in ["thumbs_up", "thumbs_down"]:
                if interaction.action == "thumbs_up" and action == "thumbs_down":
                    review.thumbs_up_count -= 1
                    review.thumbs_down_count += 1
                elif interaction.action == "thumbs_down" and action == "thumbs_up":
                    review.thumbs_down_count -= 1
                    review.thumbs_up_count += 1
                interaction.action = action
                interaction.save()
            else:
                return JsonResponse({'success': False, 'error': 'Invalid action or duplicate flagging attempt.'}, status=400)
        else:
            # Create a new interaction for the user/device
            if action in ["thumbs_up", "thumbs_down", "flag"]:
                ReviewInteraction.objects.create(review=review, session_id=session_id, action=action)
                if action == "thumbs_up":
                    review.thumbs_up_count += 1
                elif action == "thumbs_down":
                    review.thumbs_down_count += 1
                elif action == "flag":
                    review.flagged = True

        review.save()

        return JsonResponse({
            'success': True,
            'thumbs_up': review.thumbs_up_count,
            'thumbs_down': review.thumbs_down_count,
            'flagged': review.flagged,
        })

    return JsonResponse({'success': False, 'error': 'Invalid request'}, status=400)



def is_moderator(user):
    return user.groups.filter(name='Moderators').exists()

@login_required
def moderator_dashboard(request):
    # Check if the user is a moderator
    moderator = request.user.moderator if hasattr(request.user, "moderator") else None
    if not moderator:
        return HttpResponseForbidden("You do not have permission to access this page.")

    # Get only the flagged reviews assigned to this moderator
    assigned_flags = Flag.objects.filter(moderator=moderator)

    return render(request, "moderator_dashboard.html", {"reviews": assigned_flags})




@login_required
def moderate_flagged_review(request, review_id):
    if not request.user.is_moderator:
        return JsonResponse({'error': 'Access denied'}, status=403)

    review = get_object_or_404(Review, id=review_id, flagged=True)

    if request.method == 'POST':
        action = request.POST.get('action')  # "approve" or "reject"
        if action == 'approve':
            review.flagged = False
            review.moderated = True
            review.save()
            return JsonResponse({'success': True, 'message': 'Review approved'})
        elif action == 'reject':
            review.delete()
            return JsonResponse({'success': True, 'message': 'Review rejected'})
        else:
            return JsonResponse({'error': 'Invalid action'}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)



def user_review_count(request, user_id):
    user = get_object_or_404(UserProfile, id=user_id)
    review_count = user.review_count
    return JsonResponse({'username': user.username, 'review_count': review_count})

def reviews_list(request):
    reviews = Review.objects.select_related('user', 'place').annotate(
        review_count=Count('user__review')
    )
    return render(request, 'home.html', {'reviews': reviews}) 



def latest_reviews_view(request):
    reviews = Review.objects.select_related('user', 'place').annotate(
        review_count=Count('user__reviews')  # Annotating the number of reviews per user
    )
    # Debugging review counts in the console
    for review in reviews:
        print(f"User: {review.user.username}, Review Count: {review.review_count}")
    return render(request, 'home.html', {'reviews': reviews})



def assign_flagged_review(review):
    # Get a list of active moderators
    moderators = Moderator.objects.filter(is_active=True).annotate(
        assigned_count=Count('assigned_flags')
    )
    if not moderators.exists():
        return None  # No moderators available

    # Randomly pick a moderator with the least assigned flags
    selected_moderator = min(
        moderators, key=lambda moderator: moderator.assigned_count
    )

    # Assign the flagged review to the selected moderator
    flag = Flag.objects.filter(review=review).first()
    if flag:
        flag.moderator = selected_moderator
        flag.save()

    return selected_moderator


@login_required
def flag_review(request):
    if request.method == "POST":
        data = json.loads(request.body)
        review_id = data.get("review_id")
        reason = data.get("reason", "User flagged review")

        review = Review.objects.filter(id=review_id, flagged=False).first()
        if not review:
            return JsonResponse({"success": False, "error": "Review not found or already flagged."}, status=400)

        # Get all available moderators and randomly pick one
        moderators = list(Moderator.objects.all())
        if not moderators:
            return JsonResponse({"success": False, "error": "No moderators available to assign."}, status=400)

        assigned_moderator = random.choice(moderators)  # Randomly pick a moderator

        # Create the flag entry and save it with the assigned moderator
        flag, created = Flag.objects.get_or_create(review=review, defaults={"reason": reason, "moderator": assigned_moderator})

        if not created:
            return JsonResponse({"success": False, "error": "Review is already flagged."}, status=400)

        # Update the review status
        review.flagged = True
        review.save()

        return JsonResponse({"success": True, "message": f"Review flagged and assigned to {assigned_moderator.user.username}."})

    return JsonResponse({"success": False, "error": "Invalid request."}, status=400)