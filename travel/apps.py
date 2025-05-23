from django.apps import AppConfig # Imports the AppConfig class for application configuration.


class TravelConfig(AppConfig): # Defines a configuration class for the 'travel' app.
    default_auto_field = 'django.db.models.BigAutoField' # Sets the default type for auto-created primary key fields.
    name = 'travel' # Specifies the name of the application.

