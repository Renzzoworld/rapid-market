import { useState } from "react";
import { mapearGasto } from "../../compartido/servicios/adaptadoresApi.js";
import { useConsultaPaginada } from "../../compartido/hooks/useConsultaPaginada.js";

export function useGastos({ apiRequest, logueado, seccion, esAdministrador, cargarDatos, accessToken, catalogos, resumenDashboard, totalGastos }) {
  const [busquedaGastos, setBusquedaGastos] = useState("");
  const [revision, setRevision] = useState(0);
  const [mostrarGasto, setMostrarGasto] = useState(false);
  const [nuevoGasto, setNuevoGasto] = useState({ descripcion: "", categoria: "Operativo", monto: "" });
  const consulta = useConsultaPaginada({
    apiRequest, ruta: "/expenses/",
    habilitada: logueado && seccion === "gastos" && esAdministrador, busqueda: busquedaGastos, revision, mapear: mapearGasto,
  });
  return {
    estado: {
      busquedaGastos, cargandoGastos: consulta.cargando, errorGastos: consulta.error,
      esAdministrador, gastos: consulta.registros, gastosFiltrados: consulta.registros,
      mostrarGasto, nuevoGasto, paginaGastos: consulta.pagina, resumenDashboard, seccion,
      setBusquedaGastos, setMostrarGasto, setNuevoGasto, setPaginaGastos: consulta.setPagina,
      totalGastos, totalGastosRegistros: consulta.total,
      registrarGasto: async (event) => {
        event.preventDefault();
        const category = catalogos.expense_categories.find((item) => item.name === nuevoGasto.categoria);
        if (!nuevoGasto.descripcion.trim() || Number(nuevoGasto.monto) <= 0 || !category) {
          alert("Completa la descripción, categoría y un monto válido.");
          return;
        }
        try {
          await apiRequest("/expenses/", { method: "POST", body: JSON.stringify({ description: nuevoGasto.descripcion.trim(), category_id: category.id, amount: Number(nuevoGasto.monto) }) });
          await cargarDatos(accessToken);
          setBusquedaGastos("");
          consulta.setPagina(1);
          setRevision((value) => value + 1);
          setMostrarGasto(false);
          setNuevoGasto({ descripcion: "", categoria: "Operativo", monto: "" });
        } catch (error) { alert(error.message); }
      },
    },
  };
}
