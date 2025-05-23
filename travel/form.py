from django import forms # Django forms module.
from django.contrib.auth.forms import UserCreationForm # Base form for user creation.
from .models import UserProfile # UserProfile model.
from .models import Review # Review model.


class LoginForm(forms.Form): # Login form, inherits from Django's Form.
    username = forms.CharField(max_length=150, required=True) # Username field, required.
    password = forms.CharField(widget=forms.PasswordInput, required=True) # Password field, uses PasswordInput widget, required.

class SignupForm(forms.ModelForm): # Signup form, inherits from ModelForm.
    username = forms.CharField(max_length=150, required=True) # Username field, required.
    full_name = forms.CharField(max_length=150, required=True) # Full name field, required.
    password = forms.CharField(widget=forms.PasswordInput, required=True) # Password field, uses PasswordInput widget, required.
    terms_accepted = forms.BooleanField( # Terms acceptance field.
        required=True, # Field is mandatory.
        label="I agree to the Terms of Service and User Agreement", # Display label.
        widget=forms.CheckboxInput(attrs={'class': 'form-check-input'})) # Checkbox widget with CSS class.

    class Meta: # Metadata for the ModelForm.
        model = UserProfile # Model for this form.
        fields = ['username', 'full_name', 'email', 'password'] # Model fields in the form.

    def save(self, commit=True): # Overrides save() to hash password.
        user = super().save(commit=False) # Call parent save(), don't commit yet.
        user.set_password(self.cleaned_data['password'])  # Hash the password.
        if commit: # If commit is true.
            user.save() # Save user to DB.
        return user # Return user instance.

class ReviewForm(forms.ModelForm): # Review form, inherits from ModelForm.
    class Meta: # Metadata for the ModelForm.
        model = Review # Model for this form.
        fields = ['title', 'content', 'rating', 'place', 'moderated', 'flagged'] # Model fields in the form.
