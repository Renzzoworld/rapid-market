import { useCallback, useState } from "react";
import "./App.css";
import { ProveedorContexto } from "./contexto/ProveedorContexto.jsx";
import { Resumen } from "./areas/resumen/Resumen.jsx";
import { InicioSesion } from "./areas/autenticacion/InicioSesion.jsx";
import { useAutenticacion } from "./areas/autenticacion/useAutenticacion.js";
import { API_URL } from "./servicios/configuracionApi.js";
import { useInventario } from "./areas/inventario/useInventario.js";
import { useVentas } from "./areas/ventas/useVentas.js";
import { useCompras } from "./areas/compras/useCompras.js";
import { useGastos } from "./areas/gastos/useGastos.js";
import { useAccionesInventario } from "./areas/inventario/useAccionesInventario.js";
import { useAccionesVentas } from "./areas/ventas/useAccionesVentas.js";
import { useAccionesCompras } from "./areas/compras/useAccionesCompras.js";
import { useAccionesGastos } from "./areas/gastos/useAccionesGastos.js";
import { useResumen } from "./areas/resumen/useResumen.js";
import { Inventario, FormularioProducto, DetalleProducto } from "./areas/inventario/Inventario.jsx";
import { Ventas, ModalesVenta } from "./areas/ventas/Ventas.jsx";
import { Compras, DetalleCompra, VerificarCompra, FormularioCompra } from "./areas/compras/Compras.jsx";
import { Gastos, FormularioGasto } from "./areas/gastos/Gastos.jsx";

// ===== COMPONENTES COMPARTIDOS: INICIO =====
// Controles reutilizables de paginación y selección remota de productos.
function App() {
  // ===== AUTENTICACIÓN Y PETICIONES HTTP: INICIO =====
  // Guarda credenciales y gestiona llamadas autenticadas, renovación y errores de API.
  const {
    logueado, usuario, setUsuario, password, setPassword, errorLogin,
    accessToken, setAccessToken, refreshToken, setRefreshToken, rol,
    iniciarSesion, cerrarSesion: cerrarSesionAutenticacion,
  } = useAutenticacion();
  const esAdministrador = ["admin", "administrador"].includes(rol.trim().toLowerCase());

  const apiRequest = useCallback(async (path, options = {}, token = accessToken) => {
    let response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    if (response.status === 401 && refreshToken && path !== "/login/refresh/") {
      const renewed = await fetch(`${API_URL}/login/refresh/`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      });
      if (renewed.ok) {
        const tokens = await renewed.json();
        setAccessToken(tokens.access);
        if (tokens.refresh) setRefreshToken(tokens.refresh);
        response = await fetch(`${API_URL}${path}`, {
          ...options,
          headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            Authorization: `Bearer ${tokens.access}`,
            ...options.headers,
          },
        });
      }
    }
    if (response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data.detail || Object.values(data).flat().join(" ") || "No se pudo completar la operación.";
      throw new Error(detail);
    }
    return data;
  }, [accessToken, refreshToken, setAccessToken, setRefreshToken]);
  // ===== AUTENTICACIÓN Y PETICIONES HTTP: FIN =====



  // App coordina el cierre de sesión con la navegación y los selectores de producto.
  const cerrarSesion = () => cerrarSesionAutenticacion(apiRequest, () => {
    setSeccion("resumen");
    limpiarProductosVenta();
    limpiarProductosCompra();
  });

  // Navegacion de las secciones principales de la aplicacion.
  const [seccion, setSeccion] = useState("resumen");

  // ===== ESTADO DE MÓDULOS: INICIO =====
  // Inventario y selectores de producto, todos limitados a páginas remotas.
  const [revisionInventario, setRevisionInventario] = useState(0);


  const [busqueda, setBusqueda] = useState("");
  const [busquedaVentas, setBusquedaVentas] = useState("");
  const [busquedaCompras, setBusquedaCompras] = useState("");
  const [busquedaGastos, setBusquedaGastos] = useState("");
  const [revisionVentas, setRevisionVentas] = useState(0);
  const [revisionCompras, setRevisionCompras] = useState(0);
  const [revisionGastos, setRevisionGastos] = useState(0);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [productoInventarioSeleccionado, setProductoInventarioSeleccionado] =
    useState(null);

  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "",
    cantidad: "",
    unidad: "unidad",
    precio: "",
  });

  // Ventas: historial paginado, formulario, carrito y detalle seleccionado.

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

  // Compras: historial, recepción/cancelación, proveedores y carrito.

  const [mostrarCompra, setMostrarCompra] = useState(false);
  const [mostrarProveedorNuevo, setMostrarProveedorNuevo] = useState(false);
  const [nombreProveedorNuevo, setNombreProveedorNuevo] = useState("");
  const [compraSeleccionada, setCompraSeleccionada] = useState(null);
  const [compraVerificando, setCompraVerificando] = useState(null);
  const [compraCancelando, setCompraCancelando] = useState(null);
  const [fechasVencimiento, setFechasVencimiento] = useState({});
  const [proveedores, setProveedores] = useState([]);
  const [catalogos, setCatalogos] = useState({ units: [], providers: [], payment_methods: [], sale_types: [], expense_categories: [] });

  const [nuevaCompra, setNuevaCompra] = useState({
    proveedor: "",
    productoId: "",
    cantidad: 1,
    precioUnitario: "",
  });
  const [busquedaProveedorCompra, setBusquedaProveedorCompra] = useState("");
  const [busquedaProductoCompra, setBusquedaProductoCompra] = useState("");
  const [carritoCompra, setCarritoCompra] = useState([]);

  // Gastos: historial paginado y formulario de alta.

  const [mostrarGasto, setMostrarGasto] = useState(false);

  const [nuevoGasto, setNuevoGasto] = useState({
    descripcion: "",
    categoria: "Operativo",
    monto: "",
  });
  // ===== ESTADO DE MÓDULOS: FIN =====

  // Cada área administra su consulta remota, paginación y estado de carga/error.
  const estadoInventarioRemoto = useInventario({ apiRequest, logueado, seccion, busqueda, revision: revisionInventario });
  const estadoVentasRemoto = useVentas({
    apiRequest, logueado, seccion, busqueda: busquedaVentas, revision: revisionVentas,
    mostrarFormulario: mostrarVenta, busquedaProducto: busquedaProductoVenta, revisionProductos: revisionInventario,
  });
  const estadoComprasRemoto = useCompras({
    apiRequest, logueado, seccion, esAdministrador, busqueda: busquedaCompras, revision: revisionCompras,
    mostrarFormulario: mostrarCompra, busquedaProducto: busquedaProductoCompra, revisionProductos: revisionInventario,
  });
  const estadoGastosRemoto = useGastos({ apiRequest, logueado, seccion, esAdministrador, busqueda: busquedaGastos, revision: revisionGastos });
  const estadoResumen = useResumen({ apiRequest, setCatalogos, setProveedores });
  const { productosInventario, totalProductosInventario, paginaInventario, setPaginaInventario, cargandoInventario, errorInventario } = estadoInventarioRemoto;
  const { ventas, totalVentasRegistros, paginaVentas, setPaginaVentas, cargandoVentas, errorVentas, productosVentaOpciones, setProductosVentaOpciones, totalProductosVentaOpciones, setTotalProductosVentaOpciones, paginaProductosVenta, setPaginaProductosVenta, cargandoProductosVenta, limpiarProductosVenta } = estadoVentasRemoto;
  const { compras, totalComprasRegistros, paginaCompras, setPaginaCompras, cargandoCompras, errorCompras, productosCompraOpciones, setProductosCompraOpciones, totalProductosCompraOpciones, setTotalProductosCompraOpciones, paginaProductosCompra, setPaginaProductosCompra, cargandoProductosCompra, limpiarProductosCompra } = estadoComprasRemoto;
  const { gastos, totalGastosRegistros, paginaGastos, setPaginaGastos, cargandoGastos, errorGastos } = estadoGastosRemoto;
  const { resumenDashboard, ventasDashboard, ventasPorFechaRecientes, cargarDatos, totalCompras, totalVentas, totalGastos, gananciaEstimada, costosVentasIncompletos, stockBajo } = estadoResumen;

  const actualizarBusquedaProductoVenta = (busqueda) => {
    setBusquedaProductoVenta(busqueda);
    if (!busqueda.trim()) {
      limpiarProductosVenta();
    }
  };

  const actualizarBusquedaProductoCompra = (busqueda) => {
    setBusquedaProductoCompra(busqueda);
    if (!busqueda.trim()) {
      limpiarProductosCompra();
    }
  };

  const cambiarMostrarVenta = (mostrar) => {
    setMostrarVenta(mostrar);
    if (!mostrar) {
      limpiarProductosVenta();
    }
  };

  const cambiarMostrarCompra = (mostrar) => {
    setMostrarCompra(mostrar);
    if (!mostrar) {
      limpiarProductosCompra();
    }
  };




  const { abrirNuevoProducto, abrirEditarProducto, guardarProducto, eliminarProducto, verDetallesProducto } = useAccionesInventario({
    apiRequest, catalogos, productoEditando, nuevoProducto, setNuevoProducto, setProductoEditando,
    setMostrarFormulario, setBusqueda, setPaginaInventario, setRevisionInventario, productosInventario,
    setProductoInventarioSeleccionado,
  });

  const productosFiltrados = productosInventario;

  const productosVentaFiltrados = productosVentaOpciones;

  const proveedoresFiltrados = proveedores.filter((proveedor) =>
    proveedor.toLowerCase().includes(busquedaProveedorCompra.toLowerCase())
  );

  const productosCompraFiltrados = productosCompraOpciones;

  const productoSeleccionadoCompra = productosCompraOpciones.find(
    (producto) => producto.id === Number(nuevaCompra.productoId)
  );

  const totalCarritoCompra = carritoCompra.reduce(
    (total, item) => total + item.precioUnitario * item.cantidad,
    0
  );

  const productoSeleccionadoVenta = productosVentaOpciones.find(
    (producto) => producto.id === Number(nuevaVenta.productoId)
  );
  const factorPrecioVenta = nuevaVenta.tipo === "Mayorista" ? 0.95 : 1;
  const totalCarritoVenta = carritoVenta.reduce(
    (total, item) =>
      total + item.precio * factorPrecioVenta * item.cantidad,
    0
  );

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

  const ventasFiltradas = ventas;
  const comprasFiltradas = compras;
  const gastosFiltrados = gastos;

  const calcularTotalCompra = (compra) =>
    obtenerLotesCompra(compra).reduce(
      (total, lote) => total + lote.precioUnitario * lote.cantidad,
      0
    );

  const obtenerLotesProducto = (producto) =>
    Array.isArray(producto?.lotes) ? producto.lotes : [];









  const { agregarProductoVenta, cambiarCantidadProductoVenta, registrarVenta } = useAccionesVentas({
    apiRequest, cargarDatos, accessToken, catalogos, nuevaVenta, carritoVenta, productosVentaOpciones,
    setCarritoVenta, setNuevaVenta, actualizarBusquedaProductoVenta, cambiarMostrarVenta,
    setBusquedaVentas, setPaginaVentas, setRevisionVentas, setRevisionInventario,
  });
  const { guardarProveedor, agregarProductoCompra, cambiarCantidadProductoCompra, registrarCompra, validarCompra, cancelarCompra } = useAccionesCompras({
    apiRequest, cargarDatos, accessToken, catalogos, nuevaCompra, carritoCompra, productosCompraOpciones,
    setNuevaCompra, setCarritoCompra, actualizarBusquedaProductoCompra, cambiarMostrarCompra,
    setBusquedaCompras, setPaginaCompras, setRevisionCompras, setRevisionInventario, compraVerificando,
    compraCancelando, fechasVencimiento, obtenerLotesCompra, setCompraVerificando, setCompraCancelando,
    setFechasVencimiento, nombreProveedorNuevo, setNombreProveedorNuevo, setCatalogos, setProveedores,
    setBusquedaProveedorCompra, setMostrarProveedorNuevo,
  });
  const registrarGasto = useAccionesGastos({
    apiRequest, cargarDatos, accessToken, catalogos, nuevoGasto, setBusquedaGastos, setPaginaGastos,
    setRevisionGastos, setMostrarGasto, setNuevoGasto,
  });

  const totalPaginasInventario = Math.ceil(totalProductosInventario / 10);
  const inicioPaginasInventario = Math.max(
    1,
    Math.min(paginaInventario - 2, totalPaginasInventario - 4)
  );
  const paginasInventario = Array.from(
    { length: Math.min(5, totalPaginasInventario) },
    (_, index) => inicioPaginasInventario + index
  );
  // ===== NAVEGACIÓN ENTRE MÓDULOS: INICIO =====
  // Cambia la vista principal y cierra el detalle de venta abierto.
  const cambiarSeccion = (nuevaSeccion) => {
    setVentaSeleccionada(null);
    setSeccion(nuevaSeccion);
  };
  // ===== NAVEGACIÓN ENTRE MÓDULOS: FIN =====

  const contextoAplicacion = {
    estadoResumen: { costosVentasIncompletos, esAdministrador, gananciaEstimada, obtenerCodigoVenta, resumenDashboard, seccion, stockBajo, totalVentas, ventasDashboard, ventasPorFechaRecientes },
    estadoInventario: { abrirEditarProducto, abrirNuevoProducto, busqueda, cargandoInventario, compras, eliminarProducto, errorInventario, esAdministrador, guardarProducto, mostrarFormulario, nuevoProducto, obtenerCodigoLote, obtenerLotesProducto, paginaInventario, paginasInventario, productoEditando, productoInventarioSeleccionado, productosFiltrados, resumenDashboard, seccion, setBusqueda, setMostrarFormulario, setNuevoProducto, setPaginaInventario, setProductoInventarioSeleccionado, totalPaginasInventario, totalProductosInventario, verDetallesProducto },
    estadoVentas: { agregarProductoVenta, busquedaProductoVenta, busquedaVentas, cambiarCantidadProductoVenta, cargandoProductosVenta, cargandoVentas, carritoVenta, errorVentas, factorPrecioVenta, mostrarVenta, nuevaVenta, obtenerCodigoVenta, obtenerProductosVenta, paginaProductosVenta, paginaVentas, productoSeleccionadoVenta, productosVentaFiltrados, registrarVenta, resumenDashboard, seccion, setBusquedaVentas, setCarritoVenta, setNuevaVenta, setPaginaProductosVenta, setPaginaVentas, setProductosVentaOpciones, setTotalProductosVentaOpciones, setVentaSeleccionada, setBusquedaProductoVenta: actualizarBusquedaProductoVenta, setMostrarVenta: cambiarMostrarVenta, totalCarritoVenta, totalProductosVentaOpciones, totalVentas, totalVentasRegistros, ventaSeleccionada, ventas, ventasFiltradas },
    estadoCompras: { agregarProductoCompra, busquedaCompras, busquedaProductoCompra, busquedaProveedorCompra, calcularTotalCompra, cambiarCantidadProductoCompra, cancelarCompra, cargandoCompras, cargandoProductosCompra, carritoCompra, compraCancelando, compraSeleccionada, compraVerificando, compras, comprasFiltradas, errorCompras, esAdministrador, fechasVencimiento, guardarProveedor, mostrarCompra, mostrarProveedorNuevo, nombreProveedorNuevo, nuevaCompra, obtenerCodigoCompra, obtenerCodigoLote, obtenerEstadoCompra, obtenerLotesCompra, paginaCompras, paginaProductosCompra, productoSeleccionadoCompra, productosCompraFiltrados, proveedores, proveedoresFiltrados, registrarCompra, resumenDashboard, seccion, setBusquedaCompras, setBusquedaProductoCompra: actualizarBusquedaProductoCompra, setMostrarCompra: cambiarMostrarCompra, setBusquedaProveedorCompra, setCarritoCompra, setCompraCancelando, setCompraSeleccionada, setCompraVerificando, setFechasVencimiento, setMostrarProveedorNuevo, setNombreProveedorNuevo, setNuevaCompra, setPaginaCompras, setPaginaProductosCompra, setProductosCompraOpciones, setTotalProductosCompraOpciones, totalCarritoCompra, totalCompras, totalComprasRegistros, totalProductosCompraOpciones, validarCompra },
    estadoGastos: { busquedaGastos, cargandoGastos, errorGastos, esAdministrador, gastos, gastosFiltrados, mostrarGasto, nuevoGasto, paginaGastos, registrarGasto, resumenDashboard, seccion, setBusquedaGastos, setMostrarGasto, setNuevoGasto, setPaginaGastos, totalGastos, totalGastosRegistros }
  };

  if (!logueado) {
    return <InicioSesion usuario={usuario} setUsuario={setUsuario} password={password} setPassword={setPassword} error={errorLogin} onSubmit={(event) => iniciarSesion(event, cargarDatos)} />;
  }

  // =========================
  // SISTEMA PRINCIPAL
  // =========================
  return (
    <ProveedorContexto value={contextoAplicacion}>
    <div className="app-container">

      {/* ================= SIDEBAR ================= */}
      <aside className="sidebar">

        <div className="sidebar-logo">
          <h2>Rapid Market</h2>
          <span>Sistema de Gestión</span>
          {rol && <small>Rol: {rol}</small>}
        </div>

        <nav className="sidebar-menu">

          <button
            className={
              seccion === "resumen"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => cambiarSeccion("resumen")}
          >
            📊 Resumen
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

          {esAdministrador && <button
            className={
              seccion === "compras"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => cambiarSeccion("compras")}
          >
            🚚 Compras
          </button>}

          {esAdministrador && <button
            className={
              seccion === "gastos"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => cambiarSeccion("gastos")}
          >
            💰 Gastos
          </button>}


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

        <Resumen />
        <Inventario />
        <Ventas />
        <Compras />
        <Gastos />


      </main>

      <FormularioProducto />
      <ModalesVenta />
      <DetalleCompra />
      <DetalleProducto />
      <VerificarCompra />
      <FormularioCompra />
      <FormularioGasto />
    </div>
    </ProveedorContexto>
  );
}

export default App;

