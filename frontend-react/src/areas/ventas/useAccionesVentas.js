export function useAccionesVentas({ apiRequest, cargarDatos, accessToken, catalogos, nuevaVenta, carritoVenta, productosVentaOpciones, setCarritoVenta, setNuevaVenta, actualizarBusquedaProductoVenta, cambiarMostrarVenta, setBusquedaVentas, setPaginaVentas, setRevisionVentas, setRevisionInventario }) {
  const agregarProductoVenta = () => {
    const producto = productosVentaOpciones.find((item) => item.id === Number(nuevaVenta.productoId));
    const cantidad = Number(nuevaVenta.cantidad);
    const productoEnCarrito = carritoVenta.find((item) => item.id === producto?.id);
    if (!producto) { alert("Selecciona un producto."); return; }
    if (cantidad <= 0) { alert("La cantidad debe ser mayor que 0."); return; }
    if (productoEnCarrito && productoEnCarrito.cantidad + cantidad > producto.cantidad) {
      alert("No hay suficiente stock disponible para agregar esa cantidad."); return;
    }
    if (!productoEnCarrito && cantidad > producto.cantidad) { alert("No hay suficiente stock disponible."); return; }
    setCarritoVenta(productoEnCarrito
      ? carritoVenta.map((item) => item.id === producto.id ? { ...item, cantidad: item.cantidad + cantidad } : item)
      : [...carritoVenta, { id: producto.id, nombre: producto.nombre, cantidad, precio: producto.precio, stock: producto.cantidad }]);
    setNuevaVenta({ ...nuevaVenta, productoId: "", cantidad: 1 });
    actualizarBusquedaProductoVenta("");
  };

  const cambiarCantidadProductoVenta = (productoId, cambio) => {
    setCarritoVenta(carritoVenta.map((item) => {
      if (item.id !== productoId) return item;
      return { ...item, cantidad: Math.min(item.stock, item.cantidad + cambio) };
    }).filter((item) => item.cantidad > 0));
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
      setPaginaVentas(1);
      setRevisionVentas((revision) => revision + 1);
      setRevisionInventario((revision) => revision + 1);
      setCarritoVenta([]);
      cambiarMostrarVenta(false);
      setNuevaVenta({ productoId: "", cantidad: 1, tipo: "Minorista", pago: "Efectivo" });
    } catch (error) { alert(error.message); }
  };
  return { agregarProductoVenta, cambiarCantidadProductoVenta, registrarVenta };
}
