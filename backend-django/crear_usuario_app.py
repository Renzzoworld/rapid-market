"""Create a Rapid Market application user without echoing the password."""

import os
from getpass import getpass

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend_core.settings")

import django

django.setup()

from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import connection, transaction


def main():
    username = input("Usuario para Rapid Market: ").strip()
    full_name = input("Nombre completo: ").strip()

    if not username or len(username) > 50 or not full_name or len(full_name) > 150:
        print("El usuario es obligatorio (máximo 50 caracteres) y el nombre es obligatorio (máximo 150).")
        return

    role_choice = input("Rol de la cuenta (1 Administrador, 2 Vendedor) [1]: ").strip() or "1"
    roles = {
        "1": ("Administrador", "Acceso administrativo"),
        "2": ("Vendedor", "Acceso a ventas e inventario"),
    }
    if role_choice not in roles:
        print("Selecciona 1 para Administrador o 2 para Vendedor.")
        return
    role_name, role_description = roles[role_choice]

    password = getpass("Contraseña nueva (no se mostrará): ")
    confirmation = getpass("Repite la contraseña: ")

    if len(password) < 12 or len(password) > 256:
        print("Usa una contraseña de al menos 12 caracteres.")
        return
    if password != confirmation:
        print("Las contraseñas no coinciden.")
        return
    try:
        validate_password(password)
    except ValidationError as error:
        print(" ".join(error.messages))
        return

    with transaction.atomic():
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT id FROM usuarios WHERE username = %s",
                [username],
            )
            if cursor.fetchone():
                print("Ese usuario ya existe; no se hicieron cambios.")
                return

            cursor.execute("SELECT id,activo FROM roles WHERE nombre = %s", [role_name])
            role = cursor.fetchone()
            if role is None:
                cursor.execute(
                    "INSERT INTO roles (nombre, descripcion, activo) "
                    "VALUES (%s, %s, TRUE) RETURNING id",
                    [role_name, role_description],
                )
                role = cursor.fetchone()
            elif not role[1]:
                print("Ese rol está desactivado. Actívalo antes de crear una cuenta con ese rol.")
                return

            cursor.execute(
                "INSERT INTO usuarios "
                "(username, password_hash, nombre_completo, id_rol, activo) "
                "VALUES (%s, %s, %s, %s, TRUE)",
                [username, make_password(password), full_name, role[0]],
            )

    print(f"Cuenta {role_name} creada. Ya puedes iniciar sesión en Rapid Market.")


if __name__ == "__main__":
    main()
