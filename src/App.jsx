import { useEffect, useState } from "react";
import "./App.css";

// URL base usada por las peticiones de autenticacion del frontend.
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

function App() {
  // ===== LOGIN FRONTEND: INICIO =====
  // Estado de sesion, credenciales del formulario y token JWT en memoria.
  const [logueado, setLogueado] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [errorLogin, setErrorLogin] = useState("");
  const [accessToken, setAccessToken] = useState("");

  // Envia las credenciales a Django y abre la aplicacion si recibe un JWT.
  const iniciarSesion = async (e) => {
    e.preventDefault();
    setErrorLogin("");

    try {
      const response = await fetch(`${API_URL}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usuario, password }),
      });

      if (!response.ok) {
        setErrorLogin("Usuario o contraseña incorrectos");
        return;
      }

      const data = await response.json();
      setAccessToken(data.access);
      setLogueado(true);
    } catch {
      setErrorLogin("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    }
  };

  // Limpia la sesion local y devuelve al formulario de acceso.
  const cerrarSesion = () => {
    setLogueado(false);
    setAccessToken("");
    setUsuario("");
    setPassword("");
    setSeccion("inicio");
  };
  // ===== LOGIN FRONTEND: FIN =====

  // Navegacion de las secciones principales de la aplicacion.
  const [seccion, setSeccion] = useState("inicio");

  // Filtros de la sección de reportes, separados de Dashboard e Inventario.
  const [tipoReporte, setTipoReporte] = useState("ventas");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  // ===== DASHBOARD FRONTEND: INICIO =====
  // Estado y consulta protegida del resumen al abrir la pantalla principal.
  const [dashboardResumen, setDashboardResumen] = useState({
    total_productos: 0,
    productos_stock_bajo: [],
    ventas_acumuladas: 0,
    ganancia_estimada: 0,
    ventas_por_fecha: [],
    ventas_recientes: [],
  });
  const [cargandoDashboard, setCargandoDashboard] = useState(false);
  const [errorDashboard, setErrorDashboard] = useState("");

  useEffect(() => {
    if (!logueado || seccion !== "inicio" || !accessToken) return undefined;

    const controller = new AbortController();
    const cargarDashboard = async () => {
      setCargandoDashboard(true);
      setErrorDashboard("");

      try {
        const response = await fetch(`${API_URL}/dashboard/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("No se pudo cargar el resumen del dashboard.");
        }

        setDashboardResumen(await response.json());
      } catch (error) {
        if (error.name !== "AbortError") {
          setErrorDashboard(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoDashboard(false);
        }
      }
    };

    cargarDashboard();
    return () => controller.abort();
  }, [logueado, seccion, accessToken]);
  // ===== DASHBOARD FRONTEND: FIN =====

  // ===== INVENTORY FRONTEND: INICIO =====
  // Incluye carga autenticada del API, estado de productos y controles del módulo.
  const [inventarioResumen, setInventarioResumen] = useState({
    total_productos: 0,
    stock_bajo: 0,
    productos: [],
  });
  const [cargandoInventario, setCargandoInventario] = useState(false);
  const [errorInventario, setErrorInventario] = useState("");

  useEffect(() => {
    if (!logueado || seccion !== "inventario" || !accessToken) return undefined;

    const controller = new AbortController();
    const cargarInventario = async () => {
      setCargandoInventario(true);
      setErrorInventario("");

      try {
        const response = await fetch(`${API_URL}/inventario/`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("No se pudo cargar el inventario.");
        }

        const data = await response.json();
        setInventarioResumen({
          ...data,
          productos: data.productos.map((producto) => ({
            ...producto,
            esDatosApi: true,
          })),
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          setErrorInventario(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoInventario(false);
        }
      }
    };

    cargarInventario();
    return () => controller.abort();
  }, [logueado, seccion, accessToken]);
  // Estado inicial local que aún utilizan los flujos no conectados al API.
  const [productos, setProductos] = useState([
    {
      id: 1,
      nombre: "Arroz Faraón",
      cantidad: 20,
      unidad: "kg",
      precio: 5.5,
      precioCompra: 4.5,
      precioVenta: 5.5,
      perecible: true,
      lotes: [],
    },
    {
      id: 2,
      nombre: "Azúcar rubia",
      cantidad: 8,
      unidad: "kg",
      precio: 5.2,
      precioCompra: 4.2,
      precioVenta: 5.2,
      perecible: true,
      lotes: [],
    },
    {
      id: 3,
      nombre: "Leche",
      cantidad: 22,
      unidad: "unidad",
      precio: 5.0,
      precioCompra: 4.0,
      precioVenta: 5.0,
      perecible: true,
      lotes: [],
    },
    {
      id: 4,
      nombre: "Bolsas de basura",
      cantidad: 2,
      unidad: "paquete",
      precio: 9.0,
      precioCompra: 8.0,
      precioVenta: 9.0,
      perecible: false,
      lotes: [],
    },
    {
      id: 5,
      nombre: "Papel higiénico",
      cantidad: 5,
      unidad: "paquete",
      precio: 13.0,
      precioCompra: 12.0,
      precioVenta: 13.0,
      perecible: false,
      lotes: [],
    },
    {
      id: 6,
      nombre: "Fideos",
      cantidad: 15,
      unidad: "paquete",
      precio: 4.5,
      precioCompra: 3.5,
      precioVenta: 4.5,
      perecible: true,
      lotes: [],
    },
    {
      id: 7,
      nombre: "Carbón",
      cantidad: 15,
      unidad: "kg",
      precio: 6.0,
      precioCompra: 5.0,
      precioVenta: 6.0,
      perecible: false,
      lotes: [],
    },
  ]);

  const [busqueda, setBusqueda] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [productoInventarioSeleccionado, setProductoInventarioSeleccionado] =
    useState(null);

  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "",
    cantidad: "",
    unidad: "und",
    precio: "",
    perecible: null,
  });
  // ===== INVENTORY FRONTEND: FIN =====

  const [busquedaVentas, setBusquedaVentas] = useState("");
  const [busquedaCompras, setBusquedaCompras] = useState("");
  const [busquedaGastos, setBusquedaGastos] = useState("");

  // =========================
  // VENTAS
  // =========================
  const [ventas, setVentas] = useState([
    {
      idVenta: 4,
      fecha: "11/09/2026",
      producto: "Azúcar rubia",
      cantidad: 17,
      tipo: "Minorista",
      pago: "Efectivo",
      total: 88.4,
    },
    {
      idVenta: 3,
      fecha: "10/09/2026",
      producto: "Fideos",
      cantidad: 10,
      tipo: "Mayorista",
      pago: "Plin",
      total: 42.75,
    },
    {
      idVenta: 2,
      fecha: "09/09/2026",
      producto: "Leche",
      cantidad: 3,
      tipo: "Minorista",
      pago: "Efectivo",
      total: 15.0,
    },
    {
      idVenta: 1,
      fecha: "08/09/2026",
      producto: "Arroz Faraón",
      cantidad: 5,
      tipo: "Minorista",
      pago: "Yape",
      total: 27.5,
    },
  ]);

  const [mostrarVenta, setMostrarVenta] = useState(false);

  const [nuevaVenta, setNuevaVenta] = useState({
    productoId: "",
    cantidad: 1,
    tipo: "Minorista",
    pago: "Efectivo",
  });
  const [busquedaProductoVenta, setBusquedaProductoVenta] = useState("");
  const [carritoVenta, setCarritoVenta] = useState([]);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  // =========================
  // COMPRAS
  // =========================
  const [compras, setCompras] = useState([
    {
      idCompra: 4,
      fecha: "07/09/2026",
      proveedor: "Abarrotes Lima",
      costo: 200.0,
      estado: "Entregado",
      lotes: [
        {
          idLote: 4,
          fecha: "07/09/2026",
          producto: "Bolsas de basura",
          cantidad: 25,
          cantidadInicial: 25,
          cantidadActual: 2,
          precioUnitario: 8.0,
          precioCompraUnitario: 8.0,
          subtotal: 200.0,
          perecible: false,
          fechaVencimiento: "",
        },
      ],
    },
    {
      idCompra: 3,
      fecha: "07/09/2026",
      proveedor: "Abarrotes Lima",
      costo: 105.0,
      estado: "Entregado",
      lotes: [
        {
          idLote: 3,
          fecha: "07/09/2026",
          producto: "Azúcar rubia",
          cantidad: 25,
          cantidadInicial: 25,
          cantidadActual: 8,
          precioUnitario: 4.2,
          precioCompraUnitario: 4.2,
          subtotal: 105.0,
          perecible: true,
          fechaVencimiento: "15/03/2027",
        },
      ],
    },
    {
      idCompra: 2,
      fecha: "05/09/2026",
      proveedor: "Proveedor de abarrotes",
      costo: 112.5,
      estado: "Entregado",
      lotes: [
        {
          idLote: 2,
          fecha: "05/09/2026",
          producto: "Arroz Faraón",
          cantidad: 25,
          cantidadInicial: 25,
          cantidadActual: 20,
          precioUnitario: 4.5,
          precioCompraUnitario: 4.5,
          subtotal: 112.5,
          perecible: true,
          fechaVencimiento: "05/03/2027",
        },
      ],
    },
    {
      idCompra: 1,
      fecha: "04/09/2026",
      proveedor: "Distribuidora Lima",
      costo: 100.0,
      estado: "Entregado",
      lotes: [
        {
          idLote: 1,
          fecha: "04/09/2026",
          producto: "Leche",
          cantidad: 25,
          cantidadInicial: 25,
          cantidadActual: 22,
          precioUnitario: 4.0,
          precioCompraUnitario: 4.0,
          subtotal: 100.0,
          perecible: true,
          fechaVencimiento: "20/10/2026",
        },
      ],
    },
  ]);

  const [mostrarCompra, setMostrarCompra] = useState(false);
  const [compraSeleccionada, setCompraSeleccionada] = useState(null);
  const [compraVerificando, setCompraVerificando] = useState(null);
  const [compraCancelando, setCompraCancelando] = useState(null);
  const [fechasVencimiento, setFechasVencimiento] = useState({});
  const proveedores = [
    "Proveedor de abarrotes",
    "Abarrotes Lima",
    "Distribuidora Lima",
  ];

  const [nuevaCompra, setNuevaCompra] = useState({
    proveedor: "",
    productoId: "",
    cantidad: 1,
    precioUnitario: "",
  });
  const [busquedaProveedorCompra, setBusquedaProveedorCompra] = useState("");
  const [busquedaProductoCompra, setBusquedaProductoCompra] = useState("");
  const [carritoCompra, setCarritoCompra] = useState([]);

  // =========================
  // GASTOS
  // =========================
  const [gastos, setGastos] = useState([
    {
      id: 1,
      fecha: "06/09/2026",
      descripcion: "Transporte",
      categoria: "Operativo",
      monto: 15.0,
    },
    {
      id: 2,
      fecha: "05/09/2026",
      descripcion: "Servicio de luz",
      categoria: "Servicios",
      monto: 80.0,
    },
  ]);

  const [mostrarGasto, setMostrarGasto] = useState(false);

  const [nuevoGasto, setNuevoGasto] = useState({
    descripcion: "",
    categoria: "Operativo",
    monto: "",
  });

  // =========================
  // INVENTARIO - NUEVO
  // =========================
const abrirNuevoProducto = () => {
  setProductoEditando(null);

  setNuevoProducto({
    nombre: "",
    unidad: "und",
    precio: "",
    perecible: null,
  });

  setMostrarFormulario(true);
};

  // =========================
  // INVENTARIO - EDITAR
  // =========================
  const abrirEditarProducto = (producto) => {
    setProductoEditando(producto);

    setNuevoProducto({
      nombre: producto.nombre,
      unidad: producto.unidad,
      precio: producto.precio,
      perecible: producto.perecible ?? false,
});

    setMostrarFormulario(true);
  };

  // =========================
  // INVENTARIO - GUARDAR
  // =========================
  const guardarProducto = async (e) => {
    e.preventDefault();

    if (
      !nuevoProducto.nombre ||
      nuevoProducto.precio === "" ||
      typeof nuevoProducto.perecible !== "boolean"
    ) {
      alert("Completa todos los campos y selecciona si es perecible.");
      return;
    }

if (Number(nuevoProducto.precio) <= 0) {
  alert("El precio debe ser mayor que 0.");
  return;
}
if (productoEditando) {
    try {
      const response = await fetch(
        `${API_URL}/inventario/${productoEditando.id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            nombre: nuevoProducto.nombre,
            unidad: nuevoProducto.unidad,
            precio: nuevoProducto.precio,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        alert(data.detail || "No se pudieron guardar los cambios.");
        return;
      }

      setInventarioResumen((resumen) => ({
        ...resumen,
        productos: resumen.productos
          .map((producto) =>
            producto.id === data.id
              ? { ...producto, ...data }
              : producto
          )
          .sort((productoA, productoB) =>
            productoA.nombre.localeCompare(productoB.nombre, "es")
          ),
      }));
      setProductos((productosActuales) =>
        productosActuales.map((producto) =>
          producto.id === data.id
            ? {
                ...producto,
                nombre: data.nombre,
                unidad: data.unidad,
                precio: data.precio,
                precioVenta: data.precio,
              }
            : producto
        )
      );
    } catch {
      alert("No se pudo conectar con el servidor. Inténtalo de nuevo.");
      return;
    }
} else {
  try {
    const response = await fetch(`${API_URL}/inventario/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        nombre: nuevoProducto.nombre,
        unidad: nuevoProducto.unidad,
        precio: nuevoProducto.precio,
        perecible: nuevoProducto.perecible,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      alert(data.detail || "No se pudo registrar el producto.");
      return;
    }

    const nuevo = { ...data, esDatosApi: true };
    setInventarioResumen((resumen) => ({
      ...resumen,
      total_productos: resumen.total_productos + 1,
      stock_bajo:
        resumen.stock_bajo + (nuevo.estado === "disponible" ? 0 : 1),
      productos: [...resumen.productos, nuevo].sort((productoA, productoB) =>
        productoA.nombre.localeCompare(productoB.nombre, "es")
      ),
    }));
  } catch {
    alert("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    return;
  }
}

    setMostrarFormulario(false);

    setNuevoProducto({
      nombre: "",
      cantidad: 0,
      unidad: "und",
      precio: "",
      perecible: null,
    });

    setProductoEditando(null);
  };

  // =========================
  // INVENTARIO - ELIMINAR
  // =========================
  const eliminarProducto = (id) => {
    const producto = productos.find((p) => p.id === id);

    const confirmar = window.confirm(
      `¿Estás seguro de eliminar "${producto.nombre}"?`
    );

    if (confirmar) {
      setProductos(productos.filter((producto) => producto.id !== id));
    }
  };

  const productosFiltrados = inventarioResumen.productos.filter((producto) =>
    producto.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const productosVentaFiltrados = productos.filter((producto) =>
    producto.nombre
      .toLowerCase()
      .includes(busquedaProductoVenta.toLowerCase())
  );

  const proveedoresFiltrados = proveedores.filter((proveedor) =>
    proveedor.toLowerCase().includes(busquedaProveedorCompra.toLowerCase())
  );

  const productosCompraFiltrados = productos.filter((producto) =>
    producto.nombre.toLowerCase().includes(busquedaProductoCompra.toLowerCase())
  );

  const productoSeleccionadoCompra = productos.find(
    (producto) => producto.id === Number(nuevaCompra.productoId)
  );

  const totalCarritoCompra = carritoCompra.reduce(
    (total, item) => total + item.precioUnitario * item.cantidad,
    0
  );

  const productoSeleccionadoVenta = productos.find(
    (producto) => producto.id === Number(nuevaVenta.productoId)
  );
  const factorPrecioVenta = nuevaVenta.tipo === "Mayorista" ? 0.95 : 1;
  const totalCarritoVenta = carritoVenta.reduce(
    (total, item) =>
      total + item.precio * factorPrecioVenta * item.cantidad,
    0
  );

  const agregarProductoVenta = () => {
    const producto = productos.find(
      (p) => p.id === Number(nuevaVenta.productoId)
    );
    const cantidad = Number(nuevaVenta.cantidad);
    const productoEnCarrito = carritoVenta.find(
      (item) => item.id === producto?.id
    );

    if (!producto) {
      alert("Selecciona un producto.");
      return;
    }

    if (cantidad <= 0) {
      alert("La cantidad debe ser mayor que 0.");
      return;
    }

    if (
      productoEnCarrito &&
      productoEnCarrito.cantidad + cantidad > producto.cantidad
    ) {
      alert("No hay suficiente stock disponible para agregar esa cantidad.");
      return;
    }

    if (!productoEnCarrito && cantidad > producto.cantidad) {
      alert("No hay suficiente stock disponible.");
      return;
    }

    setCarritoVenta(
      productoEnCarrito
        ? carritoVenta.map((item) =>
            item.id === producto.id
              ? { ...item, cantidad: item.cantidad + cantidad }
              : item
          )
        : [
            ...carritoVenta,
            {
              id: producto.id,
              nombre: producto.nombre,
              cantidad,
              precio: producto.precio,
            },
          ]
    );
    setNuevaVenta({
      ...nuevaVenta,
      productoId: "",
      cantidad: 1,
    });
    setBusquedaProductoVenta("");
  };

  const agregarProductoCompra = () => {
    const producto = productos.find(
      (p) => p.id === Number(nuevaCompra.productoId)
    );
    const cantidad = Number(nuevaCompra.cantidad);
    const precioUnitario = Number(nuevaCompra.precioUnitario);

    if (!producto) {
      alert("Selecciona un producto.");
      return;
    }

    if (cantidad <= 0 || precioUnitario <= 0) {
      alert("Cantidad y precio unitario deben ser mayores que 0.");
      return;
    }

    setCarritoCompra([
      ...carritoCompra,
      {
        id: producto.id,
        nombre: producto.nombre,
        cantidad,
        precioUnitario,
        perecible: producto.perecible,
      },
    ]);
    setNuevaCompra({
      ...nuevaCompra,
      productoId: "",
      cantidad: 1,
      precioUnitario: "",
    });
    setBusquedaProductoCompra("");
  };

  const cambiarCantidadProductoCompra = (indice, cambio) => {
    setCarritoCompra(
      carritoCompra.map((item, itemIndex) =>
        itemIndex === indice
          ? { ...item, cantidad: Math.max(1, item.cantidad + cambio) }
          : item
      )
    );
  };

  const cambiarCantidadProductoVenta = (productoId, cambio) => {
    setCarritoVenta(
      carritoVenta
        .map((item) =>
          item.id === productoId
            ? { ...item, cantidad: item.cantidad + cambio }
            : item
        )
        .filter((item) => item.cantidad > 0)
    );
  };

  const obtenerProductosVenta = (venta) =>
    venta.productos || [
      {
        id: venta.id,
        nombre: venta.producto,
        cantidad: venta.cantidad,
        precio: venta.total / venta.cantidad,
      },
    ];

  const obtenerCodigoCompra = (compra) =>
    `CPA-${compra.idCompra ?? Number(String(compra.id).replace("CPA-", ""))}`;

  const obtenerCodigoLote = (lote) =>
    `LT-${lote.idLote ?? Number(String(lote.id).replace("LT-", ""))}`;

  const obtenerLotesCompra = (compra) =>
    compra.lotes || [
      {
        idLote: Number(
          String(compra.idCompra ?? compra.id).replace("CPA-", "")
        ),
        fecha: compra.fecha,
        producto: compra.producto,
        cantidad: compra.cantidad,
        precioUnitario: compra.costo / compra.cantidad,
        subtotal: compra.costo,
        perecible: false,
        fechaVencimiento: "",
      },
    ];

  const obtenerEstadoCompra = (compra) =>
    compra.estado || "Pendiente de entrega";

  const obtenerCodigoVenta = (venta) =>
    `VT-${venta.idVenta ?? Number(String(venta.id).replace("VT-", ""))}`;

  const ventasOrdenadas = [...ventas].sort((ventaA, ventaB) => {
    const fechaA = new Date(ventaA.fecha.split("/").reverse().join("-"));
    const fechaB = new Date(ventaB.fecha.split("/").reverse().join("-"));
    return (
      fechaB - fechaA +
      ((ventaB.idVenta ?? 0) - (ventaA.idVenta ?? 0))
    );
  });
  const ventasFiltradas = ventasOrdenadas.filter((venta) =>
    [obtenerCodigoVenta(venta), venta.fecha, venta.producto, venta.tipo, venta.pago]
      .join(" ")
      .toLowerCase()
      .includes(busquedaVentas.toLowerCase())
  );

  const comprasOrdenadas = [...compras].sort((compraA, compraB) => {
    const fechaA = new Date(compraA.fecha.split("/").reverse().join("-"));
    const fechaB = new Date(compraB.fecha.split("/").reverse().join("-"));
    return (
      fechaB - fechaA +
      ((compraB.idCompra ?? 0) - (compraA.idCompra ?? 0))
    );
  });

  const comprasFiltradas = comprasOrdenadas.filter((compra) =>
    [
      obtenerCodigoCompra(compra),
      compra.fecha,
      compra.proveedor,
      obtenerEstadoCompra(compra),
      ...obtenerLotesCompra(compra).map((lote) => lote.producto),
    ]
      .join(" ")
      .toLowerCase()
      .includes(busquedaCompras.toLowerCase())
  );

  const gastosFiltrados = gastos.filter((gasto) =>
    [gasto.id, gasto.fecha, gasto.descripcion, gasto.categoria, gasto.monto]
      .join(" ")
      .toLowerCase()
      .includes(busquedaGastos.toLowerCase())
  );

  const prepararLoteInventario = (lote, compra, producto) => ({
    ...lote,
    idCompra: compra.idCompra,
    idProducto: producto.id,
    fechaCompra: lote.fechaCompra || lote.fecha,
    cantidadInicial: lote.cantidadInicial ?? lote.cantidad,
    cantidadActual: lote.cantidadActual ?? lote.cantidad,
    precioCompraUnitario: lote.precioCompraUnitario ?? lote.precioUnitario,
  });

  const calcularTotalCompra = (compra) =>
    obtenerLotesCompra(compra).reduce(
      (total, lote) => total + lote.precioUnitario * lote.cantidad,
      0
    );

  const obtenerLotesProducto = (producto) => {
    const lotesRegistrados = (producto.lotes || []).map((lote) => ({
      ...lote,
      idProducto: producto.id,
      fechaCompra: lote.fechaCompra || lote.fecha,
      cantidadInicial: lote.cantidadInicial ?? lote.cantidad,
      cantidadActual: lote.cantidadActual ?? lote.cantidad,
      precioCompraUnitario: lote.precioCompraUnitario ?? lote.precioUnitario,
    }));

    if (producto.esDatosApi) return lotesRegistrados;

    return lotesRegistrados.concat(
      compras
      .filter((compra) => obtenerEstadoCompra(compra) === "Entregado")
      .flatMap((compra) =>
        obtenerLotesCompra(compra)
          .filter((lote) => lote.producto === producto.nombre)
            .map((lote) => ({
              ...prepararLoteInventario(lote, compra, producto),
              ordenCompra: obtenerCodigoCompra(compra),
            }))
      )
    );
    };

  const siguienteLoteCompra =
    Math.max(
      ...compras.flatMap((compraRegistrada) =>
        obtenerLotesCompra(compraRegistrada).map((lote) =>
          lote.idLote ?? Number(String(lote.id).replace("LT-", ""))
        )
      ),
      0
    ) + 1;

  // =========================
  // VENTAS - REGISTRAR
  // =========================
  const registrarVenta = (e) => {
    e.preventDefault();

    if (carritoVenta.length === 0) {
      alert("Agrega al menos un producto a la venta.");
      return;
    }

    const carritoValido = carritoVenta.every((item) => {
      const producto = productos.find((p) => p.id === item.id);
      return producto && item.cantidad > 0 && item.cantidad <= producto.cantidad;
    });

    if (!carritoValido) {
      alert("Revisa las cantidades: no hay suficiente stock disponible.");
      return;
    }

    const productosRegistrados = carritoVenta.map((item) => ({
      ...item,
      precio:
        nuevaVenta.tipo === "Mayorista" ? item.precio * 0.95 : item.precio,
    }));
    const total = productosRegistrados.reduce(
      (suma, item) => suma + item.precio * item.cantidad,
      0
    );

    const venta = {
      idVenta:
        Math.max(
          ...ventas.map((ventaRegistrada) =>
            ventaRegistrada.idVenta ??
            Number(String(ventaRegistrada.id).replace("VT-", ""))
          ),
          0
        ) + 1,
      fecha: new Date().toLocaleDateString("es-PE"),
      productos: productosRegistrados,
      producto: productosRegistrados[0].nombre,
      cantidad: productosRegistrados.reduce(
        (suma, item) => suma + item.cantidad,
        0
      ),
      cantidadProductos: productosRegistrados.length,
      tipo: nuevaVenta.tipo,
      pago: nuevaVenta.pago,
      total: total,
    };

    setVentas([venta, ...ventas]);

    // Descontar stock general
setProductos(
  productos.map((producto) => {
    const item = carritoVenta.find(
      (linea) => linea.id === producto.id
    );

    if (!item) {
      return producto;
    }

    return {
      ...producto,
      cantidad: producto.cantidad - item.cantidad,
    };
  })
);

// Actualizar cantidad de los lotes usando FIFO
const cantidadesRestantes = {};

carritoVenta.forEach((item) => {
  cantidadesRestantes[item.id] = item.cantidad;
});

// Obtener todos los lotes entregados y ordenarlos del más antiguo al más reciente
const lotesDisponibles = compras
  .filter((compra) => obtenerEstadoCompra(compra) === "Entregado")
  .flatMap((compra) =>
    (compra.lotes || []).map((lote) => ({
      idCompra: compra.idCompra,
      idLote: lote.idLote,
      producto: lote.producto,
      fechaCompra: lote.fechaCompra || lote.fecha,
      cantidadActual: Number(
        lote.cantidadActual ?? lote.cantidad ?? 0
      ),
    }))
  )
  .sort((a, b) => {
    const fechaA = new Date(
      a.fechaCompra.split("/").reverse().join("-")
    );

    const fechaB = new Date(
      b.fechaCompra.split("/").reverse().join("-")
    );

    const diferenciaFecha = fechaA - fechaB;

    if (diferenciaFecha !== 0) {
      return diferenciaFecha;
    }

    return (
      Number(String(a.idCompra).replace("CPA-", "")) -
      Number(String(b.idCompra).replace("CPA-", ""))
    );
  });

// Determinar cuánto descontar de cada lote
const descuentosPorLote = {};

lotesDisponibles.forEach((lote) => {
  const producto = productos.find(
    (p) => p.nombre === lote.producto
  );

  if (!producto) {
    return;
  }

  const cantidadRestante =
    cantidadesRestantes[producto.id] || 0;

  if (
    cantidadRestante <= 0 ||
    lote.cantidadActual <= 0
  ) {
    return;
  }

  const cantidadDescontar = Math.min(
    lote.cantidadActual,
    cantidadRestante
  );

  descuentosPorLote[
    `${lote.idCompra}-${lote.idLote}`
  ] = cantidadDescontar;

  cantidadesRestantes[producto.id] -= cantidadDescontar;
});

// Aplicar los descuentos a los lotes correspondientes
setCompras(
  compras.map((compra) => ({
    ...compra,
    lotes: (compra.lotes || []).map((lote) => {
      const clave = `${compra.idCompra}-${lote.idLote}`;
      const descuento = descuentosPorLote[clave] || 0;

      if (descuento === 0) {
        return lote;
      }

      const cantidadActual = Number(
        lote.cantidadActual ?? lote.cantidad ?? 0
      );

      return {
        ...lote,
        cantidadActual: cantidadActual - descuento,
      };
    }),
  }))
);

    setNuevaVenta({
      productoId: "",
      cantidad: 1,
      tipo: "Minorista",
      pago: "Efectivo",
    });
    setCarritoVenta([]);
    setBusquedaProductoVenta("");

    setMostrarVenta(false);
  };

  // =========================
  // COMPRAS - REGISTRAR
  // =========================
  const registrarCompra = (e) => {
    e.preventDefault();

    if (!nuevaCompra.proveedor || carritoCompra.length === 0) {
      alert("Selecciona un proveedor y agrega al menos un producto.");
      return;
    }

    const siguienteOrden =
      Math.max(
        ...compras.map((compraRegistrada) =>
          compraRegistrada.idCompra ??
          Number(String(compraRegistrada.id).replace("CPA-", ""))
        ),
        0
      ) + 1;
    const siguienteLote =
      Math.max(
        ...compras.flatMap((compraRegistrada) =>
          obtenerLotesCompra(compraRegistrada).map((lote) =>
            lote.idLote ?? Number(String(lote.id).replace("LT-", ""))
          )
        ),
        0
      ) + 1;
    const fecha = new Date().toLocaleDateString("es-PE");
    const compra = {
      idCompra: siguienteOrden,
      fecha,
      proveedor: nuevaCompra.proveedor,
      costo: totalCarritoCompra,
      lotes: carritoCompra.map((item, indice) => ({
        idLote: siguienteLote + indice,
        fecha,
        producto: item.nombre,
        cantidad: item.cantidad,
        cantidadInicial: item.cantidad,
        cantidadActual: item.cantidad,
        precioUnitario: item.precioUnitario,
        precioCompraUnitario: item.precioUnitario,
        subtotal: item.precioUnitario * item.cantidad,
        perecible: item.perecible,
        fechaVencimiento: "",
        idProducto: item.id,
        fechaCompra: fecha,
      })),
      estado: "Pendiente de entrega",
    };

    setCompras([compra, ...compras]);

    setNuevaCompra({
      proveedor: "",
      productoId: "",
      cantidad: 1,
      precioUnitario: "",
    });
    setBusquedaProveedorCompra("");
    setBusquedaProductoCompra("");
    setCarritoCompra([]);

    setMostrarCompra(false);
  };

  const validarCompra = () => {
    if (!compraVerificando) return;

    const lotes = obtenerLotesCompra(compraVerificando);
    const faltaVencimiento = lotes.some(
      (lote) =>
        lote.perecible &&
        !(fechasVencimiento[lote.idLote] || lote.fechaVencimiento)
    );

    if (faltaVencimiento) {
      alert("Agrega la fecha de vencimiento de cada producto perecible.");
      return;
    }

    setCompras(
      compras.map((compra) =>
        compra.idCompra === compraVerificando.idCompra
          ? {
              ...compra,
              estado: "Entregado",
              lotes: lotes.map((lote) => ({
                ...lote,
                fechaVencimiento:
                  fechasVencimiento[lote.idLote] || lote.fechaVencimiento || "",
              })),
            }
          : compra
      )
    );

    setProductos(
      productos.map((producto) => {
        const lotesProducto = lotes.filter(
          (lote) => lote.producto === producto.nombre
        );
        const cantidadAgregada = lotesProducto.reduce(
          (total, lote) => total + lote.cantidad,
          0
        );
        return cantidadAgregada > 0
          ? { ...producto, cantidad: producto.cantidad + cantidadAgregada }
          : producto;
      })
    );

    setCompraVerificando(null);
    setFechasVencimiento({});
  };

  const cancelarCompra = () => {
    if (!compraCancelando) return;

    setCompras(
      compras.map((compra) =>
        compra.idCompra === compraCancelando.idCompra
          ? { ...compra, estado: "Cancelado" }
          : compra
      )
    );
    setCompraCancelando(null);
    setCompraVerificando(null);
    setFechasVencimiento({});
  };

  // =========================
  // GASTOS - REGISTRAR
  // =========================
  const registrarGasto = (e) => {
    e.preventDefault();

    const monto = Number(nuevoGasto.monto);

    if (!nuevoGasto.descripcion || monto <= 0) {
      alert("Completa la descripción y coloca un monto válido.");
      return;
    }

    const gasto = {
      id: Date.now(),
      fecha: new Date().toLocaleDateString("es-PE"),
      descripcion: nuevoGasto.descripcion,
      categoria: nuevoGasto.categoria,
      monto: monto,
    };

    setGastos([gasto, ...gastos]);

    setNuevoGasto({
      descripcion: "",
      categoria: "Operativo",
      monto: "",
    });

    setMostrarGasto(false);
  };

  // =========================
  // CÁLCULOS
  // =========================
  const stockBajo = productos.filter((producto) => producto.cantidad <= 5);

  const totalVentas = ventas.reduce(
    (total, venta) => total + venta.total,
    0
  );

  const totalCompras = compras.reduce(
    (total, compra) =>
      total +
      (obtenerEstadoCompra(compra) === "Entregado" ? compra.costo : 0),
    0
  );

  const totalGastos = gastos.reduce(
    (total, gasto) => total + gasto.monto,
    0
  );

  const gananciaEstimada = totalVentas - totalCompras - totalGastos;

  const cambiarSeccion = (nuevaSeccion) => {
    setVentaSeleccionada(null);
    setSeccion(nuevaSeccion);
  };

  // ===== FORMULARIO LOGIN: INICIO =====
  // Esta vista se muestra hasta que Django confirma las credenciales.
  if (!logueado) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1>Rapid Market</h1>
          <p>Sistema de Gestión Comercial</p>

          <form onSubmit={iniciarSesion}>
            <label>Usuario</label>

            <input
              type="text"
              placeholder="Ingrese su usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
            />

            <label>Contraseña</label>

            <input
              type="password"
              placeholder="Ingrese su contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {errorLogin && (
              <div className="login-error">{errorLogin}</div>
            )}

            <button type="submit" className="login-button">
              Iniciar sesión
            </button>
          </form>

          
        </div>
      </div>
    );
  }
  // ===== FORMULARIO LOGIN: FIN =====

  // =========================
  // SISTEMA PRINCIPAL
  // =========================
  return (
    <div className="app-container">

      {/* ================= SIDEBAR ================= */}
      <aside className="sidebar">

        <div className="sidebar-logo">
          <h2>Rapid Market</h2>
          <span>Sistema de Gestión</span>
        </div>

        <nav className="sidebar-menu">

          <button
            className={
              seccion === "inicio"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => cambiarSeccion("inicio")}
          >
            🏠 Dashboard
          </button>

          <button
            className={
              seccion === "inventario"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => cambiarSeccion("inventario")}
          >
            📦 Inventario
          </button>

          <button
            className={
              seccion === "ventas"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => cambiarSeccion("ventas")}
          >
            🛒 Ventas
          </button>

          <button
            className={
              seccion === "compras"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => cambiarSeccion("compras")}
          >
            🚚 Compras
          </button>

          <button
            className={
              seccion === "gastos"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => cambiarSeccion("gastos")}
          >
            💰 Gastos
          </button>

          <button
            className={
              seccion === "reportes"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => cambiarSeccion("reportes")}
          >
            📊 Reportes
          </button>

        </nav>

        <button
          className="logout-button"
          onClick={cerrarSesion}
        >
          🚪 Cerrar sesión
        </button>

      </aside>

      {/* ================= CONTENIDO ================= */}
      <main className="main-content">

        {/* ================= DASHBOARD ================= */}
        {seccion === "inicio" && (
          <>
            <div className="page-header">
              <div>
                <h1>Dashboard</h1>
                <p>Resumen general de Rapid Market</p>
              </div>
            </div>

            <div className="stats-grid">

              <div className="stat-card">
                <div className="stat-icon">📦</div>

                <div>
                  <span>Total productos</span>
                  <h2>
                    {cargandoDashboard ? "..." : errorDashboard ? "--" : dashboardResumen.total_productos}
                  </h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⚠️</div>

                <div>
                  <span>Stock bajo</span>
                  <h2>
                    {cargandoDashboard ? "..." : errorDashboard ? "--" : dashboardResumen.productos_stock_bajo.length}
                  </h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🛒</div>

                <div>
                  <span>Ventas acumuladas</span>
                  <h2>
                    S/ {cargandoDashboard ? "..." : errorDashboard ? "--" : Number(dashboardResumen.ventas_acumuladas).toFixed(2)}
                  </h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">💰</div>

                <div>
                  <span>Ganancia estimada</span>
                  <h2>
                    S/ {cargandoDashboard ? "..." : errorDashboard ? "--" : Number(dashboardResumen.ganancia_estimada).toFixed(2)}
                  </h2>
                </div>
              </div>

            </div>
            {errorDashboard && <p role="alert">{errorDashboard}</p>}
                      <div className="content-card sales-chart-card">

            <h3>Ventas por fecha</h3>

            <div className="sales-chart">

              {dashboardResumen.ventas_por_fecha.length === 0 ? (
                <p>No hay ventas registradas.</p>
              ) : (
                dashboardResumen.ventas_por_fecha.map(({ fecha, total }) => {
                  const maximo = Math.max(
                    ...dashboardResumen.ventas_por_fecha.map((venta) => venta.total),
                    1
                  );
                  const porcentaje = (total / maximo) * 100;

                  return (
                    <div className="chart-item" key={fecha}>

                      <div className="chart-label">
                        <span>{fecha}</span>
                        <strong>
                          S/ {total.toFixed(2)}
                        </strong>
                      </div>

                      <div className="chart-bar-container">

                        <div
                          className="chart-bar"
                          style={{
                            width: `${porcentaje}%`,
                          }}
                        ></div>

                      </div>

                    </div>
                  );
                })
              )}

            </div>

          </div>
            <div className="dashboard-grid">

              <div className="content-card">

                <h3>Ventas recientes</h3>

                {dashboardResumen.ventas_recientes.length === 0 ? (
                  <p>No hay ventas registradas.</p>
                ) : (
                  dashboardResumen.ventas_recientes.map((venta) => (
                    <div className="sale-row" key={venta.id}>
                      <span>
                        Venta VT-{venta.id} · {Number(venta.cantidad_productos).toLocaleString("es-PE", {
                          maximumFractionDigits: 3,
                        })} productos
                      </span>
                      <strong>S/ {Number(venta.total).toFixed(2)}</strong>
                    </div>
                  ))
                )}

              </div>

              <div className="content-card">

                <h3>Productos con stock bajo</h3>

                {dashboardResumen.productos_stock_bajo.length === 0 ? (
                  <p>Todos los productos tienen stock suficiente.</p>
                ) : (
                  <div className="low-stock-list">
                    {dashboardResumen.productos_stock_bajo.map((producto) => (
                      <div className="sale-row" key={producto.id}>
                        <span>{producto.nombre}</span>
                        <strong>
                          {Number(producto.cantidad).toLocaleString("es-PE", {
                            maximumFractionDigits: 3,
                          })}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}

              </div>

            </div>
          </>
        )}

        {/* ===== INVENTARIO UI: INICIO ===== */}
        {/* Renderiza resumen, productos, existencias, estados y acciones del módulo. */}
        {seccion === "inventario" && (
          <>
            <div className="page-header">

              <div>
                <h1>Inventario</h1>
                <p>Control de productos y existencias</p>
              </div>

              <button
                className="primary-button"
                onClick={abrirNuevoProducto}
              >
                + Nuevo producto
              </button>

            </div>

            <div className="inventory-summary">

              <div className="summary-card">
                <span>Total de productos</span>
                <strong>
                  {cargandoInventario ? "..." : errorInventario ? "--" : inventarioResumen.total_productos}
                </strong>
              </div>

              <div className="summary-card warning">
                <span>Stock bajo</span>
                <strong>
                  {cargandoInventario ? "..." : errorInventario ? "--" : inventarioResumen.stock_bajo}
                </strong>
              </div>

            </div>
            {errorInventario && <p role="alert">{errorInventario}</p>}

            <div className="content-card inventory-card">

              <div className="inventory-toolbar">

                <input
                  type="text"
                  placeholder="🔍 Buscar producto..."
                  value={busqueda}
                  onChange={(e) =>
                    setBusqueda(e.target.value)
                  }
                />

              </div>

              <div className="table-container">

                <table>

                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Precio de venta</th>
                      <th>Cantidad de lotes</th>
                      <th>Cantidad actual</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>

                    {productosFiltrados.map((producto) => (

                      <tr key={producto.id}>

                        <td>
                          <strong>{producto.nombre}</strong>
                        </td>

                        <td>
                          S/ {Number(producto.precio).toFixed(2)}
                        </td>

                        <td>{producto.cantidad_lotes}</td>

                        <td>
                          {Number(producto.cantidad).toLocaleString("es-PE", {
                            maximumFractionDigits: 3,
                          })} {producto.unidad}
                        </td>

                        <td>
                          {producto.estado === "sin_stock" ? (
                            <span className="status-badge out-of-stock">
                              Sin stock
                            </span>
                          ) : producto.estado === "stock_bajo" ? (
                            <span className="status-badge low">
                              Stock bajo
                            </span>
                          ) : (
                            <span className="status-badge available">
                              Disponible
                            </span>
                          )}

                        </td>

                        <td>

                          <div className="action-buttons">

  <button
    type="button"
    className="details-button"
    onClick={() =>
      setProductoInventarioSeleccionado(producto)
    }
  >
    <span aria-hidden="true">👁</span> Detalles
  </button>

  <button
    type="button"
    className="edit-button"
    onClick={() => abrirEditarProducto(producto)}
  >
    <span aria-hidden="true">✏️</span> Editar
  </button>

</div>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

                {cargandoInventario && (
                  <div className="empty-state">
                    <p>Cargando inventario...</p>
                  </div>
                )}

                {!cargandoInventario && !errorInventario && productosFiltrados.length === 0 && (
                  <div className="empty-state">
                    <div>📦</div>
                    <h3>No se encontraron productos</h3>
                    <p>Prueba con otro nombre.</p>
                  </div>
                )}

              </div>

            </div>
          </>
        )}

        {/* ===== INVENTARIO UI: FIN ===== */}

        {/* ================= VENTAS ================= */}
        {seccion === "ventas" && (
          <>
            <div className="page-header">

              <div>
                <h1>Ventas</h1>
                <p>Registro y control de ventas</p>
              </div>

              <button
                className="primary-button"
                onClick={() => {
                  setBusquedaProductoVenta("");
                  setCarritoVenta([]);
                  setNuevaVenta({
                    productoId: "",
                    cantidad: 1,
                    tipo: "Minorista",
                    pago: "Efectivo",
                  });
                  setMostrarVenta(true);
                }}
              >
                + Nueva venta
              </button>

            </div>

            <div className="inventory-summary">

              <div className="summary-card">
                <span>Total de ventas</span>
                <strong>{ventas.length}</strong>
              </div>

              <div className="summary-card">
                <span>Monto vendido</span>
                <strong>S/ {totalVentas.toFixed(2)}</strong>
              </div>

            </div>

            <div className="content-card inventory-card">

              <h3>Historial de ventas</h3>

              <div className="history-toolbar">
                <input
                  type="text"
                  placeholder="Buscar por código, producto, fecha o pago..."
                  value={busquedaVentas}
                  onChange={(e) => setBusquedaVentas(e.target.value)}
                />
              </div>

              <div className="table-container">

                <table>

                  <thead>
                    <tr>
                      <th>ID de venta</th>
                      <th>Fecha</th>
                      <th>Cantidad de productos</th>
                      <th>Tipo de pago</th>
                      <th>Total</th>
                      <th>Detalles</th>
                    </tr>
                  </thead>

                  <tbody>

                    {ventasFiltradas.map((venta) => (
                      <tr key={venta.idVenta ?? venta.id}>
                        <td>{obtenerCodigoVenta(venta)}</td>
                        <td>{venta.fecha}</td>
                        <td>
                          {venta.cantidadProductos || obtenerProductosVenta(venta).length}
                        </td>
                        <td>{venta.pago}</td>
                        <td>
                          <strong>S/ {venta.total.toFixed(2)}</strong>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="details-button"
                            onClick={() => setVentaSeleccionada(venta)}
                          >
                            <span aria-hidden="true">👁</span> Detalles
                          </button>
                        </td>
                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>

            </div>
          </>
        )}

        {/* ================= COMPRAS ================= */}
        {seccion === "compras" && (
          <>
            <div className="page-header">

              <div>
                <h1>Compras</h1>
                <p>Registro de compras y abastecimiento</p>
              </div>

              <button
                className="primary-button"
                onClick={() => setMostrarCompra(true)}
              >
                + Nueva compra
              </button>

            </div>

            <div className="inventory-summary">

              <div className="summary-card">
                <span>Total de compras</span>
                <strong>{compras.length}</strong>
              </div>

              <div className="summary-card">
                <span>Costos registrados</span>
                <strong>S/ {totalCompras.toFixed(2)}</strong>
              </div>

            </div>

            <div className="content-card inventory-card">

              <h3>Historial de compras</h3>

              <div className="history-toolbar">
                <input
                  type="text"
                  placeholder="Buscar por código, proveedor, producto, fecha o estado..."
                  value={busquedaCompras}
                  onChange={(e) => setBusquedaCompras(e.target.value)}
                />
              </div>

              <div className="table-container">

                <table>

                  <thead>
                    <tr>
                      <th>Orden de compra</th>
                      <th>Fecha de compra</th>
                      <th>Proveedor</th>
                      <th>Cantidad de lotes</th>
                      <th>Costo</th>
                      <th>Estado</th>
                      <th>Detalles</th>
                      <th>Verificar</th>
                    </tr>
                  </thead>

                  <tbody>

                    {comprasFiltradas.map((compra) => (
                      <tr key={compra.idCompra ?? compra.id}>

                        <td>{obtenerCodigoCompra(compra)}</td>
                        <td>{compra.fecha}</td>
                        <td>{compra.proveedor}</td>
                        <td>{obtenerLotesCompra(compra).length}</td>
                        <td>
                          S/ {compra.costo.toFixed(2)}
                        </td>
                        <td>
                          <span className={`purchase-status ${obtenerEstadoCompra(compra).toLowerCase().replaceAll(" ", "-")}`}>
                            {obtenerEstadoCompra(compra)}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="details-button"
                            onClick={() => setCompraSeleccionada(compra)}
                          >
                            <span aria-hidden="true">👁</span> Detalles
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="details-button"
                            disabled={obtenerEstadoCompra(compra) !== "Pendiente de entrega"}
                            onClick={() => {
                              setCompraVerificando(compra);
                              setFechasVencimiento(
                                obtenerLotesCompra(compra).reduce(
                                  (fechas, lote) => ({
                                    ...fechas,
                                    [lote.idLote]: lote.fechaVencimiento || "",
                                  }),
                                  {}
                                )
                              );
                            }}
                          >
                            Verificar
                          </button>
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>

            </div>
          </>
        )}

        {/* ================= GASTOS ================= */}
        {seccion === "gastos" && (
          <>
            <div className="page-header">

              <div>
                <h1>Gastos</h1>
                <p>Control de gastos del negocio</p>
              </div>

              <button
                className="primary-button"
                onClick={() => setMostrarGasto(true)}
              >
                + Nuevo gasto
              </button>

            </div>

            <div className="inventory-summary">

              <div className="summary-card">
                <span>Total de gastos</span>
                <strong>{gastos.length}</strong>
              </div>

              <div className="summary-card">
                <span>Monto gastado</span>
                <strong>S/ {totalGastos.toFixed(2)}</strong>
              </div>

            </div>

            <div className="content-card inventory-card">

              <h3>Historial de gastos</h3>

              <div className="history-toolbar">
                <input
                  type="text"
                  placeholder="Buscar por fecha, descripción, categoría o monto..."
                  value={busquedaGastos}
                  onChange={(e) => setBusquedaGastos(e.target.value)}
                />
              </div>

              <div className="table-container">

                <table>

                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Descripción</th>
                      <th>Categoría</th>
                      <th>Monto</th>
                    </tr>
                  </thead>

                  <tbody>

                    {gastosFiltrados.map((gasto) => (
                      <tr key={gasto.id}>

                        <td>{gasto.fecha}</td>

                        <td>
                          <strong>{gasto.descripcion}</strong>
                        </td>

                        <td>{gasto.categoria}</td>

                        <td>
                          S/ {gasto.monto.toFixed(2)}
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>

            </div>
          </>
        )}

        {/* ================= REPORTES ================= */}
        {seccion === "reportes" && (
          <>
            <div className="page-header">
              <h1>REPORTES</h1>
            </div>

            <div className="reports-panel">
              <div className="reports-form">
                <div className="form-group">
                  <label htmlFor="tipo-reporte">Tipo de reporte</label>
                  <select
                    id="tipo-reporte"
                    value={tipoReporte}
                    onChange={(e) => setTipoReporte(e.target.value)}
                  >
                    <option value="ventas">Ventas</option>
                    <option value="productos">Productos</option>
                    <option value="compras">Compras</option>
                    <option value="gastos">Gastos</option>
                    <option value="ganancias">Ganancias</option>
                  </select>
                </div>

                <div className="reports-date-row">
                  <div className="form-group">
                    <label htmlFor="fecha-desde">Desde</label>
                    <input
                      id="fecha-desde"
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => {
                        const nuevaFechaDesde = e.target.value;
                        setFechaDesde(nuevaFechaDesde);

                        if (fechaHasta && fechaHasta < nuevaFechaDesde) {
                          setFechaHasta("");
                        }
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="fecha-hasta">Hasta</label>
                    <input
                      id="fecha-hasta"
                      type="date"
                      min={fechaDesde || undefined}
                      value={fechaHasta}
                      onChange={(e) => {
                        if (!fechaDesde || e.target.value >= fechaDesde) {
                          setFechaHasta(e.target.value);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="reports-actions">
                  <button type="button" className="secondary-button" onClick={() => {
                    setTipoReporte("ventas");
                    setFechaDesde("");
                    setFechaHasta("");
                  }}>
                    Limpiar
                  </button>

                  <button type="button" className="primary-button">
                    Generar reporte
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

      </main>

      {/* =====================================================
          MODAL INVENTARIO
      ===================================================== */}
      {mostrarFormulario && (
        <div className="modal-overlay">

          <div className="modal-card">

            <div className="modal-header">

              <div>

                <h2>
                  {productoEditando
                    ? "Editar producto"
                    : "Nuevo producto"}
                </h2>

                <p>
                  {productoEditando
                    ? "Actualiza la información del producto"
                    : "Registra un nuevo producto en el inventario"}
                </p>

              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setMostrarFormulario(false)
                }
              >
                ×
              </button>

            </div>

            <form onSubmit={guardarProducto}>

              <div className="form-group">

                <label>Nombre del producto</label>

                <input
                  type="text"
                  placeholder="Ej. Arroz Faraón"
                  value={nuevoProducto.nombre}
                  onChange={(e) =>
                    setNuevoProducto({
                      ...nuevoProducto,
                      nombre: e.target.value,
                    })
                  }
                />

              </div>

              <div className="form-row">

                <div className="form-group">

                  <label>Unidad</label>

                  <select
                    value={nuevoProducto.unidad}
                    onChange={(e) =>
                      setNuevoProducto({
                        ...nuevoProducto,
                        unidad: e.target.value,
                      })
                    }
                  >
                    <option value="und">Unidad</option>
                    <option value="kg">Kilogramo</option>
                    <option value="caja">Caja</option>
                    <option value="pqte">Paquete</option>
                    <option value="lata">Lata</option>
                  </select>

                </div>

              </div>

              <div className="form-group">

                <label>Precio de venta</label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={nuevoProducto.precio}
                  onChange={(e) =>
                    setNuevoProducto({
                      ...nuevoProducto,
                      precio: e.target.value,
                    })
                  }
                />

              </div>

              {!productoEditando && (
                <div className="form-group">
                  <label htmlFor="nuevo-producto-perecible">¿Es perecible?</label>
                  <select
                    id="nuevo-producto-perecible"
                    value={
                      nuevoProducto.perecible === null
                        ? ""
                        : String(nuevoProducto.perecible)
                    }
                    onChange={(e) =>
                      setNuevoProducto({
                        ...nuevoProducto,
                        perecible: e.target.value === "" ? null : e.target.value === "true",
                      })
                    }
                  >
                    <option value="">Selecciona una opción</option>
                    <option value="true">Sí, es perecible</option>
                    <option value="false">No es perecible</option>
                  </select>
                </div>
              )}

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setMostrarFormulario(false)
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {productoEditando
                    ? "Guardar cambios"
                    : "Agregar producto"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* =====================================================
          MODAL NUEVA VENTA
      ===================================================== */}
      {mostrarVenta && (
        <div className="modal-overlay">

          <div className="modal-card">

            <div className="modal-header">

              <div>
                <h2>Nueva venta</h2>
                <p>Registra una nueva venta</p>
              </div>

              <button
                className="modal-close"
                onClick={() => {
                  setMostrarVenta(false);
                  setBusquedaProductoVenta("");
                  setCarritoVenta([]);
                }}
              >
                ×
              </button>

            </div>

            <form onSubmit={registrarVenta}>

              <div className="form-group">

                <label>Producto</label>

                <div className="product-autocomplete">
                  <input
                    type="text"
                    placeholder="Escribe para buscar un producto"
                    value={busquedaProductoVenta}
                    onChange={(e) => {
                      setBusquedaProductoVenta(e.target.value);
                      setNuevaVenta({
                        ...nuevaVenta,
                        productoId: "",
                      });
                    }}
                  />

                  {busquedaProductoVenta.trim() && !productoSeleccionadoVenta && (
                    <div className="product-suggestions">
                      {productosVentaFiltrados.length > 0 ? (
                        productosVentaFiltrados.map((producto) => (
                          <button
                            type="button"
                            className="product-suggestion"
                            key={producto.id}
                            onClick={() => {
                              setBusquedaProductoVenta(producto.nombre);
                              setNuevaVenta({
                                ...nuevaVenta,
                                productoId: producto.id,
                              });
                            }}
                          >
                            <span>{producto.nombre}</span>
                          </button>
                        ))
                      ) : (
                        <p className="product-suggestions-empty">
                          No se encontraron productos.
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </div>

              <div className="form-group">

                <div className="sale-quantity-row">
                  <div>
                    <label htmlFor="sale-quantity">Cantidad</label>
                    <input
                      id="sale-quantity"
                      type="number"
                      min="1"
                      value={nuevaVenta.cantidad}
                      onChange={(e) =>
                        setNuevaVenta({
                          ...nuevaVenta,
                          cantidad: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="sale-unit-price">
                    <div>
                      <label>Precio unitario</label>
                      <strong>
                        {productoSeleccionadoVenta
                          ? `S/ ${productoSeleccionadoVenta.precio.toFixed(2)}`
                          : "-"}
                      </strong>
                    </div>
                    <div>
                      <label>Stock</label>
                      <strong>
                        {productoSeleccionadoVenta
                          ? productoSeleccionadoVenta.cantidad
                          : "-"}
                      </strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="add-product-button"
                  onClick={agregarProductoVenta}
                >
                  + Agregar producto
                </button>

              </div>

              <div className="form-group">

                <label>Tipo de venta</label>

                <select
                  value={nuevaVenta.tipo}
                  onChange={(e) =>
                    setNuevaVenta({
                      ...nuevaVenta,
                      tipo: e.target.value,
                    })
                  }
                >
                  <option value="Minorista">
                    Minorista
                  </option>

                  <option value="Mayorista">
                    Mayorista - 5% descuento
                  </option>
                </select>

              </div>

              <div className="form-group">

                <label>Medio de pago</label>

                <select
                  value={nuevaVenta.pago}
                  onChange={(e) =>
                    setNuevaVenta({
                      ...nuevaVenta,
                      pago: e.target.value,
                    })
                  }
                >
                  <option value="Efectivo">
                    Efectivo
                  </option>

                  <option value="Yape">Yape</option>

                  <option value="Plin">Plin</option>
                </select>

              </div>

              <div className="form-group sale-products-group">

                <label>Productos agregados</label>

                {carritoVenta.length > 0 ? (
                  <div className="sale-products-table-container">
                    <table className="sale-products-table">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Cantidad</th>
                          <th>Subtotal</th>
                          <th aria-label="Acciones"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {carritoVenta.map((item) => (
                          <tr key={item.id}>
                            <td>{item.nombre}</td>
                            <td>
                              <div className="quantity-controls">
                                <button
                                  type="button"
                                  onClick={() =>
                                    cambiarCantidadProductoVenta(item.id, -1)
                                  }
                                  aria-label={`Disminuir cantidad de ${item.nombre}`}
                                >
                                  -
                                </button>
                                <strong>{item.cantidad}</strong>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const producto = productos.find(
                                      (p) => p.id === item.id
                                    );
                                    if (item.cantidad < producto.cantidad) {
                                      cambiarCantidadProductoVenta(item.id, 1);
                                    }
                                  }}
                                  aria-label={`Aumentar cantidad de ${item.nombre}`}
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td>
                              S/ {(
                                item.precio * factorPrecioVenta * item.cantidad
                              ).toFixed(2)}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="remove-product-button"
                                onClick={() =>
                                  setCarritoVenta(
                                    carritoVenta.filter(
                                      (producto) => producto.id !== item.id
                                    )
                                  )
                                }
                                aria-label={`Eliminar ${item.nombre}`}
                                title="Eliminar producto"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="2"></td>
                          <td>
                            <strong>S/ {totalCarritoVenta.toFixed(2)}</strong>
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="sale-products-empty">
                    Todavía no has agregado productos.
                  </p>
                )}

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setMostrarVenta(false);
                    setBusquedaProductoVenta("");
                    setCarritoVenta([]);
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Registrar venta
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {ventaSeleccionada && (
        <div className="modal-overlay">
          <div className="modal-card sale-details-modal">
            <div className="modal-header">
              <div>
                <h2>Detalles de venta</h2>
                <p>{obtenerCodigoVenta(ventaSeleccionada)}</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setVentaSeleccionada(null)}
                aria-label="Cerrar detalles de venta"
              >
                ×
              </button>
            </div>

            <div className="sale-details-table-container">
              <p>
                Producto perecible: {productoInventarioSeleccionado.perecible ? "Sí" : "No"}
              </p>
              <table className="sale-details-table">
                <thead>
                  <tr>
                    <th>ID de venta</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio unitario</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {obtenerProductosVenta(ventaSeleccionada).map((producto) => {
                    const subtotal = producto.precio * producto.cantidad;

                    return (
                      <tr key={`${ventaSeleccionada.idVenta ?? ventaSeleccionada.id}-${producto.id}`}>
                        <td>{obtenerCodigoVenta(ventaSeleccionada)}</td>
                        <td>{producto.nombre}</td>
                        <td>{producto.cantidad}</td>
                        <td>S/ {producto.precio.toFixed(2)}</td>
                        <td>S/ {subtotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {compraSeleccionada && (
        <div className="modal-overlay">
          <div className="modal-card sale-details-modal">
            <div className="modal-header">
              <div>
                <h2>Detalles de compra</h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setCompraSeleccionada(null)}
                aria-label="Cerrar detalles de compra"
              >
                ×
              </button>
            </div>

            <div className="sale-details-table-container">
              <table className="sale-details-table">
                <thead>
                  <tr>
                    <th>Orden de compra</th>
                    <th>Fecha de compra</th>
                    <th>Fecha de vencimiento</th>
                    <th>ID lote</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio de compra</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {obtenerLotesCompra(compraSeleccionada).map((lote) => (
                    <tr
                      key={`${compraSeleccionada.idCompra ?? compraSeleccionada.id}-${lote.idLote ?? lote.id}`}
                    >
                      <td>{obtenerCodigoCompra(compraSeleccionada)}</td>
                      <td>{lote.fecha}</td>
                      <td>{lote.fechaVencimiento || "---"}</td>
                      <td>{obtenerCodigoLote(lote)}</td>
                      <td>{lote.producto}</td>
                      <td>{lote.cantidad}</td>
                      <td>
                        <span className="money-value">
                          <span>S/</span>
                          <span>{lote.precioUnitario.toFixed(2)}</span>
                        </span>
                      </td>
                      <td>
                        <span className="money-value">
                          <span>S/</span>
                          <span>{(lote.precioUnitario * lote.cantidad).toFixed(2)}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="6">
                      <strong>Total de compra</strong>
                    </td>
                    <td>
                      <strong className="money-value">
                        <span>S/</span>
                        <span>{calcularTotalCompra(compraSeleccionada).toFixed(2)}</span>
                      </strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {productoInventarioSeleccionado && (
        <div className="modal-overlay">
          <div className="modal-card sale-details-modal">
            <div className="modal-header">
              <div>
                <h2>Detalles de producto</h2>
                <p>{productoInventarioSeleccionado.nombre}</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setProductoInventarioSeleccionado(null)}
                aria-label="Cerrar detalles del producto"
              >
                ×
              </button>
            </div>

            <div className="sale-details-table-container">
              <table className="sale-details-table">
                <thead>
                  <tr>
                    <th>ID orden de compra</th>
                    <th>ID lote</th>
                    <th>Producto</th>
                    <th>Unidad</th>
                    <th>Cantidad actual</th>
                    <th>Fecha de compra</th>
                    <th>Fecha de expiración</th>
                  </tr>
                </thead>
                <tbody>
                  {obtenerLotesProducto(productoInventarioSeleccionado).length > 0 ? (
                    obtenerLotesProducto(productoInventarioSeleccionado).map((lote) => (
                      <tr key={`${lote.ordenCompra}-${lote.idLote}`}>
                        <td>{lote.ordenCompra}</td>
                        <td>{obtenerCodigoLote(lote)}</td>
                        <td>{lote.producto}</td>
                        <td>{productoInventarioSeleccionado.unidad_nombre}</td>
                        <td>{lote.cantidadActual}</td>
                        <td>{lote.fecha}</td>
                        <td>
                          {lote.fechaVencimiento ||
                            (productoInventarioSeleccionado.perecible
                              ? "Pendiente"
                              : "No aplica")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7">No hay lotes registrados para este producto.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {compraVerificando && (
        <div className="modal-overlay">
          <div className="modal-card sale-details-modal purchase-verification-modal">
            <div className="modal-header">
              <div>
                <h2>Verificar compra</h2>
                <p>{obtenerCodigoCompra(compraVerificando)}</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setCompraVerificando(null);
                  setFechasVencimiento({});
                }}
                aria-label="Volver al panel anterior"
              >
                ×
              </button>
            </div>

            <div className="purchase-verification-summary">
              <strong>ID de compra</strong>
              <span>{obtenerCodigoCompra(compraVerificando)}</span>
              <strong>Fecha de compra</strong>
              <span>{compraVerificando.fecha}</span>
            </div>

            <div className="sale-details-table-container">
              <table className="sale-details-table">
                <thead>
                  <tr>
                    <th>ID lote</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio de compra</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {obtenerLotesCompra(compraVerificando).map((lote) => (
                    <tr key={lote.idLote}>
                      <td>{obtenerCodigoLote(lote)}</td>
                      <td>{lote.producto}</td>
                      <td>{lote.cantidad}</td>
                      <td>S/ {lote.precioUnitario.toFixed(2)}</td>
                      <td>
                        S/ {(lote.precioUnitario * lote.cantidad).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="4"><strong>Total final</strong></td>
                    <td><strong>S/ {calcularTotalCompra(compraVerificando).toFixed(2)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="expiration-section">
              <h3>Fechas de vencimiento</h3>
              {obtenerLotesCompra(compraVerificando).some((lote) => lote.perecible) ? (
                obtenerLotesCompra(compraVerificando)
                  .filter((lote) => lote.perecible)
                  .map((lote) => (
                    <div className="expiration-row" key={lote.idLote}>
                      <label htmlFor={`expiration-${lote.idLote}`}>
                        {obtenerCodigoLote(lote)} - {lote.producto}
                      </label>
                      <input
                        id={`expiration-${lote.idLote}`}
                        type="date"
                        value={fechasVencimiento[lote.idLote] || ""}
                        onChange={(e) =>
                          setFechasVencimiento({
                            ...fechasVencimiento,
                            [lote.idLote]: e.target.value,
                          })
                        }
                      />
                    </div>
                  ))
              ) : (
                <p>No hay productos perecibles en esta compra.</p>
              )}
            </div>

            {compraCancelando ? (
              <div className="cancel-confirmation">
                <strong>¿Estas seguro de cancelar esta orden de compra?</strong>
                <div className="modal-actions">
                  <button type="button" className="danger-button" onClick={cancelarCompra}>
                    Cancelar compra
                  </button>
                  <button type="button" className="secondary-button" onClick={() => setCompraCancelando(null)}>
                    Volver al panel anterior
                  </button>
                </div>
              </div>
            ) : (
              <div className="modal-actions verification-actions">
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => setCompraCancelando(compraVerificando)}
                >
                  Cancelar orden de compra
                </button>
                <button type="button" className="primary-button" onClick={validarCompra}>
                  Validar compra
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL NUEVA COMPRA
      ===================================================== */}
      {mostrarCompra && (
        <div className="modal-overlay">

          <div className="modal-card">

            <div className="modal-header">

              <div>
                <h2>Nueva compra</h2>
                <p>Registra una compra al proveedor</p>
              </div>

              <button
                className="modal-close"
                onClick={() => {
                  setMostrarCompra(false);
                  setNuevaCompra({
                    proveedor: "",
                    productoId: "",
                    cantidad: 1,
                    precioUnitario: "",
                  });
                  setBusquedaProveedorCompra("");
                  setBusquedaProductoCompra("");
                  setCarritoCompra([]);
                }}
              >
                ×
              </button>

            </div>

            <form onSubmit={registrarCompra}>

              <div className="form-group">

                <label>Proveedor</label>

                <div className="product-autocomplete">
                  <input
                    type="text"
                    placeholder="Escribe para buscar un proveedor"
                    value={busquedaProveedorCompra}
                    disabled={carritoCompra.length > 0}
                    onChange={(e) => {
                      setBusquedaProveedorCompra(e.target.value);
                      setNuevaCompra({ ...nuevaCompra, proveedor: "" });
                    }}
                  />

                  {busquedaProveedorCompra.trim() && !nuevaCompra.proveedor && (
                    <div className="product-suggestions">
                      {proveedoresFiltrados.length > 0 ? (
                        proveedoresFiltrados.map((proveedor) => (
                          <button
                            type="button"
                            className="product-suggestion"
                            key={proveedor}
                            onClick={() => {
                              setBusquedaProveedorCompra(proveedor);
                              setNuevaCompra({ ...nuevaCompra, proveedor });
                            }}
                          >
                            <span>{proveedor}</span>
                          </button>
                        ))
                      ) : (
                        <p className="product-suggestions-empty">
                          No se encontraron proveedores.
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </div>

              <div className="form-group">

                <label>Producto</label>

                <div className="product-autocomplete">
                  <input
                    type="text"
                    placeholder="Escribe para buscar un producto"
                    value={busquedaProductoCompra}
                    onChange={(e) => {
                      setBusquedaProductoCompra(e.target.value);
                      setNuevaCompra({ ...nuevaCompra, productoId: "" });
                    }}
                  />

                  {busquedaProductoCompra.trim() && !productoSeleccionadoCompra && (
                    <div className="product-suggestions">
                      {productosCompraFiltrados.length > 0 ? (
                        productosCompraFiltrados.map((producto) => (
                          <button
                            type="button"
                            className="product-suggestion"
                            key={producto.id}
                            onClick={() => {
                              setBusquedaProductoCompra(producto.nombre);
                              setNuevaCompra({
                                ...nuevaCompra,
                                productoId: producto.id,
                                precioUnitario: "",
                              });
                            }}
                          >
                            <span>{producto.nombre}</span>
                          </button>
                        ))
                      ) : (
                        <p className="product-suggestions-empty">
                          No se encontraron productos.
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </div>

              <div className="form-group">

                <div className="sale-quantity-row">
                  <div>
                    <label htmlFor="purchase-quantity">Cantidad</label>
                    <input
                      id="purchase-quantity"
                      type="number"
                      min="1"
                      value={nuevaCompra.cantidad}
                      onChange={(e) =>
                        setNuevaCompra({
                          ...nuevaCompra,
                          cantidad: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label htmlFor="purchase-unit-price">
    Precio unitario de compra
  </label>

  <input
    id="purchase-unit-price"
    type="number"
    min="0.01"
    step="0.01"
    placeholder="Ej. 1.80"
    value={nuevaCompra.precioUnitario}
    disabled={!productoSeleccionadoCompra}
    onChange={(e) =>
      setNuevaCompra({
        ...nuevaCompra,
        precioUnitario: e.target.value,
      })
    }
  />
                  </div>
                </div>

                <button
                  type="button"
                  className="add-product-button"
                  onClick={agregarProductoCompra}
                >
                  + Agregar producto
                </button>

              </div>

              <div className="form-group">

                <label>Costo total de compra</label>
                <strong>S/ {totalCarritoCompra.toFixed(2)}</strong>

              </div>

              <div className="form-group sale-products-group">

                <label>Productos agregados</label>

                {carritoCompra.length > 0 ? (
                  <div className="sale-products-table-container">
                    <table className="sale-products-table">
                      <thead>
                        <tr>
                          <th>ID lote</th>
                          <th>Producto</th>
                          <th>Cantidad</th>
                          <th>Precio unitario</th>
                          <th>Subtotal</th>
                          <th aria-label="Acciones"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {carritoCompra.map((item, indice) => (
                          <tr key={`${item.id}-${indice}`}>
                            <td>LT-{siguienteLoteCompra + indice}</td>
                            <td>{item.nombre}</td>
                            <td>
                              <div className="quantity-controls">
                                <button
                                  type="button"
                                  onClick={() =>
                                    cambiarCantidadProductoCompra(indice, -1)
                                  }
                                  aria-label={`Disminuir cantidad de ${item.nombre}`}
                                >
                                  -
                                </button>
                                <strong>{item.cantidad}</strong>
                                <button
                                  type="button"
                                  onClick={() =>
                                    cambiarCantidadProductoCompra(indice, 1)
                                  }
                                  aria-label={`Aumentar cantidad de ${item.nombre}`}
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td>S/ {item.precioUnitario.toFixed(2)}</td>
                            <td>
                              S/ {(item.precioUnitario * item.cantidad).toFixed(2)}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="remove-product-button"
                                onClick={() =>
                                  setCarritoCompra(
                                    carritoCompra.filter((_, itemIndex) => itemIndex !== indice)
                                  )
                                }
                                aria-label={`Eliminar ${item.nombre}`}
                                title="Eliminar producto"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="sale-products-empty">
                    Todavía no has agregado productos.
                  </p>
                )}

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setMostrarCompra(false);
                    setNuevaCompra({
                      proveedor: "",
                      productoId: "",
                      cantidad: 1,
                      precioUnitario: "",
                    });
                    setBusquedaProveedorCompra("");
                    setBusquedaProductoCompra("");
                    setCarritoCompra([]);
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Registrar compra
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* =====================================================
          MODAL NUEVO GASTO
      ===================================================== */}
      {mostrarGasto && (
        <div className="modal-overlay">

          <div className="modal-card">

            <div className="modal-header">

              <div>
                <h2>Nuevo gasto</h2>
                <p>Registra un gasto del negocio</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setMostrarGasto(false)}
              >
                ×
              </button>

            </div>

            <form onSubmit={registrarGasto}>

              <div className="form-group">

                <label>Descripción</label>

                <input
                  type="text"
                  placeholder="Ej. Transporte"
                  value={nuevoGasto.descripcion}
                  onChange={(e) =>
                    setNuevoGasto({
                      ...nuevoGasto,
                      descripcion: e.target.value,
                    })
                  }
                />

              </div>

              <div className="form-group">

                <label>Categoría</label>

                <select
                  value={nuevoGasto.categoria}
                  onChange={(e) =>
                    setNuevoGasto({
                      ...nuevoGasto,
                      categoria: e.target.value,
                    })
                  }
                >
                  <option value="Operativo">
                    Operativo
                  </option>

                  <option value="Servicios">
                    Servicios
                  </option>

                  <option value="Transporte">
                    Transporte
                  </option>

                  <option value="Otros">
                    Otros
                  </option>
                </select>

              </div>

              <div className="form-group">

                <label>Monto</label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={nuevoGasto.monto}
                  onChange={(e) =>
                    setNuevoGasto({
                      ...nuevoGasto,
                      monto: e.target.value,
                    })
                  }
                />

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setMostrarGasto(false)}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Registrar gasto
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

export default App;