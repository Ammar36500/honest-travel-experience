from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('travel', '0017_remove_review_destination_review_moderated_and_more'),  # The app name and previous migration
    ]

    operations = [
        migrations.AddField(
            model_name='destination',
            name='country',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]