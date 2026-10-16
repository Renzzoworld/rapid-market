import { useContextoAplicacion } from "../../contexto/useContextoAplicacion.js";
import Paginacion from "../../componentes/Paginacion.jsx";
import SugerenciasProductos from "../../componentes/SugerenciasProductos.jsx";

export function Compras() {
  const { estadoCompras } = useContextoAplicacion();
  const { busquedaCompras, cargandoCompras, comprasFiltradas, errorCompras, esAdministrador, obtenerCodigoCompra, obtenerEstadoCompra, obtenerLotesCompra, paginaCompras, resumenDashboard, seccion, setBusquedaCompras, setBusquedaProductoCompra, setCarritoCompra, setCompraSeleccionada, setCompraVerificando, setFechasVencimiento, setMostrarCompra, setPaginaCompras, setPaginaProductosCompra, setProductosCompraOpciones, totalCompras, totalComprasRegistros } = estadoCompras;

  return (
    <>
        {seccion === "compras" && esAdministrador && (
          <>
            <div className="page-header">

              <div>
                <h1>Compras</h1>
                <p>Registro de compras y abastecimiento</p>
              </div>

              <button
                className="primary-button"
                onClick={() => {
                  setBusquedaProductoCompra("");
                  setProductosCompraOpciones([]);
                  setPaginaProductosCompra(1);
                  setCarritoCompra([]);
                  setMostrarCompra(true);
                }}
              >
                + Nueva compra
              </button>

            </div>

            <div className="inventory-summary">

              <div className="summary-card">
                <span>Total de compras</span>
                <strong>{Number(resumenDashboard.purchases_count || 0)}</strong>
              </div>

              <div className="summary-card">
                <span>Costo de compras recibidas</span>
                <strong>S/ {totalCompras.toFixed(2)}</strong>
              </div>

            </div>

            <div className="content-card inventory-card">

              <h3>Historial de compras</h3>

              <div className="history-toolbar">
                <input
                  type="text"
                  placeholder="Buscar por código, proveedor, producto, fecha o estado..."
                  value={busquedaCompras}
                  onChange={(e) => {
                    setBusquedaCompras(e.target.value);
                    setPaginaCompras(1);
                  }}
                />
              </div>

              <div className="table-container">

                <table>

                  <thead>
                    <tr>
                      <th>Orden de compra</th>
                      <th>Fecha de compra</th>
                      <th>Proveedor</th>
                      <th>Cantidad de lotes</th>
                      <th>Costo</th>
                      <th>Estado</th>
                      <th>Detalles</th>
                      <th>Verificar</th>
                    </tr>
                  </thead>

                  <tbody>

                    {cargandoCompras ? (
                      <tr><td colSpan={8} className="empty-state">Cargando compras...</td></tr>
                    ) : errorCompras ? (
                      <tr><td colSpan={8} className="empty-state">{errorCompras}</td></tr>
                    ) : comprasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="empty-state">
                          {busquedaCompras.trim()
                            ? "No se encontraron compras con esa búsqueda."
                            : "Todavía no hay compras registradas."}
                        </td>
                      </tr>
                    ) : comprasFiltradas.map((compra) => (
                      <tr key={compra.idCompra ?? compra.id}>

                        <td>{obtenerCodigoCompra(compra)}</td>
                        <td>{compra.fecha}</td>
                        <td>{compra.proveedor}</td>
                        <td>{obtenerLotesCompra(compra).length}</td>
                        <td>
                          S/ {compra.costo.toFixed(2)}
                        </td>
                        <td>
                          <span className={`purchase-status ${obtenerEstadoCompra(compra).toLowerCase().replaceAll(" ", "-")}`}>
                            {obtenerEstadoCompra(compra)}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="details-button"
                            onClick={() => setCompraSeleccionada(compra)}
                          >
                            <span aria-hidden="true">👁</span> Detalles
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="details-button"
                            disabled={obtenerEstadoCompra(compra) !== "Pendiente de entrega"}
                            onClick={() => {
                              setCompraVerificando(compra);
                              setFechasVencimiento(
                                obtenerLotesCompra(compra).reduce(
                                  (fechas, lote) => ({
                                    ...fechas,
                                    [lote.idLote]: lote.fechaVencimiento || "",
                                  }),
                                  {}
                                )
                              );
                            }}
                          >
                            Verificar
                          </button>
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>

              <Paginacion pagina={paginaCompras} cantidad={totalComprasRegistros} cargando={cargandoCompras} alCambiar={setPaginaCompras} />

            </div>
          </>
        )}
    </>
  );
}

export function DetalleCompra() {
  const { estadoCompras } = useContextoAplicacion();
  const { calcularTotalCompra, compraSeleccionada, obtenerCodigoCompra, obtenerCodigoLote, obtenerLotesCompra, setCompraSeleccionada } = estadoCompras;

  return (
    <>
      {compraSeleccionada && (
        <div className="modal-overlay">
          <div className="modal-card sale-details-modal">
            <div className="modal-header">
              <div>
                <h2>Detalles de compra</h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setCompraSeleccionada(null)}
                aria-label="Cerrar detalles de compra"
              >
                ×
              </button>
            </div>

            <div className="sale-details-table-container">
              <table className="sale-details-table">
                <thead>
                  <tr>
                    <th>Orden de compra</th>
                    <th>Fecha de compra</th>
                    <th>Fecha de vencimiento</th>
                    <th>ID lote</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio de compra</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {obtenerLotesCompra(compraSeleccionada).map((lote) => (
                    <tr
                      key={`${compraSeleccionada.idCompra ?? compraSeleccionada.id}-${lote.idLote ?? lote.id}`}
                    >
                      <td>{obtenerCodigoCompra(compraSeleccionada)}</td>
                      <td>{lote.fecha}</td>
                      <td>{lote.fechaVencimiento || "---"}</td>
                      <td>{obtenerCodigoLote(lote)}</td>
                      <td>{lote.producto}</td>
                      <td>{lote.cantidad}</td>
                      <td>
                        <span className="money-value">
                          <span>S/</span>
                          <span>{lote.precioUnitario.toFixed(2)}</span>
                        </span>
                      </td>
                      <td>
                        <span className="money-value">
                          <span>S/</span>
                          <span>{(lote.precioUnitario * lote.cantidad).toFixed(2)}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="6">
                      <strong>Total de compra</strong>
                    </td>
                    <td>
                      <strong className="money-value">
                        <span>S/</span>
                        <span>{calcularTotalCompra(compraSeleccionada).toFixed(2)}</span>
                      </strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}


    </>
  );
}
export function VerificarCompra() {
  const { estadoCompras } = useContextoAplicacion();
  const { calcularTotalCompra, cancelarCompra, compraCancelando, compraVerificando, fechasVencimiento, obtenerCodigoCompra, obtenerCodigoLote, obtenerLotesCompra, setCompraCancelando, setCompraVerificando, setFechasVencimiento, validarCompra } = estadoCompras;

  return (
    <>
      {compraVerificando && (
        <div className="modal-overlay">
          <div className="modal-card sale-details-modal purchase-verification-modal">
            <div className="modal-header">
              <div>
                <h2>Verificar compra</h2>
                <p>{obtenerCodigoCompra(compraVerificando)}</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setCompraVerificando(null);
                  setFechasVencimiento({});
                }}
                aria-label="Volver al panel anterior"
              >
                ×
              </button>
            </div>

            <div className="purchase-verification-summary">
              <strong>ID de compra</strong>
              <span>{obtenerCodigoCompra(compraVerificando)}</span>
              <strong>Fecha de compra</strong>
              <span>{compraVerificando.fecha}</span>
            </div>

            <div className="sale-details-table-container">
              <table className="sale-details-table">
                <thead>
                  <tr>
                    <th>ID lote</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio de compra</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {obtenerLotesCompra(compraVerificando).map((lote) => (
                    <tr key={lote.idLote}>
                      <td>{obtenerCodigoLote(lote)}</td>
                      <td>{lote.producto}</td>
                      <td>{lote.cantidad}</td>
                      <td>S/ {lote.precioUnitario.toFixed(2)}</td>
                      <td>
                        S/ {(lote.precioUnitario * lote.cantidad).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="4"><strong>Total final</strong></td>
                    <td><strong>S/ {calcularTotalCompra(compraVerificando).toFixed(2)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="expiration-section">
              <h3>Fechas de vencimiento</h3>
              {obtenerLotesCompra(compraVerificando).some((lote) => lote.perecible) ? (
                obtenerLotesCompra(compraVerificando)
                  .filter((lote) => lote.perecible)
                  .map((lote) => (
                    <div className="expiration-row" key={lote.idLote}>
                      <label htmlFor={`expiration-${lote.idLote}`}>
                        {obtenerCodigoLote(lote)} - {lote.producto}
                      </label>
                      <input
                        id={`expiration-${lote.idLote}`}
                        type="date"
                        value={fechasVencimiento[lote.idLote] || ""}
                        onChange={(e) =>
                          setFechasVencimiento({
                            ...fechasVencimiento,
                            [lote.idLote]: e.target.value,
                          })
                        }
                      />
                    </div>
                  ))
              ) : (
                <p>No hay productos perecibles en esta compra.</p>
              )}
            </div>

            {compraCancelando ? (
              <div className="cancel-confirmation">
                <strong>¿Estas seguro de cancelar esta orden de compra?</strong>
                <div className="modal-actions">
                  <button type="button" className="danger-button" onClick={cancelarCompra}>
                    Cancelar compra
                  </button>
                  <button type="button" className="secondary-button" onClick={() => setCompraCancelando(null)}>
                    Volver al panel anterior
                  </button>
                </div>
              </div>
            ) : (
              <div className="modal-actions verification-actions">
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => setCompraCancelando(compraVerificando)}
                >
                  Cancelar orden de compra
                </button>
                <button type="button" className="primary-button" onClick={validarCompra}>
                  Validar compra
                </button>
              </div>
            )}
          </div>
        </div>
      )}


    </>
  );
}
export function FormularioCompra() {
  const { estadoCompras } = useContextoAplicacion();
  const { agregarProductoCompra, busquedaProductoCompra, busquedaProveedorCompra, cambiarCantidadProductoCompra, cargandoProductosCompra, carritoCompra, guardarProveedor, mostrarCompra, mostrarProveedorNuevo, nombreProveedorNuevo, nuevaCompra, paginaProductosCompra, productoSeleccionadoCompra, productosCompraFiltrados, proveedoresFiltrados, registrarCompra, setBusquedaProductoCompra, setBusquedaProveedorCompra, setCarritoCompra, setMostrarCompra, setMostrarProveedorNuevo, setNombreProveedorNuevo, setNuevaCompra, setPaginaProductosCompra, setProductosCompraOpciones, setTotalProductosCompraOpciones, totalCarritoCompra, totalProductosCompraOpciones } = estadoCompras;

  return (
    <>
      {/* =====================================================
          MODAL NUEVA COMPRA
      ===================================================== */}
      {mostrarCompra && (
        <div className="modal-overlay">

          <div className="modal-card">

            <div className="modal-header">

              <div>
                <h2>Nueva compra</h2>
                <p>Registra una compra al proveedor</p>
              </div>

              <button
                className="modal-close"
                onClick={() => {
                  setMostrarCompra(false);
                  setNuevaCompra({
                    proveedor: "",
                    productoId: "",
                    cantidad: 1,
                    precioUnitario: "",
                  });
                  setBusquedaProveedorCompra("");
                  setBusquedaProductoCompra("");
                  setProductosCompraOpciones([]);
                  setPaginaProductosCompra(1);
                  setCarritoCompra([]);
                }}
              >
                ×
              </button>

            </div>

            <form onSubmit={registrarCompra}>

              <div className="form-group">

                <label>Proveedor</label>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setMostrarProveedorNuevo((visible) => !visible)}
                >
                  {mostrarProveedorNuevo ? "Cancelar nuevo proveedor" : "+ Agregar proveedor"}
                </button>

                {mostrarProveedorNuevo && (
                  <div className="provider-create-row">
                    <input
                      type="text"
                      maxLength="150"
                      placeholder="Nombre del proveedor"
                      value={nombreProveedorNuevo}
                      onChange={(event) => setNombreProveedorNuevo(event.target.value)}
                    />
                    <button type="button" className="primary-button" onClick={guardarProveedor}>
                      Guardar proveedor
                    </button>
                  </div>
                )}

                <div className="product-autocomplete">
                  <input
                    type="text"
                    placeholder="Escribe para buscar un proveedor"
                    value={busquedaProveedorCompra}
                    disabled={carritoCompra.length > 0}
                    onChange={(e) => {
                      setBusquedaProveedorCompra(e.target.value);
                      setNuevaCompra({ ...nuevaCompra, proveedor: "" });
                    }}
                  />

                  {busquedaProveedorCompra.trim() && !nuevaCompra.proveedor && (
                    <div className="product-suggestions">
                      {proveedoresFiltrados.length > 0 ? (
                        proveedoresFiltrados.map((proveedor) => (
                          <button
                            type="button"
                            className="product-suggestion"
                            key={proveedor}
                            onClick={() => {
                              setBusquedaProveedorCompra(proveedor);
                              setNuevaCompra({ ...nuevaCompra, proveedor });
                            }}
                          >
                            <span>{proveedor}</span>
                          </button>
                        ))
                      ) : (
                        <p className="product-suggestions-empty">
                          No se encontraron proveedores.
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </div>

              <div className="form-group">

                <label>Producto</label>

                <div className="product-autocomplete">
                  <input
                    type="text"
                    placeholder="Escribe para buscar un producto"
                    value={busquedaProductoCompra}
                    onChange={(e) => {
                      setBusquedaProductoCompra(e.target.value);
                      setProductosCompraOpciones([]);
                      setTotalProductosCompraOpciones(0);
                      setPaginaProductosCompra(1);
                      setNuevaCompra({ ...nuevaCompra, productoId: "" });
                    }}
                  />

                  {busquedaProductoCompra.trim() && !productoSeleccionadoCompra && (
                    <SugerenciasProductos
                      productos={productosCompraFiltrados}
                      cargando={cargandoProductosCompra}
                      pagina={paginaProductosCompra}
                      cantidad={totalProductosCompraOpciones}
                      alCambiar={setPaginaProductosCompra}
                      alSeleccionar={(producto) => {
                        setBusquedaProductoCompra(producto.nombre);
                        setNuevaCompra({ ...nuevaCompra, productoId: producto.id, precioUnitario: "" });
                      }}
                    />
                  )}
                </div>

              </div>

              <div className="form-group">

                <div className="sale-quantity-row">
                  <div>
                    <label htmlFor="purchase-quantity">Cantidad</label>
                    <input
                      id="purchase-quantity"
                      type="number"
                      min="1"
                      value={nuevaCompra.cantidad}
                      onChange={(e) =>
                        setNuevaCompra({
                          ...nuevaCompra,
                          cantidad: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label htmlFor="purchase-unit-price">
    Precio unitario de compra
  </label>

  <input
    id="purchase-unit-price"
    type="number"
    min="0.01"
    step="0.01"
    placeholder="Ej. 1.80"
    value={nuevaCompra.precioUnitario}
    disabled={!productoSeleccionadoCompra}
    onChange={(e) =>
      setNuevaCompra({
        ...nuevaCompra,
        precioUnitario: e.target.value,
      })
    }
  />
                  </div>
                </div>

                <button
                  type="button"
                  className="add-product-button"
                  onClick={agregarProductoCompra}
                >
                  + Agregar producto
                </button>

              </div>

              <div className="form-group">

                <label>Costo total de compra</label>
                <strong>S/ {totalCarritoCompra.toFixed(2)}</strong>

              </div>

              <div className="form-group sale-products-group">

                <label>Productos agregados</label>

                {carritoCompra.length > 0 ? (
                  <div className="sale-products-table-container">
                    <table className="sale-products-table">
                      <thead>
                        <tr>
                          <th>ID lote</th>
                          <th>Producto</th>
                          <th>Cantidad</th>
                          <th>Precio unitario</th>
                          <th>Subtotal</th>
                          <th aria-label="Acciones"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {carritoCompra.map((item, indice) => (
                          <tr key={`${item.id}-${indice}`}>
                            <td>Se asignará al guardar</td>
                            <td>{item.nombre}</td>
                            <td>
                              <div className="quantity-controls">
                                <button
                                  type="button"
                                  onClick={() =>
                                    cambiarCantidadProductoCompra(indice, -1)
                                  }
                                  aria-label={`Disminuir cantidad de ${item.nombre}`}
                                >
                                  -
                                </button>
                                <strong>{item.cantidad}</strong>
                                <button
                                  type="button"
                                  onClick={() =>
                                    cambiarCantidadProductoCompra(indice, 1)
                                  }
                                  aria-label={`Aumentar cantidad de ${item.nombre}`}
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td>S/ {item.precioUnitario.toFixed(2)}</td>
                            <td>
                              S/ {(item.precioUnitario * item.cantidad).toFixed(2)}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="remove-product-button"
                                onClick={() =>
                                  setCarritoCompra(
                                    carritoCompra.filter((_, itemIndex) => itemIndex !== indice)
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
                    setMostrarCompra(false);
                    setNuevaCompra({
                      proveedor: "",
                      productoId: "",
                      cantidad: 1,
                      precioUnitario: "",
                    });
                    setBusquedaProveedorCompra("");
                    setBusquedaProductoCompra("");
                    setProductosCompraOpciones([]);
                    setCarritoCompra([]);
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Registrar compra
                </button>

              </div>

            </form>

          </div>

        </div>
      )}


    </>
  );
}