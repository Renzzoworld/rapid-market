import { mapearProducto } from "../../servicios/adaptadoresApi.js";
import { useConsultaPaginada } from "../compartido/useConsultaPaginada.js";

export function useInventario({ apiRequest, logueado, seccion, busqueda, revision }) {
  const consulta = useConsultaPaginada({
    apiRequest, ruta: "/products/",
    habilitada: logueado && seccion === "inventario", busqueda, revision, mapear: mapearProducto,
  });
  return {
    productosInventario: consulta.registros,
    totalProductosInventario: consulta.total,
    paginaInventario: consulta.pagina,
    setPaginaInventario: consulta.setPagina,
    cargandoInventario: consulta.cargando,
    errorInventario: consulta.error,
  };
}
