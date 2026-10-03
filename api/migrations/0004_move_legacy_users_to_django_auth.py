from django.contrib.auth.hashers import make_password
from django.db import migrations


def move_legacy_accounts(apps, schema_editor):
    connection = schema_editor.connection
    existing_tables = set(connection.introspection.table_names())
    required_tables = {
        "usuarios",
        "roles",
        "compras",
        "gastos",
        "ventas",
        "auth_user",
        "auth_group",
    }
    missing_tables = required_tables - existing_tables
    if missing_tables:
        raise RuntimeError(
            "No se puede migrar la autenticación; faltan tablas: "
            + ", ".join(sorted(missing_tables))
        )

    User = apps.get_model("auth", "User")
    Group = apps.get_model("auth", "Group")

    with connection.cursor() as cursor:
        cursor.execute("SELECT id, nombre, activo FROM roles ORDER BY id")
        legacy_roles = cursor.fetchall()
        groups_by_role_id = {}
        for role_id, role_name, is_active in legacy_roles:
            group, _ = Group.objects.using(connection.alias).get_or_create(
                name=role_name
            )
            groups_by_role_id[role_id] = (group, is_active)

        cursor.execute(
            """
            SELECT id, username, nombre_completo, id_rol
            FROM usuarios
            ORDER BY id
            """
        )
        legacy_users = cursor.fetchall()

    user_id_map = {}
    for legacy_id, username, full_name, role_id in legacy_users:
        archived_prefix = f"legacy_{legacy_id}_"
        archived_username = archived_prefix + username[
            : 30 - len(archived_prefix)
        ]
        if User.objects.using(connection.alias).filter(
            username=archived_username
        ).exists():
            raise RuntimeError(
                f"Ya existe la cuenta de archivo {archived_username!r}; "
                "se detiene la migración para evitar asociar historial a otra cuenta."
            )

        first_name = (full_name or "")[:30]
        last_name = (full_name or "")[30:60]
        user = User(
            username=archived_username,
            password=make_password(None),
            first_name=first_name,
            last_name=last_name,
            is_active=False,
            is_staff=False,
            is_superuser=False,
        )
        user.save(using=connection.alias)
        user_id_map[legacy_id] = user.pk

        role = groups_by_role_id.get(role_id)
        if role and role[1]:
            user.groups.add(role[0])

    with connection.cursor() as cursor:
        for legacy_id, auth_user_id in user_id_map.items():
            for table in ("compras", "gastos", "ventas"):
                cursor.execute(
                    f"UPDATE {table} SET id_usuario = %s WHERE id_usuario = %s",
                    [auth_user_id, legacy_id],
                )

        cursor.execute("SELECT DISTINCT id_usuario FROM compras")
        unlinked_purchase_users = {
            row[0] for row in cursor.fetchall() if row[0] not in user_id_map.values()
        }
        cursor.execute("SELECT DISTINCT id_usuario FROM gastos")
        unlinked_expense_users = {
            row[0] for row in cursor.fetchall() if row[0] not in user_id_map.values()
        }
        cursor.execute("SELECT DISTINCT id_usuario FROM ventas")
        unlinked_sale_users = {
            row[0] for row in cursor.fetchall() if row[0] not in user_id_map.values()
        }
        if unlinked_purchase_users or unlinked_expense_users or unlinked_sale_users:
            raise RuntimeError(
                "Hay operaciones cuyo id_usuario no corresponde a una cuenta "
                "heredada. Se detiene la migración para preservar su historial."
            )

        cursor.execute("DELETE FROM usuarios")
        cursor.execute("DELETE FROM roles")


def create_api_permissions(apps, schema_editor):
    ContentType = apps.get_model("contenttypes", "ContentType")
    Permission = apps.get_model("auth", "Permission")
    content_type, _ = ContentType.objects.using(
        schema_editor.connection.alias
    ).get_or_create(app_label="api", model="rapidmarketaccess")

    permissions = (
        ("view_dashboard", "Can view dashboard"),
        ("view_inventory", "Can view inventory"),
        ("add_product", "Can add product"),
        ("change_product", "Can change product"),
    )
    for codename, name in permissions:
        Permission.objects.using(schema_editor.connection.alias).get_or_create(
            content_type=content_type,
            codename=codename,
            defaults={"name": name},
        )


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0003_remove_unused_django_table_models"),
        ("auth", "0012_alter_user_first_name_max_length"),
        ("contenttypes", "0002_remove_content_type_name"),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                "ALTER TABLE compras DROP CONSTRAINT IF EXISTS fk_compra_usuario",
                "ALTER TABLE gastos DROP CONSTRAINT IF EXISTS fk_gasto_usuario",
                "ALTER TABLE ventas DROP CONSTRAINT IF EXISTS fk_venta_usuario",
            ],
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunPython(move_legacy_accounts),
        migrations.RunSQL(
            sql=[
                """
                ALTER TABLE compras
                ADD CONSTRAINT fk_compra_auth_user
                FOREIGN KEY (id_usuario) REFERENCES auth_user(id)
                """,
                """
                ALTER TABLE gastos
                ADD CONSTRAINT fk_gasto_auth_user
                FOREIGN KEY (id_usuario) REFERENCES auth_user(id)
                """,
                """
                ALTER TABLE ventas
                ADD CONSTRAINT fk_venta_auth_user
                FOREIGN KEY (id_usuario) REFERENCES auth_user(id)
                """,
            ],
            reverse_sql=[
                "ALTER TABLE compras DROP CONSTRAINT IF EXISTS fk_compra_auth_user",
                "ALTER TABLE gastos DROP CONSTRAINT IF EXISTS fk_gasto_auth_user",
                "ALTER TABLE ventas DROP CONSTRAINT IF EXISTS fk_venta_auth_user",
            ],
        ),
        migrations.RunPython(create_api_permissions, migrations.RunPython.noop),
    ]
