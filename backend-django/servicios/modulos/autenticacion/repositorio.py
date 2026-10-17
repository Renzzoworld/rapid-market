from django.db import connection


def usuario_por_nombre(username):
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT u.id, u.username, u.nombre_completo, u.password_hash, u.activo, u.id_rol, r.nombre "
            "FROM usuarios u JOIN roles r ON r.id=u.id_rol WHERE u.username = %s AND r.activo=true",
            [username],
        )
        return cursor.fetchone()


def usuario_por_id(user_id):
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT u.id, u.username, u.nombre_completo, u.activo, u.id_rol, r.nombre "
            "FROM usuarios u JOIN roles r ON r.id=u.id_rol WHERE u.id = %s AND r.activo=true",
            [user_id],
        )
        return cursor.fetchone()
