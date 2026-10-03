from django.db import migrations


def repoint_admin_log_user(apps, schema_editor):
    connection = schema_editor.connection
    quote = connection.ops.quote_name
    with connection.cursor() as cursor:
        constraints = connection.introspection.get_constraints(
            cursor, "django_admin_log"
        )
        legacy_constraints = [
            name
            for name, details in constraints.items()
            if details.get("foreign_key") == ("usuarios", "id")
        ]

        for name in legacy_constraints:
            cursor.execute(
                f"ALTER TABLE {quote('django_admin_log')} "
                f"DROP CONSTRAINT {quote(name)}"
            )

        if legacy_constraints:
            User = apps.get_model("auth", "User")
            users = User.objects.using(connection.alias).values_list(
                "id", "username"
            )
            archived_ids = {}
            for auth_user_id, username in users:
                parts = username.split("_", 2)
                if len(parts) == 3 and parts[0] == "legacy" and parts[1].isdigit():
                    archived_ids[int(parts[1])] = auth_user_id

            cursor.execute(
                "SELECT DISTINCT user_id FROM django_admin_log"
            )
            old_user_ids = [row[0] for row in cursor.fetchall()]
            for old_user_id in old_user_ids:
                if old_user_id is None:
                    continue
                auth_user_id = archived_ids.get(old_user_id)
                if auth_user_id is None:
                    cursor.execute(
                        "SELECT 1 FROM auth_user WHERE id = %s",
                        [old_user_id],
                    )
                    if cursor.fetchone() is not None:
                        continue
                    raise RuntimeError(
                        "No se pudo asociar una entrada de django_admin_log "
                        f"con una cuenta Django (usuario antiguo {old_user_id})."
                    )
                cursor.execute(
                    "UPDATE django_admin_log SET user_id = %s WHERE user_id = %s",
                    [auth_user_id, old_user_id],
                )

        constraints = connection.introspection.get_constraints(
            cursor, "django_admin_log"
        )
        has_auth_user_fk = any(
            details.get("foreign_key") == ("auth_user", "id")
            for details in constraints.values()
        )
        if not has_auth_user_fk:
            cursor.execute(
                f"ALTER TABLE {quote('django_admin_log')} "
                "ADD CONSTRAINT django_admin_log_user_auth_user_fk "
                "FOREIGN KEY (user_id) REFERENCES auth_user(id) "
                "DEFERRABLE INITIALLY DEFERRED"
            )


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0004_move_legacy_users_to_django_auth"),
        ("admin", "0003_logentry_add_action_flag_choices"),
    ]

    operations = [
        migrations.RunPython(
            repoint_admin_log_user,
            migrations.RunPython.noop,
        ),
    ]
