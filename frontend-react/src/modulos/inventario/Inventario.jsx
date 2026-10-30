import { useContextoAplicacion } from "../../compartido/contexto/useContextoAplicacion.js";

export function Inventario() {
  const { estadoInventario } = useContextoAplicacion();
  const { abrirEditarProducto, abrirNuevoProducto, busqueda, cargandoInventario, eliminarProducto, errorInventario, esAdministrador, paginaInventario, paginasInventario, productosFiltrados, resumenDashboard, seccion, setBusqueda, setPaginaInventario, totalPaginasInventario, totalProductosInventario, verDetallesProducto } = estadoInventario;

  return (
    <>
        {seccion === "inventario" && (
          <>
            <div className="page-header">

              <div>
                <h1>Inventario</h1>
                <p>Control de productos y existencias</p>
              </div>

              {esAdministrador && <button
                className="primary-button"
                onClick={abrirNuevoProducto}
              >
                + Nuevo producto
              </button>}

            </div>

            <div className="inventory-summary">

              <div className="summary-card">
                <span>Total de productos</span>
                <strong>{Number(resumenDashboard.product_count || totalProductosInventario)}</strong>
              </div>

              <div className="summary-card warning">
                <span>Stock bajo</span>
                <strong>{Number(resumenDashboard.low_stock_count || 0)}</strong>
              </div>

            </div>

            <div className="content-card inventory-card">

              <div className="inventory-toolbar">

                <input
                  type="text"
                  placeholder="🔍 Buscar producto..."
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setPaginaInventario(1);
                  }}
                />

              </div>

              <div className="table-container">

                <table>

                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Precio</th>
                      <th>Cantidad de lotes</th>
                      <th>Cantidad actual</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>

                  <tbody>

                    {!cargandoInventario && !errorInventario && productosFiltrados.map((producto) => (

                      <tr key={producto.id}>

                        <td>
                          <strong>{producto.nombre}</strong><br /><small>{producto.categoria}</small>
                        </td>

                        <td>
                          S/ {producto.precio.toFixed(2)}
                        </td>

                        <td>{producto.cantidadLotes}</td>

                        <td>{producto.cantidad}</td>

                        <td>

                          {producto.cantidad === 0 ? (
                            <span className="status-badge out-of-stock">
                              Sin stock
                            </span>
                          ) : producto.cantidad <= 5 ? (
                            <span className="status-badge low">
                              Stock bajo
                            </span>
                          ) : (
                            <span className="status-badge available">
                              Disponible
                            </span>
                          )}

                        </td>

                        <td>

                          <div className="action-buttons">

  <button
    type="button"
    className="details-button"
    onClick={() => verDetallesProducto(producto)}
  >
    <span aria-hidden="true">👁</span> Detalles
  </button>

  {esAdministrador && <button
    type="button"
    className="edit-button"
    onClick={() => abrirEditarProducto(producto)}
  >
    <span aria-hidden="true">✏️</span> Editar
  </button>}

  {esAdministrador && <button
    type="button"
    className="action-button delete"
    title="Desactivar producto"
    aria-label={`Desactivar ${producto.nombre}`}
    onClick={() => eliminarProducto(producto.id)}
  >
    🗑️
  </button>}

</div>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

                {cargandoInventario && (
                  <div className="empty-state" role="status">
                    <p>Cargando productos...</p>
                  </div>
                )}

                {errorInventario && (
                  <div className="empty-state" role="alert">
                    <p>{errorInventario}</p>
                  </div>
                )}

                {!cargandoInventario && !errorInventario && productosFiltrados.length === 0 && (
                  <div className="empty-state">
                    <div>📦</div>
                    <h3>No se encontraron productos</h3>
                    <p>Prueba con otro nombre.</p>
                  </div>
                )}

              </div>

              {totalPaginasInventario > 1 && (
                <nav className="inventory-pagination" aria-label="Paginación del inventario">
                  <span>
                    Página {paginaInventario} de {totalPaginasInventario}
                  </span>
                  <div className="inventory-page-buttons">
                    <button
                      type="button"
                      disabled={paginaInventario === 1 || cargandoInventario}
                      onClick={() => setPaginaInventario((page) => Math.max(1, page - 1))}
                    >
                      Anterior
                    </button>
                    {paginasInventario.map((page) => (
                      <button
                        type="button"
                        key={page}
                        className={page === paginaInventario ? "active" : ""}
                        aria-current={page === paginaInventario ? "page" : undefined}
                        disabled={cargandoInventario}
                        onClick={() => setPaginaInventario(page)}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={paginaInventario === totalPaginasInventario || cargandoInventario}
                      onClick={() => setPaginaInventario((page) => Math.min(totalPaginasInventario, page + 1))}
                    >
                      Siguiente
                    </button>
                  </div>
                </nav>
              )}

            </div>
          </>
        )}
    </>
  );
}

export function FormularioProducto() {
  const { estadoInventario, estadoResumen } = useContextoAplicacion();
  const { guardarProducto, mostrarFormulario, nuevoProducto, productoEditando, setMostrarFormulario, setNuevoProducto } = estadoInventario;
  const { catalogos } = estadoResumen;

  return (
    <>
      {/* =====================================================
          MODAL INVENTARIO
      ===================================================== */}
      {mostrarFormulario && (
        <div className="modal-overlay">

          <div className="modal-card">

            <div className="modal-header">

              <div>

                <h2>
                  {productoEditando
                    ? "Editar producto"
                    : "Nuevo producto"}
                </h2>

                <p>
                  {productoEditando
                    ? "Actualiza la información del producto"
                    : "Registra un nuevo producto en el inventario"}
                </p>

              </div>

              <button
                className="modal-close"
                onClick={() =>
                  setMostrarFormulario(false)
                }
              >
                ×
              </button>

            </div>

            <form onSubmit={guardarProducto}>

              <div className="form-group">

                <label>Nombre del producto</label>

                <input
                  type="text"
                  placeholder="Ej. Arroz Faraón"
                  value={nuevoProducto.nombre}
                  onChange={(e) =>
                    setNuevoProducto({
                      ...nuevoProducto,
                      nombre: e.target.value,
                    })
                  }
                />

              </div>

              <div className="form-row">

                <div className="form-group">

                  <label>Unidad</label>

                  <select
                    value={nuevoProducto.unidad}
                    onChange={(e) =>
                      setNuevoProducto({
                        ...nuevoProducto,
                        unidad: e.target.value,
                      })
                    }
                  >
                    <option value="unidad">Unidad</option>
                    <option value="kg">Kilogramo</option>
                    <option value="caja">Caja</option>
                    <option value="paquete">Paquete</option>
                  </select>

                </div>

              </div>

              <div className="form-group">
                <label>Categoría *</label>
                <select required value={nuevoProducto.categoriaId || ""} onChange={(e) => setNuevoProducto({ ...nuevoProducto, categoriaId: e.target.value })}>
                  <option value="">Selecciona una categoría</option>
                  {(catalogos?.product_categories || []).map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
                </select>
              </div>

              <div className="form-group">

                <label>Precio de venta</label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={nuevoProducto.precio}
                  onChange={(e) =>
                    setNuevoProducto({
                      ...nuevoProducto,
                      precio: e.target.value,
                    })
                  }
                />

              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(nuevoProducto.perecible)}
                    onChange={(e) => setNuevoProducto({ ...nuevoProducto, perecible: e.target.checked })}
                  />
                  Producto perecible (requiere fecha de vencimiento al recibir compras)
                </label>
              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setMostrarFormulario(false)
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {productoEditando
                    ? "Guardar cambios"
                    : "Agregar producto"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}


    </>
  );
}
export function DetalleProducto() {
  const { estadoInventario } = useContextoAplicacion();
  const { obtenerCodigoLote, obtenerLotesProducto, productoInventarioSeleccionado, setProductoInventarioSeleccionado } = estadoInventario;

  return (
    <>
      {productoInventarioSeleccionado && (
        <div className="modal-overlay">
          <div className="modal-card sale-details-modal">
            <div className="modal-header">
              <div>
                <h2>Detalles de producto</h2>
                <p>{productoInventarioSeleccionado.nombre}</p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setProductoInventarioSeleccionado(null)}
                aria-label="Cerrar detalles del producto"
              >
                ×
              </button>
            </div>

            <div className="sale-details-table-container">
              <table className="sale-details-table">
                <thead>
                  <tr>
                    <th>ID orden de compra</th>
                    <th>ID lote</th>
                    <th>Producto</th>
                    <th>Unidad</th>
                    <th>Cantidad actual</th>
                    <th>Fecha de compra</th>
                    <th>Fecha de expiración</th>
                  </tr>
                </thead>
                <tbody>
                  {obtenerLotesProducto(productoInventarioSeleccionado).length > 0 ? (
                    obtenerLotesProducto(productoInventarioSeleccionado).map((lote) => (
                      <tr key={`${lote.ordenCompra}-${lote.idLote}`}>
                        <td>{lote.ordenCompra}</td>
                        <td>{obtenerCodigoLote(lote)}</td>
                        <td>{lote.producto}</td>
                        <td>{productoInventarioSeleccionado.unidad}</td>
                        <td>{lote.cantidadActual}</td>
                        <td>{lote.fecha}</td>
                        <td>{lote.fechaVencimiento || "---"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7">No hay lotes registrados para este producto.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


    </>
  );
}
