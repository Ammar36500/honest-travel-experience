from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import UserProfile

@admin.register(UserProfile) # Registers UserProfile model 
class CustomUserAdmin(UserAdmin): # Defines a custom admin interface for UserProfile
    fieldsets = UserAdmin.fieldsets + ( # Extends the default fields displayed in the user edit/add form
        (None, {'fields': ('bio', 'gender', 'profile_picture', 'location')}), # Adds a new section with custom profile fields
    )
    list_display = UserAdmin.list_display + ('bio', 'gender', 'location') # Adds custom fields to the user list view in admin