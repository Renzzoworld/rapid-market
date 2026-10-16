"""Reset a Rapid Market account password securely from the local console."""

import os
from getpass import getpass

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend_core.settings")

import django

django.setup()

from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import connection


def main():
    username = input("Usuario de Rapid Market: ").strip()
    password = getpass("Nueva contraseña (12 caracteres o más): ")
    confirmation = getpass("Repite la contraseña: ")
    if len(password) < 12 or len(password) > 256:
        print("La contraseña debe tener entre 12 y 256 caracteres.")
        return
    if password != confirmation:
        print("Las contraseñas no coinciden.")
        return
    try:
        validate_password(password)
    except ValidationError as error:
        print(" ".join(error.messages))
        return
    with connection.cursor() as cursor:
        cursor.execute(
            "UPDATE usuarios SET password_hash=%s WHERE username=%s",
            [make_password(password), username],
        )
        if cursor.rowcount != 1:
            print("No se encontró una cuenta con ese usuario.")
            return
    print("Contraseña actualizada y guardada como hash.")


if __name__ == "__main__":
    main()
