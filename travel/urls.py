from django.urls import path
from . import views
from django.contrib.auth import views as auth_views
from .views import submit_review

urlpatterns = [
    path("", views.home, name="home"),  # Home page
    path("destinations/", views.destinations, name="destinations"),  # Destinations page
    path("submit-review/", views.submit_review, name="submit_review"),
    path('profile/', views.profile_view, name='profile'),
    path("about/", views.about, name="about"),  # About page
    path("contact/", views.contact, name="contact"),  # Contact page
    path("login/", views.login_view, name="login"),
    path("logout/", auth_views.LogoutView.as_view(next_page="home"), name="logout"),
    path('register/', views.register_view, name='register'),
    path('update-profile-picture/', views.update_profile_picture, name='update_profile_picture'),
   path("api/places/", views.api_places, name="api_places"),
    path('search-results/', views.search_results, name='search_results'),
    path('review/place/<int:place_id>/', views.review_place, name='review_place'),
    path('submit-review/<int:place_id>/', views.submit_place_review, name='submit_place_review'),
    path('review-action/', views.review_action, name='review_action'),
    path('moderator-dashboard/', views.moderator_dashboard, name='moderator_dashboard'),
    path("moderate-review/<int:review_id>/", views.moderate_review, name="moderate_review"),
    path('user/<int:user_id>/review-count/', views.user_review_count, name='user_review_count'),


]