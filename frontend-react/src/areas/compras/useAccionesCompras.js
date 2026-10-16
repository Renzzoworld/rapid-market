export function useAccionesCompras({ apiRequest, cargarDatos, accessToken, catalogos, nuevaCompra, carritoCompra, productosCompraOpciones, setNuevaCompra, setCarritoCompra, actualizarBusquedaProductoCompra, cambiarMostrarCompra, setBusquedaCompras, setPaginaCompras, setRevisionCompras, setRevisionInventario, compraVerificando, compraCancelando, fechasVencimiento, obtenerLotesCompra, setCompraVerificando, setCompraCancelando, setFechasVencimiento, nombreProveedorNuevo, setNombreProveedorNuevo, setCatalogos, setProveedores, setBusquedaProveedorCompra, setMostrarProveedorNuevo }) {
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
    const producto = productosCompraOpciones.find((item) => item.id === Number(nuevaCompra.productoId));
    const cantidad = Number(nuevaCompra.cantidad);
    const precioUnitario = Number(nuevaCompra.precioUnitario);
    if (!producto) { alert("Selecciona un producto."); return; }
    if (cantidad <= 0 || precioUnitario <= 0) { alert("Cantidad y precio unitario deben ser mayores que 0."); return; }
    setCarritoCompra([...carritoCompra, { id: producto.id, nombre: producto.nombre, cantidad, precioUnitario, perecible: producto.perecible }]);
    setNuevaCompra({ ...nuevaCompra, productoId: "", cantidad: 1, precioUnitario: "" });
    actualizarBusquedaProductoCompra("");
  };

  const cambiarCantidadProductoCompra = (indice, cambio) => setCarritoCompra(carritoCompra.map((item, index) =>
    index === indice ? { ...item, cantidad: Math.max(1, item.cantidad + cambio) } : item));

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
      setPaginaCompras(1);
      setRevisionCompras((revision) => revision + 1);
      setRevisionInventario((revision) => revision + 1);
      setCarritoCompra([]);
      cambiarMostrarCompra(false);
      setNuevaCompra({ proveedor: "", productoId: "", cantidad: 1, precioUnitario: "" });
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
      setRevisionCompras((revision) => revision + 1);
      setRevisionInventario((revision) => revision + 1);
      setCompraVerificando(null);
      setFechasVencimiento({});
    } catch (error) { alert(error.message); }
  };

  const cancelarCompra = async () => {
    if (!compraCancelando) return;
    try {
      await apiRequest(`/purchases/${compraCancelando.idCompra}/cancel/`, { method: "POST", body: JSON.stringify({}) });
      await cargarDatos(accessToken);
      setRevisionCompras((revision) => revision + 1);
      setRevisionInventario((revision) => revision + 1);
      setCompraCancelando(null);
      setCompraVerificando(null);
      setFechasVencimiento({});
    } catch (error) { alert(error.message); }
  };

  return { guardarProveedor, agregarProductoCompra, cambiarCantidadProductoCompra, registrarCompra, validarCompra, cancelarCompra };
}
