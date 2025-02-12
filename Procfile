web: gunicorn ReviewTravel.wsgi --log-file - 
#or works good with external database
web: python manage.py migrate && gunicorn ReviewTravel.wsgi
web: gunicorn ReviewTravel.wsgi:application
