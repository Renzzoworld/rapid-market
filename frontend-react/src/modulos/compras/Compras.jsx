import { useContextoAplicacion } from "../../compartido/contexto/useContextoAplicacion.js";
import Paginacion from "../../compartido/componentes/Paginacion.jsx";
import SugerenciasProductos from "../../compartido/componentes/SugerenciasProductos.jsx";

const fechaHoyLocal = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export function Compras() {
  const { estadoCompras } = useContextoAplicacion();
  const { abrirNuevaCompra, busquedaCompras, cargandoCompras, comprasFiltradas, errorCompras, esAdministrador, obtenerCodigoCompra, obtenerEstadoCompra, obtenerLotesCompra, paginaCompras, resumenDashboard, seccion, setBusquedaCompras, setCompraSeleccionada, setCompraVerificando, setFechasVencimiento, setPaginaCompras, totalCompras, totalComprasRegistros } = estadoCompras;

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
                onClick={abrirNuevaCompra}
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

              <div className="table-container module-list-table">

                <table>

                  <thead>
                    <tr>
                      <th>Orden de compra</th>
                      <th>Fecha de compra</th>
                      <th>Proveedor</th>
                      <th>Cantidad de lotes</th>
                      <th>Total (IGV incluido)</th>
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
  const { compraSeleccionada, verOrdenCompraPDF, cerrarVistaPreviaOrden, ordenCompraPdf, cargandoOrdenCompraPdf, obtenerCodigoCompra, obtenerCodigoLote, obtenerLotesCompra, setCompraSeleccionada } = estadoCompras;

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
                onClick={() => { cerrarVistaPreviaOrden(); setCompraSeleccionada(null); }}
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
                  <tr><td colSpan="6"><strong>Subtotal</strong></td><td colSpan="2">S/ {Number(compraSeleccionada.subtotal || 0).toFixed(2)}</td></tr>
                </tfoot>
              </table>
            </div>
            <div className="purchase-order-info">
              <p><strong>Proveedor:</strong> {compraSeleccionada.razonSocialProveedor || compraSeleccionada.proveedor} · RUC {compraSeleccionada.rucProveedor || "—"}</p>
              <p><strong>Correo y teléfono seleccionados:</strong> {compraSeleccionada.correoProveedor || "—"} · {compraSeleccionada.telefonoProveedor || "—"}</p>
              {compraSeleccionada.nombreContactoProveedor && <p><strong>Contacto:</strong> {compraSeleccionada.nombreContactoProveedor} · {compraSeleccionada.cargoContactoProveedor} · {[compraSeleccionada.telefonoContactoProveedor, compraSeleccionada.correoContactoProveedor].filter(Boolean).join(" · ")}</p>}
              <p><strong>Entrega requerida:</strong> {compraSeleccionada.fechaEntregaRequerida || "—"}</p>
              <p><strong>Lugar de entrega:</strong> {compraSeleccionada.lugarEntrega || "—"}</p>
            </div>
            <div className="modal-actions"><button type="button" className="primary-button" disabled={cargandoOrdenCompraPdf} onClick={() => verOrdenCompraPDF(compraSeleccionada)}>{cargandoOrdenCompraPdf ? "Preparando PDF..." : "Ver orden de compra PDF"}</button></div>
          </div>
        </div>
      )}
      {ordenCompraPdf && (
        <div className="modal-overlay purchase-pdf-overlay" role="dialog" aria-modal="true" aria-label="Vista previa de orden de compra">
          <div className="modal-card purchase-pdf-modal">
            <div className="modal-header">
              <div><h2>Orden de compra</h2><p>Vista previa del documento antes de descargarlo.</p></div>
              <button type="button" className="modal-close" onClick={cerrarVistaPreviaOrden} aria-label="Cerrar vista previa">×</button>
            </div>
            <iframe className="purchase-pdf-frame" src={ordenCompraPdf.url} title="Vista previa de la orden de compra" />
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={cerrarVistaPreviaOrden}>Volver a detalles</button>
              <a className="primary-button purchase-pdf-download" href={ordenCompraPdf.url} download={ordenCompraPdf.filename}>Descargar PDF</a>
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
                  <tr><td colSpan="4"><strong>Subtotal</strong></td><td>S/ {Number(compraVerificando.subtotal || 0).toFixed(2)}</td></tr>
                  <tr><td colSpan="4"><strong>IGV {compraVerificando.igvPorcentaje == null ? "" : `(${compraVerificando.igvPorcentaje.toFixed(2)}%)`}</strong></td><td>S/ {Number(compraVerificando.igvMonto || 0).toFixed(2)}</td></tr>
                  <tr><td colSpan="4"><strong>Total final</strong></td><td><strong>S/ {calcularTotalCompra(compraVerificando).toFixed(2)}</strong></td></tr>
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
  const {
    agregarProductoCompra, busquedaProductoCompra, busquedaProveedorCompra,
    cambiarCantidadProductoCompra, cargandoProductosCompra, cargandoProveedores,
    cargandoDetalleProveedorCompra, carritoCompra, errorProveedores, mostrarCompra,
    nuevaCompra, ordenCompraDefaults, proveedorCompraDetalle, paginaProductosCompra,
    productoSeleccionadoCompra, productosCompraFiltrados, proveedoresFiltrados,
    registrarCompra, seleccionarProveedorCompra, cerrarNuevaCompra,
    setBusquedaProductoCompra, setBusquedaProveedorCompra, setCarritoCompra,
    setNuevaCompra, setProveedorCompraDetalle, setPaginaProductosCompra, setProductosCompraOpciones,
    setTotalProductosCompraOpciones, subtotalCarritoCompra, porcentajeIgvCompra,
    igvCarritoCompra, totalFinalCompra, totalProductosCompraOpciones,
  } = estadoCompras;
  const correosProveedor = (proveedorCompraDetalle?.datos_contacto || []).filter((item) => item.tipo === "correo");
  const telefonosProveedor = (proveedorCompraDetalle?.datos_contacto || []).filter((item) => item.tipo === "telefono");
  const contactosProveedor = (proveedorCompraDetalle?.contacts || []).filter((item) => item.activo !== false);

  return (
    <>
      {mostrarCompra && (
        <div className="modal-overlay">
          <div className="modal-card purchase-form-modal">
            <div className="modal-header">
              <div><h2>Nueva orden de compra</h2><p>Los precios unitarios se ingresan sin IGV.</p></div>
              <button type="button" className="modal-close" onClick={cerrarNuevaCompra} aria-label="Cerrar">×</button>
            </div>
            <form onSubmit={registrarCompra}>
              <fieldset className="provider-form-section purchase-section"><legend>Proveedor y entrega</legend>
                <div className="form-group"><label>Proveedor *</label><div className="product-autocomplete">
                  <input type="text" placeholder={cargandoProveedores ? "Cargando proveedores..." : "Escribe para buscar un proveedor"} value={busquedaProveedorCompra} disabled={carritoCompra.length > 0 || cargandoProveedores || cargandoDetalleProveedorCompra || Boolean(errorProveedores)} onChange={(event) => {
                    setBusquedaProveedorCompra(event.target.value);
                    setProveedorCompraDetalle(null);
                    setNuevaCompra({ ...nuevaCompra, proveedor: event.target.value, providerId: "", providerEmailId: "", providerPhoneId: "", contactId: "" });
                  }} />
                  {busquedaProveedorCompra.trim() && !nuevaCompra.providerId && <div className="product-suggestions">{proveedoresFiltrados.length ? proveedoresFiltrados.map((provider) => <button type="button" className="product-suggestion" key={provider.id} onClick={() => seleccionarProveedorCompra(provider)}><span>{provider.name}</span></button>) : <p className="product-suggestions-empty">No se encontraron proveedores.</p>}</div>}
                </div>{cargandoDetalleProveedorCompra && <p className="field-hint">Cargando los datos de contacto...</p>}{errorProveedores && <p className="field-error" role="alert">{errorProveedores}</p>}</div>
                {proveedorCompraDetalle && <>
                <div className="purchase-contact-grid">
                  <label className="form-group">Correo del proveedor *<select required value={nuevaCompra.providerEmailId} onChange={(event) => setNuevaCompra({ ...nuevaCompra, providerEmailId: event.target.value })}><option value="">Seleccionar correo</option>{correosProveedor.map((item) => <option key={item.id} value={item.id}>{item.valor}</option>)}</select></label>
                  <label className="form-group">Teléfono del proveedor *<select required value={nuevaCompra.providerPhoneId} onChange={(event) => setNuevaCompra({ ...nuevaCompra, providerPhoneId: event.target.value })}><option value="">Seleccionar teléfono</option>{telefonosProveedor.map((item) => <option key={item.id} value={item.id}>{item.valor}</option>)}</select></label>
                  <label className="form-group purchase-contact-full">Contacto (opcional)<select value={nuevaCompra.contactId} onChange={(event) => setNuevaCompra({ ...nuevaCompra, contactId: event.target.value })}><option value="">Sin contacto específico</option>{contactosProveedor.map((contact) => <option key={contact.id} value={contact.id}>{contact.nombre} · {contact.cargo_nombre === "Otros" ? contact.cargo_otro : contact.cargo_nombre}</option>)}</select></label>
                  {(!correosProveedor.length || !telefonosProveedor.length) && <p className="field-error purchase-contact-full">Registra al menos un correo y un teléfono en los datos generales del proveedor para emitir una orden.</p>}
                </div>
                <div className="purchase-contact-grid">
                  <label className="form-group">Fecha requerida de entrega *<input type="date" required min={fechaHoyLocal()} value={nuevaCompra.fechaEntregaRequerida} onChange={(event) => setNuevaCompra({ ...nuevaCompra, fechaEntregaRequerida: event.target.value })} /></label>
                  <label className="form-group">Lugar de entrega *<input required maxLength="250" value={nuevaCompra.lugarEntrega} onChange={(event) => setNuevaCompra({ ...nuevaCompra, lugarEntrega: event.target.value })} placeholder={ordenCompraDefaults?.company?.domicilio_fiscal || "Dirección de entrega"} /></label>
                </div>
                </>}
              </fieldset>

              <fieldset className="provider-form-section purchase-section"><legend>Productos</legend>
                <div className="form-group"><label>Producto {nuevaCompra.proveedor && <small>(categorías del proveedor)</small>}</label><div className="product-autocomplete">
                  <input type="text" placeholder={nuevaCompra.providerId ? "Escribe para buscar un producto" : "Primero selecciona un proveedor"} disabled={!nuevaCompra.providerId} value={busquedaProductoCompra} onChange={(event) => { setBusquedaProductoCompra(event.target.value); setProductosCompraOpciones([]); setTotalProductosCompraOpciones(0); setPaginaProductosCompra(1); setNuevaCompra({ ...nuevaCompra, productoId: "" }); }} />
                  {busquedaProductoCompra.trim() && !productoSeleccionadoCompra && <SugerenciasProductos productos={productosCompraFiltrados} cargando={cargandoProductosCompra} pagina={paginaProductosCompra} cantidad={totalProductosCompraOpciones} alCambiar={setPaginaProductosCompra} alSeleccionar={(producto) => { setBusquedaProductoCompra(producto.nombre); setNuevaCompra({ ...nuevaCompra, productoId: producto.id, precioUnitario: "" }); }} />}
                </div></div>
                <div className="sale-quantity-row"><div><label htmlFor="purchase-quantity">Cantidad</label><input id="purchase-quantity" type="number" min="0.001" step="0.001" value={nuevaCompra.cantidad} onChange={(event) => setNuevaCompra({ ...nuevaCompra, cantidad: event.target.value })} /></div>
                  <div><label htmlFor="purchase-unit-price">Precio unitario sin IGV</label><input id="purchase-unit-price" type="number" min="0.01" step="0.01" placeholder="Ej. 1.80" value={nuevaCompra.precioUnitario} disabled={!productoSeleccionadoCompra} onChange={(event) => setNuevaCompra({ ...nuevaCompra, precioUnitario: event.target.value })} /></div>
                </div>
                <button type="button" className="add-product-button" onClick={agregarProductoCompra}>+ Agregar producto</button>
                {carritoCompra.length > 0 ? <div className="sale-products-table-container"><table className="sale-products-table"><thead><tr><th>N°</th><th>Producto</th><th>Cantidad</th><th>Precio unitario</th><th>Importe</th><th aria-label="Acciones" /></tr></thead><tbody>
                  {carritoCompra.map((item, index) => <tr key={`${item.id}-${index}`}><td>{String(index + 1).padStart(2, "0")}</td><td>{item.nombre}</td><td><div className="quantity-controls"><button type="button" onClick={() => cambiarCantidadProductoCompra(index, -1)} aria-label={`Disminuir cantidad de ${item.nombre}`}>-</button><strong>{item.cantidad}</strong><button type="button" onClick={() => cambiarCantidadProductoCompra(index, 1)} aria-label={`Aumentar cantidad de ${item.nombre}`}>+</button></div></td><td>S/ {item.precioUnitario.toFixed(2)}</td><td>S/ {(item.precioUnitario * item.cantidad).toFixed(2)}</td><td><button type="button" className="remove-product-button" onClick={() => setCarritoCompra(carritoCompra.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Eliminar ${item.nombre}`} title="Eliminar producto">🗑️</button></td></tr>)}
                </tbody></table></div> : <p className="sale-products-empty">Todavía no has agregado productos.</p>}
                <div className="purchase-totals"><div><span>Subtotal</span><strong>S/ {subtotalCarritoCompra.toFixed(2)}</strong></div><div><span>IGV ({porcentajeIgvCompra.toFixed(2)}%)</span><strong>S/ {igvCarritoCompra.toFixed(2)}</strong></div><div className="purchase-grand-total"><span>Total final</span><strong>S/ {totalFinalCompra.toFixed(2)}</strong></div></div>
              </fieldset>

              <fieldset className="provider-form-section purchase-section"><legend>Observaciones</legend><textarea rows="3" maxLength="2000" value={nuevaCompra.observaciones} onChange={(event) => setNuevaCompra({ ...nuevaCompra, observaciones: event.target.value })} placeholder="Opcional" /></fieldset>
              <div className="modal-actions"><button type="button" className="secondary-button" onClick={cerrarNuevaCompra}>Cancelar</button><button type="submit" className="primary-button">Emitir orden de compra</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
