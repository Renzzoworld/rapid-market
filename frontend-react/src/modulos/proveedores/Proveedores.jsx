import Paginacion from "../../compartido/componentes/Paginacion.jsx";
import { useContextoAplicacion } from "../../compartido/contexto/useContextoAplicacion.js";

const LOGO_PREDETERMINADO = "/proveedor-sin-logo.svg";

export function Proveedores() {
  const { estadoProveedores } = useContextoAplicacion();
  const {
    busqueda, cargando, error, esAdministrador, pagina, registros, seleccionado,
    total, setBusqueda, setPagina, setSeleccionado, mostrarFormulario,
    setMostrarFormulario, nuevoProveedor, setNuevoProveedor, guardarProveedor,
  } = estadoProveedores;

  if (!esAdministrador) return null;

  return (
    <>
      {estadoProveedores.seccion === "proveedores" && (
        <section className="proveedores-page">
          <header className="page-header">
            <div><h1>Proveedores</h1><p>Directorio de proveedores</p></div>
            <button className="primary-button" onClick={() => setMostrarFormulario(true)}>+ Nuevo proveedor</button>
          </header>

          <div className="history-toolbar">
            <input
              type="search"
              value={busqueda}
              placeholder="Buscar por nombre, RUC, contacto o teléfono..."
              onChange={(event) => { setBusqueda(event.target.value); setPagina(1); }}
            />
          </div>

          {cargando && <div className="empty-state" role="status"><p>Cargando proveedores...</p></div>}
          {error && <div className="empty-state" role="alert"><p>{error}</p></div>}
          {!cargando && !error && registros.length === 0 && (
            <div className="empty-state"><p>{busqueda ? "No hay proveedores que coincidan con la búsqueda." : "Aún no hay proveedores registrados."}</p></div>
          )}

          {!error && registros.length > 0 && (
            <div className="proveedores-grid">
              {registros.map((proveedor) => (
                <button type="button" className="proveedor-card content-card" key={proveedor.id} onClick={() => setSeleccionado(proveedor)}>
                  <img src={proveedor.logo || LOGO_PREDETERMINADO} alt={`Logo de ${proveedor.nombre}`} />
                  <strong>{proveedor.nombre}</strong>
                  <span>{proveedor.activo ? "Activo" : "Inactivo"}</span>
                </button>
              ))}
            </div>
          )}

          <Paginacion pagina={pagina} cantidad={total} cargando={cargando} alCambiar={setPagina} tamanoPagina={9} />
        </section>
      )}

      {estadoProveedores.seccion === "proveedores" && seleccionado && (
        <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSeleccionado(null); }}>
          <section className="modal-card proveedor-detalle" role="dialog" aria-modal="true" aria-labelledby="proveedor-titulo">
            <div className="modal-header">
              <div><h2 id="proveedor-titulo">{seleccionado.nombre}</h2><p>Información del proveedor</p></div>
              <button className="modal-close" onClick={() => setSeleccionado(null)} aria-label="Cerrar">×</button>
            </div>
            <img src={seleccionado.logo || LOGO_PREDETERMINADO} alt={`Logo de ${seleccionado.nombre}`} />
            <dl className="proveedor-datos">
              <dt>RUC</dt><dd>{seleccionado.ruc || "No registrado"}</dd>
              <dt>Contacto</dt><dd>{seleccionado.contacto || "No registrado"}</dd>
              <dt>Teléfono</dt><dd>{seleccionado.telefono || "No registrado"}</dd>
              <dt>Correo</dt><dd>{seleccionado.email || "No registrado"}</dd>
              <dt>Dirección</dt><dd>{seleccionado.direccion || "No registrada"}</dd>
              <dt>Estado</dt><dd>{seleccionado.activo ? "Activo" : "Inactivo"}</dd>
            </dl>
          </section>
        </div>
      )}

      {estadoProveedores.seccion === "proveedores" && mostrarFormulario && (
        <div className="modal-overlay">
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="nuevo-proveedor-titulo">
            <div className="modal-header">
              <div><h2 id="nuevo-proveedor-titulo">Nuevo proveedor</h2><p>Completa los datos del proveedor</p></div>
              <button className="modal-close" onClick={() => setMostrarFormulario(false)} aria-label="Cerrar">×</button>
            </div>
            <form onSubmit={guardarProveedor}>
              <div className="form-group"><label htmlFor="proveedor-nombre">Nombre *</label><input id="proveedor-nombre" required maxLength="150" value={nuevoProveedor.nombre} onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, nombre: e.target.value })} /></div>
              <div className="form-group"><label htmlFor="proveedor-ruc">RUC</label><input id="proveedor-ruc" inputMode="numeric" maxLength="11" pattern="[0-9]{11}" value={nuevoProveedor.ruc} onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, ruc: e.target.value })} /></div>
              <div className="form-group"><label htmlFor="proveedor-contacto">Persona de contacto</label><input id="proveedor-contacto" maxLength="150" value={nuevoProveedor.contacto} onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, contacto: e.target.value })} /></div>
              <div className="form-group"><label htmlFor="proveedor-telefono">Teléfono</label><input id="proveedor-telefono" maxLength="30" value={nuevoProveedor.telefono} onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, telefono: e.target.value })} /></div>
              <div className="form-group"><label htmlFor="proveedor-email">Correo</label><input id="proveedor-email" type="email" maxLength="254" value={nuevoProveedor.email} onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, email: e.target.value })} /></div>
              <div className="form-group"><label htmlFor="proveedor-direccion">Dirección</label><input id="proveedor-direccion" maxLength="250" value={nuevoProveedor.direccion} onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, direccion: e.target.value })} /></div>
              <div className="form-group"><label htmlFor="proveedor-logo">Logo (PNG, JPG o WebP; máximo 2 MB)</label><input id="proveedor-logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, logo: e.target.files?.[0] || null })} /></div>
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
                <button type="submit" className="primary-button">Guardar proveedor</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
