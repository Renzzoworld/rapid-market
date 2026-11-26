import { useContextoAplicacion } from "../../compartido/contexto/useContextoAplicacion.js";
import Paginacion from "../../compartido/componentes/Paginacion.jsx";
import SugerenciasProductos from "../../compartido/componentes/SugerenciasProductos.jsx";

export function Ventas() {
  const { estadoVentas } = useContextoAplicacion();
  const { busquedaVentas, cargandoVentas, errorVentas, obtenerCodigoVenta, obtenerProductosVenta, paginaVentas, periodoVentas, resumenDashboard, seccion, setBusquedaProductoVenta, setBusquedaVentas, setPeriodoVentas, setCarritoVenta, setMostrarVenta, setNuevaVenta, setPaginaProductosVenta, setPaginaVentas, setProductosVentaOpciones, setVentaSeleccionada, totalVentas, totalVentasRegistros, ventasFiltradas } = estadoVentas;

  return (
    <>
        {seccion === "ventas" && (
          <>
            <div className="page-header">

              <div>
                <h1>Ventas</h1>
                <p>Registro y control de ventas</p>
              </div>

              <button
                className="primary-button"
                onClick={() => {
                  setBusquedaProductoVenta("");
                  setProductosVentaOpciones([]);
                  setPaginaProductosVenta(1);
                  setCarritoVenta([]);
                  setNuevaVenta({
                    productoId: "",
                    cantidad: 1,
                    tipo: "Minorista",
                    pago: "Efectivo",
                  });
                  setMostrarVenta(true);
                }}
              >
                + Nueva venta
              </button>

            </div>

            <div className="inventory-summary">

              <div className="summary-card">
                <span>Total de ventas</span>
                <strong>{Number(resumenDashboard.sales_count || 0)}</strong>
              </div>

              <div className="summary-card">
                <span>Monto vendido</span>
                <strong>S/ {totalVentas.toFixed(2)}</strong>
              </div>

            </div>

            <div className="content-card inventory-card">

              <h3>Historial de ventas</h3>

              <div className="history-toolbar">
                <label className="sales-period-select">
                  <span>Periodo</span>
                  <select aria-label="Filtrar ventas por periodo" value={periodoVentas} onChange={(event) => setPeriodoVentas(event.target.value)}>
                    <option value="all">Todas las ventas</option>
                    <option value="today">Ventas de hoy</option>
                    <option value="week">Últimos 7 días</option>
                  </select>
                </label>
                <input
                  type="text"
                  placeholder="Buscar por código, producto, fecha o pago..."
                  value={busquedaVentas}
                  onChange={(e) => {
                    setBusquedaVentas(e.target.value);
                    setPaginaVentas(1);
                  }}
                />
              </div>

              <div className="table-container module-list-table">

                <table>

                  <thead>
                    <tr>
                      <th>ID de venta</th>
                      <th>Fecha</th>
                      <th>Cantidad de productos</th>
                      <th>Tipo de pago</th>
                      <th>Total</th>
                      <th>Estado</th>
                      <th>Detalles</th>
                    </tr>
                  </thead>

                  <tbody>

                    {!cargandoVentas && !errorVentas && ventasFiltradas.map((venta) => (
                      <tr key={venta.idVenta ?? venta.id}>
                        <td>{obtenerCodigoVenta(venta)}</td>
                        <td>{venta.fecha}</td>
                        <td>
                          {venta.cantidadProductos || obtenerProductosVenta(venta).length}
                        </td>
                        <td>{venta.pago}</td>
                        <td>
                          <strong>S/ {venta.total.toFixed(2)}</strong>
                        </td>
                        <td><span className={`status-badge ${venta.anulada ? "out-of-stock" : "available"}`}>{venta.anulada ? "Anulada" : "Vigente"}</span></td>
                        <td><button type="button" className="details-button" onClick={() => setVentaSeleccionada(venta)}>👁 Detalles</button></td>
                      </tr>
                    ))}

                  </tbody>

                </table>

                {cargandoVentas && <div className="empty-state" role="status"><p>Cargando ventas...</p></div>}
                {errorVentas && <div className="empty-state" role="alert"><p>{errorVentas}</p></div>}
                {!cargandoVentas && !errorVentas && ventasFiltradas.length === 0 && (
                  <div className="empty-state">
                    <p>{busquedaVentas.trim() ? "No se encontraron ventas con esa búsqueda." : "Todavía no hay ventas registradas."}</p>
                  </div>
                )}

              </div>

              <Paginacion pagina={paginaVentas} cantidad={totalVentasRegistros} cargando={cargandoVentas} alCambiar={setPaginaVentas} mostrarRango etiqueta="ventas" />

            </div>
          </>
        )}
    </>
  );
}

export function ModalesVenta() {
  const { estadoVentas, estadoResumen } = useContextoAplicacion();
  const { catalogos } = estadoResumen;
  const { agregarProductoVenta, anularVenta, descargarComprobante, editarVenta, busquedaProductoVenta, cambiarCantidadProductoVenta, cargandoProductosVenta, carritoVenta, factorPrecioVenta, mostrarVenta, nuevaVenta, obtenerCodigoVenta, obtenerProductosVenta, paginaProductosVenta, productoSeleccionadoVenta, productosVentaFiltrados, registrarVenta, setBusquedaProductoVenta, setCarritoVenta, setMostrarVenta, setNuevaVenta, setPaginaProductosVenta, setProductosVentaOpciones, setTotalProductosVentaOpciones, setVentaSeleccionada, totalCarritoVenta, totalProductosVentaOpciones, ventaSeleccionada } = estadoVentas;

  return (
    <>
      {/* =====================================================
          MODAL NUEVA VENTA
      ===================================================== */}
      {mostrarVenta && (
        <div className="modal-overlay">

          <div className="modal-card">

            <div className="modal-header">

              <div>
                <h2>Nueva venta</h2>
                <p>Registra una nueva venta</p>
              </div>

              <button
                className="modal-close"
                onClick={() => {
                  setMostrarVenta(false);
                  setBusquedaProductoVenta("");
                  setCarritoVenta([]);
                }}
              >
                ×
              </button>

            </div>

            <form onSubmit={registrarVenta}>

              <div className="form-step-title">1. Selecciona productos</div>
              <div className="form-group">
                <label>Producto</label>

                <div className="product-autocomplete">
                  <input
                    type="text"
                    placeholder="Escribe para buscar un producto"
                    value={busquedaProductoVenta}
                    onChange={(e) => {
                      setBusquedaProductoVenta(e.target.value);
                      setProductosVentaOpciones([]);
                      setTotalProductosVentaOpciones(0);
                      setPaginaProductosVenta(1);
                      setNuevaVenta({
                        ...nuevaVenta,
                        productoId: "",
                      });
                    }}
                  />

                  {busquedaProductoVenta.trim() && !productoSeleccionadoVenta && (
                    <SugerenciasProductos
                      productos={productosVentaFiltrados}
                      cargando={cargandoProductosVenta}
                      pagina={paginaProductosVenta}
                      cantidad={totalProductosVentaOpciones}
                      alCambiar={setPaginaProductosVenta}
                      alSeleccionar={(producto) => {
                        setBusquedaProductoVenta(producto.nombre);
                        setNuevaVenta({ ...nuevaVenta, productoId: producto.id });
                      }}
                    />
                  )}
                </div>

              </div>

              <div className="form-group">

                <div className="sale-quantity-row">
                  <div>
                    <label htmlFor="sale-quantity">Cantidad</label>
                    <input
                      id="sale-quantity"
                      type="number"
                      min="1"
                      value={nuevaVenta.cantidad}
                      onChange={(e) =>
                        setNuevaVenta({
                          ...nuevaVenta,
                          cantidad: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="sale-unit-price">
                    <div>
                      <label>Precio unitario</label>
                      <strong>
                        {productoSeleccionadoVenta
                          ? `S/ ${productoSeleccionadoVenta.precio.toFixed(2)}`
                          : "-"}
                      </strong>
                    </div>
                    <div>
                      <label>Stock</label>
                      <strong>
                        {productoSeleccionadoVenta
                          ? productoSeleccionadoVenta.cantidad
                          : "-"}
                      </strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="add-product-button"
                  onClick={agregarProductoVenta}
                >
                  + Agregar producto
                </button>

              </div>

              <div className="form-step-title">2. Tipo de venta y pago</div>
              <div className="sale-options-grid">
              <div className="form-group">
                <label>Tipo de venta</label>

                <select
                  value={nuevaVenta.tipo}
                  onChange={(e) =>
                    setNuevaVenta({
                      ...nuevaVenta,
                      tipo: e.target.value,
                    })
                  }
                >
                  <option value="Minorista">
                    Minorista
                  </option>

                  <option value="Mayorista">
                    Mayorista - 5% descuento
                  </option>
                </select>

              </div>

              <div className="form-group">

                <label>Medio de pago</label>

                <select
                  value={nuevaVenta.pago}
                  onChange={(e) =>
                    setNuevaVenta({
                      ...nuevaVenta,
                      pago: e.target.value,
                    })
                  }
                >
                  <option value="Efectivo">
                    Efectivo
                  </option>

                  <option value="Yape">Yape</option>

                  <option value="Plin">Plin</option>
                </select>

              </div>

              </div>
              <div className="form-step-title">3. Revisa los productos</div>
              <div className="form-group sale-products-group">
                <label>Productos agregados</label>

                {carritoVenta.length > 0 ? (
                  <div className="sale-products-table-container">
                    <table className="sale-products-table">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Cantidad</th>
                          <th>Subtotal</th>
                          <th aria-label="Acciones"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {carritoVenta.map((item) => (
                          <tr key={item.id}>
                            <td>{item.nombre}</td>
                            <td>
                              <div className="quantity-controls">
                                <button
                                  type="button"
                                  onClick={() =>
                                    cambiarCantidadProductoVenta(item.id, -1)
                                  }
                                  aria-label={`Disminuir cantidad de ${item.nombre}`}
                                >
                                  -
                                </button>
                                <strong>{item.cantidad}</strong>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.cantidad < item.stock) {
                                      cambiarCantidadProductoVenta(item.id, 1);
                                    }
                                  }}
                                  aria-label={`Aumentar cantidad de ${item.nombre}`}
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td>
                              S/ {(
                                item.precio * factorPrecioVenta * item.cantidad
                              ).toFixed(2)}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="remove-product-button"
                                onClick={() =>
                                  setCarritoVenta(
                                    carritoVenta.filter(
                                      (producto) => producto.id !== item.id
                                    )
                                  )
                                }
                                aria-label={`Eliminar ${item.nombre}`}
                                title="Eliminar producto"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan="2"></td>
                          <td>
                            <strong>S/ {totalCarritoVenta.toFixed(2)}</strong>
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <p className="sale-products-empty">
                    Todavía no has agregado productos.
                  </p>
                )}

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setMostrarVenta(false);
                    setBusquedaProductoVenta("");
                    setProductosVentaOpciones([]);
                    setCarritoVenta([]);
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Registrar venta
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {ventaSeleccionada && (
        <div className="modal-overlay">
          <div className="modal-card sale-details-modal">
            <div className="modal-header">
              <div>
                <h2>Detalles de venta</h2>
                <p>{obtenerCodigoVenta(ventaSeleccionada)}</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setVentaSeleccionada(null)}
                aria-label="Cerrar detalles de venta"
              >
                ×
              </button>
            </div>

            {!ventaSeleccionada.anulada && <div className="sale-edit-row">
              <label>Tipo <select id="edit-sale-type" defaultValue={ventaSeleccionada.tipo}>{(catalogos.sale_types || []).map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
              <label>Pago <select id="edit-sale-payment" defaultValue={ventaSeleccionada.pago}>{(catalogos.payment_methods || []).map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
              <button type="button" className="secondary-button" onClick={() => editarVenta(ventaSeleccionada, document.getElementById("edit-sale-type").value, document.getElementById("edit-sale-payment").value)}>Guardar edición</button>
              <button type="button" className="action-button delete" onClick={() => anularVenta(ventaSeleccionada)}>Anular venta</button>
            </div>}
            <div className="sale-pdf-actions">
              <button type="button" className="secondary-button" onClick={() => descargarComprobante(ventaSeleccionada, "boleta")}>Descargar boleta PDF</button>
              <button type="button" className="secondary-button" onClick={() => descargarComprobante(ventaSeleccionada, "factura")}>Descargar factura PDF</button>
            </div>
            <div className="sale-details-table-container">
              <table className="sale-details-table">
                <thead>
                  <tr>
                    <th>ID de venta</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio unitario</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {obtenerProductosVenta(ventaSeleccionada).map((producto) => {
                    const subtotal = producto.precio * producto.cantidad;

                    return (
                      <tr key={`${ventaSeleccionada.idVenta ?? ventaSeleccionada.id}-${producto.id}`}>
                        <td>{obtenerCodigoVenta(ventaSeleccionada)}</td>
                        <td>{producto.nombre}</td>
                        <td>{producto.cantidad}</td>
                        <td>S/ {producto.precio.toFixed(2)}</td>
                        <td>S/ {subtotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


    </>
  );
}
