from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import UserProfile


class LoginForm(forms.Form):
    username = forms.CharField(max_length=150, required=True)
    password = forms.CharField(widget=forms.PasswordInput, required=True)

class SignupForm(forms.ModelForm):
    username = forms.CharField(max_length=150, required=True)
    full_name = forms.CharField(max_length=150, required=True)
    password = forms.CharField(widget=forms.PasswordInput, required=True)

    class Meta:
        model = UserProfile
        fields = ['username', 'full_name', 'email', 'password']

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data['password'])  # Hash the password
        if commit:
            user.save()
        return user
