import { mapearProducto, mapearVenta } from "../../servicios/adaptadoresApi.js";
import { useConsultaPaginada } from "../compartido/useConsultaPaginada.js";
import { useBusquedaProductos } from "../compartido/useBusquedaProductos.js";

export function useVentas({ apiRequest, logueado, seccion, busqueda, revision, mostrarFormulario, busquedaProducto, revisionProductos }) {
  const historial = useConsultaPaginada({
    apiRequest, ruta: "/sales/",
    habilitada: logueado && seccion === "ventas", busqueda, revision, mapear: mapearVenta,
  });
  const productos = useBusquedaProductos({
    apiRequest, habilitada: logueado && mostrarFormulario, busqueda: busquedaProducto,
    revision: revisionProductos, mapear: mapearProducto,
  });
  return {
    ventas: historial.registros, totalVentasRegistros: historial.total,
    paginaVentas: historial.pagina, setPaginaVentas: historial.setPagina,
    cargandoVentas: historial.cargando, errorVentas: historial.error,
    productosVentaOpciones: productos.registros, setProductosVentaOpciones: productos.setRegistros,
    totalProductosVentaOpciones: productos.total, setTotalProductosVentaOpciones: productos.setTotal,
    paginaProductosVenta: productos.pagina, setPaginaProductosVenta: productos.setPagina,
    cargandoProductosVenta: productos.cargando, limpiarProductosVenta: productos.limpiar,
  };
}
