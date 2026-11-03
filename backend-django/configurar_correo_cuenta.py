"""Registra o actualiza el correo asociado a una cuenta Rapid Market."""
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend_core.settings")
import django
django.setup()

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import validate_email


def main():
    username = input("Usuario de Rapid Market: ").strip()
    email = input("Correo al que esa persona puede acceder: ").strip()
    if not username:
        print("Debes indicar el usuario.")
        return
    try:
        validate_email(email)
    except ValidationError:
        print("Escribe una dirección de correo válida.")
        return
    User = get_user_model()
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        print("No existe una cuenta con ese usuario.")
        return
    user.email = email
    user.save(update_fields=["email"])
    print(f"Correo actualizado para {username}. Ya puede solicitar recuperación de contraseña.")


if __name__ == "__main__":
    main()
