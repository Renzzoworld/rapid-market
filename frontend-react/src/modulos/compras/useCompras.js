import { useState } from "react";
import { mapearCompra, mapearProducto } from "../../compartido/servicios/adaptadoresApi.js";
import { useConsultaPaginada } from "../../compartido/hooks/useConsultaPaginada.js";
import { useBusquedaProductos } from "../../compartido/hooks/useBusquedaProductos.js";

const compraInicial = { proveedor: "", productoId: "", cantidad: 1, precioUnitario: "" };
const obtenerLotesCompra = (purchase) => purchase.lotes || [{ idLote: Number(String(purchase.idCompra ?? purchase.id).replace("CPA-", "")), fecha: purchase.fecha, producto: purchase.producto, cantidad: purchase.cantidad, precioUnitario: purchase.costo / purchase.cantidad, subtotal: purchase.costo, perecible: false, fechaVencimiento: "" }];

export function useCompras({ apiRequest, logueado, seccion, esAdministrador, revisionProductos, invalidarInventario, cargarDatos, accessToken, catalogos, setCatalogos, proveedores, setProveedores, resumenDashboard, totalCompras }) {
  const [busquedaCompras, setBusquedaCompras] = useState("");
  const [revision, setRevision] = useState(0);
  const [mostrarCompra, setMostrarCompra] = useState(false);
  const [mostrarProveedorNuevo, setMostrarProveedorNuevo] = useState(false);
  const [nombreProveedorNuevo, setNombreProveedorNuevo] = useState("");
  const [compraSeleccionada, setCompraSeleccionada] = useState(null);
  const [compraVerificando, setCompraVerificando] = useState(null);
  const [compraCancelando, setCompraCancelando] = useState(null);
  const [fechasVencimiento, setFechasVencimiento] = useState({});
  const [nuevaCompra, setNuevaCompra] = useState(compraInicial);
  const [busquedaProveedorCompra, setBusquedaProveedorCompra] = useState("");
  const [busquedaProductoCompra, setBusquedaProductoCompra] = useState("");
  const [carritoCompra, setCarritoCompra] = useState([]);
  const historial = useConsultaPaginada({
    apiRequest, ruta: "/purchases/",
    habilitada: logueado && seccion === "compras" && esAdministrador, busqueda: busquedaCompras, revision, mapear: mapearCompra,
  });
  const productos = useBusquedaProductos({
    apiRequest, habilitada: logueado && mostrarCompra, busqueda: busquedaProductoCompra,
    revision: revisionProductos, mapear: mapearProducto,
  });
  const actualizarBusquedaProductoCompra = (value) => {
    setBusquedaProductoCompra(value);
    if (!value.trim()) productos.limpiar();
  };
  const cambiarMostrarCompra = (value) => {
    setMostrarCompra(value);
    if (!value) productos.limpiar();
  };
  const guardarProveedor = async () => {
    const name = nombreProveedorNuevo.trim();
    if (!name) { alert("Escribe el nombre del proveedor."); return; }
    try {
      const provider = await apiRequest("/providers/", { method: "POST", body: JSON.stringify({ name }) });
      setCatalogos((current) => ({ ...current, providers: [...current.providers, provider] }));
      setProveedores((current) => [...current, provider.name]);
      setNuevaCompra((current) => ({ ...current, proveedor: provider.name }));
      setBusquedaProveedorCompra(provider.name);
      setNombreProveedorNuevo("");
      setMostrarProveedorNuevo(false);
    } catch (error) { alert(error.message); }
  };
  const agregarProductoCompra = () => {
    const product = productos.registros.find((item) => item.id === Number(nuevaCompra.productoId));
    const quantity = Number(nuevaCompra.cantidad);
    const unitPrice = Number(nuevaCompra.precioUnitario);
    if (!product) { alert("Selecciona un producto."); return; }
    if (quantity <= 0 || unitPrice <= 0) { alert("Cantidad y precio unitario deben ser mayores que 0."); return; }
    setCarritoCompra([...carritoCompra, { id: product.id, nombre: product.nombre, cantidad: quantity, precioUnitario: unitPrice, perecible: product.perecible }]);
    setNuevaCompra({ ...nuevaCompra, productoId: "", cantidad: 1, precioUnitario: "" });
    actualizarBusquedaProductoCompra("");
  };
  const cambiarCantidadProductoCompra = (index, change) => setCarritoCompra(carritoCompra.map((item, itemIndex) => itemIndex === index ? { ...item, cantidad: Math.max(1, item.cantidad + change) } : item));
  const registrarCompra = async (event) => {
    event.preventDefault();
    const provider = catalogos.providers.find((item) => item.name === nuevaCompra.proveedor);
    if (!provider || !carritoCompra.length) { alert("Selecciona un proveedor y agrega productos."); return; }
    try {
      await apiRequest("/purchases/", { method: "POST", body: JSON.stringify({
        provider_id: provider.id,
        items: carritoCompra.map((item) => ({ product_id: item.id, quantity: item.cantidad, unit_price: item.precioUnitario })),
      }) });
      await cargarDatos(accessToken);
      setBusquedaCompras("");
      historial.setPagina(1);
      setRevision((value) => value + 1);
      invalidarInventario();
      setCarritoCompra([]);
      cambiarMostrarCompra(false);
      setNuevaCompra(compraInicial);
    } catch (error) { alert(error.message); }
  };
  const validarCompra = async () => {
    if (!compraVerificando) return;
    const expiries = {};
    for (const lot of obtenerLotesCompra(compraVerificando)) {
      const expiry = fechasVencimiento[lot.idLote] || lot.fechaVencimiento;
      if (lot.perecible && !expiry) { alert("Agrega el vencimiento de cada producto perecible."); return; }
      if (lot.idDetalle && expiry) expiries[lot.idDetalle] = expiry.split("/").reverse().join("-");
    }
    try {
      await apiRequest(`/purchases/${compraVerificando.idCompra}/deliver/`, { method: "POST", body: JSON.stringify({ expiries }) });
      await cargarDatos(accessToken);
      setRevision((value) => value + 1);
      invalidarInventario();
      setCompraVerificando(null);
      setFechasVencimiento({});
    } catch (error) { alert(error.message); }
  };
  const cancelarCompra = async () => {
    if (!compraCancelando) return;
    try {
      await apiRequest(`/purchases/${compraCancelando.idCompra}/cancel/`, { method: "POST", body: JSON.stringify({}) });
      await cargarDatos(accessToken);
      setRevision((value) => value + 1);
      invalidarInventario();
      setCompraCancelando(null);
      setCompraVerificando(null);
      setFechasVencimiento({});
    } catch (error) { alert(error.message); }
  };
  const productOptions = productos.registros;
  return {
    estado: {
      agregarProductoCompra, busquedaCompras, busquedaProductoCompra, busquedaProveedorCompra,
      calcularTotalCompra: (purchase) => obtenerLotesCompra(purchase).reduce((total, lot) => total + lot.precioUnitario * lot.cantidad, 0),
      cambiarCantidadProductoCompra, cancelarCompra, cargandoCompras: historial.cargando,
      cargandoProductosCompra: productos.cargando, carritoCompra, compraCancelando,
      compraSeleccionada, compraVerificando, compras: historial.registros,
      comprasFiltradas: historial.registros, errorCompras: historial.error, esAdministrador,
      fechasVencimiento, guardarProveedor, mostrarCompra, mostrarProveedorNuevo,
      nombreProveedorNuevo, nuevaCompra,
      obtenerCodigoCompra: (purchase) => `CPA-${purchase.idCompra ?? Number(String(purchase.id).replace("CPA-", ""))}`,
      obtenerCodigoLote: (lot) => `LT-${lot.idLote ?? Number(String(lot.id).replace("LT-", ""))}`,
      obtenerEstadoCompra: (purchase) => purchase.estado || "Pendiente de entrega",
      obtenerLotesCompra, paginaCompras: historial.pagina, paginaProductosCompra: productos.pagina,
      productoSeleccionadoCompra: productOptions.find((item) => item.id === Number(nuevaCompra.productoId)),
      productosCompraFiltrados: productOptions, proveedores,
      proveedoresFiltrados: proveedores.filter((provider) => provider.toLowerCase().includes(busquedaProveedorCompra.toLowerCase())),
      registrarCompra, resumenDashboard, seccion, setBusquedaCompras,
      setBusquedaProductoCompra: actualizarBusquedaProductoCompra, setMostrarCompra: cambiarMostrarCompra,
      setBusquedaProveedorCompra, setCarritoCompra, setCompraCancelando, setCompraSeleccionada,
      setCompraVerificando, setFechasVencimiento, setMostrarProveedorNuevo,
      setNombreProveedorNuevo, setNuevaCompra, setPaginaCompras: historial.setPagina,
      setPaginaProductosCompra: productos.setPagina, setProductosCompraOpciones: productos.setRegistros,
      setTotalProductosCompraOpciones: productos.setTotal,
      totalCarritoCompra: carritoCompra.reduce((total, item) => total + item.precioUnitario * item.cantidad, 0),
      totalCompras, totalComprasRegistros: historial.total,
      totalProductosCompraOpciones: productos.total, validarCompra,
    },
  };
}
