export function useAccionesGastos({ apiRequest, cargarDatos, accessToken, catalogos, nuevoGasto, setBusquedaGastos, setPaginaGastos, setRevisionGastos, setMostrarGasto, setNuevoGasto }) {
  return async function registrarGasto(event) {
    event.preventDefault();
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
}
