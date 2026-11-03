"""Guarda la contraseña de aplicación de Gmail sin mostrarla en pantalla."""
from getpass import getpass
from pathlib import Path
import re

ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


def main():
    if not ENV_FILE.exists():
        print("No encuentro el archivo .env en la carpeta principal del proyecto.")
        return
    app_password = "".join(getpass("Pega la contraseña de aplicación de Google (no se mostrará): ").split())
    if len(app_password) != 16:
        print("La contraseña de aplicación debe tener 16 caracteres. No se guardó ningún cambio.")
        return
    content = ENV_FILE.read_text(encoding="utf-8")
    pattern = r"(?m)^EMAIL_HOST_PASSWORD=.*$"
    replacement = f"EMAIL_HOST_PASSWORD={app_password}"
    if re.search(pattern, content):
        content = re.sub(pattern, lambda _: replacement, content, count=1)
    else:
        if content and not content.endswith(("\n", "\r")):
            content += "\n"
        content += replacement + "\n"
    ENV_FILE.write_text(content, encoding="utf-8")
    print("Contraseña de aplicación guardada en .env. No se mostró en pantalla.")
    print("Reinicia el servidor Django para cargar la configuración.")


if __name__ == "__main__":
    main()
