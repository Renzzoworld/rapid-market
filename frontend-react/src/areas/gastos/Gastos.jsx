import { useContextoAplicacion } from "../../contexto/useContextoAplicacion.js";
import Paginacion from "../../componentes/Paginacion.jsx";

export function Gastos() {
  const { estadoGastos } = useContextoAplicacion();
  const { busquedaGastos, cargandoGastos, errorGastos, esAdministrador, gastosFiltrados, paginaGastos, resumenDashboard, seccion, setBusquedaGastos, setMostrarGasto, setPaginaGastos, totalGastos, totalGastosRegistros } = estadoGastos;

  return (
    <>
        {seccion === "gastos" && esAdministrador && (
          <>
            <div className="page-header">

              <div>
                <h1>Gastos</h1>
                <p>Control de gastos del negocio</p>
              </div>

              <button
                className="primary-button"
                onClick={() => setMostrarGasto(true)}
              >
                + Nuevo gasto
              </button>

            </div>

            <div className="inventory-summary">

              <div className="summary-card">
                <span>Total de gastos</span>
                <strong>{Number(resumenDashboard.expenses_count || 0)}</strong>
              </div>

              <div className="summary-card">
                <span>Monto gastado</span>
                <strong>S/ {totalGastos.toFixed(2)}</strong>
              </div>

            </div>

            <div className="content-card inventory-card">

              <h3>Historial de gastos</h3>

              <div className="history-toolbar">
                <input
                  type="text"
                  placeholder="Buscar por fecha, descripción, categoría o monto..."
                  value={busquedaGastos}
                  onChange={(e) => {
                    setBusquedaGastos(e.target.value);
                    setPaginaGastos(1);
                  }}
                />
              </div>

              <div className="table-container">

                <table>

                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Descripción</th>
                      <th>Categoría</th>
                      <th>Monto</th>
                    </tr>
                  </thead>

                  <tbody>

                    {!cargandoGastos && !errorGastos && gastosFiltrados.map((gasto) => (
                      <tr key={gasto.id}>

                        <td>{gasto.fecha}</td>

                        <td>
                          <strong>{gasto.descripcion}</strong>
                        </td>

                        <td>{gasto.categoria}</td>

                        <td>
                          S/ {gasto.monto.toFixed(2)}
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>
                {cargandoGastos && <div className="empty-state" role="status"><p>Cargando gastos...</p></div>}
                {errorGastos && <div className="empty-state" role="alert"><p>{errorGastos}</p></div>}
                {!cargandoGastos && !errorGastos && gastosFiltrados.length === 0 && (
                  <div className="empty-state">
                    <p>{busquedaGastos.trim() ? "No se encontraron gastos con esa búsqueda." : "Todavía no hay gastos registrados."}</p>
                  </div>
                )}

              </div>

              <Paginacion pagina={paginaGastos} cantidad={totalGastosRegistros} cargando={cargandoGastos} alCambiar={setPaginaGastos} />

            </div>
          </>
        )}
    </>
  );
}

export function FormularioGasto() {
  const { estadoGastos } = useContextoAplicacion();
  const { mostrarGasto, nuevoGasto, registrarGasto, setMostrarGasto, setNuevoGasto } = estadoGastos;

  return (
    <>
      {/* =====================================================
          MODAL NUEVO GASTO
      ===================================================== */}
      {mostrarGasto && (
        <div className="modal-overlay">

          <div className="modal-card">

            <div className="modal-header">

              <div>
                <h2>Nuevo gasto</h2>
                <p>Registra un gasto del negocio</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setMostrarGasto(false)}
              >
                ×
              </button>

            </div>

            <form onSubmit={registrarGasto}>

              <div className="form-group">

                <label>Descripción</label>

                <input
                  type="text"
                  placeholder="Ej. Transporte"
                  value={nuevoGasto.descripcion}
                  onChange={(e) =>
                    setNuevoGasto({
                      ...nuevoGasto,
                      descripcion: e.target.value,
                    })
                  }
                />

              </div>

              <div className="form-group">

                <label>Categoría</label>

                <select
                  value={nuevoGasto.categoria}
                  onChange={(e) =>
                    setNuevoGasto({
                      ...nuevoGasto,
                      categoria: e.target.value,
                    })
                  }
                >
                  <option value="Operativo">
                    Operativo
                  </option>

                  <option value="Servicios">
                    Servicios
                  </option>

                  <option value="Transporte">
                    Transporte
                  </option>

                  <option value="Otros">
                    Otros
                  </option>
                </select>

              </div>

              <div className="form-group">

                <label>Monto</label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={nuevoGasto.monto}
                  onChange={(e) =>
                    setNuevoGasto({
                      ...nuevoGasto,
                      monto: e.target.value,
                    })
                  }
                />

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setMostrarGasto(false)}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  Registrar gasto
                </button>

              </div>

            </form>

          </div>

        </div>
      )}


    </>
  );
}