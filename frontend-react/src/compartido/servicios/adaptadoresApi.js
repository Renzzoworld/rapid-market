export const fechaVista = (value) => {
  if (!value) return "";
  const dateOnlyMatch = typeof value === "string" && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value);
  return date.toLocaleDateString("es-PE");
};

export const mapearProducto = (product) => ({
  id: product.id, nombre: product.name, cantidad: Number(product.stock),
  categoriaId: product.category_id, categoria: product.category,
  unidad: product.unit_abbr, unidadId: product.unit_id,
  precio: Number(product.price), precioVenta: Number(product.price),
  perecible: product.perishable, activo: product.active,
  stockMinimo: Number(product.min_stock), cantidadLotes: Number(product.lot_count || 0),
});

export const mapearVenta = (sale) => ({
  idVenta: sale.id, fecha: fechaVista(sale.fecha), tipo: sale.type,
  pago: sale.payment, total: Number(sale.total), cantidad: Number(sale.quantity),
  costoVendido: Number(sale.cost_of_goods_sold || 0), costoCompleto: sale.cost_data_complete,
  productos: sale.items.map((item) => ({
    id: item.product_id, nombre: item.name, cantidad: Number(item.quantity), precio: Number(item.price),
  })),
  producto: sale.items[0]?.name || "Venta", cantidadProductos: sale.items.length,
});

export const mapearCompra = (purchase) => ({
  idCompra: purchase.id, fecha: fechaVista(purchase.fecha), proveedor: purchase.provider,
  costo: Number(purchase.total), estado: purchase.state,
  lotes: purchase.items.map((item) => ({
    idLote: item.lot_id, idDetalle: item.detail_id, idProducto: item.product_id,
    fecha: fechaVista(purchase.fecha), producto: item.name, cantidad: Number(item.quantity),
    cantidadInicial: Number(item.quantity), cantidadActual: Number(item.current_quantity),
    precioUnitario: Number(item.unit_price), precioCompraUnitario: Number(item.unit_price),
    subtotal: Number(item.quantity) * Number(item.unit_price), perecible: item.perishable,
    fechaVencimiento: fechaVista(item.expiry_date),
  })),
});

export const mapearGasto = (expense) => ({
  id: expense.id, fecha: fechaVista(expense.fecha), descripcion: expense.description,
  categoria: expense.category, categoriaId: expense.category_id, monto: Number(expense.amount),
});
