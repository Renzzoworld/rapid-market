import { mapearGasto } from "../../servicios/adaptadoresApi.js";
import { useConsultaPaginada } from "../compartido/useConsultaPaginada.js";

export function useGastos({ apiRequest, logueado, seccion, esAdministrador, busqueda, revision }) {
  const consulta = useConsultaPaginada({
    apiRequest, ruta: "/expenses/",
    habilitada: logueado && seccion === "gastos" && esAdministrador, busqueda, revision, mapear: mapearGasto,
  });
  return {
    gastos: consulta.registros, totalGastosRegistros: consulta.total,
    paginaGastos: consulta.pagina, setPaginaGastos: consulta.setPagina,
    cargandoGastos: consulta.cargando, errorGastos: consulta.error,
  };
}
