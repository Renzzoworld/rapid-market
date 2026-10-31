from django.db import migrations


def copiar_canales_de_proveedor(apps, schema_editor):
    Channel = apps.get_model('api', 'CanalesProveedor')
    SupplierData = apps.get_model('api', 'DatosProveedor')
    database = schema_editor.connection.alias
    records = []
    for channel in Channel.objects.using(database).filter(medio__in=['telefono', 'whatsapp', 'correo']).iterator():
        records.append(SupplierData(
            proveedor_id=channel.proveedor_id,
            tipo='correo' if channel.medio == 'correo' else 'telefono',
            valor=channel.valor,
        ))
    SupplierData.objects.using(database).bulk_create(records, ignore_conflicts=True)


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0010_detallecompras_nombre_producto_snapshot'),
    ]

    operations = [
        migrations.RunPython(copiar_canales_de_proveedor, migrations.RunPython.noop),
    ]
