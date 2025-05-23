import os # Imports the operating system module
from celery import Celery # Imports the Celery class for creating Celery applications.

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ReviewTravel.settings") # Sets the default Django settings module for Celery.
app = Celery("ReviewTravel") # Creates a Celery application instance named "ReviewTravel".
app.config_from_object("django.conf:settings", namespace="CELERY") # Loads Celery configuration from Django settings
app.autodiscover_tasks() # Automatically discovers tasks in Django apps 

