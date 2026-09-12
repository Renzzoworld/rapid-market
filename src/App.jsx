import { useState } from "react";
import "./App.css";

function App() {
  // =========================
  // LOGIN Y NAVEGACIÓN
  // =========================
  const [logueado, setLogueado] = useState(false);
  const [seccion, setSeccion] = useState("inicio");

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [errorLogin, setErrorLogin] = useState("");

  // =========================
  // INVENTARIO
  // =========================
  const [productos, setProductos] = useState([
    {
      id: 1,
      nombre: "Arroz Faraón",
      cantidad: 25,
      unidad: "kg",
      precio: 4.5,
    },
    {
      id: 2,
      nombre: "Azúcar rubia",
      cantidad: 8,
      unidad: "kg",
      precio: 4.2,
    },
    {
      id: 3,
      nombre: "Leche",
      cantidad: 4,
      unidad: "unidad",
      precio: 4.0,
    },
    {
      id: 4,
      nombre: "Bolsas de basura",
      cantidad: 2,
      unidad: "paquete",
      precio: 8.0,
    },
    {
      id: 5,
      nombre: "Papel higiénico",
      cantidad: 5,
      unidad: "paquete",
      precio: 12.0,
    },
    {
      id: 6,
      nombre: "Fideos",
      cantidad: 20,
      unidad: "paquete",
      precio: 3.5,
    },
    {
      id: 7,
      nombre: "Carbón",
      cantidad: 15,
      unidad: "kg",
      precio: 5.0,
    },
  ]);

  const [busqueda, setBusqueda] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);

  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "",
    cantidad: "",
    unidad: "unidad",
    precio: "",
  });

  // =========================
  // VENTAS
  // =========================
  const [ventas, setVentas] = useState([
    {
      id: "VT-003",
      fecha: "05/09/2026",
      producto: "Fideos",
      cantidad: 10,
      tipo: "Mayorista",
      pago: "Plin",
      total: 31.5,
    },
    {
      id: "VT-002",
      fecha: "06/09/2026",
      producto: "Leche",
      cantidad: 3,
      tipo: "Minorista",
      pago: "Efectivo",
      total: 12.0,
    },
    {
      id: "VT-001",
      fecha: "06/09/2026",
      producto: "Arroz Faraón",
      cantidad: 5,
      tipo: "Minorista",
      pago: "Yape",
      total: 22.5,
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
      id: 1,
      fecha: "05/09/2026",
      proveedor: "Proveedor de abarrotes",
      producto: "Arroz Faraón",
      cantidad: 20,
      costo: 75.0,
    },
    {
      id: 2,
      fecha: "04/09/2026",
      proveedor: "Distribuidora Lima",
      producto: "Leche",
      cantidad: 12,
      costo: 42.0,
    },
  ]);

  const [mostrarCompra, setMostrarCompra] = useState(false);

  const [nuevaCompra, setNuevaCompra] = useState({
    proveedor: "",
    productoId: "",
    cantidad: 1,
    costo: "",
  });

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
  // LOGIN
  // =========================
  const iniciarSesion = (e) => {
    e.preventDefault();

    if (usuario === "admin" && password === "123456") {
      setLogueado(true);
      setErrorLogin("");
    } else {
      setErrorLogin("Usuario o contraseña incorrectos");
    }
  };

  // =========================
  // INVENTARIO - NUEVO
  // =========================
  const abrirNuevoProducto = () => {
    setProductoEditando(null);

    setNuevoProducto({
      nombre: "",
      cantidad: "",
      unidad: "unidad",
      precio: "",
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
      cantidad: producto.cantidad,
      unidad: producto.unidad,
      precio: producto.precio,
    });

    setMostrarFormulario(true);
  };

  // =========================
  // INVENTARIO - GUARDAR
  // =========================
  const guardarProducto = (e) => {
    e.preventDefault();

    if (
      !nuevoProducto.nombre ||
      nuevoProducto.cantidad === "" ||
      nuevoProducto.precio === ""
    ) {
      alert("Completa todos los campos.");
      return;
    }
if (Number(nuevoProducto.cantidad) < 0) {
  alert("La cantidad no puede ser negativa.");
  return;
}

if (Number(nuevoProducto.precio) <= 0) {
  alert("El precio debe ser mayor que 0.");
  return;
}
    if (productoEditando) {
      setProductos(
        productos.map((producto) =>
          producto.id === productoEditando.id
            ? {
                ...producto,
                nombre: nuevoProducto.nombre,
                cantidad: Number(nuevoProducto.cantidad),
                unidad: nuevoProducto.unidad,
                precio: Number(nuevoProducto.precio),
              }
            : producto
        )
      );
    } else {
      const nuevo = {
        id: Date.now(),
        nombre: nuevoProducto.nombre,
        cantidad: Number(nuevoProducto.cantidad),
        unidad: nuevoProducto.unidad,
        precio: Number(nuevoProducto.precio),
      };

      setProductos([...productos, nuevo]);
    }

    setMostrarFormulario(false);

    setNuevoProducto({
      nombre: "",
      cantidad: "",
      unidad: "unidad",
      precio: "",
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

  const productosFiltrados = productos.filter((producto) =>
    producto.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const productosVentaFiltrados = productos.filter((producto) =>
    producto.nombre
      .toLowerCase()
      .includes(busquedaProductoVenta.toLowerCase())
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
      id: `VT-${String(
        Math.max(
          ...ventas.map((ventaRegistrada) =>
            Number(String(ventaRegistrada.id).replace("VT-", ""))
          ),
          0
        ) + 1
      ).padStart(3, "0")}`,
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

    // Descontar stock
    setProductos(
      productos.map((producto) => {
        const item = carritoVenta.find((linea) => linea.id === producto.id);
        return item
          ? { ...producto, cantidad: producto.cantidad - item.cantidad }
          : producto;
      })
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

    const producto = productos.find(
      (p) => p.id === Number(nuevaCompra.productoId)
    );

    const cantidad = Number(nuevaCompra.cantidad);
    const costo = Number(nuevaCompra.costo);

    if (!nuevaCompra.proveedor || !producto) {
      alert("Completa proveedor y producto.");
      return;
    }

    if (cantidad <= 0 || costo <= 0) {
      alert("Cantidad y costo deben ser mayores que 0.");
      return;
    }

    const compra = {
      id: Date.now(),
      fecha: new Date().toLocaleDateString("es-PE"),
      proveedor: nuevaCompra.proveedor,
      producto: producto.nombre,
      cantidad: cantidad,
      costo: costo,
    };

    setCompras([compra, ...compras]);

    // Aumentar stock
    setProductos(
      productos.map((p) =>
        p.id === producto.id
          ? {
              ...p,
              cantidad: p.cantidad + cantidad,
            }
          : p
      )
    );

    setNuevaCompra({
      proveedor: "",
      productoId: "",
      cantidad: 1,
      costo: "",
    });

    setMostrarCompra(false);
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
  const totalVentas = ventas.reduce(
    (total, venta) => total + venta.total,
    0
  );

  const totalCompras = compras.reduce(
    (total, compra) => total + compra.costo,
    0
  );

  const totalGastos = gastos.reduce(
    (total, gasto) => total + gasto.monto,
    0
  );

  const gananciaEstimada = totalVentas - totalCompras - totalGastos;

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

  const cambiarSeccion = (nuevaSeccion) => {
    setVentaSeleccionada(null);
    setSeccion(nuevaSeccion);
  };

  // =========================
  // CERRAR SESIÓN
  // =========================
  const cerrarSesion = () => {
    setLogueado(false);
    setUsuario("");
    setPassword("");
    setSeccion("inicio");
  };

  // =========================
  // LOGIN
  // =========================
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
                  <span>Ventas acumuladas</span>
                  <h2>S/ {totalVentas.toFixed(2)}</h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">💰</div>

                <div>
                  <span>Ganancia estimada</span>
                  <h2>S/ {gananciaEstimada.toFixed(2)}</h2>
                </div>
              </div>

            </div>
                      <div className="content-card sales-chart-card">

            <h3>Ventas por fecha</h3>

            <div className="sales-chart">

              {Object.entries(ventasPorFecha).map(
                ([fecha, total]) => {

                  const porcentaje =
                    (total / Math.max(...Object.values(ventasPorFecha))) *
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

                <h3>Ventas recientes</h3>

                {ventas.slice(0, 5).map((venta) => (
                  <div className="sale-row" key={venta.id}>
                    <span>
                      Venta {venta.id} -{" "}
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
                      <th>Cantidad</th>
                      <th>Unidad</th>
                      <th>Precio</th>
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

                        <td>{producto.cantidad}</td>

                        <td>{producto.unidad}</td>

                        <td>
                          S/ {producto.precio.toFixed(2)}
                        </td>

                        <td>

                          {producto.cantidad <= 5 ? (
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
                              className="action-button"
                              onClick={() =>
                                abrirEditarProducto(producto)
                              }
                            >
                              ✏️ Editar
                            </button>

                            <button
                              className="action-button delete"
                              onClick={() =>
                                eliminarProducto(producto.id)
                              }
                            >
                              🗑️ Eliminar
                            </button>

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

                    {ventas.map((venta) => (
                      <tr key={venta.id}>
                        <td>{venta.id}</td>
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

              <div className="table-container">

                <table>

                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Proveedor</th>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Costo</th>
                    </tr>
                  </thead>

                  <tbody>

                    {compras.map((compra) => (
                      <tr key={compra.id}>

                        <td>{compra.fecha}</td>
                        <td>{compra.proveedor}</td>

                        <td>
                          <strong>{compra.producto}</strong>
                        </td>

                        <td>{compra.cantidad}</td>

                        <td>
                          S/ {compra.costo.toFixed(2)}
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

                    {gastos.map((gasto) => (
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

              <div>
                <h1>Reportes</h1>
                <p>Resumen de información del negocio</p>
              </div>

            </div>

            <div className="stats-grid">

              <div className="stat-card">
                <div className="stat-icon">🛒</div>

                <div>
                  <span>Ventas</span>
                  <h2>S/ {totalVentas.toFixed(2)}</h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🚚</div>

                <div>
                  <span>Compras</span>
                  <h2>S/ {totalCompras.toFixed(2)}</h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">💸</div>

                <div>
                  <span>Gastos</span>
                  <h2>S/ {totalGastos.toFixed(2)}</h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📈</div>

                <div>
                  <span>Ganancia estimada</span>
                  <h2>S/ {gananciaEstimada.toFixed(2)}</h2>
                </div>
              </div>

            </div>

            <div className="dashboard-grid">

              <div className="content-card">

                <h3>Resumen financiero</h3>

                <div className="sale-row">
                  <span>Total de ventas</span>
                  <strong>S/ {totalVentas.toFixed(2)}</strong>
                </div>

                <div className="sale-row">
                  <span>Total de compras</span>
                  <strong>S/ {totalCompras.toFixed(2)}</strong>
                </div>

                <div className="sale-row">
                  <span>Total de gastos</span>
                  <strong>S/ {totalGastos.toFixed(2)}</strong>
                </div>

                <div className="sale-row">
                  <span>Ganancia estimada</span>
                  <strong>S/ {gananciaEstimada.toFixed(2)}</strong>
                </div>

              </div>

              <div className="content-card">

                <h3>Estado del inventario</h3>

                <div className="sale-row">
                  <span>Productos registrados</span>
                  <strong>{productos.length}</strong>
                </div>

                <div className="sale-row">
                  <span>Productos con stock bajo</span>
                  <strong>{stockBajo.length}</strong>
                </div>

                <div className="sale-row">
                  <span>Ventas registradas</span>
                  <strong>{ventas.length}</strong>
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

                  <label>Cantidad</label>

                  <input
                    type="number"
                    min="0"
                    value={nuevoProducto.cantidad}
                    onChange={(e) =>
                      setNuevoProducto({
                        ...nuevoProducto,
                        cantidad: e.target.value,
                      })
                    }
                  />

                </div>

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
                <p>{ventaSeleccionada.id}</p>
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
                      <tr key={`${ventaSeleccionada.id}-${producto.id}`}>
                        <td>{ventaSeleccionada.id}</td>
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
                onClick={() => setMostrarCompra(false)}
              >
                ×
              </button>

            </div>

            <form onSubmit={registrarCompra}>

              <div className="form-group">

                <label>Proveedor</label>

                <input
                  type="text"
                  placeholder="Nombre del proveedor"
                  value={nuevaCompra.proveedor}
                  onChange={(e) =>
                    setNuevaCompra({
                      ...nuevaCompra,
                      proveedor: e.target.value,
                    })
                  }
                />

              </div>

              <div className="form-group">

                <label>Producto</label>

                <select
                  value={nuevaCompra.productoId}
                  onChange={(e) =>
                    setNuevaCompra({
                      ...nuevaCompra,
                      productoId: e.target.value,
                    })
                  }
                >

                  <option value="">
                    Seleccionar producto
                  </option>

                  {productos.map((producto) => (
                    <option
                      key={producto.id}
                      value={producto.id}
                    >
                      {producto.nombre}
                    </option>
                  ))}

                </select>

              </div>

              <div className="form-group">

                <label>Cantidad</label>

                <input
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

              <div className="form-group">

                <label>Costo total de compra</label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={nuevaCompra.costo}
                  onChange={(e) =>
                    setNuevaCompra({
                      ...nuevaCompra,
                      costo: e.target.value,
                    })
                  }
                />

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setMostrarCompra(false)}
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