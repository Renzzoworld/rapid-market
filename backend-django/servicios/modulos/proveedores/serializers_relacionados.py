from rest_framework import serializers

from ...models import CanalesProveedor, ContactosProveedor, HorariosContacto


class HorarioContactoSerializer(serializers.ModelSerializer):
    class Meta:
        model = HorariosContacto
        fields = ['id', 'dia_semana', 'hora_inicio', 'hora_fin']
        read_only_fields = ['id']

    def validate(self, attrs):
        inicio = attrs.get(
            'hora_inicio',
            getattr(self.instance, 'hora_inicio', None),
        )
        fin = attrs.get(
            'hora_fin',
            getattr(self.instance, 'hora_fin', None),
        )

        if inicio and fin and fin <= inicio:
            raise serializers.ValidationError(
                'La hora de fin debe ser posterior a la hora de inicio.'
            )
        return attrs


class ContactoProveedorSerializer(serializers.ModelSerializer):
    horarios = HorarioContactoSerializer(many=True, required=False)

    class Meta:
        model = ContactosProveedor
        fields = [
            'id', 'nombre', 'cargo', 'email', 'telefono', 'activo', 'horarios',
        ]
        read_only_fields = ['id']

    def validate_horarios(self, horarios):
        # Evita intervalos que se solapen para el mismo día.
        por_dia = {}
        for horario in horarios:
            dia = horario['dia_semana']
            por_dia.setdefault(dia, []).append(
                (horario['hora_inicio'], horario['hora_fin'])
            )

        for intervalos in por_dia.values():
            intervalos.sort()
            for anterior, siguiente in zip(intervalos, intervalos[1:]):
                if siguiente[0] < anterior[1]:
                    raise serializers.ValidationError(
                        'Los horarios del mismo día no pueden solaparse.'
                    )
        return horarios

    def create(self, validated_data):
        horarios = validated_data.pop('horarios', [])
        contacto = ContactosProveedor.objects.create(
            proveedor=self.context['proveedor'],
            **validated_data,
        )
        HorariosContacto.objects.bulk_create([
            HorariosContacto(contacto=contacto, **horario)
            for horario in horarios
        ])
        return contacto

    def update(self, instance, validated_data):
        horarios = validated_data.pop('horarios', None)

        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)
        instance.save()

        # Si el cliente envía "horarios", reemplaza el horario completo.
        # Si no envía esa propiedad, conserva los horarios actuales.
        if horarios is not None:
            instance.horarios.all().delete()
            HorariosContacto.objects.bulk_create([
                HorariosContacto(contacto=instance, **horario)
                for horario in horarios
            ])
        return instance


class CanalProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = CanalesProveedor
        fields = [
            'id', 'contacto', 'nombre', 'medio', 'valor', 'funcion', 'activo',
        ]
        read_only_fields = ['id']

    def validate_contacto(self, contacto):
        proveedor = self.context['proveedor']
        if contacto and contacto.proveedor_id != proveedor.id:
            raise serializers.ValidationError(
                'El contacto debe pertenecer a este proveedor.'
            )
        return contacto