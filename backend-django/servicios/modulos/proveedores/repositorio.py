from django.db import connection

from ...compartido.repositorio_base import one, rows

PAGE_SIZE = 9


def listar_proveedores(page=1, search=""):
    termino = f"%{search}%"
    total = one("""
        SELECT COUNT(*) AS total
        FROM proveedores
        WHERE (%s = '' OR nombre ILIKE %s OR COALESCE(ruc, '') ILIKE %s
               OR contacto ILIKE %s OR telefono ILIKE %s OR email ILIKE %s)
    """, [search, termino, termino, termino, termino, termino])["total"]

    total_paginas = max((total + PAGE_SIZE - 1) // PAGE_SIZE, 1)
    page = min(page, total_paginas)

    resultados = rows("""
        SELECT id, nombre AS name, ruc, contacto AS contact,
               telefono AS phone, email, direccion AS address,
               logo, activo AS active
        FROM proveedores
        WHERE (%s = '' OR nombre ILIKE %s OR COALESCE(ruc, '') ILIKE %s
               OR contacto ILIKE %s OR telefono ILIKE %s OR email ILIKE %s)
        ORDER BY nombre
        LIMIT %s OFFSET %s
    """, [search, termino, termino, termino, termino, termino,
          PAGE_SIZE, (page - 1) * PAGE_SIZE])

    return {
        "results": resultados,
        "count": total,
        "page": page,
        "page_size": PAGE_SIZE,
    }


def obtener_proveedor(provider_id):
    return one("""
        SELECT id, nombre AS name, ruc, contacto AS contact,
               telefono AS phone, email, direccion AS address,
               logo, activo AS active
        FROM proveedores
        WHERE id = %s
    """, [provider_id])


def guardar_proveedor(data):
    with connection.cursor() as cursor:
        cursor.execute("""
            INSERT INTO proveedores
                (nombre, ruc, contacto, telefono, email, direccion, logo, activo)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, [
            data["name"], data.get("ruc") or None, data.get("contact", ""),
            data.get("phone", ""), data.get("email", ""),
            data.get("address", ""), data.get("logo", ""),
            data.get("active", True),
        ])
        provider_id = cursor.fetchone()[0]
    return obtener_proveedor(provider_id)