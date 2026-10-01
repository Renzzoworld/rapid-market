from django.db import migrations


def create_missing_auth_user_table(apps, schema_editor):
    user_model = apps.get_model("auth", "User")
    table_name = user_model._meta.db_table
    existing_tables = schema_editor.connection.introspection.table_names()

    if table_name not in existing_tables:
        schema_editor.create_model(user_model)


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0001_initial"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.RunPython(
            create_missing_auth_user_table,
            migrations.RunPython.noop,
        ),
    ]