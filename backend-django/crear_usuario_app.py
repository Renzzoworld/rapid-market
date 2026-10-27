"""Create a Rapid Market application user without echoing the password."""

import os
from getpass import getpass

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend_core.settings")

import django

django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction


def main():
    username = input("Usuario para Rapid Market: ").strip()
    full_name = input("Nombre completo: ").strip()

    if not username or len(username) > 150 or not full_name or len(full_name) > 150:
        print("El usuario es obligatorio (máximo 150 caracteres) y el nombre es obligatorio (máximo 150).")
        return

    role_choice = input("Rol de la cuenta (1 Administrador, 2 Vendedor) [1]: ").strip() or "1"
    groups = {
        "1": ("Administrador", "Acceso administrativo"),
        "2": ("Vendedor", "Acceso a ventas e inventario"),
    }
    if role_choice not in groups:
        print("Selecciona 1 para Administrador o 2 para Vendedor.")
        return
    role_name, _ = groups[role_choice]

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

    User = get_user_model()
    user = User(username=username, first_name=full_name)
    try:
        user.full_clean(exclude=["password", "last_login", "date_joined"])
        validate_password(password, user=user)
    except ValidationError as error:
        print(" ".join(error.messages))
        return
    with transaction.atomic():
        group, _ = Group.objects.get_or_create(name=role_name)
        user.set_password(password)
        user.is_staff = role_name == "Administrador"
        user.save()
        user.groups.add(group)

    print(f"Cuenta {role_name} creada. Ya puedes iniciar sesión en Rapid Market.")


if __name__ == "__main__":
    main()
