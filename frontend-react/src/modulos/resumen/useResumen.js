import { useCallback, useState } from "react";
import { fechaVista, mapearVenta } from "../../compartido/servicios/adaptadoresApi.js";

const catalogosIniciales = { units: [], providers: [], product_categories: [], payment_methods: [], sale_types: [], expense_categories: [] };

export function useResumen({ apiRequest }) {
  const [resumenDashboard, setResumenDashboard] = useState({});
  const [productosBajoStock, setProductosBajoStock] = useState([]);
  const [ventasDashboard, setVentasDashboard] = useState([]);
  const [ventasPorFechaRecientes, setVentasPorFechaRecientes] = useState([]);
  const [catalogos, setCatalogos] = useState(catalogosIniciales);
  const [proveedores, setProveedores] = useState([]);

  const cargarDatos = useCallback(async (token) => {
    const data = await apiRequest("/dashboard/", {}, token);
    setCatalogos(data.references);
    setProveedores(data.references.providers);
    setResumenDashboard(data.summary);
    setProductosBajoStock(data.low_stock_products);
    setVentasDashboard((data.summary.recent_sales || []).map(mapearVenta));
    setVentasPorFechaRecientes((data.summary.sales_by_day || []).map((row) => [
      fechaVista(row.day), Number(row.total),
    ]));
  }, [apiRequest]);

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

  return {
    resumenDashboard, productosBajoStock, ventasDashboard, ventasPorFechaRecientes,
    catalogos, setCatalogos, proveedores, setProveedores,
    cargarDatos, totalCompras, totalVentas, totalGastos, gananciaEstimada,
    costosVentasIncompletos, stockBajo,
  };
}
