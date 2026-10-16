import { useCallback, useEffect, useState } from "react";
import "./App.css";
import { ProveedorContexto } from "./contexto/ProveedorContexto.jsx";
import { Inicio } from "./areas/inicio/Inicio.jsx";
import { Inventario, FormularioProducto, DetalleProducto } from "./areas/inventario/Inventario.jsx";
import { Ventas, ModalesVenta } from "./areas/ventas/Ventas.jsx";
import { Compras, DetalleCompra, VerificarCompra, FormularioCompra } from "./areas/compras/Compras.jsx";
import { Gastos, FormularioGasto } from "./areas/gastos/Gastos.jsx";

// URL base usada por las peticiones de autenticacion del frontend.
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

// ===== ADAPTADORES DE RESPUESTAS API: INICIO =====
// Normalizan fechas y nombres de campos para las vistas de los módulos.
const fechaVista = (value) => {
  if (!value) return "";
  const dateOnlyMatch = typeof value === "string" && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value);
  return date.toLocaleDateString("es-PE");
};

const mapearProducto = (product) => ({
  id: product.id, nombre: product.name, cantidad: Number(product.stock),
  unidad: product.unit_abbr, unidadId: product.unit_id,
  precio: Number(product.price), precioVenta: Number(product.price),
  perecible: product.perishable, activo: product.active,
  stockMinimo: Number(product.min_stock),
  cantidadLotes: Number(product.lot_count || 0),
});

const mapearVenta = (sale) => ({
  idVenta: sale.id, fecha: fechaVista(sale.fecha), tipo: sale.type,
  pago: sale.payment, total: Number(sale.total), cantidad: Number(sale.quantity),
  costoVendido: Number(sale.cost_of_goods_sold || 0), costoCompleto: sale.cost_data_complete,
  productos: sale.items.map((item) => ({
    id: item.product_id, nombre: item.name, cantidad: Number(item.quantity), precio: Number(item.price),
  })),
  producto: sale.items[0]?.name || "Venta", cantidadProductos: sale.items.length,
});

const mapearCompra = (purchase) => ({
  idCompra: purchase.id, fecha: fechaVista(purchase.fecha), proveedor: purchase.provider,
  costo: Number(purchase.total), estado: purchase.state,
  lotes: purchase.items.map((item) => ({
    idLote: item.lot_id, idDetalle: item.detail_id, idProducto: item.product_id,
    fecha: fechaVista(purchase.fecha), producto: item.name, cantidad: Number(item.quantity),
    cantidadInicial: Number(item.quantity), cantidadActual: Number(item.current_quantity),
    precioUnitario: Number(item.unit_price), precioCompraUnitario: Number(item.unit_price),
    subtotal: Number(item.quantity) * Number(item.unit_price), perecible: item.perishable,
    fechaVencimiento: fechaVista(item.expiry_date),
  })),
});

const mapearGasto = (expense) => ({
  id: expense.id, fecha: fechaVista(expense.fecha), descripcion: expense.description,
  categoria: expense.category, categoriaId: expense.category_id, monto: Number(expense.amount),
});
// ===== ADAPTADORES DE RESPUESTAS API: FIN =====

// ===== COMPONENTES COMPARTIDOS: INICIO =====
// Controles reutilizables de paginación y selección remota de productos.
function App() {
  // ===== AUTENTICACIÓN Y PETICIONES HTTP: INICIO =====
  // Guarda credenciales y gestiona llamadas autenticadas, renovación y errores de API.
  const [logueado, setLogueado] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [errorLogin, setErrorLogin] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [rol, setRol] = useState("");
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
  }, [accessToken, refreshToken]);
  // ===== AUTENTICACIÓN Y PETICIONES HTTP: FIN =====

  // ===== RESUMEN - CARGA DE DATOS AGREGADOS: INICIO =====
  // Obtiene métricas, referencias y listas breves preparadas por el backend.
  const cargarDatos = async (token) => {
    const data = await apiRequest("/dashboard/", {}, token);
    setCatalogos(data.references);
    setProveedores(data.references.providers.map((provider) => provider.name));
    setResumenDashboard(data.summary);
    setProductosBajoStock(data.low_stock_products);
    setVentasDashboard((data.summary.recent_sales || []).map(mapearVenta));
    setVentasPorFechaRecientes((data.summary.sales_by_day || []).map((row) => [
      fechaVista(row.day), Number(row.total),
    ]));
  };
  // ===== RESUMEN - CARGA DE DATOS AGREGADOS: FIN =====

  // ===== COMPRAS - ALTA DE PROVEEDOR: INICIO =====
  // Registra un proveedor nuevo y lo selecciona en el formulario de compra.
  const guardarProveedor = async () => {
    const name = nombreProveedorNuevo.trim();
    if (!name) { alert("Escribe el nombre del proveedor."); return; }
    try {
      const provider = await apiRequest("/providers/", {
        method: "POST", body: JSON.stringify({ name }),
      });
      setCatalogos((current) => ({ ...current, providers: [...current.providers, provider] }));
      setProveedores((current) => [...current, provider.name]);
      setNuevaCompra((current) => ({ ...current, proveedor: provider.name }));
      setBusquedaProveedorCompra(provider.name);
      setNombreProveedorNuevo("");
      setMostrarProveedorNuevo(false);
    } catch (error) { alert(error.message); }
  };
  // ===== COMPRAS - ALTA DE PROVEEDOR: FIN =====

  // ===== LOGIN - INICIO Y CIERRE DE SESIÓN: INICIO =====
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
      setRefreshToken(data.refresh);
      setRol(data.user.role);
      await cargarDatos(data.access);
      setLogueado(true);
    } catch (error) {
      setErrorLogin(error.message || "No se pudo conectar con el servidor. Inténtalo de nuevo.");
    }
  };

  // Limpia la sesion local y devuelve al formulario de acceso.
  const cerrarSesion = async () => {
    try {
      if (refreshToken) await apiRequest("/logout/", { method: "POST", body: JSON.stringify({ refresh: refreshToken }) });
    } catch { /* Se limpia la sesión local incluso si el servidor no responde. */ }
    setLogueado(false);
    setAccessToken("");
    setRefreshToken("");
    setRol("");
    setUsuario("");
    setPassword("");
    setSeccion("inicio");
  };
  // ===== LOGIN - INICIO Y CIERRE DE SESIÓN: FIN =====

  // Navegacion de las secciones principales de la aplicacion.
  const [seccion, setSeccion] = useState("inicio");

  // ===== ESTADO DE MÓDULOS: INICIO =====
  // Inventario y selectores de producto, todos limitados a páginas remotas.
  const [productosInventario, setProductosInventario] = useState([]);
  const [productosVentaOpciones, setProductosVentaOpciones] = useState([]);
  const [productosCompraOpciones, setProductosCompraOpciones] = useState([]);
  const [paginaProductosVenta, setPaginaProductosVenta] = useState(1);
  const [paginaProductosCompra, setPaginaProductosCompra] = useState(1);
  const [totalProductosVentaOpciones, setTotalProductosVentaOpciones] = useState(0);
  const [totalProductosCompraOpciones, setTotalProductosCompraOpciones] = useState(0);
  const [cargandoProductosVenta, setCargandoProductosVenta] = useState(false);
  const [cargandoProductosCompra, setCargandoProductosCompra] = useState(false);
  const [totalProductosInventario, setTotalProductosInventario] = useState(0);
  const [paginaInventario, setPaginaInventario] = useState(1);
  const [cargandoInventario, setCargandoInventario] = useState(false);
  const [errorInventario, setErrorInventario] = useState("");
  const [revisionInventario, setRevisionInventario] = useState(0);

  const [resumenDashboard, setResumenDashboard] = useState({});
  const [productosBajoStock, setProductosBajoStock] = useState([]);
  const [ventasDashboard, setVentasDashboard] = useState([]);
  const [ventasPorFechaRecientes, setVentasPorFechaRecientes] = useState([]);

  const [busqueda, setBusqueda] = useState("");
  const [busquedaVentas, setBusquedaVentas] = useState("");
  const [busquedaCompras, setBusquedaCompras] = useState("");
  const [busquedaGastos, setBusquedaGastos] = useState("");
  const [paginaVentas, setPaginaVentas] = useState(1);
  const [paginaCompras, setPaginaCompras] = useState(1);
  const [paginaGastos, setPaginaGastos] = useState(1);
  const [totalVentasRegistros, setTotalVentasRegistros] = useState(0);
  const [totalComprasRegistros, setTotalComprasRegistros] = useState(0);
  const [totalGastosRegistros, setTotalGastosRegistros] = useState(0);
  const [cargandoVentas, setCargandoVentas] = useState(false);
  const [cargandoCompras, setCargandoCompras] = useState(false);
  const [cargandoGastos, setCargandoGastos] = useState(false);
  const [errorVentas, setErrorVentas] = useState("");
  const [errorCompras, setErrorCompras] = useState("");
  const [errorGastos, setErrorGastos] = useState("");
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
  const [ventas, setVentas] = useState([]);

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
  const [compras, setCompras] = useState([]);

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
  const [gastos, setGastos] = useState([]);

  const [mostrarGasto, setMostrarGasto] = useState(false);

  const [nuevoGasto, setNuevoGasto] = useState({
    descripcion: "",
    categoria: "Operativo",
    monto: "",
  });
  // ===== ESTADO DE MÓDULOS: FIN =====

  // ===== INVENTARIO - OPERACIONES: INICIO =====
  // Abre el formulario de alta y prepara sus campos.
const abrirNuevoProducto = () => {
  setProductoEditando(null);

  setNuevoProducto({
    nombre: "",
    unidad: "unidad",
    precio: "",
    perecible: false,
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
      perecible: producto.perecible,
    });

    setMostrarFormulario(true);
  };

  // =========================
  // INVENTARIO - GUARDAR
  // =========================
  const guardarProducto = async (e) => {
    e.preventDefault();
    const unit = catalogos.units.find((item) => item.abreviatura === nuevoProducto.unidad);
    if (!nuevoProducto.nombre.trim() || !unit || Number(nuevoProducto.precio) <= 0) {
      alert("Completa el nombre, unidad y un precio mayor que cero.");
      return;
    }
    const body = {
      name: nuevoProducto.nombre.trim(), unit_id: unit.id,
      price: Number(nuevoProducto.precio), perishable: Boolean(nuevoProducto.perecible),
      min_stock: Number(productoEditando?.stockMinimo ?? 5),
    };
    try {
      await apiRequest(productoEditando ? `/products/${productoEditando.id}/` : "/products/", {
        method: productoEditando ? "PATCH" : "POST", body: JSON.stringify(body),
      });
      setBusqueda(body.name);
      setPaginaInventario(1);
      setRevisionInventario((revision) => revision + 1);
      setMostrarFormulario(false);
      setProductoEditando(null);
    } catch (error) { alert(error.message); }
  };

  const eliminarProducto = async (id) => {
    const producto = productosInventario.find((item) => item.id === id);
    if (!producto || !window.confirm(`¿Desactivar "${producto.nombre}"?`)) return;
    try {
      await apiRequest(`/products/${id}/`, { method: "DELETE" });
      setRevisionInventario((revision) => revision + 1);
    }
    catch (error) { alert(error.message); }
  };

  const verDetallesProducto = async (producto) => {
    try {
      const details = await apiRequest(`/products/${producto.id}/`);
      setProductoInventarioSeleccionado({
        ...mapearProducto(details),
        lotes: details.lots.map((lot) => ({
          idLote: lot.lot_id,
          idProducto: details.id,
          producto: lot.product,
          unidad: lot.unit,
          cantidad: Number(lot.initial_quantity),
          cantidadInicial: Number(lot.initial_quantity),
          cantidadActual: Number(lot.current_quantity),
          fecha: fechaVista(lot.purchase_date),
          fechaCompra: fechaVista(lot.purchase_date),
          fechaVencimiento: fechaVista(lot.expiry_date),
          ordenCompra: `CPA-${lot.purchase_id}`,
        })),
      });
    } catch (error) {
      alert(error.message);
    }
  };
  // ===== INVENTARIO - OPERACIONES: FIN =====


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

  const agregarProductoVenta = () => {
    const producto = productosVentaOpciones.find(
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
              stock: producto.cantidad,
            },
          ]
    );
    setNuevaVenta({
      ...nuevaVenta,
      productoId: "",
      cantidad: 1,
    });
    setBusquedaProductoVenta("");
    setProductosVentaOpciones([]);
  };

  const agregarProductoCompra = () => {
    const producto = productosCompraOpciones.find(
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
    setProductosCompraOpciones([]);
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
        .map((item) => {
          if (item.id !== productoId) return item;
          const quantity = item.cantidad + cambio;
          return { ...item, cantidad: Math.min(item.stock, quantity) };
        })
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

  // ===== VENTAS - REGISTRO: INICIO =====
  // Valida el carrito y envía la venta; luego actualiza resumen, historial e inventario.
  const registrarVenta = async (e) => {
    e.preventDefault();
    if (!carritoVenta.length) { alert("Agrega al menos un producto a la venta."); return; }
    const type = catalogos.sale_types.find((item) => item.name === nuevaVenta.tipo);
    const payment = catalogos.payment_methods.find((item) => item.name === nuevaVenta.pago);
    if (!type || !payment) { alert("Falta configurar el tipo de venta o el método de pago."); return; }
    try {
      await apiRequest("/sales/", { method: "POST", body: JSON.stringify({
        sale_type_id: type.id, payment_method_id: payment.id,
        items: carritoVenta.map((item) => ({ product_id: item.id, quantity: item.cantidad })),
      }) });
      await cargarDatos(accessToken);
      setBusquedaVentas("");
      setPaginaVentas(1);
      setRevisionVentas((revision) => revision + 1);
      setRevisionInventario((revision) => revision + 1);
      setCarritoVenta([]); setMostrarVenta(false);
      setNuevaVenta({ productoId: "", cantidad: 1, tipo: "Minorista", pago: "Efectivo" });
    } catch (error) { alert(error.message); }
  };
  // ===== VENTAS - REGISTRO: FIN =====


  // ===== COMPRAS - OPERACIONES: INICIO =====
  // Alta, recepción de lotes y cancelación de compras.
  const registrarCompra = async (e) => {
    e.preventDefault();
    const provider = catalogos.providers.find((item) => item.name === nuevaCompra.proveedor);
    if (!provider || !carritoCompra.length) { alert("Selecciona un proveedor y agrega productos."); return; }
    try {
      await apiRequest("/purchases/", { method: "POST", body: JSON.stringify({
        provider_id: provider.id,
        items: carritoCompra.map((item) => ({ product_id: item.id, quantity: item.cantidad, unit_price: item.precioUnitario })),
      }) });
      await cargarDatos(accessToken);
      setBusquedaCompras("");
      setPaginaCompras(1);
      setRevisionCompras((revision) => revision + 1);
      setRevisionInventario((revision) => revision + 1);
      setCarritoCompra([]); setMostrarCompra(false);
      setNuevaCompra({ proveedor: "", productoId: "", cantidad: 1, precioUnitario: "" });
    } catch (error) { alert(error.message); }
  };


  const validarCompra = async () => {
    if (!compraVerificando) return;
    const lots = obtenerLotesCompra(compraVerificando);
    const expiries = {};
    for (const lot of lots) {
      const expiry = fechasVencimiento[lot.idLote] || lot.fechaVencimiento;
      if (lot.perecible && !expiry) { alert("Agrega el vencimiento de cada producto perecible."); return; }
      if (lot.idDetalle && expiry) expiries[lot.idDetalle] = expiry.split("/").reverse().join("-");
    }
    try {
      await apiRequest(`/purchases/${compraVerificando.idCompra}/deliver/`, { method: "POST", body: JSON.stringify({ expiries }) });
      await cargarDatos(accessToken);
      setRevisionCompras((revision) => revision + 1);
      setRevisionInventario((revision) => revision + 1);
      setCompraVerificando(null); setFechasVencimiento({});
    } catch (error) { alert(error.message); }
  };

  const cancelarCompra = async () => {
    if (!compraCancelando) return;
    try {
      await apiRequest(`/purchases/${compraCancelando.idCompra}/cancel/`, { method: "POST", body: JSON.stringify({}) });
      await cargarDatos(accessToken);
      setRevisionCompras((revision) => revision + 1);
      setRevisionInventario((revision) => revision + 1);
      setCompraCancelando(null); setCompraVerificando(null); setFechasVencimiento({});
    } catch (error) { alert(error.message); }
  };
  // ===== COMPRAS - OPERACIONES: FIN =====

  // ===== GASTOS - REGISTRO: INICIO =====
  // Valida y registra un gasto; refresca las métricas y el historial paginado.
  const registrarGasto = async (e) => {
    e.preventDefault();
    const category = catalogos.expense_categories.find((item) => item.name === nuevoGasto.categoria);
    if (!nuevoGasto.descripcion.trim() || Number(nuevoGasto.monto) <= 0 || !category) {
      alert("Completa la descripción, categoría y un monto válido."); return;
    }
    try {
      await apiRequest("/expenses/", { method: "POST", body: JSON.stringify({
        description: nuevoGasto.descripcion.trim(), category_id: category.id, amount: Number(nuevoGasto.monto),
      }) });
      await cargarDatos(accessToken);
      setBusquedaGastos("");
      setPaginaGastos(1);
      setRevisionGastos((revision) => revision + 1);
      setMostrarGasto(false);
      setNuevoGasto({ descripcion: "", categoria: "Operativo", monto: "" });
    } catch (error) { alert(error.message); }
  };
  // ===== GASTOS - REGISTRO: FIN =====


  // ===== RESUMEN - DATOS Y CÁLCULOS: INICIO =====
  // Las métricas globales vienen agregadas por el backend; aquí solo se formatean.
  const totalCompras = Number(resumenDashboard.purchases_total || 0);
  const totalVentas = Number(resumenDashboard.sales_total || 0);
  const totalGastos = Number(resumenDashboard.expenses_total || 0);
  const gananciaEstimada = Number(resumenDashboard.estimated_profit || 0);
  const costosVentasIncompletos = Number(resumenDashboard.sales_without_complete_cost || 0) > 0;
  const stockBajo = productosBajoStock.map((product) => ({
    id: product.id,
    nombre: product.name,
    cantidad: Number(product.stock),
  }));
  // ===== RESUMEN - DATOS Y CÁLCULOS: FIN =====

  // ===== INVENTARIO - CARGA PAGINADA: INICIO =====
  // Consulta solo la página visible y su búsqueda; invalida respuestas obsoletas.
  useEffect(() => {
    if (!logueado || seccion !== "inventario") return undefined;

    let vigente = true;
    const cargarPagina = async () => {
      setCargandoInventario(true);
      setErrorInventario("");
      const query = new URLSearchParams({
        page: String(paginaInventario),
        search: busqueda.trim(),
      });
      try {
        const data = await apiRequest(`/products/?${query.toString()}`);
        if (!vigente) return;
        setProductosInventario(data.results.map(mapearProducto));
        setTotalProductosInventario(data.count);
        if (data.page !== paginaInventario) setPaginaInventario(data.page);
      } catch (error) {
        if (vigente) setErrorInventario(error.message);
      } finally {
        if (vigente) setCargandoInventario(false);
      }
    };

    cargarPagina();
    return () => { vigente = false; };
  }, [logueado, seccion, apiRequest, busqueda, paginaInventario, revisionInventario]);
  // ===== INVENTARIO - CARGA PAGINADA: FIN =====

  // ===== VENTAS - CARGA PAGINADA: INICIO =====
  useEffect(() => {
    if (!logueado || seccion !== "ventas") return undefined;
    let vigente = true;
    const query = new URLSearchParams({ page: String(paginaVentas), search: busquedaVentas.trim() });
    const timer = setTimeout(() => {
      setCargandoVentas(true);
      setErrorVentas("");
      apiRequest(`/sales/?${query.toString()}`)
        .then((data) => {
          if (!vigente) return;
          setVentas(data.results.map(mapearVenta));
          setTotalVentasRegistros(data.count);
          if (data.page !== paginaVentas) setPaginaVentas(data.page);
        })
        .catch((error) => { if (vigente) setErrorVentas(error.message); })
        .finally(() => { if (vigente) setCargandoVentas(false); });
    }, 0);
    return () => { vigente = false; clearTimeout(timer); };
  }, [logueado, seccion, apiRequest, paginaVentas, busquedaVentas, revisionVentas]);
  // ===== VENTAS - CARGA PAGINADA: FIN =====

  // ===== COMPRAS - CARGA PAGINADA: INICIO =====
  useEffect(() => {
    if (!logueado || seccion !== "compras" || !esAdministrador) return undefined;
    let vigente = true;
    const query = new URLSearchParams({ page: String(paginaCompras), search: busquedaCompras.trim() });
    const timer = setTimeout(() => {
      setCargandoCompras(true);
      setErrorCompras("");
      apiRequest(`/purchases/?${query.toString()}`)
        .then((data) => {
          if (!vigente) return;
          setCompras(data.results.map(mapearCompra));
          setTotalComprasRegistros(data.count);
          if (data.page !== paginaCompras) setPaginaCompras(data.page);
        })
        .catch((error) => { if (vigente) setErrorCompras(error.message); })
        .finally(() => { if (vigente) setCargandoCompras(false); });
    }, 0);
    return () => { vigente = false; clearTimeout(timer); };
  }, [logueado, seccion, esAdministrador, apiRequest, paginaCompras, busquedaCompras, revisionCompras]);
  // ===== COMPRAS - CARGA PAGINADA: FIN =====

  // ===== GASTOS - CARGA PAGINADA: INICIO =====
  useEffect(() => {
    if (!logueado || seccion !== "gastos" || !esAdministrador) return undefined;
    let vigente = true;
    const query = new URLSearchParams({ page: String(paginaGastos), search: busquedaGastos.trim() });
    const timer = setTimeout(() => {
      setCargandoGastos(true);
      setErrorGastos("");
      apiRequest(`/expenses/?${query.toString()}`)
        .then((data) => {
          if (!vigente) return;
          setGastos(data.results.map(mapearGasto));
          setTotalGastosRegistros(data.count);
          if (data.page !== paginaGastos) setPaginaGastos(data.page);
        })
        .catch((error) => { if (vigente) setErrorGastos(error.message); })
        .finally(() => { if (vigente) setCargandoGastos(false); });
    }, 0);
    return () => { vigente = false; clearTimeout(timer); };
  }, [logueado, seccion, esAdministrador, apiRequest, paginaGastos, busquedaGastos, revisionGastos]);
  // ===== GASTOS - CARGA PAGINADA: FIN =====

  // ===== VENTAS - BÚSQUEDA DE PRODUCTOS PARA EL FORMULARIO: INICIO =====
  useEffect(() => {
    if (!logueado || !mostrarVenta || !busquedaProductoVenta.trim()) {
      setProductosVentaOpciones([]);
      setTotalProductosVentaOpciones(0);
      setCargandoProductosVenta(false);
      return undefined;
    }
    let vigente = true;
    const query = new URLSearchParams({ page: String(paginaProductosVenta), search: busquedaProductoVenta.trim() });
    const timer = setTimeout(() => {
      setCargandoProductosVenta(true);
      apiRequest(`/products/?${query.toString()}`)
        .then((data) => {
          if (!vigente) return;
          setProductosVentaOpciones(data.results.map(mapearProducto));
          setTotalProductosVentaOpciones(data.count);
          if (data.page !== paginaProductosVenta) setPaginaProductosVenta(data.page);
        })
        .catch((error) => { if (vigente) alert(error.message); })
        .finally(() => { if (vigente) setCargandoProductosVenta(false); });
    }, 150);
    return () => { vigente = false; clearTimeout(timer); };
  }, [logueado, mostrarVenta, busquedaProductoVenta, paginaProductosVenta, apiRequest]);
  // ===== VENTAS - BÚSQUEDA DE PRODUCTOS PARA EL FORMULARIO: FIN =====

  // ===== COMPRAS - BÚSQUEDA DE PRODUCTOS PARA EL FORMULARIO: INICIO =====
  useEffect(() => {
    if (!logueado || !mostrarCompra || !busquedaProductoCompra.trim()) {
      setProductosCompraOpciones([]);
      setTotalProductosCompraOpciones(0);
      setCargandoProductosCompra(false);
      return undefined;
    }
    let vigente = true;
    const query = new URLSearchParams({ page: String(paginaProductosCompra), search: busquedaProductoCompra.trim() });
    const timer = setTimeout(() => {
      setCargandoProductosCompra(true);
      apiRequest(`/products/?${query.toString()}`)
        .then((data) => {
          if (!vigente) return;
          setProductosCompraOpciones(data.results.map(mapearProducto));
          setTotalProductosCompraOpciones(data.count);
          if (data.page !== paginaProductosCompra) setPaginaProductosCompra(data.page);
        })
        .catch((error) => { if (vigente) alert(error.message); })
        .finally(() => { if (vigente) setCargandoProductosCompra(false); });
    }, 150);
    return () => { vigente = false; clearTimeout(timer); };
  }, [logueado, mostrarCompra, busquedaProductoCompra, paginaProductosCompra, apiRequest]);
  // ===== COMPRAS - BÚSQUEDA DE PRODUCTOS PARA EL FORMULARIO: FIN =====

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
    estadoVentas: { agregarProductoVenta, busquedaProductoVenta, busquedaVentas, cambiarCantidadProductoVenta, cargandoProductosVenta, cargandoVentas, carritoVenta, errorVentas, factorPrecioVenta, mostrarVenta, nuevaVenta, obtenerCodigoVenta, obtenerProductosVenta, paginaProductosVenta, paginaVentas, productoSeleccionadoVenta, productosVentaFiltrados, registrarVenta, resumenDashboard, seccion, setBusquedaProductoVenta, setBusquedaVentas, setCarritoVenta, setMostrarVenta, setNuevaVenta, setPaginaProductosVenta, setPaginaVentas, setProductosVentaOpciones, setTotalProductosVentaOpciones, setVentaSeleccionada, totalCarritoVenta, totalProductosVentaOpciones, totalVentas, totalVentasRegistros, ventaSeleccionada, ventas, ventasFiltradas },
    estadoCompras: { agregarProductoCompra, busquedaCompras, busquedaProductoCompra, busquedaProveedorCompra, calcularTotalCompra, cambiarCantidadProductoCompra, cancelarCompra, cargandoCompras, cargandoProductosCompra, carritoCompra, compraCancelando, compraSeleccionada, compraVerificando, compras, comprasFiltradas, errorCompras, esAdministrador, fechasVencimiento, guardarProveedor, mostrarCompra, mostrarProveedorNuevo, nombreProveedorNuevo, nuevaCompra, obtenerCodigoCompra, obtenerCodigoLote, obtenerEstadoCompra, obtenerLotesCompra, paginaCompras, paginaProductosCompra, productoSeleccionadoCompra, productosCompraFiltrados, proveedores, proveedoresFiltrados, registrarCompra, resumenDashboard, seccion, setBusquedaCompras, setBusquedaProductoCompra, setBusquedaProveedorCompra, setCarritoCompra, setCompraCancelando, setCompraSeleccionada, setCompraVerificando, setFechasVencimiento, setMostrarCompra, setMostrarProveedorNuevo, setNombreProveedorNuevo, setNuevaCompra, setPaginaCompras, setPaginaProductosCompra, setProductosCompraOpciones, setTotalProductosCompraOpciones, totalCarritoCompra, totalCompras, totalComprasRegistros, totalProductosCompraOpciones, validarCompra },
    estadoGastos: { busquedaGastos, cargandoGastos, errorGastos, esAdministrador, gastos, gastosFiltrados, mostrarGasto, nuevoGasto, paginaGastos, registrarGasto, resumenDashboard, seccion, setBusquedaGastos, setMostrarGasto, setNuevoGasto, setPaginaGastos, totalGastos, totalGastosRegistros }
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
              seccion === "inicio"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => cambiarSeccion("inicio")}
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

        <Inicio />
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
