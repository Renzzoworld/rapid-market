from rest_framework import serializers

from ...models import (
    CanalesProveedor, ContactosProveedor, DatosContactoProveedor,
    HorariosContacto, HorariosProveedor,
)


class HorarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = HorariosContacto
        fields = ['id', 'dia_semana', 'hora_inicio', 'hora_fin']
        read_only_fields = ['id']

    def validate(self, attrs):
        inicio = attrs.get('hora_inicio', getattr(self.instance, 'hora_inicio', None))
        fin = attrs.get('hora_fin', getattr(self.instance, 'hora_fin', None))
        if inicio and fin and fin <= inicio:
            raise serializers.ValidationError('La hora final debe ser posterior a la inicial.')
        return attrs


class HorarioProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = HorariosProveedor
        fields = ['dia_semana', 'hora_inicio', 'hora_fin']

    def validate(self, attrs):
        if attrs['hora_fin'] <= attrs['hora_inicio']:
            raise serializers.ValidationError('La hora final debe ser posterior a la inicial.')
        return attrs


class DatoContactoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatosContactoProveedor
        fields = ['id', 'tipo', 'valor']
        read_only_fields = ['id']

    def validate(self, attrs):
        tipo, valor = attrs.get('tipo'), attrs.get('valor', '').strip()
        if tipo == 'correo':
            serializers.EmailField().run_validation(valor)
        if tipo == 'telefono' and not (7 <= len(valor) <= 30):
            raise serializers.ValidationError({'valor': 'El teléfono debe tener entre 7 y 30 caracteres.'})
        attrs['valor'] = valor
        return attrs


class ContactoProveedorSerializer(serializers.ModelSerializer):
    horarios = HorarioSerializer(many=True, required=False)
    datos_contacto = DatoContactoSerializer(many=True, required=False)
    cargo_nombre = serializers.CharField(source='cargo.nombre', read_only=True)

    class Meta:
        model = ContactosProveedor
        fields = ['id', 'nombre', 'cargo', 'cargo_nombre', 'cargo_otro', 'direccion', 'activo', 'horarios', 'datos_contacto']
        read_only_fields = ['id', 'cargo_nombre']

    def validate(self, attrs):
        cargo = attrs.get('cargo', getattr(self.instance, 'cargo', None))
        cargo_otro = attrs.get('cargo_otro', getattr(self.instance, 'cargo_otro', ''))
        if cargo and cargo.nombre.lower() == 'otros' and not cargo_otro.strip():
            raise serializers.ValidationError({'cargo_otro': 'Especifica el cargo.'})
        datos = attrs.get('datos_contacto')
        tiene_dato = bool(datos) if datos is not None else bool(self.instance and self.instance.datos_contacto.exists())
        if not tiene_dato:
            raise serializers.ValidationError({'datos_contacto': 'Registra al menos un teléfono o correo.'})
        horarios = attrs.get('horarios')
        if horarios is not None:
            por_dia = {}
            for h in horarios:
                por_dia.setdefault(h['dia_semana'], []).append((h['hora_inicio'], h['hora_fin']))
            for intervalos in por_dia.values():
                intervalos.sort()
                if any(sig[0] < ant[1] for ant, sig in zip(intervalos, intervalos[1:])):
                    raise serializers.ValidationError({'horarios': 'Los horarios del mismo día no pueden solaparse.'})
        return attrs

    def _guardar_relaciones(self, instance, validated_data):
        horarios = validated_data.pop('horarios', None)
        datos = validated_data.pop('datos_contacto', None)
        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)
        instance.save()
        if horarios is not None:
            instance.horarios.all().delete()
            HorariosContacto.objects.bulk_create([HorariosContacto(contacto=instance, **h) for h in horarios])
        if datos is not None:
            instance.datos_contacto.all().delete()
            DatosContactoProveedor.objects.bulk_create([DatosContactoProveedor(contacto=instance, **d) for d in datos])
        return instance

    def create(self, validated_data):
        return self._guardar_relaciones(ContactosProveedor(proveedor=self.context['proveedor']), validated_data)

    def update(self, instance, validated_data):
        return self._guardar_relaciones(instance, validated_data)


class CanalProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = CanalesProveedor
        fields = ['id', 'medio', 'valor', 'departamento', 'departamento_otro', 'red_social', 'red_social_otro', 'activo']
        read_only_fields = ['id']

    def validate(self, attrs):
        medio = attrs.get('medio', getattr(self.instance, 'medio', ''))
        depto = attrs.get('departamento', getattr(self.instance, 'departamento', None))
        depto_otro = attrs.get('departamento_otro', getattr(self.instance, 'departamento_otro', ''))
        red = attrs.get('red_social', getattr(self.instance, 'red_social', None))
        red_otro = attrs.get('red_social_otro', getattr(self.instance, 'red_social_otro', ''))
        valor = attrs.get('valor', getattr(self.instance, 'valor', '')).strip()
        if medio in {'telefono', 'whatsapp'} and not (7 <= len(valor) <= 30):
            raise serializers.ValidationError({'valor': 'Ingresa un número válido (7 a 30 caracteres).'})
        if medio == 'correo':
            serializers.EmailField().run_validation(valor)
        if medio in {'web', 'red_social'}:
            from urllib.parse import urlsplit
            parsed = urlsplit(valor)
            if parsed.scheme not in {'http', 'https'} or not parsed.hostname or parsed.username or parsed.password:
                raise serializers.ValidationError({'valor': 'Ingresa una URL http o https válida.'})
        if depto and depto.nombre.lower() == 'otros' and not depto_otro.strip():
            raise serializers.ValidationError({'departamento_otro': 'Especifica el departamento.'})
        if medio in {'telefono', 'whatsapp', 'correo'} and not depto:
            raise serializers.ValidationError({'departamento': 'Selecciona el departamento de atención.'})
        if medio == 'red_social' and red and red.nombre.lower() == 'otros' and not red_otro.strip():
            raise serializers.ValidationError({'red_social_otro': 'Especifica la red social.'})
        if medio == 'red_social' and not red:
            raise serializers.ValidationError({'red_social': 'Selecciona una red social.'})
        if medio != 'red_social' and red:
            raise serializers.ValidationError({'red_social': 'Solo aplica para redes sociales.'})
        attrs['valor'] = valor
        return attrs
