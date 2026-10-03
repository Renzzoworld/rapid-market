from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0002_repair_missing_auth_user_table"),
    ]

    operations = [
        migrations.DeleteModel(name="AuthGroup"),
        migrations.DeleteModel(name="AuthGroupPermissions"),
        migrations.DeleteModel(name="AuthPermission"),
        migrations.DeleteModel(name="DjangoAdminLog"),
        migrations.DeleteModel(name="DjangoContentType"),
        migrations.DeleteModel(name="DjangoMigrations"),
        migrations.DeleteModel(name="DjangoSession"),
        migrations.DeleteModel(name="Roles"),
        migrations.DeleteModel(name="Usuarios"),
    ]
