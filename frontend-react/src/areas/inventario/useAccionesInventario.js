import { fechaVista, mapearProducto } from "../../servicios/adaptadoresApi.js";

export function useAccionesInventario({ apiRequest, catalogos, productoEditando, nuevoProducto, setNuevoProducto, setProductoEditando, setMostrarFormulario, setBusqueda, setPaginaInventario, setRevisionInventario, productosInventario, setProductoInventarioSeleccionado }) {
  const abrirNuevoProducto = () => {
    setProductoEditando(null);
    setNuevoProducto({ nombre: "", unidad: "unidad", precio: "", perecible: false });
    setMostrarFormulario(true);
  };

  const abrirEditarProducto = (producto) => {
    setProductoEditando(producto);
    setNuevoProducto({ nombre: producto.nombre, unidad: producto.unidad, precio: producto.precio, perecible: producto.perecible });
    setMostrarFormulario(true);
  };

  const guardarProducto = async (event) => {
    event.preventDefault();
    const unit = catalogos.units.find((item) => item.abreviatura === nuevoProducto.unidad);
    if (!nuevoProducto.nombre.trim() || !unit || Number(nuevoProducto.precio) <= 0) {
      alert("Completa el nombre, unidad y un precio mayor que cero.");
      return;
    }
    const body = {
      name: nuevoProducto.nombre.trim(), unit_id: unit.id,
      price: Number(nuevoProducto.precio), perishable: Boolean(nuevoProducto.perecible),
      min_stock: Number(productoEditando?.stockMinimo ?? 5),
    };
    try {
      await apiRequest(productoEditando ? `/products/${productoEditando.id}/` : "/products/", {
        method: productoEditando ? "PATCH" : "POST", body: JSON.stringify(body),
      });
      setBusqueda(body.name);
      setPaginaInventario(1);
      setRevisionInventario((revision) => revision + 1);
      setMostrarFormulario(false);
      setProductoEditando(null);
    } catch (error) { alert(error.message); }
  };

  const eliminarProducto = async (id) => {
    const producto = productosInventario.find((item) => item.id === id);
    if (!producto || !window.confirm(`¿Desactivar "${producto.nombre}"?`)) return;
    try {
      await apiRequest(`/products/${id}/`, { method: "DELETE" });
      setRevisionInventario((revision) => revision + 1);
    } catch (error) { alert(error.message); }
  };

  const verDetallesProducto = async (producto) => {
    try {
      const details = await apiRequest(`/products/${producto.id}/`);
      setProductoInventarioSeleccionado({
        ...mapearProducto(details),
        lotes: details.lots.map((lot) => ({
          idLote: lot.lot_id, idProducto: details.id, producto: lot.product, unidad: lot.unit,
          cantidad: Number(lot.initial_quantity), cantidadInicial: Number(lot.initial_quantity),
          cantidadActual: Number(lot.current_quantity), fecha: fechaVista(lot.purchase_date),
          fechaCompra: fechaVista(lot.purchase_date), fechaVencimiento: fechaVista(lot.expiry_date),
          ordenCompra: `CPA-${lot.purchase_id}`,
        })),
      });
    } catch (error) { alert(error.message); }
  };

  return { abrirNuevoProducto, abrirEditarProducto, guardarProducto, eliminarProducto, verDetallesProducto };
}
