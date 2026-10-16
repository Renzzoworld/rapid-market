import { useState } from "react";
import { mapearProducto, mapearVenta } from "../../compartido/servicios/adaptadoresApi.js";
import { useConsultaPaginada } from "../../compartido/hooks/useConsultaPaginada.js";
import { useBusquedaProductos } from "../../compartido/hooks/useBusquedaProductos.js";

const ventaInicial = { productoId: "", cantidad: 1, tipo: "Minorista", pago: "Efectivo" };

export function useVentas({ apiRequest, logueado, seccion, revisionProductos, invalidarInventario, cargarDatos, accessToken, catalogos, resumenDashboard, totalVentas }) {
  const [busquedaVentas, setBusquedaVentas] = useState("");
  const [revision, setRevision] = useState(0);
  const [mostrarVenta, setMostrarVenta] = useState(false);
  const [nuevaVenta, setNuevaVenta] = useState(ventaInicial);
  const [busquedaProductoVenta, setBusquedaProductoVenta] = useState("");
  const [carritoVenta, setCarritoVenta] = useState([]);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const historial = useConsultaPaginada({
    apiRequest, ruta: "/sales/",
    habilitada: logueado && seccion === "ventas", busqueda: busquedaVentas, revision, mapear: mapearVenta,
  });
  const productos = useBusquedaProductos({
    apiRequest, habilitada: logueado && mostrarVenta, busqueda: busquedaProductoVenta,
    revision: revisionProductos, mapear: mapearProducto,
  });
  const actualizarBusquedaProductoVenta = (value) => {
    setBusquedaProductoVenta(value);
    if (!value.trim()) productos.limpiar();
  };
  const cambiarMostrarVenta = (value) => {
    setMostrarVenta(value);
    if (!value) productos.limpiar();
  };
  const agregarProductoVenta = () => {
    const product = productos.registros.find((item) => item.id === Number(nuevaVenta.productoId));
    const quantity = Number(nuevaVenta.cantidad);
    const existing = carritoVenta.find((item) => item.id === product?.id);
    if (!product) { alert("Selecciona un producto."); return; }
    if (quantity <= 0) { alert("La cantidad debe ser mayor que 0."); return; }
    if (existing && existing.cantidad + quantity > product.cantidad) { alert("No hay suficiente stock disponible para agregar esa cantidad."); return; }
    if (!existing && quantity > product.cantidad) { alert("No hay suficiente stock disponible."); return; }
    setCarritoVenta(existing
      ? carritoVenta.map((item) => item.id === product.id ? { ...item, cantidad: item.cantidad + quantity } : item)
      : [...carritoVenta, { id: product.id, nombre: product.nombre, cantidad: quantity, precio: product.precio, stock: product.cantidad }]);
    setNuevaVenta({ ...nuevaVenta, productoId: "", cantidad: 1 });
    actualizarBusquedaProductoVenta("");
  };
  const cambiarCantidadProductoVenta = (productId, change) => {
    setCarritoVenta(carritoVenta.map((item) => item.id !== productId ? item : { ...item, cantidad: Math.min(item.stock, item.cantidad + change) }).filter((item) => item.cantidad > 0));
  };
  const registrarVenta = async (event) => {
    event.preventDefault();
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
      setBusquedaVentas("");
      historial.setPagina(1);
      setRevision((value) => value + 1);
      invalidarInventario();
      setCarritoVenta([]);
      cambiarMostrarVenta(false);
      setNuevaVenta(ventaInicial);
    } catch (error) { alert(error.message); }
  };
  const factorPrecioVenta = nuevaVenta.tipo === "Mayorista" ? 0.95 : 1;
  const obtenerCodigoVenta = (sale) => `VT-${sale.idVenta ?? Number(String(sale.id).replace("VT-", ""))}`;
  const obtenerProductosVenta = (sale) => sale.productos || [{ id: sale.id, nombre: sale.producto, cantidad: sale.cantidad, precio: sale.total / sale.cantidad }];
  return {
    estado: {
      agregarProductoVenta, busquedaProductoVenta, busquedaVentas, cambiarCantidadProductoVenta,
      cargandoProductosVenta: productos.cargando, cargandoVentas: historial.cargando,
      carritoVenta, errorVentas: historial.error, factorPrecioVenta, mostrarVenta, nuevaVenta,
      obtenerCodigoVenta, obtenerProductosVenta, paginaProductosVenta: productos.pagina,
      paginaVentas: historial.pagina,
      productoSeleccionadoVenta: productos.registros.find((item) => item.id === Number(nuevaVenta.productoId)),
      productosVentaFiltrados: productos.registros, registrarVenta, resumenDashboard, seccion,
      setBusquedaVentas, setCarritoVenta, setNuevaVenta, setPaginaProductosVenta: productos.setPagina,
      setPaginaVentas: historial.setPagina, setProductosVentaOpciones: productos.setRegistros,
      setTotalProductosVentaOpciones: productos.setTotal, setVentaSeleccionada,
      setBusquedaProductoVenta: actualizarBusquedaProductoVenta, setMostrarVenta: cambiarMostrarVenta,
      totalCarritoVenta: carritoVenta.reduce((total, item) => total + item.precio * factorPrecioVenta * item.cantidad, 0),
      totalProductosVentaOpciones: productos.total, totalVentas,
      totalVentasRegistros: historial.total, ventaSeleccionada,
      ventas: historial.registros, ventasFiltradas: historial.registros,
    },
    limpiarProductosVenta: productos.limpiar,
  };
}
