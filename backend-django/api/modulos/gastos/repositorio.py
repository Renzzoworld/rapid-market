from django.db import connection

from ...compartido.repositorio_base import one, rows

PAGE_SIZE = 10


def expense_category_exists(category_id):
    return one("SELECT id FROM categorias_gasto WHERE id=%s", [category_id]) is not None


def create_expense(description, category_id, amount, user_id):
    with connection.cursor() as cursor:
        cursor.execute("INSERT INTO gastos (descripcion,id_categoria,monto,id_usuario) VALUES (%s,%s,%s,%s) RETURNING id", [description, category_id, amount, user_id])
        return cursor.fetchone()[0]


def get_expense(expense_id):
    return one("""SELECT g.id,g.fecha,g.descripcion AS description,g.monto AS amount,
        g.id_categoria AS category_id,c.nombre AS category FROM gastos g
        JOIN categorias_gasto c ON c.id=g.id_categoria WHERE g.id=%s""", [expense_id])




def list_expense_page(page=1, search=""):
    search_term = f"%{search}%"
    count = one("""
        SELECT COUNT(*) AS total
        FROM gastos g
        JOIN categorias_gasto c ON c.id = g.id_categoria
        WHERE (%s = '' OR g.id::text ILIKE %s OR g.fecha::date::text ILIKE %s
               OR g.descripcion ILIKE %s OR c.nombre ILIKE %s OR g.monto::text ILIKE %s)
    """, [search, search_term, search_term, search_term, search_term, search_term])["total"]
    page = min(page, max((count + PAGE_SIZE - 1) // PAGE_SIZE, 1))
    expenses = rows("""
        SELECT g.id,g.fecha,g.descripcion AS description,g.monto AS amount,
               g.id_categoria AS category_id,c.nombre AS category
        FROM gastos g
        JOIN categorias_gasto c ON c.id=g.id_categoria
        WHERE (%s = '' OR g.id::text ILIKE %s OR g.fecha::date::text ILIKE %s
               OR g.descripcion ILIKE %s OR c.nombre ILIKE %s OR g.monto::text ILIKE %s)
        ORDER BY g.fecha DESC,g.id DESC
        LIMIT %s OFFSET %s
    """, [search, search_term, search_term, search_term, search_term, search_term,
          PAGE_SIZE, (page - 1) * PAGE_SIZE])
    return {"results": expenses, "count": count, "page": page, "page_size": PAGE_SIZE}
