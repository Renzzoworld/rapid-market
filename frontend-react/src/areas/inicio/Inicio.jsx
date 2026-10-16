import { useContextoAplicacion } from "../../contexto/useContextoAplicacion.js";

export function Inicio() {
  const { estadoResumen } = useContextoAplicacion();
  const { costosVentasIncompletos, esAdministrador, gananciaEstimada, obtenerCodigoVenta, resumenDashboard, seccion, stockBajo, totalVentas, ventasDashboard, ventasPorFechaRecientes } = estadoResumen;

  return (
    <>
        {seccion === "inicio" && (
          <>
            <div className="page-header">
              <div>
                <h1>Resumen</h1>
                <p>{esAdministrador ? "Vista general del negocio" : "Consulta tu actividad de ventas y el stock disponible"}</p>
              </div>
            </div>

            <div className="stats-grid">

              <div className="stat-card">
                <div className="stat-icon">📦</div>

                <div>
                  <span>Total productos</span>
                  <h2>{Number(resumenDashboard.product_count || 0)}</h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⚠️</div>

                <div>
                  <span>Stock bajo</span>
                  <h2>{Number(resumenDashboard.low_stock_count || 0)}</h2>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🛒</div>

                <div>
                  <span>{esAdministrador ? "Ventas acumuladas" : "Mis ventas"}</span>
                  <h2>S/ {totalVentas.toFixed(2)}</h2>
                </div>
              </div>

              {esAdministrador && <div className="stat-card">
                <div className="stat-icon">💰</div>

                <div>
                  <span>Ganancia estimada</span>
                  <h2>S/ {gananciaEstimada.toFixed(2)}</h2>
                  {costosVentasIncompletos && <small>Hay ventas sin costo de lote completo; la cifra podría ser mayor a la real.</small>}
                </div>
              </div>}

            </div>
                      <div className="content-card sales-chart-card">

            <h3>Ventas por fecha</h3>

            <div className="sales-chart">

              {ventasPorFechaRecientes.map(
                ([fecha, total]) => {

                  const porcentaje =
                    (total / Math.max(...ventasPorFechaRecientes.map(([, valor]) => valor))) *
                    100;

                  return (
                    <div className="chart-item" key={fecha}>

                      <div className="chart-label">
                        <span>{fecha}</span>
                        <strong>
                          S/ {total.toFixed(2)}
                        </strong>
                      </div>

                      <div className="chart-bar-container">

                        <div
                          className="chart-bar"
                          style={{
                            width: `${porcentaje}%`,
                          }}
                        ></div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          </div>
            <div className="dashboard-grid">

              <div className="content-card">

                <h3>{esAdministrador ? "Ventas recientes" : "Mis ventas recientes"}</h3>

              {ventasDashboard.map((venta) => (
                  <div className="sale-row" key={venta.idVenta ?? venta.id}>
                    <span>
                      Venta {obtenerCodigoVenta(venta)} -{" "}
                      {venta.producto}
                    </span>

                    <strong>
                      S/ {venta.total.toFixed(2)}
                    </strong>
                  </div>
                ))}

              </div>

              <div className="content-card">

                <h3>Productos con stock bajo</h3>

                {stockBajo.length === 0 ? (
                  <p>Todos los productos tienen stock suficiente.</p>
                ) : (
                  stockBajo.map((producto) => (
                    <div
                      className="sale-row"
                      key={producto.id}
                    >
                      <span>{producto.nombre}</span>
                      <strong>{producto.cantidad}</strong>
                    </div>
                  ))
                )}

              </div>

            </div>

          </>
        )}
    </>
  );
}