from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import UserProfile

@admin.register(UserProfile)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('bio', 'gender', 'profile_picture', 'location')}),
    )
    list_display = UserAdmin.list_display + ('bio', 'gender', 'location')