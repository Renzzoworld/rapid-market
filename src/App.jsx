import { useState } from "react";
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
  const [refreshToken, setRefreshToken] = useState("");
  const [rol, setRol] = useState("");
  const esAdministrador = ["admin", "administrador"].includes(rol.trim().toLowerCase());

  const apiRequest = async (path, options = {}, token = accessToken) => {
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
  };

  const fechaVista = (value) => value ? new Date(value).toLocaleDateString("es-PE") : "";

  const cargarDatos = async (token) => {
    const data = await apiRequest("/dashboard/", {}, token);
    setCatalogos(data.references);
    setProveedores(data.references.providers.map((provider) => provider.name));
    setProductos(data.products.map((product) => ({
      id: product.id, nombre: product.name, cantidad: Number(product.stock),
      unidad: product.unit_abbr, unidadId: product.unit_id,
      precio: Number(product.price), precioVenta: Number(product.price),
      perecible: product.perishable, activo: product.active,
    })));
    setVentas(data.sales.map((sale) => ({
      idVenta: sale.id, fecha: fechaVista(sale.fecha), tipo: sale.type,
      pago: sale.payment, total: Number(sale.total), cantidad: Number(sale.quantity),
      costoVendido: Number(sale.cost_of_goods_sold), costoCompleto: sale.cost_data_complete,
      productos: sale.items.map((item) => ({ id: item.product_id, nombre: item.name, cantidad: Number(item.quantity), precio: Number(item.price) })),
      producto: sale.items[0]?.name || "Venta", cantidadProductos: sale.items.length,
    })));
    setCompras(data.purchases.map((purchase) => ({
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
    })));
    setGastos(data.expenses.map((expense) => ({
      id: expense.id, fecha: fechaVista(expense.fecha), descripcion: expense.description,
      categoria: expense.category, categoriaId: expense.category_id, monto: Number(expense.amount),
    })));
  };

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
  // ===== LOGIN FRONTEND: FIN =====

  // Navegacion de las secciones principales de la aplicacion.
  const [seccion, setSeccion] = useState("inicio");

  const [tipoReporte, setTipoReporte] = useState("ventas");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [reporte, setReporte] = useState(null);

  // =========================
  // INVENTARIO
  // =========================
  const [productos, setProductos] = useState([]);

  const [busqueda, setBusqueda] = useState("");
  const [busquedaVentas, setBusquedaVentas] = useState("");
  const [busquedaCompras, setBusquedaCompras] = useState("");
  const [busquedaGastos, setBusquedaGastos] = useState("");
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

  // =========================
  // VENTAS
  // =========================
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

  // =========================
  // COMPRAS
  // =========================
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

  // =========================
  // GASTOS
  // =========================
  const [gastos, setGastos] = useState([]);

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
      await cargarDatos(accessToken);
      setMostrarFormulario(false);
      setProductoEditando(null);
    } catch (error) { alert(error.message); }
  };

  const eliminarProducto = async (id) => {
    const producto = productos.find((item) => item.id === id);
    if (!producto || !window.confirm(`¿Desactivar "${producto.nombre}"?`)) return;
    try { await apiRequest(`/products/${id}/`, { method: "DELETE" }); await cargarDatos(accessToken); }
    catch (error) { alert(error.message); }
  };


  const productosFiltrados = productos.filter((producto) =>
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
  const ventasDashboard = ventasOrdenadas.slice(0, 5);

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

  const obtenerLotesProducto = (producto) =>
    (producto.lotes || []).map((lote) => ({
      ...lote,
      idProducto: producto.id,
      fechaCompra: lote.fechaCompra || lote.fecha,
      cantidadInicial: lote.cantidadInicial ?? lote.cantidad,
      cantidadActual: lote.cantidadActual ?? lote.cantidad,
      precioCompraUnitario: lote.precioCompraUnitario ?? lote.precioUnitario,
    })).concat(
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
      setCarritoVenta([]); setMostrarVenta(false);
      setNuevaVenta({ productoId: "", cantidad: 1, tipo: "Minorista", pago: "Efectivo" });
    } catch (error) { alert(error.message); }
  };


  // =========================
  // COMPRAS - REGISTRAR
  // =========================
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
      await cargarDatos(accessToken); setCompraVerificando(null); setFechasVencimiento({});
    } catch (error) { alert(error.message); }
  };

  const cancelarCompra = async () => {
    if (!compraCancelando) return;
    try {
      await apiRequest(`/purchases/${compraCancelando.idCompra}/cancel/`, { method: "POST", body: JSON.stringify({}) });
      await cargarDatos(accessToken); setCompraCancelando(null); setCompraVerificando(null); setFechasVencimiento({});
    } catch (error) { alert(error.message); }
  };

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
      await cargarDatos(accessToken); setMostrarGasto(false);
      setNuevoGasto({ descripcion: "", categoria: "Operativo", monto: "" });
    } catch (error) { alert(error.message); }
  };


  // =========================
  // CÁLCULOS
  // =========================
  const totalCompras = compras.reduce(
    (total, compra) =>
      total +
      (obtenerEstadoCompra(compra) === "Entregado"
        ? Number(compra.costo ?? calcularTotalCompra(compra) ?? 0)
        : 0),
    0
  );

  const totalVentas = ventas.reduce(
    (total, venta) => total + venta.total,
    0
  );

  const costoProductosVendidos = ventas.reduce(
    (total, venta) => total + (venta.costoVendido || 0),
    0
  );

  const totalGastos = gastos.reduce(
    (total, gasto) => total + gasto.monto,
    0
  );

  const gananciaEstimada = totalVentas - costoProductosVendidos - totalGastos;
  const costosVentasIncompletos = ventas.some((venta) => !venta.costoCompleto);

  const stockBajo = productos.filter(
    (producto) => producto.cantidad <= 5
  );
  // =========================
  // DATOS PARA GRÁFICO DE VENTAS
  // =========================
  const ventasPorFecha = ventas.reduce((resultado, venta) => {
    if (!resultado[venta.fecha]) {
      resultado[venta.fecha] = 0;
    }

    resultado[venta.fecha] += venta.total;

    return resultado;
  }, {});

  const ventasPorFechaRecientes = Object.entries(ventasPorFecha)
    .sort(([fechaA], [fechaB]) => {
      const fechaOrdenA = new Date(fechaA.split("/").reverse().join("-"));
      const fechaOrdenB = new Date(fechaB.split("/").reverse().join("-"));
      return fechaOrdenB - fechaOrdenA;
    })
    .slice(0, 5);

  const cambiarSeccion = (nuevaSeccion) => {
    setVentaSeleccionada(null);
    setSeccion(nuevaSeccion);
  };

  const generarReporte = async () => {
    const query = new URLSearchParams();
    if (fechaDesde) query.set("from", fechaDesde);
    if (fechaHasta) query.set("to", fechaHasta);
    try { setReporte(await apiRequest(`/reports/?${query.toString()}`)); }
    catch (error) { alert(error.message); }
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
            📊 {esAdministrador ? "Resumen y reportes" : "Resumen"}
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

        {/* ================= DASHBOARD ================= */}
        {seccion === "inicio" && (
          <>
            <div className="page-header">
              <div>
                <h1>{esAdministrador ? "Resumen y reportes" : "Resumen"}</h1>
                <p>{esAdministrador ? "Vista general del negocio y análisis por periodo" : "Consulta tu actividad de ventas y el stock disponible"}</p>
              </div>
            </div>

            <div className="stats-grid">

              <div className="stat-card">
                <div className="stat-icon">📦</div>

                <div>
                  <span>Total productos</span>
                  <h2>{productos.length}</h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⚠️</div>

                <div>
                  <span>Stock bajo</span>
                  <h2>{stockBajo.length}</h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🛒</div>

                <div>
                  <span>{esAdministrador ? "Ventas acumuladas" : "Mis ventas"}</span>
                  <h2>S/ {totalVentas.toFixed(2)}</h2>
                </div>
              </div>

              {esAdministrador && <div className="stat-card">
                <div className="stat-icon">💰</div>

                <div>
                  <span>Ganancia estimada</span>
                  <h2>S/ {gananciaEstimada.toFixed(2)}</h2>
                  {costosVentasIncompletos && <small>Hay ventas sin costo de lote completo; la cifra podría ser mayor a la real.</small>}
                </div>
              </div>}

            </div>
                      <div className="content-card sales-chart-card">

            <h3>Ventas por fecha</h3>

            <div className="sales-chart">

              {ventasPorFechaRecientes.map(
                ([fecha, total]) => {

                  const porcentaje =
                    (total / Math.max(...ventasPorFechaRecientes.map(([, valor]) => valor))) *
                    100;

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
                }
              )}

            </div>

          </div>
            <div className="dashboard-grid">

              <div className="content-card">

                <h3>{esAdministrador ? "Ventas recientes" : "Mis ventas recientes"}</h3>

                {ventasDashboard.map((venta) => (
                  <div className="sale-row" key={venta.idVenta ?? venta.id}>
                    <span>
                      Venta {obtenerCodigoVenta(venta)} -{" "}
                      {venta.producto}
                    </span>

                    <strong>
                      S/ {venta.total.toFixed(2)}
                    </strong>
                  </div>
                ))}

              </div>

              <div className="content-card">

                <h3>Productos con stock bajo</h3>

                {stockBajo.length === 0 ? (
                  <p>Todos los productos tienen stock suficiente.</p>
                ) : (
                  stockBajo.map((producto) => (
                    <div
                      className="sale-row"
                      key={producto.id}
                    >
                      <span>{producto.nombre}</span>
                      <strong>{producto.cantidad}</strong>
                    </div>
                  ))
                )}

              </div>

            </div>

            {esAdministrador && <div className="page-header">
              <div>
                <h1>Reportes detallados</h1>
                <p>Filtra la información por tipo y periodo.</p>
              </div>
            </div>}

            {esAdministrador && <div className="reports-panel">
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
                    setReporte(null);
                  }}>
                    Limpiar
                  </button>

                  <button type="button" className="primary-button" onClick={generarReporte}>
                    Generar reporte
                  </button>
                </div>
                {reporte && (
                  <div className="report-results" aria-live="polite">
                    <h2>Resumen del periodo</h2>
                    <p>Ventas: S/ {Number(reporte.sales_total).toFixed(2)}</p>
                    <p>Compras recibidas (referencia): S/ {Number(reporte.purchases_total).toFixed(2)}</p>
                    <p>Costo de productos vendidos: S/ {Number(reporte.cost_of_goods_sold).toFixed(2)}</p>
                    <p>Gastos: S/ {Number(reporte.expenses_total).toFixed(2)}</p>
                    <p>Ganancia estimada: S/ {Number(reporte.estimated_profit).toFixed(2)}</p>
                    {Number(reporte.sales_without_complete_cost) > 0 && <p className="report-cost-warning">Hay {reporte.sales_without_complete_cost} venta(s) sin costo de lote completo; la ganancia podría ser mayor a la real.</p>}
                    <div className="table-container">
                      <table>
                        <thead><tr><th>Detalle</th><th>Fecha / estado</th><th>Monto / stock</th></tr></thead>
                        <tbody>
                          {(tipoReporte === "ventas" ? reporte.sales : tipoReporte === "productos" ? reporte.products : tipoReporte === "compras" ? reporte.purchases : tipoReporte === "gastos" ? reporte.expenses : []).map((row, index) => (
                            <tr key={row.id || row.day || index}>
                              <td>{row.name || row.description || row.provider || (row.day ? fechaVista(row.day) : "")}</td>
                              <td>{row.state || row.category || (row.count ? `${row.count} venta(s)` : "")}</td>
                              <td>{row.stock !== undefined ? `${Number(row.stock)} ${row.unit_abbr}` : `S/ ${Number(row.total ?? row.amount ?? row.price ?? 0).toFixed(2)}`}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>}
          </>
        )}

        {/* ================= INVENTARIO ================= */}
        {seccion === "inventario" && (
          <>
            <div className="page-header">

              <div>
                <h1>Inventario</h1>
                <p>Control de productos y existencias</p>
              </div>

              {esAdministrador && <button
                className="primary-button"
                onClick={abrirNuevoProducto}
              >
                + Nuevo producto
              </button>}

            </div>

            <div className="inventory-summary">

              <div className="summary-card">
                <span>Total de productos</span>
                <strong>{productos.length}</strong>
              </div>

              <div className="summary-card warning">
                <span>Stock bajo</span>
                <strong>{stockBajo.length}</strong>
              </div>

            </div>

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
                      <th>Precio</th>
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
                          S/ {producto.precio.toFixed(2)}
                        </td>

                        <td>{obtenerLotesProducto(producto).length}</td>

                        <td>{producto.cantidad}</td>

                        <td>

                          {producto.cantidad === 0 ? (
                            <span className="status-badge out-of-stock">
                              Sin stock
                            </span>
                          ) : producto.cantidad <= 5 ? (
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

  {esAdministrador && <button
    type="button"
    className="edit-button"
    onClick={() => abrirEditarProducto(producto)}
  >
    <span aria-hidden="true">✏️</span> Editar
  </button>}

  {esAdministrador && <button
    type="button"
    className="action-button delete"
    title="Desactivar producto"
    aria-label={`Desactivar ${producto.nombre}`}
    onClick={() => eliminarProducto(producto.id)}
  >
    🗑️
  </button>}

</div>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

                {productosFiltrados.length === 0 && (
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
        {seccion === "compras" && esAdministrador && (
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
                <span>Costo de compras recibidas</span>
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

                    {comprasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="empty-state">
                          {busquedaCompras.trim()
                            ? "No se encontraron compras con esa búsqueda."
                            : "Todavía no hay compras registradas."}
                        </td>
                      </tr>
                    ) : comprasFiltradas.map((compra) => (
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
        {seccion === "gastos" && esAdministrador && (
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
                    <option value="unidad">Unidad</option>
                    <option value="kg">Kilogramo</option>
                    <option value="caja">Caja</option>
                    <option value="paquete">Paquete</option>
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

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(nuevoProducto.perecible)}
                    onChange={(e) => setNuevoProducto({ ...nuevoProducto, perecible: e.target.checked })}
                  />
                  Producto perecible (requiere fecha de vencimiento al recibir compras)
                </label>
              </div>

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
                        <td>{productoInventarioSeleccionado.unidad}</td>
                        <td>{lote.cantidadActual}</td>
                        <td>{lote.fecha}</td>
                        <td>{lote.fechaVencimiento || "---"}</td>
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

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setMostrarProveedorNuevo((visible) => !visible)}
                >
                  {mostrarProveedorNuevo ? "Cancelar nuevo proveedor" : "+ Agregar proveedor"}
                </button>

                {mostrarProveedorNuevo && (
                  <div className="provider-create-row">
                    <input
                      type="text"
                      maxLength="150"
                      placeholder="Nombre del proveedor"
                      value={nombreProveedorNuevo}
                      onChange={(event) => setNombreProveedorNuevo(event.target.value)}
                    />
                    <button type="button" className="primary-button" onClick={guardarProveedor}>
                      Guardar proveedor
                    </button>
                  </div>
                )}

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
