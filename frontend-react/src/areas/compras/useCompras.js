import { mapearCompra, mapearProducto } from "../../servicios/adaptadoresApi.js";
import { useConsultaPaginada } from "../compartido/useConsultaPaginada.js";
import { useBusquedaProductos } from "../compartido/useBusquedaProductos.js";

export function useCompras({ apiRequest, logueado, seccion, esAdministrador, busqueda, revision, mostrarFormulario, busquedaProducto, revisionProductos }) {
  const historial = useConsultaPaginada({
    apiRequest, ruta: "/purchases/",
    habilitada: logueado && seccion === "compras" && esAdministrador, busqueda, revision, mapear: mapearCompra,
  });
  const productos = useBusquedaProductos({
    apiRequest, habilitada: logueado && mostrarFormulario, busqueda: busquedaProducto,
    revision: revisionProductos, mapear: mapearProducto,
  });
  return {
    compras: historial.registros, totalComprasRegistros: historial.total,
    paginaCompras: historial.pagina, setPaginaCompras: historial.setPagina,
    cargandoCompras: historial.cargando, errorCompras: historial.error,
    productosCompraOpciones: productos.registros, setProductosCompraOpciones: productos.setRegistros,
    totalProductosCompraOpciones: productos.total, setTotalProductosCompraOpciones: productos.setTotal,
    paginaProductosCompra: productos.pagina, setPaginaProductosCompra: productos.setPagina,
    cargandoProductosCompra: productos.cargando, limpiarProductosCompra: productos.limpiar,
  };
}
