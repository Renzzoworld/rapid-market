import { useState } from "react";
import { fechaVista, mapearProducto } from "../../compartido/servicios/adaptadoresApi.js";
import { useConsultaPaginada } from "../../compartido/hooks/useConsultaPaginada.js";

export function useInventario({ apiRequest, logueado, seccion, catalogos, esAdministrador, resumenDashboard }) {
  const [busqueda, setBusqueda] = useState("");
  const [revision, setRevision] = useState(0);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [productoInventarioSeleccionado, setProductoInventarioSeleccionado] = useState(null);
  const [nuevoProducto, setNuevoProducto] = useState({ nombre: "", cantidad: "", unidad: "unidad", precio: "", categoriaId: "" });
  const consulta = useConsultaPaginada({
    apiRequest, ruta: "/products/",
    habilitada: logueado && seccion === "inventario", busqueda, revision, mapear: mapearProducto,
  });
  const abrirNuevoProducto = () => {
    setProductoEditando(null);
    setNuevoProducto({ nombre: "", unidad: "unidad", precio: "", perecible: false, categoriaId: "" });
    setMostrarFormulario(true);
  };
  const abrirEditarProducto = (producto) => {
    setProductoEditando(producto);
    setNuevoProducto({ nombre: producto.nombre, unidad: producto.unidad, precio: producto.precio, perecible: producto.perecible, categoriaId: String(producto.categoriaId) });
    setMostrarFormulario(true);
  };
  const guardarProducto = async (event) => {
    event.preventDefault();
    const unit = catalogos.units.find((item) => item.abreviatura === nuevoProducto.unidad);
    if (!nuevoProducto.nombre.trim() || !unit || !nuevoProducto.categoriaId || Number(nuevoProducto.precio) <= 0) {
      alert("Completa nombre, unidad, categoría y precio.");
      return;
    }
    const body = { name: nuevoProducto.nombre.trim(), unit_id: unit.id, category_id: Number(nuevoProducto.categoriaId), price: Number(nuevoProducto.precio), perishable: Boolean(nuevoProducto.perecible), min_stock: Number(productoEditando?.stockMinimo ?? 5) };
    try {
      await apiRequest(productoEditando ? `/products/${productoEditando.id}/` : "/products/", { method: productoEditando ? "PATCH" : "POST", body: JSON.stringify(body) });
      setBusqueda(body.name);
      consulta.setPagina(1);
      setRevision((value) => value + 1);
      setMostrarFormulario(false);
      setProductoEditando(null);
    } catch (error) { alert(error.message); }
  };
  const eliminarProducto = async (id) => {
    const product = consulta.registros.find((item) => item.id === id);
    if (!product || !window.confirm(`¿Desactivar "${product.nombre}"?`)) return;
    try {
      await apiRequest(`/products/${id}/`, { method: "DELETE" });
      setRevision((value) => value + 1);
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
  const totalPaginasInventario = Math.ceil(consulta.total / 10);
  const inicio = Math.max(1, Math.min(consulta.pagina - 2, totalPaginasInventario - 4));
  const paginasInventario = Array.from({ length: Math.min(5, totalPaginasInventario) }, (_, index) => inicio + index);
  return {
    estado: {
      abrirEditarProducto, abrirNuevoProducto, busqueda, cargandoInventario: consulta.cargando,
      eliminarProducto, errorInventario: consulta.error, esAdministrador, guardarProducto,
      mostrarFormulario, nuevoProducto,
      obtenerCodigoLote: (lot) => `LT-${lot.idLote ?? Number(String(lot.id).replace("LT-", ""))}`,
      obtenerLotesProducto: (product) => Array.isArray(product?.lotes) ? product.lotes : [],
      paginaInventario: consulta.pagina, paginasInventario, productoEditando,
      productoInventarioSeleccionado, productosFiltrados: consulta.registros,
      resumenDashboard, seccion, setBusqueda, setMostrarFormulario, setNuevoProducto,
      setPaginaInventario: consulta.setPagina, setProductoInventarioSeleccionado,
      totalPaginasInventario, totalProductosInventario: consulta.total, verDetallesProducto,
    },
    revision,
    invalidar: () => setRevision((value) => value + 1),
  };
}
