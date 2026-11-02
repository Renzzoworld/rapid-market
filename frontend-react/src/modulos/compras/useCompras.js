import { useEffect, useRef, useState } from "react";
import { mapearCompra, mapearProducto } from "../../compartido/servicios/adaptadoresApi.js";
import { useConsultaPaginada } from "../../compartido/hooks/useConsultaPaginada.js";
import { useBusquedaProductos } from "../../compartido/hooks/useBusquedaProductos.js";

const compraInicial = {
  proveedor: "", providerId: "", providerEmailId: "", providerPhoneId: "", contactId: "",
  fechaEntregaRequerida: "", lugarEntrega: "", observaciones: "",
  productoId: "", cantidad: 1, precioUnitario: "",
};
const obtenerLotesCompra = (purchase) => purchase.lotes || [{
  idLote: Number(String(purchase.idCompra ?? purchase.id).replace("OC-", "").replace("CPA-", "")),
  fecha: purchase.fecha, producto: purchase.producto, cantidad: purchase.cantidad,
  precioUnitario: purchase.costo / purchase.cantidad, subtotal: purchase.costo,
  perecible: false, fechaVencimiento: "",
}];
const redondearDinero = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const fechaHoyLocal = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export function useCompras({ apiRequest, apiDownload, logueado, seccion, esAdministrador, revisionProductos, invalidarInventario, cargarDatos, accessToken, catalogos, setCatalogos, proveedores, setProveedores, resumenDashboard, totalCompras }) {
  const [busquedaCompras, setBusquedaCompras] = useState("");
  const [revision, setRevision] = useState(0);
  const [mostrarCompra, setMostrarCompra] = useState(false);
  const [cargandoProveedores, setCargandoProveedores] = useState(false);
  const [cargandoDetalleProveedorCompra, setCargandoDetalleProveedorCompra] = useState(false);
  const [errorProveedores, setErrorProveedores] = useState("");
  const [proveedorCompraDetalle, setProveedorCompraDetalle] = useState(null);
  const [ordenCompraDefaults, setOrdenCompraDefaults] = useState(null);
  const [compraSeleccionada, setCompraSeleccionada] = useState(null);
  const [ordenCompraPdf, setOrdenCompraPdf] = useState(null);
  const [cargandoOrdenCompraPdf, setCargandoOrdenCompraPdf] = useState(false);
  const ordenCompraPdfUrl = useRef(null);
  const [compraVerificando, setCompraVerificando] = useState(null);
  const [recepcionProductos, setRecepcionProductos] = useState([]);
  const [observacionesRecepcion, setObservacionesRecepcion] = useState("");
  const [errorRecepcion, setErrorRecepcion] = useState("");
  const [confirmacionRecepcion, setConfirmacionRecepcion] = useState("");
  const [guardandoRecepcion, setGuardandoRecepcion] = useState(false);
  const [compraCancelando, setCompraCancelando] = useState(null);
  const [confirmacionCancelacion, setConfirmacionCancelacion] = useState("");
  const [cancelandoCompra, setCancelandoCompra] = useState(false);
  const [nuevaCompra, setNuevaCompra] = useState(compraInicial);
  const [busquedaProveedorCompra, setBusquedaProveedorCompra] = useState("");
  const [busquedaProductoCompra, setBusquedaProductoCompra] = useState("");
  const [carritoCompra, setCarritoCompra] = useState([]);
  const historial = useConsultaPaginada({
    apiRequest, ruta: "/purchases/",
    habilitada: logueado && seccion === "compras" && esAdministrador,
    busqueda: busquedaCompras, revision, mapear: mapearCompra,
  });

  const cargarProveedores = async () => {
    if (!logueado || !esAdministrador) return;
    setCargandoProveedores(true);
    setErrorProveedores("");
    try {
      const [referencias, defaults] = await Promise.all([
        apiRequest("/references/"),
        apiRequest("/purchases/order-defaults/"),
      ]);
      setCatalogos((actuales) => ({ ...actuales, ...referencias }));
      setProveedores(referencias.providers);
      setOrdenCompraDefaults(defaults);
    } catch (error) {
      setErrorProveedores(error.message);
    } finally {
      setCargandoProveedores(false);
    }
  };

  const productos = useBusquedaProductos({
    apiRequest, habilitada: logueado && mostrarCompra, busqueda: busquedaProductoCompra,
    revision: revisionProductos, mapear: mapearProducto,
    categoryIds: nuevaCompra.providerId
      ? (catalogos.providers?.find((provider) => provider.id === Number(nuevaCompra.providerId))?.category_ids || [-1])
      : [],
  });
  const actualizarBusquedaProductoCompra = (value) => {
    setBusquedaProductoCompra(value);
    if (!value.trim()) productos.limpiar();
  };
  const cambiarMostrarCompra = (value) => {
    setMostrarCompra(value);
    if (!value) productos.limpiar();
  };
  const abrirNuevaCompra = async () => {
    let defaults = ordenCompraDefaults;
    if (!defaults) {
      try {
        defaults = await apiRequest("/purchases/order-defaults/");
        setOrdenCompraDefaults(defaults);
      } catch (error) {
        alert(error.message);
        return;
      }
    }
    setBusquedaProveedorCompra("");
    setBusquedaProductoCompra("");
    setProveedorCompraDetalle(null);
    setCarritoCompra([]);
    setNuevaCompra({ ...compraInicial, lugarEntrega: defaults.company?.domicilio_fiscal || "" });
    setMostrarCompra(true);
  };
  const cerrarNuevaCompra = () => {
    cambiarMostrarCompra(false);
    setNuevaCompra(compraInicial);
    setBusquedaProveedorCompra("");
    setBusquedaProductoCompra("");
    setProveedorCompraDetalle(null);
    setCarritoCompra([]);
  };
  const seleccionarProveedorCompra = async (provider) => {
    setBusquedaProveedorCompra(provider.name);
    setProveedorCompraDetalle(null);
    setCargandoDetalleProveedorCompra(true);
    setNuevaCompra({
      ...compraInicial,
      proveedor: provider.name,
      providerId: provider.id,
      lugarEntrega: ordenCompraDefaults?.company?.domicilio_fiscal || "",
    });
    setBusquedaProductoCompra("");
    productos.limpiar();
    try {
      const detail = await apiRequest(`/providers/manage/${provider.id}/`);
      setProveedorCompraDetalle(detail);
      const supplierEmails = (detail.datos_contacto || []).filter((item) => item.tipo === "correo");
      const supplierPhones = (detail.datos_contacto || []).filter((item) => item.tipo === "telefono");
      setNuevaCompra((current) => ({
        ...current,
        providerEmailId: supplierEmails[0]?.id || "",
        providerPhoneId: supplierPhones[0]?.id || "",
      }));
    } catch (error) {
      setErrorProveedores(error.message);
    } finally {
      setCargandoDetalleProveedorCompra(false);
    }
  };
  const cargarPrecioProductoProveedor = async (providerId, productId) => {
    if (!providerId || !productId) {
      setNuevaCompra((actual) => ({ ...actual, precioUnitario: "" }));
      return;
    }
    try {
      const result = await apiRequest(`/purchases/last-price/?provider_id=${providerId}&product_id=${productId}`);
      setNuevaCompra((actual) => ({
        ...actual,
        productoId: Number(productId),
        precioUnitario: result.last_price === null || result.last_price === undefined ? "" : String(result.last_price),
      }));
    } catch (error) {
      setNuevaCompra((actual) => ({ ...actual, productoId: Number(productId), precioUnitario: "" }));
    }
  };
  const agregarProductoCompra = () => {
    const product = productos.registros.find((item) => item.id === Number(nuevaCompra.productoId));
    const quantity = Number(nuevaCompra.cantidad);
    const unitPrice = Number(nuevaCompra.precioUnitario);
    if (!product) { alert("Selecciona un producto."); return; }
    if (quantity <= 0 || unitPrice <= 0) { alert("Cantidad y precio unitario sin IGV deben ser mayores que 0."); return; }
    setCarritoCompra([...carritoCompra, { id: product.id, nombre: product.nombre, cantidad: quantity, precioUnitario: unitPrice, perecible: product.perecible }]);
    setNuevaCompra({ ...nuevaCompra, productoId: "", cantidad: 1, precioUnitario: "" });
    actualizarBusquedaProductoCompra("");
  };
  const subtotalCarritoCompra = redondearDinero(carritoCompra.reduce((sum, item) => sum + redondearDinero(item.precioUnitario * item.cantidad), 0));
  const porcentajeIgvCompra = Number(ordenCompraDefaults?.igv_rate || 0);
  const igvCarritoCompra = redondearDinero(subtotalCarritoCompra * porcentajeIgvCompra / 100);
  const totalCarritoCompra = redondearDinero(subtotalCarritoCompra + igvCarritoCompra);

  const registrarCompra = async (event) => {
    event.preventDefault();
    const selectedProvider = catalogos.providers?.find((item) => item.id === Number(nuevaCompra.providerId));
    if (!selectedProvider || !carritoCompra.length) { alert("Selecciona un proveedor y agrega productos."); return; }
    if (!nuevaCompra.providerEmailId || !nuevaCompra.providerPhoneId) { alert("Selecciona un correo y teléfono del proveedor."); return; }
    if (!nuevaCompra.fechaEntregaRequerida || !nuevaCompra.lugarEntrega.trim()) { alert("Indica la fecha y el lugar de entrega."); return; }
    try {
      await apiRequest("/purchases/", { method: "POST", body: JSON.stringify({
        provider_id: Number(nuevaCompra.providerId),
        provider_email_id: Number(nuevaCompra.providerEmailId),
        provider_phone_id: Number(nuevaCompra.providerPhoneId),
        contact_id: nuevaCompra.contactId ? Number(nuevaCompra.contactId) : null,
        requested_delivery_date: nuevaCompra.fechaEntregaRequerida,
        delivery_address: nuevaCompra.lugarEntrega.trim(),
        observations: nuevaCompra.observaciones.trim(),
        items: carritoCompra.map((item) => ({ product_id: item.id, quantity: item.cantidad, unit_price: item.precioUnitario })),
      }) });
      await cargarDatos(accessToken);
      setBusquedaCompras("");
      historial.setPagina(1);
      setRevision((value) => value + 1);
      invalidarInventario();
      cerrarNuevaCompra();
    } catch (error) { alert(error.message); }
  };
  const verOrdenCompraPDF = async (purchase) => {
    setCargandoOrdenCompraPdf(true);
    try {
      const blob = await apiDownload(`/purchases/${purchase.idCompra}/order-pdf/`);
      const url = URL.createObjectURL(blob);
      if (ordenCompraPdfUrl.current) URL.revokeObjectURL(ordenCompraPdfUrl.current);
      ordenCompraPdfUrl.current = url;
      setOrdenCompraPdf({
        url,
        filename: `OC-${String(purchase.idCompra).padStart(6, "0")}.pdf`,
      });
    } catch (error) { alert(error.message); }
    finally { setCargandoOrdenCompraPdf(false); }
  };
  const cerrarVistaPreviaOrden = () => {
    if (ordenCompraPdfUrl.current) URL.revokeObjectURL(ordenCompraPdfUrl.current);
    ordenCompraPdfUrl.current = null;
    setOrdenCompraPdf(null);
  };
  useEffect(() => () => {
    if (ordenCompraPdfUrl.current) URL.revokeObjectURL(ordenCompraPdfUrl.current);
  }, []);
  const prepararRecepcionCompra = (purchase) => {
    setCompraVerificando(purchase);
    setObservacionesRecepcion("");
    setErrorRecepcion("");
    setConfirmacionRecepcion("");
    setRecepcionProductos(obtenerLotesCompra(purchase).map((lot) => ({
      detailId: lot.idDetalle,
      receivedQuantity: "",
      conforme: "",
      motivoRechazo: "",
      expiryDate: "",
    })));
  };
  const actualizarRecepcionProducto = (detailId, changes) => {
    setErrorRecepcion("");
    setConfirmacionRecepcion("");
    setRecepcionProductos((items) => items.map((item) => item.detailId === detailId ? { ...item, ...changes } : item));
  };
  const cancelarRecepcion = () => {
    setCompraVerificando(null);
    setRecepcionProductos([]);
    setObservacionesRecepcion("");
    setErrorRecepcion("");
    setConfirmacionRecepcion("");
  };
  const cancelarConfirmacionRecepcion = () => setConfirmacionRecepcion("");
  const iniciarCancelacionCompra = (purchase) => {
    setCompraCancelando(purchase);
    setConfirmacionCancelacion("");
    setErrorRecepcion("");
  };
  const cancelarCompraConfirmada = async () => {
    if (!compraCancelando) return;
    if (!confirmacionCancelacion) {
      setConfirmacionCancelacion("¿Estás seguro de cancelar la orden de compra?");
      return;
    }
    setCancelandoCompra(true);
    try {
      await apiRequest(`/purchases/${compraCancelando.idCompra}/cancel/`, { method: "POST", body: JSON.stringify({}) });
      await cargarDatos(accessToken);
      setRevision((value) => value + 1);
      setCompraCancelando(null);
      setConfirmacionCancelacion("");
      alert("Orden de compra cancelada.");
    } catch (error) {
      setErrorRecepcion(error.message || "No se pudo cancelar la orden de compra.");
    } finally {
      setCancelandoCompra(false);
    }
  };
  const cerrarCancelacionCompra = () => {
    setCompraCancelando(null);
    setConfirmacionCancelacion("");
    setErrorRecepcion("");
  };
  const registrarRecepcion = async () => {
    if (!compraVerificando) return;
    const lots = obtenerLotesCompra(compraVerificando);
    for (const lot of lots) {
      const receipt = recepcionProductos.find((item) => item.detailId === lot.idDetalle);
      if (!receipt || receipt.receivedQuantity === "" || !receipt.conforme) { setErrorRecepcion("Completa la cantidad recibida y el estado de cada producto."); return; }
      if (receipt.conforme === "false" && !receipt.motivoRechazo.trim()) { setErrorRecepcion(`Indica el motivo de rechazo de ${lot.producto}.`); return; }
      const receivedQuantity = Number(receipt.receivedQuantity);
      const orderedQuantity = Number(lot.cantidad);
      if (Number.isNaN(receivedQuantity) || receivedQuantity < 0 || receivedQuantity > orderedQuantity) {
        setErrorRecepcion(`La cantidad recibida de ${lot.producto} no puede ser mayor a la solicitada ni negativa.`);
        return;
      }
      if (lot.perecible && receipt.conforme === "true" && !receipt.expiryDate) { setErrorRecepcion(`Indica el vencimiento de ${lot.producto}.`); return; }
    }
    const willHaveRejectedLots = lots.some((lot) => {
      const receipt = recepcionProductos.find((item) => item.detailId === lot.idDetalle);
      const receivedQuantity = Number(receipt.receivedQuantity);
      const orderedQuantity = Number(lot.cantidad);
      const expired = lot.perecible && receipt.expiryDate && receipt.expiryDate < fechaHoyLocal();
      return receipt.conforme === "false" || receivedQuantity > orderedQuantity || expired;
    });
    const hasPartialAcceptedLots = lots.some((lot) => {
      const receipt = recepcionProductos.find((item) => item.detailId === lot.idDetalle);
      const receivedQuantity = Number(receipt.receivedQuantity);
      const orderedQuantity = Number(lot.cantidad);
      return receipt.conforme === "true" && receivedQuantity > 0 && receivedQuantity < orderedQuantity;
    });
    if (willHaveRejectedLots || hasPartialAcceptedLots) {
      const willReceiveAnyLot = lots.some((lot) => {
        const receipt = recepcionProductos.find((item) => item.detailId === lot.idDetalle);
        const receivedQuantity = Number(receipt.receivedQuantity);
        const orderedQuantity = Number(lot.cantidad);
        const notExpired = !lot.perecible || !receipt.expiryDate || receipt.expiryDate >= fechaHoyLocal();
        return receipt.conforme === "true" && receivedQuantity >= 0 && receivedQuantity <= orderedQuantity && notExpired;
      });
      const message = willReceiveAnyLot
        ? "Se ingresarán al inventario los lotes recibidos y la orden quedará parcialmente entregada. Los lotes rechazados no ingresarán. ¿Deseas continuar?"
        : "Todos los lotes quedarán rechazados y no ingresarán al inventario. ¿Deseas continuar?";
      if (!confirmacionRecepcion) {
        setConfirmacionRecepcion(message);
        return;
      }
    }
    setErrorRecepcion("");
    setConfirmacionRecepcion("");
    setGuardandoRecepcion(true);
    try {
      const result = await apiRequest(`/purchases/${compraVerificando.idCompra}/receive/`, { method: "POST", body: JSON.stringify({
        observations: observacionesRecepcion.trim(),
        items: recepcionProductos.map((item) => ({
          detail_id: item.detailId,
          received_quantity: item.receivedQuantity,
          conforme: item.conforme === "true",
          motivo_rechazo: item.motivoRechazo.trim(),
          expiry_date: item.expiryDate || null,
        })),
      }) });
      await cargarDatos(accessToken);
      setRevision((value) => value + 1);
      if (result.state === "Recibido" || result.state === "Parcialmente entregado") invalidarInventario();
      cancelarRecepcion();
      const messages = {
        "Recibido": "Recepción registrada. Todos los lotes ingresaron al inventario.",
        "Parcialmente entregado": "Recepción registrada. Los lotes recibidos ingresaron al inventario; los rechazados no.",
        "Rechazado": "Recepción registrada. Ningún lote ingresó al inventario.",
      };
      alert(messages[result.state] || "Recepción registrada.");
    } catch (error) { setErrorRecepcion(error.message || "No se pudo registrar la revisión."); }
    finally { setGuardandoRecepcion(false); }
  };
  const registrarFactura = async (purchaseId, formData) => {
    try {
      const result = await apiRequest(`/purchases/${purchaseId}/invoice/`, { method: "POST", body: formData });
      setRevision((value) => value + 1);
      setCompraSeleccionada((current) => current ? { ...current, facturaProveedor: {
        tipo: result.invoice.tipo, numero: result.invoice.numero,
        fechaEmision: result.invoice.fecha_emision.split("-").reverse().join("/"),
        montoTotal: Number(result.invoice.monto_total),
        tieneArchivo: result.invoice.has_file, nombreArchivo: result.invoice.filename || "",
      } } : current);
      alert("Factura registrada.");
      return true;
    } catch (error) { alert(error.message); }
    return false;
  };
  const descargarFactura = async (purchaseId, filename) => {
    try {
      const blob = await apiDownload(`/purchases/${purchaseId}/invoice/file/`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || "factura-proveedor";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { alert(error.message); }
  };
  const productOptions = productos.registros;
  return {
    estado: {
      agregarProductoCompra, busquedaCompras, busquedaProductoCompra, busquedaProveedorCompra,
      calcularTotalCompra: (purchase) => Number(purchase.total ?? obtenerLotesCompra(purchase).reduce((total, lot) => total + lot.precioUnitario * lot.cantidad, 0)),
      cambiarCantidadProductoCompra: (index, change) => setCarritoCompra((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, cantidad: Math.max(1, item.cantidad + change) } : item)),
      cargandoCompras: historial.cargando, cargarPrecioProductoProveedor, cargandoDetalleProveedorCompra,
      cargandoProductosCompra: productos.cargando, cargandoProveedores, carritoCompra,
      compraSeleccionada, compraVerificando, compraCancelando, recepcionProductos, observacionesRecepcion,
      guardandoRecepcion, errorRecepcion, confirmacionRecepcion, confirmacionCancelacion, cancelandoCompra,
      ordenCompraPdf, cargandoOrdenCompraPdf,
      compras: historial.registros, comprasFiltradas: historial.registros,
      errorCompras: historial.error, esAdministrador, cargarProveedores, errorProveedores,
      mostrarCompra, nuevaCompra, ordenCompraDefaults, proveedorCompraDetalle, setProveedorCompraDetalle,
      obtenerCodigoCompra: (purchase) => `OC-${String(purchase.idCompra ?? Number(String(purchase.id).replace(/^(OC|CPA)-/, ""))).padStart(6, "0")}`,
      obtenerCodigoLote: (lot) => `LT-${lot.idLote ?? Number(String(lot.id).replace("LT-", ""))}`,
      obtenerEstadoCompra: (purchase) => purchase.recepcion?.resultado || purchase.estado || "Pendiente",
      obtenerLotesCompra, paginaCompras: historial.pagina, paginaProductosCompra: productos.pagina,
      productoSeleccionadoCompra: productOptions.find((item) => item.id === Number(nuevaCompra.productoId)),
      productosCompraFiltrados: productOptions, proveedores,
      proveedoresFiltrados: proveedores.filter((provider) => provider.name.toLowerCase().includes(busquedaProveedorCompra.toLowerCase())),
      registrarCompra, verOrdenCompraPDF, cerrarVistaPreviaOrden, registrarRecepcion,
      prepararRecepcionCompra, actualizarRecepcionProducto, cancelarRecepcion, cancelarConfirmacionRecepcion,
      iniciarCancelacionCompra, cancelarCompraConfirmada, cerrarCancelacionCompra,
      registrarFactura, descargarFactura,
      abrirNuevaCompra, cerrarNuevaCompra, seleccionarProveedorCompra,
      resumenDashboard, seccion, setBusquedaCompras,
      setBusquedaProductoCompra: actualizarBusquedaProductoCompra, setMostrarCompra: cambiarMostrarCompra,
      setBusquedaProveedorCompra, setCarritoCompra, setCompraSeleccionada,
      setCompraVerificando, setObservacionesRecepcion, setNuevaCompra, setPaginaCompras: historial.setPagina,
      setPaginaProductosCompra: productos.setPagina, setProductosCompraOpciones: productos.setRegistros,
      setTotalProductosCompraOpciones: productos.setTotal,
      totalCarritoCompra: subtotalCarritoCompra, subtotalCarritoCompra, porcentajeIgvCompra,
      igvCarritoCompra, totalFinalCompra: totalCarritoCompra,
      totalCompras, totalComprasRegistros: historial.total,
      totalProductosCompraOpciones: productos.total,
    },
  };
}
