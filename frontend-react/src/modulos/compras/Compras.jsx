import { useState } from "react";
import { useContextoAplicacion } from "../../compartido/contexto/useContextoAplicacion.js";
import Paginacion from "../../compartido/componentes/Paginacion.jsx";
import SugerenciasProductos from "../../compartido/componentes/SugerenciasProductos.jsx";

const fechaHoyLocal = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export function Compras() {
  const { estadoCompras } = useContextoAplicacion();
  const { abrirNuevaCompra, busquedaCompras, cargandoCompras, compraCancelando, comprasFiltradas, confirmacionCancelacion, cancelandoCompra, errorCompras, esAdministrador, obtenerCodigoCompra, obtenerCodigoLote, obtenerEstadoCompra, obtenerLotesCompra, paginaCompras, prepararRecepcionCompra, resumenDashboard, seccion, setBusquedaCompras, setCompraSeleccionada, setPaginaCompras, totalCompras, totalComprasRegistros, iniciarCancelacionCompra, cancelarCompraConfirmada, cerrarCancelacionCompra, verOrdenCompraPDF, cargandoOrdenCompraPdf } = estadoCompras;
  const [compraRecepcionMostrando, setCompraRecepcionMostrando] = useState(null);

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
                      <th>Orden</th>
                      <th>Recepción</th>
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
                          S/ {Number(compra.displayTotal ?? compra.costo ?? 0).toFixed(2)}
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
                            disabled={cargandoOrdenCompraPdf}
                            onClick={() => verOrdenCompraPDF(compra)}
                          >
                            <span aria-hidden="true">📄</span> {cargandoOrdenCompraPdf ? "Preparando PDF..." : "Ver orden de compra PDF"}
                          </button>
                        </td>
                        <td>
                          <div className="purchase-row-actions">
                            {compra.recepcion ? (
                              <button
                                type="button"
                                className="details-button secondary-button"
                                onClick={() => setCompraRecepcionMostrando(compra)}
                              >
                                Ver registro de recepción
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="details-button"
                                  disabled={obtenerEstadoCompra(compra) !== "Pendiente"}
                                  onClick={() => prepararRecepcionCompra(compra)}
                                >
                                  Registrar recepción
                                </button>
                                <button
                                  type="button"
                                  className="details-button secondary-button"
                                  disabled={obtenerEstadoCompra(compra) !== "Pendiente"}
                                  onClick={() => iniciarCancelacionCompra(compra)}
                                >
                                  Cancelar orden de compra
                                </button>
                              </>
                            )}
                          </div>
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

        {compraCancelando && (
          <div className="modal-overlay">
            <div className="modal-card purchase-confirmation-modal">
              <div className="modal-header">
                <div>
                  <h2>Cancelar orden de compra</h2>
                </div>
                <button type="button" className="modal-close" onClick={cerrarCancelacionCompra} aria-label="Cerrar confirmación de cancelación">×</button>
              </div>
              <p>{confirmacionCancelacion || "¿Estás seguro de cancelar la orden de compra?"}</p>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={cerrarCancelacionCompra} disabled={cancelandoCompra}>No</button>
                <button type="button" className="primary-button" onClick={cancelarCompraConfirmada} disabled={cancelandoCompra}>
                  {cancelandoCompra ? "Cancelando..." : "Sí"}
                </button>
              </div>
            </div>
          </div>
        )}
          {compraRecepcionMostrando && (() => {
            const recepcion = compraRecepcionMostrando.recepcion || null;
            const itemsRecepcion = recepcion?.items || [];
            return (
              <div className="modal-overlay">
                <div className="modal-card sale-details-modal purchase-details-modal">
                  <div className="modal-header">
                    <div>
                      <h2>Registro de recepción</h2>
                      <p>{obtenerCodigoCompra(compraRecepcionMostrando)}</p>
                    </div>
                    <button type="button" className="modal-close" onClick={() => setCompraRecepcionMostrando(null)} aria-label="Cerrar registro de recepción">×</button>
                  </div>
                  <section className="purchase-record-section">
                    <p><strong>Proveedor:</strong> {compraRecepcionMostrando.proveedor}</p>
                    <p><strong>Resultado:</strong> <span className={`purchase-status ${(recepcion?.resultado || "").toLowerCase().replaceAll(" ", "-") || "pendiente"}`}>{recepcion?.resultado || "Sin resultado"}</span></p>
                    <p><strong>Fecha solicitada:</strong> {compraRecepcionMostrando.fechaEntregaRequerida || "—"}</p>
                    <p><strong>Fecha recibida:</strong> {recepcion?.fecha || "—"}</p>
                    <div className="table-container purchase-record-table"><table><thead><tr><th>Lote</th><th>Producto</th><th>Cantidad recibida</th><th>Precio unitario</th><th>Subtotal</th><th>Total final (IGV)</th><th>Revisión</th><th>Detalle</th><th>Vencimiento</th></tr></thead><tbody>
                      {itemsRecepcion.map((item) => {
                        const lot = obtenerLotesCompra(compraRecepcionMostrando).find((entry) => entry.idDetalle === item.idDetalle);
                        const subtotal = Number(item.cantidadRecibida || 0) * Number(lot?.precioUnitario || 0);
                        const totalConIgv = subtotal * (1 + (Number(compraRecepcionMostrando.igvPorcentaje || 0) / 100));
                        return <tr key={item.idDetalle ?? `${lot?.idLote ?? "lot"}-${Math.random()}`}>
                          <td>{lot ? obtenerCodigoLote(lot) : "—"}</td>
                          <td><strong>{lot?.producto || "Producto"}</strong></td>
                          <td>{item.cantidadRecibida ?? "—"}</td>
                          <td>S/ {Number(lot?.precioUnitario || 0).toFixed(2)}</td>
                          <td>S/ {subtotal.toFixed(2)}</td>
                          <td>S/ {totalConIgv.toFixed(2)}</td>
                          <td>{item.conforme ? "Recibido" : "Rechazado"}</td>
                          <td>{item.motivoRechazo || (item.conforme ? "" : "—")}</td>
                          <td>{item.fechaVencimiento || "—"}</td>
                        </tr>;
                      })}
                    </tbody></table></div>
                    {!itemsRecepcion.length && <p className="empty-state">No hay registros de recepción para esta compra.</p>}
                    {recepcion?.observaciones && <p><strong>Observaciones:</strong> {recepcion.observaciones}</p>}
                  </section>
                  <div className="modal-actions">
                    <button type="button" className="primary-button" onClick={() => setCompraRecepcionMostrando(null)}>Cerrar</button>
                  </div>
                </div>
              </div>
            );
          })()}
    </>
  );
}

export function DetalleCompra() {
  const { estadoCompras } = useContextoAplicacion();
  const { compraSeleccionada, verOrdenCompraPDF, cerrarVistaPreviaOrden, ordenCompraPdf, cargandoOrdenCompraPdf, obtenerCodigoCompra, obtenerCodigoLote, obtenerLotesCompra, registrarFactura, descargarFactura, setCompraSeleccionada } = estadoCompras;
  const [mostrarFormularioFactura, setMostrarFormularioFactura] = useState(false);

  const guardarFactura = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const datos = new FormData(form);
    const payload = new FormData();
    ["tipo", "numero", "fecha_emision", "monto_total"].forEach((key) => payload.append(key, datos.get(key)));
    const archivo = form.elements.archivo.files[0];
    if (archivo) payload.append("archivo", archivo);
    if (await registrarFactura(compraSeleccionada.idCompra, payload)) setMostrarFormularioFactura(false);
  };

  return (
    <>
      {compraSeleccionada && (
        <div className="modal-overlay">
          <div className="modal-card sale-details-modal purchase-details-modal">
            <div className="modal-header">
              <div>
                <h2>Detalles de compra</h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => { cerrarVistaPreviaOrden(); setMostrarFormularioFactura(false); setCompraSeleccionada(null); }}
                aria-label="Cerrar detalles de compra"
              >
                ×
              </button>
            </div>

            <section className="purchase-record-section purchase-order-lines-section">
              <h3>Productos de la orden</h3>
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
              </table>
              </div>
            </section>
            <div className="modal-actions purchase-pdf-actions"><button type="button" className="primary-button" disabled={cargandoOrdenCompraPdf} onClick={() => verOrdenCompraPDF(compraSeleccionada)}>{cargandoOrdenCompraPdf ? "Preparando PDF..." : "Ver orden de compra PDF"}</button></div>
            <section className="purchase-record-section">
              <h3>Datos del proveedor y entrega</h3>
              <div className="purchase-document-grid">
                <p><strong>Razón social:</strong><br />{compraSeleccionada.razonSocialProveedor || compraSeleccionada.proveedor}</p>
                <p><strong>RUC:</strong><br />{compraSeleccionada.rucProveedor || "—"}</p>
                <p><strong>Correo:</strong><br />{compraSeleccionada.correoProveedor || "—"}</p>
                <p><strong>Teléfono:</strong><br />{compraSeleccionada.telefonoProveedor || "—"}</p>
                {compraSeleccionada.nombreContactoProveedor && <p><strong>Contacto:</strong><br />{compraSeleccionada.nombreContactoProveedor} · {compraSeleccionada.cargoContactoProveedor}<br />{[compraSeleccionada.telefonoContactoProveedor, compraSeleccionada.correoContactoProveedor].filter(Boolean).join(" · ")}</p>}
                <p><strong>Entrega requerida:</strong><br />{compraSeleccionada.fechaEntregaRequerida || "—"}</p>
                <p><strong>Lugar de entrega:</strong><br />{compraSeleccionada.lugarEntrega || "—"}</p>
              </div>
            </section>
            {compraSeleccionada.recepcion && (
              <section className="purchase-record-section">
                <h3>Registro de recepción</h3>
                <p><strong>Resultado:</strong> <span className={`purchase-status ${compraSeleccionada.recepcion.resultado.toLowerCase().replaceAll(" ", "-")}`}>{compraSeleccionada.recepcion.resultado}</span></p>
                <p><strong>Fecha solicitada:</strong> {compraSeleccionada.fechaEntregaRequerida || "—"}</p>
                <p><strong>Fecha recibida:</strong> {compraSeleccionada.recepcion.fecha}</p>
                <div className="table-container purchase-record-table"><table><thead><tr><th>Lote</th><th>Producto</th><th>Cantidad recibida</th><th>Precio unitario</th><th>Subtotal</th><th>Total final (IGV)</th><th>Revisión</th><th>Detalle</th><th>Vencimiento</th></tr></thead><tbody>
                  {compraSeleccionada.recepcion.items.map((item) => {
                    const lot = obtenerLotesCompra(compraSeleccionada).find((entry) => entry.idDetalle === item.idDetalle);
                    const subtotal = Number(item.cantidadRecibida || 0) * Number(lot?.precioUnitario || 0);
                    const totalConIgv = subtotal * (1 + (Number(compraSeleccionada.igvPorcentaje || 0) / 100));
                    return <tr key={item.idDetalle}>
                      <td>{lot ? obtenerCodigoLote(lot) : "—"}</td>
                      <td><strong>{lot?.producto || "Producto"}</strong></td>
                      <td>{item.cantidadRecibida}</td>
                      <td>S/ {Number(lot?.precioUnitario || 0).toFixed(2)}</td>
                      <td>S/ {subtotal.toFixed(2)}</td>
                      <td>S/ {totalConIgv.toFixed(2)}</td>
                      <td>{item.conforme ? "Recibido" : "Rechazado"}</td>
                      <td>{item.motivoRechazo || (item.conforme ? "" : "—")}</td>
                      <td>{item.fechaVencimiento || "—"}</td>
                    </tr>;
                  })}
                </tbody></table></div>
                {compraSeleccionada.recepcion.observaciones && <p><strong>Observaciones:</strong> {compraSeleccionada.recepcion.observaciones}</p>}
              </section>
            )}
            {compraSeleccionada.recepcion && <section className="purchase-record-section">
              <h3>Factura del proveedor</h3>
              {compraSeleccionada.facturaProveedor ? (
                <>
                  <div className="purchase-document-grid">
                    <p><strong>Tipo:</strong> {compraSeleccionada.facturaProveedor.tipo}</p>
                    <p><strong>Número:</strong> {compraSeleccionada.facturaProveedor.numero}</p>
                    <p><strong>Fecha de emisión:</strong> {compraSeleccionada.facturaProveedor.fechaEmision}</p>
                    <p><strong>Monto:</strong> S/ {compraSeleccionada.facturaProveedor.montoTotal.toFixed(2)}</p>
                  </div>
                  {compraSeleccionada.facturaProveedor.tieneArchivo && <button type="button" className="secondary-button" onClick={() => descargarFactura(compraSeleccionada.idCompra, compraSeleccionada.facturaProveedor.nombreArchivo)}>Descargar {compraSeleccionada.facturaProveedor.nombreArchivo || "archivo de factura"}</button>}
                </>
              ) : mostrarFormularioFactura ? (
                <form className="purchase-invoice-form" onSubmit={guardarFactura}>
                  <label>Tipo de comprobante<select name="tipo" defaultValue="Factura" required><option>Factura</option><option>Boleta</option><option>Otro</option></select></label>
                  <label>Número de comprobante<input name="numero" maxLength="50" required placeholder="Ej. F001-0000123" /></label>
                  <label>Fecha de emisión<input name="fecha_emision" type="date" required defaultValue={fechaHoyLocal()} /></label>
                  <label>Monto total (S/)<input name="monto_total" type="number" min="0.01" step="0.01" required defaultValue={Number(compraSeleccionada.total || 0).toFixed(2)} /></label>
                  <label className="purchase-invoice-file">Archivo (opcional)<input name="archivo" type="file" accept=".pdf,.xml,.jpg,.jpeg,.png" /><small>PDF, XML, JPG o PNG; máximo 10 MB.</small></label>
                  <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setMostrarFormularioFactura(false)}>Cancelar</button><button type="submit" className="primary-button">Guardar factura</button></div>
                </form>
              ) : <button type="button" className="secondary-button" onClick={() => setMostrarFormularioFactura(true)}>Registrar factura</button>}
            </section>}
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
  const { compraVerificando, recepcionProductos, observacionesRecepcion, errorRecepcion, confirmacionRecepcion, guardandoRecepcion, actualizarRecepcionProducto, cancelarRecepcion, obtenerCodigoCompra, obtenerCodigoLote, obtenerLotesCompra, registrarRecepcion, cancelarConfirmacionRecepcion, setObservacionesRecepcion } = estadoCompras;

  return (
    <>
      {compraVerificando && (
        <div className="modal-overlay">
          <div className="modal-card sale-details-modal purchase-verification-modal">
            <div className="modal-header">
              <div>
                <h2>Revisar entrega</h2>
                <p>{obtenerCodigoCompra(compraVerificando)}</p>
              </div>
              <button type="button" className="modal-close" onClick={cancelarRecepcion} aria-label="Cerrar revisión">×</button>
            </div>

            <div className="purchase-verification-summary">
              <strong>Orden de compra</strong>
              <span>{obtenerCodigoCompra(compraVerificando)}</span>
              <strong>Proveedor</strong>
              <span>{compraVerificando.proveedor}</span>
              <strong>Fecha requerida de entrega</strong>
              <span>{compraVerificando.fechaEntregaRequerida || "—"}</span>
              <strong>Fecha actual</strong>
              <span>{fechaHoyLocal().split("-").reverse().join("/")}</span>
            </div>

            
            {errorRecepcion && <p className="field-error" role="alert">{errorRecepcion}</p>}
            {confirmacionRecepcion && <p className="receipt-confirmation" role="status">{confirmacionRecepcion}</p>}
            <div className="table-container purchase-receipt-table">
              <table>
                <thead><tr><th>Producto / lote</th><th>Solicitado</th><th>Recibido</th><th>Resultado</th><th>Vencimiento</th></tr></thead>
                <tbody>
                  {obtenerLotesCompra(compraVerificando).map((lote) => {
                    const receipt = recepcionProductos.find((item) => item.detailId === lote.idDetalle) || {};
                    return <tr key={lote.idDetalle}>
                      <td><strong>{lote.producto}</strong><small>{obtenerCodigoLote(lote)}</small></td>
                      <td>{lote.cantidad}</td>
                      <td><input type="number" min="0" step="0.001" required aria-label={`Cantidad recibida de ${lote.producto}`} value={receipt.receivedQuantity ?? ""} onChange={(event) => actualizarRecepcionProducto(lote.idDetalle, { receivedQuantity: event.target.value })} /></td>
                      <td><select required aria-label={`Resultado de revisión de ${lote.producto}`} value={receipt.conforme ?? ""} onChange={(event) => actualizarRecepcionProducto(lote.idDetalle, { conforme: event.target.value })}><option value="">Seleccionar</option><option value="true">Recibido</option><option value="false">Rechazar esta entrega</option></select>
                        {receipt.conforme === "false" && <input className="receipt-rejection-reason" maxLength="250" required placeholder="Motivo del rechazo" value={receipt.motivoRechazo || ""} onChange={(event) => actualizarRecepcionProducto(lote.idDetalle, { motivoRechazo: event.target.value })} />}
                      </td>
                      <td>{lote.perecible ? <input type="date" aria-label={`Vencimiento de ${lote.producto}`} value={receipt.expiryDate || ""} onChange={(event) => actualizarRecepcionProducto(lote.idDetalle, { expiryDate: event.target.value })} /> : "No aplica"}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
            <label className="receipt-observations">Observaciones de recepción (opcional)<textarea rows="3" maxLength="2000" value={observacionesRecepcion} onChange={(event) => setObservacionesRecepcion(event.target.value)} placeholder="Anotaciones sobre la entrega" /></label>
            <div className="modal-actions verification-actions">
              <button type="button" className="secondary-button" onClick={cancelarRecepcion}>Cerrar</button>
              {confirmacionRecepcion && <button type="button" className="secondary-button" disabled={guardandoRecepcion} onClick={cancelarConfirmacionRecepcion}>Volver a revisar</button>}
              <button type="button" className="primary-button" disabled={guardandoRecepcion} onClick={registrarRecepcion}>{guardandoRecepcion ? "Guardando revisión..." : confirmacionRecepcion ? "Confirmar recepción" : "Registrar revisión"}</button>
            </div>
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
    cambiarCantidadProductoCompra, cargarPrecioProductoProveedor, cargandoProductosCompra, cargandoProveedores,
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
                  <input type="text" placeholder={nuevaCompra.providerId ? "Escribe para buscar un producto" : "Primero selecciona un proveedor"} disabled={!nuevaCompra.providerId} value={busquedaProductoCompra} onChange={(event) => { setBusquedaProductoCompra(event.target.value); setProductosCompraOpciones([]); setTotalProductosCompraOpciones(0); setPaginaProductosCompra(1); setNuevaCompra({ ...nuevaCompra, productoId: "", precioUnitario: "" }); }} />
                  {busquedaProductoCompra.trim() && !productoSeleccionadoCompra && <SugerenciasProductos productos={productosCompraFiltrados} cargando={cargandoProductosCompra} pagina={paginaProductosCompra} cantidad={totalProductosCompraOpciones} alCambiar={setPaginaProductosCompra} alSeleccionar={(producto) => { setBusquedaProductoCompra(producto.nombre); cargarPrecioProductoProveedor(nuevaCompra.providerId, producto.id); }} />}
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
