import Paginacion from "../../compartido/componentes/Paginacion.jsx";
import { useContextoAplicacion } from "../../compartido/contexto/useContextoAplicacion.js";

const LOGO_PREDETERMINADO = "/proveedor-sin-logo.svg";
const medios = {
  telefono: "Teléfono",
  whatsapp: "WhatsApp",
  correo: "Correo",
  web: "Sitio web",
  otro: "Otro",
};

function Dialogo({ titulo, cerrar, children }) {
  return (
    <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) cerrar(); }}>
      <section className="modal-card proveedor-dialogo" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="modal-header">
          <div><h2>{titulo}</h2></div>
          <button type="button" className="modal-close" onClick={cerrar} aria-label="Cerrar">×</button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function Proveedores() {
  const { estadoProveedores: p } = useContextoAplicacion();
  const {
    busqueda, cargando, error, esAdministrador, pagina, registros, seleccionado,
    total, setBusqueda, setPagina, mostrarFormulario, setMostrarFormulario,
    proveedorEditando, nuevoProveedor, setNuevoProveedor, contactoDetalle,
    canalDetalle, formRelacion, contactoEditando, canalEditando, formContacto,
    formCanal, confirmacion, cargandoDetalle, diasSemana, setContactoDetalle,
    setCanalDetalle, setFormRelacion, setFormContacto, setFormCanal,
    abrirProveedor, abrirNuevoProveedor, editarProveedor, guardarProveedor,
    cambiarEstadoProveedor, abrirFormularioContacto, guardarContacto,
    abrirFormularioCanal, guardarCanal, solicitarEliminacion,
    confirmarEliminacion,
  } = p;

  if (!esAdministrador) return null;

  const cambiarHorario = (dia, cambios) => {
    const actual = formContacto.horarios.find((horario) => horario.dia_semana === dia);
    const horarios = actual
      ? formContacto.horarios.map((horario) => horario.dia_semana === dia ? { ...horario, ...cambios } : horario)
      : [...formContacto.horarios, { dia_semana: dia, hora_inicio: "09:00", hora_fin: "17:00", ...cambios }];
    setFormContacto({ ...formContacto, horarios });
  };

  const alternarDia = (dia, marcado) => {
    const horarios = marcado
      ? [...formContacto.horarios, { dia_semana: dia, hora_inicio: "09:00", hora_fin: "17:00" }]
      : formContacto.horarios.filter((horario) => horario.dia_semana !== dia);
    setFormContacto({ ...formContacto, horarios });
  };

  return (
    <>
      {p.seccion === "proveedores" && (
        <section className="proveedores-page">
          <header className="page-header">
            <div><h1>Proveedores</h1><p>Administra proveedores, contactos y canales de atención</p></div>
            <button className="primary-button" onClick={abrirNuevoProveedor}>+ Nuevo proveedor</button>
          </header>

          <div className="history-toolbar">
            <input type="search" value={busqueda} placeholder="Buscar por nombre, RUC o dirección..."
              onChange={(event) => { setBusqueda(event.target.value); setPagina(1); }} />
          </div>

          {cargando && <div className="empty-state" role="status"><p>Cargando proveedores...</p></div>}
          {error && <div className="empty-state" role="alert"><p>{error}</p></div>}
          {!cargando && !error && registros.length === 0 && (
            <div className="empty-state"><p>{busqueda ? "No hay coincidencias." : "Aún no hay proveedores registrados."}</p></div>
          )}
          {!error && registros.length > 0 && (
            <div className="proveedores-grid">
              {registros.map((proveedor) => (
                <button type="button" className="proveedor-card content-card" key={proveedor.id} onClick={() => abrirProveedor(proveedor)}>
                  <img src={proveedor.logo || LOGO_PREDETERMINADO} alt={`Logo de ${proveedor.nombre}`} />
                  <strong>{proveedor.nombre}</strong>
                  <span className={proveedor.activo ? "provider-badge active" : "provider-badge inactive"}>{proveedor.activo ? "Activo" : "Inactivo"}</span>
                </button>
              ))}
            </div>
          )}
          <Paginacion pagina={pagina} cantidad={total} cargando={cargando} alCambiar={setPagina} tamanoPagina={9} />
        </section>
      )}

      {p.seccion === "proveedores" && seleccionado && (
        <Dialogo titulo={seleccionado.nombre} cerrar={() => p.setSeleccionado(null)}>
          {cargandoDetalle ? <p role="status">Cargando detalles...</p> : (
            <>
              <div className="proveedor-resumen">
                <img src={seleccionado.logo || LOGO_PREDETERMINADO} alt={`Logo de ${seleccionado.nombre}`} />
                <div>
                  <span className={seleccionado.activo ? "provider-badge active" : "provider-badge inactive"}>{seleccionado.activo ? "Activo" : "Inactivo"}</span>
                  <p><strong>RUC:</strong> {seleccionado.ruc || "No registrado"}</p>
                  <p><strong>Dirección:</strong> {seleccionado.direccion || "No registrada"}</p>
                </div>
              </div>

              <div className="provider-actions">
                <button type="button" className="secondary-button" onClick={editarProveedor}>Editar datos generales</button>
                <button type="button" className="secondary-button" onClick={cambiarEstadoProveedor}>{seleccionado.activo ? "Desactivar" : "Activar"}</button>
                <button type="button" className="danger-button" onClick={() => solicitarEliminacion("proveedor", seleccionado)}>Eliminar proveedor</button>
              </div>

              <section className="provider-related-section">
                <header><h3>Contactos ({seleccionado.contactos?.length || 0})</h3><button type="button" className="details-button" onClick={() => abrirFormularioContacto()}>+ Agregar contacto</button></header>
                {!seleccionado.contactos?.length && <p className="field-hint">No hay contactos registrados.</p>}
                {seleccionado.contactos?.map((contacto) => (
                  <article className="provider-related-card" key={contacto.id}>
                    <div><strong>{contacto.nombre}</strong><span>{contacto.cargo || "Sin cargo"}</span></div>
                    <div className="provider-inline-actions">
                      <button type="button" className="details-button" onClick={() => setContactoDetalle(contacto)}>Detalles</button>
                      <button type="button" className="secondary-button" onClick={() => abrirFormularioContacto(contacto)}>Editar</button>
                      <button type="button" className="action-button delete" onClick={() => solicitarEliminacion("contacto", contacto)}>Eliminar</button>
                    </div>
                  </article>
                ))}
                {contactoDetalle && (
                  <div className="related-detail">
                    <header><h4>{contactoDetalle.nombre}</h4><button type="button" className="modal-close" onClick={() => setContactoDetalle(null)} aria-label="Cerrar detalle">×</button></header>
                    <p><strong>Cargo:</strong> {contactoDetalle.cargo || "No registrado"}</p>
                    <p><strong>Correo:</strong> {contactoDetalle.email || "No registrado"}</p>
                    <p><strong>Teléfono:</strong> {contactoDetalle.telefono || "No registrado"}</p>
                    <p><strong>Estado:</strong> {contactoDetalle.activo ? "Activo" : "Inactivo"}</p>
                    <h5>Horario de atención</h5>
                    {contactoDetalle.horarios?.length ? contactoDetalle.horarios.map((h) => (
                      <p key={h.id || `${h.dia_semana}-${h.hora_inicio}`}>
                        {diasSemana[h.dia_semana]}: {String(h.hora_inicio).slice(0, 5)}–{String(h.hora_fin).slice(0, 5)}
                      </p>
                    )) : <p>Sin horario registrado.</p>}
                  </div>
                )}
              </section>

              <section className="provider-related-section">
                <header><h3>Canales de atención ({seleccionado.canales?.length || 0})</h3><button type="button" className="details-button" onClick={() => abrirFormularioCanal()}>+ Agregar canal</button></header>
                {!seleccionado.canales?.length && <p className="field-hint">No hay canales registrados.</p>}
                {seleccionado.canales?.map((canal) => (
                  <article className="provider-related-card" key={canal.id}>
                    <div><strong>{canal.nombre}</strong><span>{medios[canal.medio] || canal.medio}: {canal.valor}</span></div>
                    <div className="provider-inline-actions">
                      <button type="button" className="details-button" onClick={() => setCanalDetalle(canal)}>Detalles</button>
                      <button type="button" className="secondary-button" onClick={() => abrirFormularioCanal(canal)}>Editar</button>
                      <button type="button" className="action-button delete" onClick={() => solicitarEliminacion("canal", canal)}>Eliminar</button>
                    </div>
                  </article>
                ))}
                {canalDetalle && (
                  <div className="related-detail">
                    <header><h4>{canalDetalle.nombre}</h4><button type="button" className="modal-close" onClick={() => setCanalDetalle(null)} aria-label="Cerrar detalle">×</button></header>
                    <p><strong>Medio:</strong> {medios[canalDetalle.medio] || canalDetalle.medio}</p>
                    <p><strong>Dato de contacto:</strong> {canalDetalle.valor}</p>
                    <p><strong>Función:</strong> {canalDetalle.funcion || "No especificada"}</p>
                    <p><strong>Contacto asignado:</strong> {seleccionado.contactos?.find((c) => c.id === canalDetalle.contacto)?.nombre || "General del proveedor"}</p>
                    <p><strong>Estado:</strong> {canalDetalle.activo ? "Activo" : "Inactivo"}</p>
                  </div>
                )}
              </section>
            </>
          )}
        </Dialogo>
      )}

      {p.seccion === "proveedores" && mostrarFormulario && (
        <Dialogo titulo={proveedorEditando ? "Editar proveedor" : "Nuevo proveedor"} cerrar={() => setMostrarFormulario(false)}>
          <form onSubmit={guardarProveedor}>
            <div className="form-group"><label htmlFor="proveedor-nombre">Nombre *</label><input id="proveedor-nombre" required maxLength="150" value={nuevoProveedor.nombre} onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, nombre: e.target.value })} /></div>
            <div className="form-group"><label htmlFor="proveedor-ruc">RUC</label><input id="proveedor-ruc" inputMode="numeric" maxLength="11" pattern="[0-9]{11}" value={nuevoProveedor.ruc} onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, ruc: e.target.value })} /></div>
            <div className="form-group"><label htmlFor="proveedor-direccion">Dirección</label><input id="proveedor-direccion" maxLength="250" value={nuevoProveedor.direccion} onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, direccion: e.target.value })} /></div>
            <div className="form-group"><label htmlFor="proveedor-logo">Logo (opcional, JPEG/PNG/WebP; máximo 2 MB)</label><input id="proveedor-logo" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setNuevoProveedor({ ...nuevoProveedor, logo: e.target.files?.[0] || null })} /></div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setMostrarFormulario(false)}>Cancelar</button><button type="submit" className="primary-button">Guardar</button></div>
          </form>
        </Dialogo>
      )}

      {p.seccion === "proveedores" && formRelacion === "contacto" && (
        <Dialogo titulo={contactoEditando ? "Editar contacto" : "Nuevo contacto"} cerrar={() => setFormRelacion(null)}>
          <form onSubmit={guardarContacto}>
            <div className="form-group"><label>Nombre *</label><input required maxLength="150" value={formContacto.nombre} onChange={(e) => setFormContacto({ ...formContacto, nombre: e.target.value })} /></div>
            <div className="form-group"><label>Cargo</label><input maxLength="120" value={formContacto.cargo} onChange={(e) => setFormContacto({ ...formContacto, cargo: e.target.value })} /></div>
            <div className="form-group"><label>Correo</label><input type="email" maxLength="254" value={formContacto.email} onChange={(e) => setFormContacto({ ...formContacto, email: e.target.value })} /></div>
            <div className="form-group"><label>Teléfono directo</label><input maxLength="30" value={formContacto.telefono} onChange={(e) => setFormContacto({ ...formContacto, telefono: e.target.value })} /></div>
            <fieldset className="schedule-fieldset"><legend>Horario semanal</legend>
              {diasSemana.map((dia, index) => {
                const horario = formContacto.horarios.find((h) => h.dia_semana === index);
                return <div className="schedule-row" key={dia}>
                  <label><input type="checkbox" checked={Boolean(horario)} onChange={(e) => alternarDia(index, e.target.checked)} />{dia}</label>
                  {horario && <><input aria-label={`${dia} desde`} type="time" required value={horario.hora_inicio} onChange={(e) => cambiarHorario(index, { hora_inicio: e.target.value })} /><span>a</span><input aria-label={`${dia} hasta`} type="time" required value={horario.hora_fin} onChange={(e) => cambiarHorario(index, { hora_fin: e.target.value })} /></>}
                </div>;
              })}
            </fieldset>
            <div className="form-group"><label><input type="checkbox" checked={formContacto.activo} onChange={(e) => setFormContacto({ ...formContacto, activo: e.target.checked })} /> Activo</label></div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setFormRelacion(null)}>Cancelar</button><button type="submit" className="primary-button">Guardar contacto</button></div>
          </form>
        </Dialogo>
      )}

      {p.seccion === "proveedores" && formRelacion === "canal" && (
        <Dialogo titulo={canalEditando ? "Editar canal" : "Nuevo canal"} cerrar={() => setFormRelacion(null)}>
          <form onSubmit={guardarCanal}>
            <div className="form-group"><label>Nombre del canal *</label><input required maxLength="100" value={formCanal.nombre} onChange={(e) => setFormCanal({ ...formCanal, nombre: e.target.value })} /></div>
            <div className="form-group"><label>Medio</label><select value={formCanal.medio} onChange={(e) => setFormCanal({ ...formCanal, medio: e.target.value })}>{Object.entries(medios).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div className="form-group"><label>Número, correo o dirección *</label><input required maxLength="255" value={formCanal.valor} onChange={(e) => setFormCanal({ ...formCanal, valor: e.target.value })} /></div>
            <div className="form-group"><label>Función</label><input maxLength="150" placeholder="Pedidos, soporte, consultas..." value={formCanal.funcion} onChange={(e) => setFormCanal({ ...formCanal, funcion: e.target.value })} /></div>
            <div className="form-group"><label>Contacto asociado</label><select value={formCanal.contacto} onChange={(e) => setFormCanal({ ...formCanal, contacto: e.target.value })}><option value="">Canal general del proveedor</option>{seleccionado?.contactos?.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
            <div className="form-group"><label><input type="checkbox" checked={formCanal.activo} onChange={(e) => setFormCanal({ ...formCanal, activo: e.target.checked })} /> Activo</label></div>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setFormRelacion(null)}>Cancelar</button><button type="submit" className="primary-button">Guardar canal</button></div>
          </form>
        </Dialogo>
      )}

      {p.seccion === "proveedores" && confirmacion && (
        <Dialogo titulo="Confirmar eliminación" cerrar={() => p.setConfirmacion(null)}>
          <p>¿Seguro que deseas eliminar {confirmacion.tipo === "proveedor" ? "el proveedor" : confirmacion.tipo === "contacto" ? "el contacto" : "el canal"} <strong>{confirmacion.nombre}</strong>?</p>
          {confirmacion.tipo === "proveedor" && <p>También se eliminarán sus contactos, horarios y canales asociados. Si tiene compras registradas, el sistema impedirá eliminarlo; podrás desactivarlo en su lugar.</p>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => p.setConfirmacion(null)}>Cancelar</button><button type="button" className="danger-button" onClick={confirmarEliminacion}>Sí, eliminar</button></div>
        </Dialogo>
      )}
    </>
  );
}
