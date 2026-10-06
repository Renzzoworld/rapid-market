# DER resumido de Rapid Market

Esta versión separa el DER en tres vistas para que las tablas y las relaciones se vean grandes al abrir la vista previa de Markdown. Las cajas que aparecen en más de una vista representan la misma tabla real; se repiten solo para que el dibujo sea más fácil de leer.

## 1. Ventas e inventario

```mermaid
flowchart LR
    U[USUARIOS] -->|1 a muchos| V[VENTAS]
    TV[TIPOS_VENTA] -->|1 a muchos| V
    MP[METODOS_PAGO] -->|1 a muchos| V
    V -->|1 a muchos| DV[DETALLE_VENTAS]
    P[PRODUCTOS] -->|1 a muchos| DV
    UM[UNIDADES_MEDIDA] -->|1 a muchos| P
    DV -->|1 a muchos| DVL[DETALLE_VENTA_LOTES]
    L[LOTES] -->|1 a muchos| DVL
```

## 2. Compras e ingreso al inventario

```mermaid
flowchart LR
    U[USUARIOS] -->|1 a muchos| C[COMPRAS]
    PV[PROVEEDORES] -->|1 a muchos| C
    EC[ESTADOS_COMPRA] -->|1 a muchos| C
    C -->|1 a muchos| DC[DETALLE_COMPRAS]
    P[PRODUCTOS] -->|1 a muchos| DC
    UM[UNIDADES_MEDIDA] -->|1 a muchos| P
    DC -->|1 a muchos| L[LOTES]
```

## 3. Usuarios y gastos

```mermaid
flowchart LR
    R[ROLES] -->|1 a muchos| U[USUARIOS]
    U -->|1 a muchos| G[GASTOS]
    CG[CATEGORIAS_GASTO] -->|1 a muchos| G
```

### Cómo abrirlo grande en VS Code

1. Abre este archivo y pulsa `Ctrl + Shift + V` para mostrar la vista previa.
2. Usa el panel de vista previa para cada diagrama; cada uno ocupa menos espacio que el DER completo.
3. Si tu VS Code permite zoom de Mermaid, puedes hacer clic en un diagrama y acercarlo. También puedes abrir la vista previa al costado con `Ctrl + K`, soltar esas teclas y luego pulsar `V`.

Las relaciones muestran cardinalidad simplificada: `1 a muchos` significa que una fila de la primera tabla puede relacionarse con varias filas de la segunda. El diagrama detallado, con columnas y claves, está en `DER_Y_MODELO_ESTRELLA.md`.
