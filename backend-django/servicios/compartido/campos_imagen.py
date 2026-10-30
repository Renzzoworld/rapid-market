from pathlib import Path
import warnings

from PIL import Image, UnidentifiedImageError
from rest_framework import serializers


class ImagenValidadaField(serializers.ImageField):
    """
    Valida la imagen real usando Pillow, además del tamaño y las dimensiones.
    Se puede reutilizar en serializers de distintos módulos.
    """

    MAX_BYTES = 2 * 1024 * 1024
    MIN_WIDTH = 300
    MIN_HEIGHT = 300
    MAX_WIDTH = 1200
    MAX_HEIGHT = 1200

    EXTENSIONES_POR_FORMATO = {
        "JPEG": {".jpg", ".jpeg"},
        "PNG": {".png"},
        "WEBP": {".webp"},
    }

    def to_internal_value(self, data):
        # Comprueba el tamaño antes de que Pillow procese el archivo.
        if getattr(data, "size", 0) > self.MAX_BYTES:
            raise serializers.ValidationError(
                "La imagen no puede superar los 2 MB."
            )

        # ImageField de DRF también usa la validación de imagen de Django/Pillow.
        archivo = super().to_internal_value(data)
        extension = Path(archivo.name).suffix.lower()

        try:
            archivo.seek(0)

            # Trata como error las imágenes de dimensiones desmesuradas que
            # Pillow señala con DecompressionBombWarning.
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)

                with Image.open(archivo) as imagen:
                    formato_real = imagen.format
                    ancho, alto = imagen.size

                    if formato_real not in self.EXTENSIONES_POR_FORMATO:
                        raise serializers.ValidationError(
                            "Solo se permiten imágenes JPEG, PNG o WebP."
                        )

                    extensiones_validas = self.EXTENSIONES_POR_FORMATO[formato_real]
                    if extension not in extensiones_validas:
                        raise serializers.ValidationError(
                            "La extensión del archivo no coincide con el formato real de la imagen."
                        )

                    if ancho < self.MIN_WIDTH or alto < self.MIN_HEIGHT:
                        raise serializers.ValidationError(
                            "La imagen debe medir al menos 300 × 300 píxeles."
                        )

                    if ancho > self.MAX_WIDTH or alto > self.MAX_HEIGHT:
                        raise serializers.ValidationError(
                            "La imagen no puede superar 1200 × 1200 píxeles."
                        )

                    # Comprueba la estructura del archivo.
                    imagen.verify()

                # verify() requiere volver al inicio antes de decodificar.
                archivo.seek(0)
                with Image.open(archivo) as imagen:
                    imagen.load()

        except serializers.ValidationError:
            raise
        except (
            UnidentifiedImageError,
            Image.DecompressionBombError,
            Image.DecompressionBombWarning,
            OSError,
            SyntaxError,
            ValueError,
        ) as error:
            raise serializers.ValidationError(
                "El archivo no es una imagen válida o está dañado."
            ) from error
        finally:
            # Deja el archivo listo para que el almacenamiento lo lea después.
            archivo.seek(0)

        return archivo