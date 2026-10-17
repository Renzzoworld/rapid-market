from django.db import connection


def rows(sql, params=()):
    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        names = [column[0] for column in cursor.description]
        return [dict(zip(names, row)) for row in cursor.fetchall()]


def one(sql, params=()):
    result = rows(sql, params)
    return result[0] if result else None
