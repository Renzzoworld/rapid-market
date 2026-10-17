import { useCallback, useState } from "react";
import "./App.css";
import { ProveedorContexto } from "./compartido/contexto/ProveedorContexto.jsx";
import { Resumen } from "./modulos/resumen/Resumen.jsx";
import { InicioSesion } from "./modulos/autenticacion/InicioSesion.jsx";
import { useAutenticacion } from "./modulos/autenticacion/useAutenticacion.js";
import { useClienteApi } from "./compartido/servicios/useClienteApi.js";
import { useInventario } from "./modulos/inventario/useInventario.js";
import { useVentas } from "./modulos/ventas/useVentas.js";
import { useCompras } from "./modulos/compras/useCompras.js";
import { useGastos } from "./modulos/gastos/useGastos.js";
import { useResumen } from "./modulos/resumen/useResumen.js";
import { Inventario, FormularioProducto, DetalleProducto } from "./modulos/inventario/Inventario.jsx";
import { Ventas, ModalesVenta } from "./modulos/ventas/Ventas.jsx";
import { Compras, DetalleCompra, VerificarCompra, FormularioCompra } from "./modulos/compras/Compras.jsx";
import { Gastos, FormularioGasto } from "./modulos/gastos/Gastos.jsx";

function App() {
  const [seccion, setSeccion] = useState("resumen");
  const auth = useAutenticacion();
  const { setAccessToken, setRefreshToken } = auth;
  const onTokensRenovados = useCallback((tokens) => {
    setAccessToken(tokens.access);
    if (tokens.refresh) setRefreshToken(tokens.refresh);
  }, [setAccessToken, setRefreshToken]);
  const { apiRequest, requestPublic } = useClienteApi({
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    onTokensRenovados,
  });
  const esAdministrador = ["admin", "administrador"].includes(auth.rol.trim().toLowerCase());
  const resumen = useResumen({ apiRequest });
  const inventario = useInventario({
    apiRequest, logueado: auth.logueado, seccion, catalogos: resumen.catalogos,
    esAdministrador, resumenDashboard: resumen.resumenDashboard,
  });
  const ventas = useVentas({
    apiRequest, logueado: auth.logueado, seccion, revisionProductos: inventario.revision,
    invalidarInventario: inventario.invalidar, cargarDatos: resumen.cargarDatos,
    accessToken: auth.accessToken, catalogos: resumen.catalogos,
    resumenDashboard: resumen.resumenDashboard, totalVentas: resumen.totalVentas,
  });
  const compras = useCompras({
    apiRequest, logueado: auth.logueado, seccion, esAdministrador,
    revisionProductos: inventario.revision, invalidarInventario: inventario.invalidar,
    cargarDatos: resumen.cargarDatos, accessToken: auth.accessToken,
    catalogos: resumen.catalogos, setCatalogos: resumen.setCatalogos,
    proveedores: resumen.proveedores, setProveedores: resumen.setProveedores,
    resumenDashboard: resumen.resumenDashboard, totalCompras: resumen.totalCompras,
  });
  const gastos = useGastos({
    apiRequest, logueado: auth.logueado, seccion, esAdministrador,
    cargarDatos: resumen.cargarDatos, accessToken: auth.accessToken,
    catalogos: resumen.catalogos, resumenDashboard: resumen.resumenDashboard,
    totalGastos: resumen.totalGastos,
  });

  const cerrarSesion = () => auth.cerrarSesion(apiRequest, () => {
    setSeccion("resumen");
    ventas.limpiarProductosVenta();
    compras.estado.setBusquedaProductoCompra("");
  });
  const cambiarSeccion = (nuevaSeccion) => {
    ventas.estado.setVentaSeleccionada(null);
    setSeccion(nuevaSeccion);
  };

  const contextoAplicacion = {
    estadoResumen: {
      costosVentasIncompletos: resumen.costosVentasIncompletos, esAdministrador,
      gananciaEstimada: resumen.gananciaEstimada, obtenerCodigoVenta: ventas.estado.obtenerCodigoVenta,
      resumenDashboard: resumen.resumenDashboard, seccion, stockBajo: resumen.stockBajo,
      totalVentas: resumen.totalVentas, ventasDashboard: resumen.ventasDashboard,
      ventasPorFechaRecientes: resumen.ventasPorFechaRecientes,
    },
    estadoInventario: { ...inventario.estado, compras: compras.estado.compras, seccion },
    estadoVentas: { ...ventas.estado, seccion },
    estadoCompras: { ...compras.estado, seccion },
    estadoGastos: { ...gastos.estado, seccion },
  };

  if (!auth.logueado) {
    return <InicioSesion
      usuario={auth.usuario} setUsuario={auth.setUsuario}
      password={auth.password} setPassword={auth.setPassword}
      error={auth.errorLogin}
      onSubmit={(event) => auth.iniciarSesion(event, resumen.cargarDatos, requestPublic)}
    />;
  }

  return (
    <ProveedorContexto value={contextoAplicacion}>
      <div className="app-container">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <h2>Rapid Market</h2>
            <span>Sistema de Gestión</span>
            {auth.rol && <small>Rol: {auth.rol}</small>}
          </div>
          <nav className="sidebar-menu">
            <button className={seccion === "resumen" ? "menu-item active" : "menu-item"} onClick={() => cambiarSeccion("resumen")}>📊 Resumen</button>
            <button className={seccion === "inventario" ? "menu-item active" : "menu-item"} onClick={() => cambiarSeccion("inventario")}>📦 Inventario</button>
            <button className={seccion === "ventas" ? "menu-item active" : "menu-item"} onClick={() => cambiarSeccion("ventas")}>🛒 Ventas</button>
            {esAdministrador && <button className={seccion === "compras" ? "menu-item active" : "menu-item"} onClick={() => cambiarSeccion("compras")}>🚚 Compras</button>}
            {esAdministrador && <button className={seccion === "gastos" ? "menu-item active" : "menu-item"} onClick={() => cambiarSeccion("gastos")}>💰 Gastos</button>}
          </nav>
          <button className="logout-button" onClick={cerrarSesion}>🚪 Cerrar sesión</button>
        </aside>
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
