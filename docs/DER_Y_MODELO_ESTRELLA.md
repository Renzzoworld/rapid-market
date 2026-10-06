# DER y modelo estrella de Rapid Market

Este documento describe dos perspectivas distintas de la base de datos:

- **DER operativo:** representa las tablas relacionales que usa actualmente la aplicación para registrar compras, inventario, ventas y gastos.
- **Modelo estrella propuesto:** organiza esos datos para consultas y reportes analíticos. Es una propuesta de almacén de datos; sus tablas no existen todavía en PostgreSQL.

El DER se preparó a partir de `backend-martin/database_schema_pg16.sql`, que el README indica para PostgreSQL 16. Se incluyen las 16 tablas del negocio. Las tablas internas de Django (sesiones, migraciones y permisos) se omiten porque no representan operaciones de Rapid Market.

## 1. DER actual de la aplicación

```mermaid
erDiagram
    ROLES {
        int id PK
        string nombre UK
        string descripcion
        boolean activo
    }
    USUARIOS {
        int id PK
        string username UK
        string password_hash
        string nombre_completo
        int id_rol FK
        boolean activo
        datetime created_at
    }
    UNIDADES_MEDIDA {
        int id PK
        string nombre UK
        string abreviatura UK
    }
    PRODUCTOS {
        int id PK
        string nombre UK
        int id_unidad FK
        decimal precio_venta
        boolean perecible
        decimal stock_minimo
        boolean activo
    }
    PROVEEDORES {
        int id PK
        string nombre UK
        boolean activo
    }
    ESTADOS_COMPRA {
        int id PK
        string nombre UK
    }
    COMPRAS {
        int id PK
        datetime fecha
        int id_proveedor FK
        int id_estado FK
        int id_usuario FK
    }
    DETALLE_COMPRAS {
        int id PK
        int id_compra FK
        int id_producto FK
        decimal cantidad
        decimal precio_unitario
    }
    LOTES {
        int id PK
        int id_detalle_compra FK
        decimal cantidad_inicial
        decimal cantidad_actual
        date fecha_vencimiento
    }
    TIPOS_VENTA {
        int id PK
        string nombre UK
        decimal descuento_porcentaje
        boolean activo
    }
    METODOS_PAGO {
        int id PK
        string nombre UK
        boolean activo
    }
    VENTAS {
        int id PK
        datetime fecha
        int id_usuario FK
        int id_tipo_venta FK
        int id_metodo_pago FK
    }
    DETALLE_VENTAS {
        int id PK
        int id_venta FK
        int id_producto FK
        decimal cantidad
        decimal precio_unitario
    }
    DETALLE_VENTA_LOTES {
        int id PK
        int id_detalle_venta FK
        int id_lote FK
        decimal cantidad
    }
    CATEGORIAS_GASTO {
        int id PK
        string nombre UK
    }
    GASTOS {
        int id PK
        datetime fecha
        string descripcion
        int id_categoria FK
        decimal monto
        int id_usuario FK
    }

    ROLES ||--o{ USUARIOS : asigna
    UNIDADES_MEDIDA ||--o{ PRODUCTOS : mide
    PROVEEDORES ||--o{ COMPRAS : suministra
    ESTADOS_COMPRA ||--o{ COMPRAS : clasifica
    USUARIOS ||--o{ COMPRAS : registra
    COMPRAS ||--o{ DETALLE_COMPRAS : contiene
    PRODUCTOS ||--o{ DETALLE_COMPRAS : se_compra
    DETALLE_COMPRAS ||--o{ LOTES : origina
    USUARIOS ||--o{ VENTAS : registra
    TIPOS_VENTA ||--o{ VENTAS : clasifica
    METODOS_PAGO ||--o{ VENTAS : cobra
    VENTAS ||--o{ DETALLE_VENTAS : contiene
    PRODUCTOS ||--o{ DETALLE_VENTAS : se_vende
    DETALLE_VENTAS ||--o{ DETALLE_VENTA_LOTES : se_descuenta_de
    LOTES ||--o{ DETALLE_VENTA_LOTES : aporta_stock
    CATEGORIAS_GASTO ||--o{ GASTOS : clasifica
    USUARIOS ||--o{ GASTOS : registra
```

### Cómo leer el DER

- `PK` identifica la clave primaria de una tabla; `FK` identifica una referencia a otra tabla; `UK` indica un valor único.
- Por ejemplo, una compra tiene proveedor, estado y usuario; además, puede tener varios renglones en `detalle_compras`.
- Una línea de venta puede consumir stock de uno o varios lotes. `detalle_venta_lotes` registra esa distribución y permite calcular el costo de lo vendido a partir del costo de compra de cada lote.
- La base no guarda un total separado en la cabecera de compra o venta: se obtiene sumando cantidad por precio unitario en sus detalles.
- En `detalle_ventas`, `precio_unitario` guarda el precio aplicado al vender (el backend lo calcula con el descuento del tipo de venta). El porcentaje elegido está en `tipos_venta`.
- La relación de un detalle de compra con los lotes permite varios lotes en el esquema, aunque el flujo actual normalmente crea uno por detalle.

## 2. Modelo estrella propuesto para reportes

Para analizar ventas, compras y gastos se propone un **esquema de constelación**: son tres estrellas que comparten dimensiones, cada una con el nivel de detalle apropiado para su operación. Esto evita mezclar en una sola tabla hechos que tienen significados y granularidades distintas.

```mermaid
erDiagram
    DIM_FECHA {
        int fecha_key PK
        date fecha
        int dia
        int mes
        string nombre_mes
        int trimestre
        int anio
    }
    DIM_PRODUCTO {
        int producto_key PK
        int id_producto_origen
        string nombre
        string unidad
        boolean perecible
        boolean activo
    }
    DIM_USUARIO {
        int usuario_key PK
        int id_usuario_origen
        string username
        string nombre
        string rol
    }
    DIM_TIPO_VENTA {
        int tipo_venta_key PK
        int id_tipo_origen
        string nombre
        decimal descuento_porcentaje
    }
    DIM_METODO_PAGO {
        int metodo_pago_key PK
        int id_metodo_origen
        string nombre
    }
    DIM_PROVEEDOR {
        int proveedor_key PK
        int id_proveedor_origen
        string nombre
    }
    DIM_ESTADO_COMPRA {
        int estado_compra_key PK
        int id_estado_origen
        string nombre
    }
    DIM_CATEGORIA_GASTO {
        int categoria_gasto_key PK
        int id_categoria_origen
        string nombre
    }
    FACT_VENTA_LINEA {
        int fecha_key FK
        int producto_key FK
        int usuario_key FK
        int tipo_venta_key FK
        int metodo_pago_key FK
        int id_detalle_venta_origen
        decimal cantidad
        decimal precio_unitario_neto
        decimal venta_neta
        decimal costo_vendido
        decimal margen_bruto
    }
    FACT_COMPRA_LINEA {
        int fecha_key FK
        int producto_key FK
        int usuario_key FK
        int proveedor_key FK
        int estado_compra_key FK
        int id_detalle_compra_origen
        decimal cantidad
        decimal costo_unitario
        decimal importe_linea
    }
    FACT_GASTO {
        int fecha_key FK
        int usuario_key FK
        int categoria_gasto_key FK
        int id_gasto_origen
        decimal monto
    }

    DIM_FECHA ||--o{ FACT_VENTA_LINEA : fecha_venta
    DIM_PRODUCTO ||--o{ FACT_VENTA_LINEA : producto_vendido
    DIM_USUARIO ||--o{ FACT_VENTA_LINEA : vendedor
    DIM_TIPO_VENTA ||--o{ FACT_VENTA_LINEA : tipo
    DIM_METODO_PAGO ||--o{ FACT_VENTA_LINEA : pago
    DIM_FECHA ||--o{ FACT_COMPRA_LINEA : fecha_compra
    DIM_PRODUCTO ||--o{ FACT_COMPRA_LINEA : producto_comprado
    DIM_USUARIO ||--o{ FACT_COMPRA_LINEA : usuario_compra
    DIM_PROVEEDOR ||--o{ FACT_COMPRA_LINEA : proveedor
    DIM_ESTADO_COMPRA ||--o{ FACT_COMPRA_LINEA : estado
    DIM_FECHA ||--o{ FACT_GASTO : fecha_gasto
    DIM_USUARIO ||--o{ FACT_GASTO : usuario_gasto
    DIM_CATEGORIA_GASTO ||--o{ FACT_GASTO : categoria
```

### Granularidad y medidas

| Tabla de hechos | Una fila representa | Medidas principales | Origen en la base actual |
|---|---|---|---|
| `FACT_VENTA_LINEA` | Un producto dentro de una venta (`detalle_ventas`) | Cantidad, venta neta, costo vendido y margen bruto | `ventas`, `detalle_ventas` y el costo asignado mediante `detalle_venta_lotes` → `lotes` → `detalle_compras` |
| `FACT_COMPRA_LINEA` | Un producto dentro de una compra (`detalle_compras`) | Cantidad, costo unitario e importe de línea | `compras` y `detalle_compras` |
| `FACT_GASTO` | Un gasto registrado (`gastos`) | Monto | `gastos` |

Fórmulas sugeridas:

- **Venta neta** = `detalle_ventas.cantidad × detalle_ventas.precio_unitario`.
- **Costo vendido** = suma de `detalle_venta_lotes.cantidad × detalle_compras.precio_unitario` para los lotes asignados a esa línea.
- **Margen bruto** = venta neta − costo vendido. Los gastos se analizan aparte; para estimar el resultado después de gastos se restan de la suma del margen bruto en el período.
- **Importe de compra** = `detalle_compras.cantidad × detalle_compras.precio_unitario`.

### Dimensiones compartidas

- `DIM_FECHA` permite agrupar y filtrar por día, mes, trimestre o año. Se relaciona con cada hecho usando la fecha propia de esa operación.
- `DIM_PRODUCTO` permite comparar ventas y compras por artículo y unidad de medida.
- `DIM_USUARIO` permite analizar quién registró ventas, compras o gastos. El rol se conserva como atributo para segmentar los resultados.
- Proveedor y estado aplican a compras; tipo de venta y método de pago, a ventas; categoría, a gastos.

## 3. Consideraciones antes de implementarlo

1. Este modelo estrella es una **propuesta analítica**, no una modificación de las tablas que usa el sistema. Puede implementarse después en tablas de reporte o en una base de datos separada.
2. Para que el costo y el margen de cada venta sean confiables, todas las cantidades vendidas deben estar asignadas a lotes. Si falta una asignación, se debe marcar el costo como incompleto y no presentar el margen como definitivo.
3. La venta neta sí queda almacenada por línea. Para conservar también el porcentaje y monto exactos de descuento históricos si luego cambia la configuración del tipo de venta, conviene guardar esos valores aplicados en la venta o en su detalle.
4. La base actual mantiene la cantidad actual por lote, pero no guarda una fotografía diaria del inventario. Para analizar cómo variaba el stock en el pasado habría que empezar a registrar una tabla de hechos de inventario periódico (por ejemplo, una fila por producto y día).
