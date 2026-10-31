import { useState } from "react";
import Paginacion from "../../compartido/componentes/Paginacion.jsx";
import { useContextoAplicacion } from "../../compartido/contexto/useContextoAplicacion.js";

const logoDefault = "/proveedor-sin-logo.svg";

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card proveedor-dialogo" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        {children}
      </section>
    </div>
  );
}

const horaCorta = (hora) => String(hora || "").slice(0, 5);
function diasComoRangos(indices, dias) {
  const groups = [];
  let current = [];
  for (const day of indices) {
    if (!current.length || day === current[current.length - 1] + 1) current.push(day);
    else { groups.push(current); current = [day]; }
  }
  if (current.length) groups.push(current);
  return groups.map((group) => group.length > 1 ? `${dias[group[0]]} a ${dias[group[group.length - 1]]}` : dias[group[0]]).join(", ");
}

function gruposHorario(horarios) {
  const groups = new Map();
  horarios.forEach((horario) => {
    const key = `${horaCorta(horario.hora_inicio)}-${horaCorta(horario.hora_fin)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(Number(horario.dia_semana));
  });
  return [...groups.entries()].map(([key, days]) => ({ key, days: [...new Set(days)].sort((a, b) => a - b) })).sort((a, b) => a.days[0] - b.days[0]);
}

function DetalleHorario({ horarios, diasSemana }) {
  if (!horarios?.length) return <p>Sin horario registrado.</p>;
  return <div className="schedule-display">{gruposHorario(horarios).map(({ key, days }) => {
    const [start, end] = key.split("-");
    return <p key={key}><strong>{diasComoRangos(days, diasSemana)}:</strong> {start}–{end}</p>;
  })}</div>;
}

function EditorHorario({ horarios, onChange, diasSemana }) {
  const [diasSeleccionados, setDiasSeleccionados] = useState([]);
  const [inicio, setInicio] = useState("09:00");
  const [fin, setFin] = useState("17:00");
  const [error, setError] = useState("");
  const agregar = () => {
    if (!diasSeleccionados.length) { setError("Selecciona uno o más días."); return; }
    if (fin <= inicio) { setError("La hora final debe ser posterior a la inicial."); return; }
    if (diasSeleccionados.some((day) => horarios.some((item) => Number(item.dia_semana) === day && inicio < horaCorta(item.hora_fin) && horaCorta(item.hora_inicio) < fin))) {
      setError("Uno o más días ya tienen un horario que se cruza con este intervalo.");
      return;
    }
    setError("");
    onChange([...horarios, ...diasSeleccionados.map((dia_semana) => ({ dia_semana, hora_inicio: inicio, hora_fin: fin }))]);
    setDiasSeleccionados([]);
  };
  const eliminarHorario = (days, start, end) => onChange(horarios.filter((item) => !(
    days.includes(Number(item.dia_semana)) && horaCorta(item.hora_inicio) === start && horaCorta(item.hora_fin) === end
  )));

  return (
    <fieldset className="schedule-fieldset schedule-editor">
      <legend>Horario de atención</legend>
      <p className="schedule-step-title">Selecciona los días</p>
      <div className="schedule-days">{diasSemana.map((dia, index) => (
        <label className={diasSeleccionados.includes(index) ? "selected" : ""} key={dia}>
          <input type="checkbox" checked={diasSeleccionados.includes(index)} onChange={(event) => setDiasSeleccionados(event.target.checked ? [...diasSeleccionados, index] : diasSeleccionados.filter((day) => day !== index))} />
          {dia}
        </label>
      ))}</div>
      <p className="schedule-step-title">Establece el horario</p>
      <div className="schedule-add-row">
        <label>Desde<input type="time" value={inicio} onChange={(event) => setInicio(event.target.value)} /></label>
        <label>Hasta<input type="time" value={fin} onChange={(event) => setFin(event.target.value)} /></label>
        <button type="button" className="details-button" onClick={agregar}>+ Agregar horario</button>
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="schedule-assigned">
        <strong>Horarios agregados</strong>
        {horarios.length ? gruposHorario(horarios).map(({ key, days }) => {
          const [start, end] = key.split("-");
          return <div className="schedule-assigned-group" key={key}>
            <span>{diasComoRangos(days, diasSemana)} · {start}–{end}</span>
            <button type="button" onClick={() => eliminarHorario(days, start, end)}>Eliminar horario</button>
          </div>;
        }) : <span className="field-hint">Aún no se han agregado horarios.</span>}
      </div>
    </fieldset>
  );
}

export function Proveedores() {
  const { estadoProveedores: p } = useContextoAplicacion();
  const {
    busqueda, cargando, error, esAdministrador, pagina, registros, seleccionado, total,
    setBusqueda, setPagina, mostrarFormulario, pasoFormulario, confirmarCancelar,
    proveedorEditando, nuevoProveedor, setNuevoProveedor, catalogos, diasSemana,
    contactoDetalle, formRelacion, contactoEditando, formContacto, confirmacion,
    cargandoDetalle, setContactoDetalle, setFormRelacion, setFormContacto,
    setConfirmacion, setConfirmarCancelar, setPasoFormulario, solicitarCancelarProveedor,
    cancelarProveedor, abrirProveedor, abrirNuevoProveedor, editarProveedor,
    guardarProveedor, cambiarEstadoProveedor, abrirFormularioContacto, guardarContacto,
    solicitarEliminacion, confirmarEliminacion,
  } = p;
  if (!esAdministrador) return null;

  const addProviderContact = (tipo) => setNuevoProveedor({
    ...nuevoProveedor,
    datos_contacto: [...nuevoProveedor.datos_contacto, { tipo, valor: "" }],
  });
  const removeProviderContact = (index) => setNuevoProveedor({
    ...nuevoProveedor,
    datos_contacto: nuevoProveedor.datos_contacto.filter((_, itemIndex) => itemIndex !== index),
  });
  const updateProviderContact = (index, valor) => setNuevoProveedor({
    ...nuevoProveedor,
    datos_contacto: nuevoProveedor.datos_contacto.map((item, itemIndex) => itemIndex === index ? { ...item, valor } : item),
  });
  const avanzar = (event) => {
    if (event.currentTarget.form.reportValidity()) setPasoFormulario(2);
  };
  const actualizarDatoContacto = (index, patch) => setFormContacto({
    ...formContacto,
    datos_contacto: formContacto.datos_contacto.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
  });
  const agregarDatoContacto = (tipo) => setFormContacto({
    ...formContacto,
    datos_contacto: [...formContacto.datos_contacto, { tipo, valor: "" }],
  });

  return <>
    {p.seccion === "proveedores" && <section className="proveedores-page">
      <header className="page-header"><div><h1>Proveedores</h1><p>Administra proveedores y sus contactos</p></div><button className="primary-button" onClick={abrirNuevoProveedor}>+ Nuevo proveedor</button></header>
      <div className="history-toolbar"><input type="search" value={busqueda} placeholder="Buscar proveedor..." onChange={(event) => { setBusqueda(event.target.value); setPagina(1); }} /></div>
      {cargando && <p role="status">Cargando proveedores...</p>}{error && <p role="alert">{error}</p>}{!cargando && !error && !registros.length && <p className="empty-state">No hay proveedores registrados.</p>}
      <div className="proveedores-grid">{registros.map((proveedor) => <button className="proveedor-card content-card" key={proveedor.id} onClick={() => abrirProveedor(proveedor)}><img src={proveedor.logo || logoDefault} alt="" /><strong>{proveedor.nombre}</strong><span>{proveedor.razon_social}</span><span className={`provider-badge ${proveedor.activo ? "active" : "inactive"}`}>{proveedor.activo ? "Activo" : "Inactivo"}</span></button>)}</div>
      <Paginacion pagina={pagina} cantidad={total} cargando={cargando} alCambiar={setPagina} tamanoPagina={9} />
    </section>}

    {p.seccion === "proveedores" && seleccionado && <Modal title={seleccionado.nombre} onClose={() => p.setSeleccionado(null)}>{cargandoDetalle ? <p>Cargando...</p> : <>
      <section className="provider-detail-block"><h3>Datos generales</h3><div className="proveedor-resumen"><img src={seleccionado.logo || logoDefault} alt="" /><div>
        <p><b>Razón social:</b> {seleccionado.razon_social}</p><p><b>RUC:</b> {seleccionado.ruc}</p><p><b>Dirección fiscal:</b> {seleccionado.direccion}</p>
        <p><b>Categorías:</b> {seleccionado.categorias.map((item) => item.nombre).join(", ")}</p>
        <p><b>Correos:</b> {seleccionado.datos_contacto.filter((item) => item.tipo === "correo").map((item) => item.valor).join(", ") || "—"}</p>
        <p><b>Teléfonos:</b> {seleccionado.datos_contacto.filter((item) => item.tipo === "telefono").map((item) => item.valor).join(", ") || "—"}</p>
        <b>Horario de atención</b><DetalleHorario horarios={seleccionado.horarios} diasSemana={diasSemana} />
      </div></div></section>
      <div className="provider-actions provider-actions-centered"><button className="provider-edit-action" onClick={editarProveedor}>Editar datos generales</button><button className="provider-state-action" onClick={cambiarEstadoProveedor}>{seleccionado.activo ? "Desactivar" : "Activar"}</button><button className="danger-button" onClick={() => solicitarEliminacion("proveedor", seleccionado)}>Eliminar</button></div>
      <section className="provider-related-section provider-detail-block"><header><h3>Contactos ({seleccionado.contactos.length})</h3><button className="details-button" onClick={() => abrirFormularioContacto()}>+ Agregar contacto</button></header>
        {seleccionado.contactos.map((contacto) => <article className="provider-related-card" key={contacto.id}><div><b>{contacto.nombre}</b><span>{contacto.cargo_nombre === "Otros" ? contacto.cargo_otro : contacto.cargo_nombre}</span></div><div className="provider-inline-actions"><button className="details-button" onClick={() => setContactoDetalle(contactoDetalle?.id === contacto.id ? null : contacto)}>{contactoDetalle?.id === contacto.id ? "Ocultar" : "Detalles"}</button><button className="secondary-button" onClick={() => abrirFormularioContacto(contacto)}>Editar</button><button className="action-button delete" onClick={() => solicitarEliminacion("contacto", contacto)}>Eliminar</button></div>
          {contactoDetalle?.id === contacto.id && <div className="related-detail"><p><b>Dirección:</b> {contacto.direccion}</p><p><b>Medios de contacto:</b></p>{contacto.datos_contacto.map((item) => <p key={item.id}>{item.tipo}: {item.valor}</p>)}<b>Horario</b><DetalleHorario horarios={contacto.horarios} diasSemana={diasSemana} /></div>}
        </article>)}
      </section>
    </>}</Modal>}

    {p.seccion === "proveedores" && mostrarFormulario && <Modal title={`${proveedorEditando ? "Editar" : "Nuevo"} proveedor · Paso ${pasoFormulario} de 2`} onClose={solicitarCancelarProveedor}>
      <form onSubmit={guardarProveedor}>
        {pasoFormulario === 1 ? <>
          <fieldset className="provider-form-section"><legend>Datos generales</legend>
            {[ ["razon_social", "Razón social"], ["nombre", "Nombre comercial"], ["ruc", "RUC"], ["direccion", "Dirección fiscal"] ].map(([key, label]) => <label className="form-group" key={key}>{label} *<input required maxLength={key === "direccion" ? 250 : key === "ruc" ? 11 : key === "nombre" ? 150 : 180} inputMode={key === "ruc" ? "numeric" : undefined} pattern={key === "ruc" ? "[0-9]{11}" : undefined} value={nuevoProveedor[key]} onChange={(event) => setNuevoProveedor({ ...nuevoProveedor, [key]: event.target.value })} /></label>)}
          </fieldset>
          <fieldset className="provider-form-section"><legend>Correos electrónicos *</legend>{nuevoProveedor.datos_contacto.map((item, index) => item.tipo === "correo" && <div className="provider-contact-entry" key={`correo-${index}`}><input aria-label={`Correo ${index + 1}`} type="email" required value={item.valor} onChange={(event) => updateProviderContact(index, event.target.value)} placeholder="contacto@empresa.com" /><button type="button" className="action-button delete" onClick={() => removeProviderContact(index)} disabled={nuevoProveedor.datos_contacto.filter((dato) => dato.tipo === "correo").length <= 1}>Eliminar</button></div>)}<button type="button" className="details-button" onClick={() => addProviderContact("correo")}>+ Agregar correo</button></fieldset>
          <fieldset className="provider-form-section"><legend>Números telefónicos *</legend>{nuevoProveedor.datos_contacto.map((item, index) => item.tipo === "telefono" && <div className="provider-contact-entry" key={`telefono-${index}`}><input aria-label={`Teléfono ${index + 1}`} type="tel" required minLength={7} maxLength={30} value={item.valor} onChange={(event) => updateProviderContact(index, event.target.value)} placeholder="Teléfono de contacto" /><button type="button" className="action-button delete" onClick={() => removeProviderContact(index)} disabled={nuevoProveedor.datos_contacto.filter((dato) => dato.tipo === "telefono").length <= 1}>Eliminar</button></div>)}<button type="button" className="details-button" onClick={() => addProviderContact("telefono")}>+ Agregar teléfono</button></fieldset>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={solicitarCancelarProveedor}>Cancelar</button><button type="button" className="primary-button" onClick={avanzar}>Siguiente</button></div>
        </> : <>
          <fieldset className="provider-form-section"><legend>Categorías de productos *</legend>{catalogos.categorias.map((categoria) => <label className="category-choice" key={categoria.id}><input type="checkbox" checked={nuevoProveedor.categorias.includes(categoria.id)} onChange={(event) => setNuevoProveedor({ ...nuevoProveedor, categorias: event.target.checked ? [...nuevoProveedor.categorias, categoria.id] : nuevoProveedor.categorias.filter((id) => id !== categoria.id) })} />{categoria.nombre}</label>)}</fieldset>
          <EditorHorario horarios={nuevoProveedor.horarios} diasSemana={diasSemana} onChange={(horarios) => setNuevoProveedor({ ...nuevoProveedor, horarios })} />
          <fieldset className="provider-form-section"><legend>Imagen</legend><label className="form-group">Logo (opcional)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setNuevoProveedor({ ...nuevoProveedor, logo: event.target.files?.[0] || null })} /></label></fieldset>
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setPasoFormulario(1)}>Volver</button><button type="button" className="secondary-button" onClick={solicitarCancelarProveedor}>Cancelar</button><button className="primary-button">Guardar</button></div>
        </>}
      </form>
    </Modal>}

    {confirmarCancelar && <Modal title="Cancelar operación" onClose={() => setConfirmarCancelar(false)}><p>¿Desea cancelar la operación? Se perderán los cambios.</p><div className="modal-actions"><button className="secondary-button" onClick={() => setConfirmarCancelar(false)}>No, continuar</button><button className="danger-button" onClick={cancelarProveedor}>Sí, cancelar</button></div></Modal>}

    {p.seccion === "proveedores" && formRelacion === "contacto" && <Modal title={contactoEditando ? "Editar contacto" : "Nuevo contacto"} onClose={() => setFormRelacion(null)}><form onSubmit={guardarContacto}>
      <fieldset className="provider-form-section"><legend>Información del contacto</legend><label className="form-group">Nombre de contacto *<input required maxLength="150" value={formContacto.nombre} onChange={(event) => setFormContacto({ ...formContacto, nombre: event.target.value })} /></label>
        <label className="form-group">Cargo *<select required value={formContacto.cargo} onChange={(event) => setFormContacto({ ...formContacto, cargo: Number(event.target.value), cargo_otro: "" })}><option value="">Seleccionar</option>{catalogos.cargos.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
        {catalogos.cargos.find((item) => item.id === Number(formContacto.cargo))?.nombre === "Otros" && <label className="form-group">Especificar cargo *<input required value={formContacto.cargo_otro} onChange={(event) => setFormContacto({ ...formContacto, cargo_otro: event.target.value })} /></label>}
        <label className="form-group">Dirección *<input required maxLength="250" value={formContacto.direccion} onChange={(event) => setFormContacto({ ...formContacto, direccion: event.target.value })} /></label>
      </fieldset>
      <fieldset className="schedule-fieldset"><legend>Teléfonos y correos (al menos uno)</legend>{formContacto.datos_contacto.map((item, index) => <div className="schedule-row" key={index}><select value={item.tipo} onChange={(event) => actualizarDatoContacto(index, { tipo: event.target.value, valor: "" })}><option value="telefono">Teléfono</option><option value="correo">Correo</option></select><input type={item.tipo === "correo" ? "email" : "tel"} value={item.valor} onChange={(event) => actualizarDatoContacto(index, { valor: event.target.value })} /><button type="button" onClick={() => setFormContacto({ ...formContacto, datos_contacto: formContacto.datos_contacto.filter((_, itemIndex) => itemIndex !== index) })}>Quitar</button></div>)}<button type="button" onClick={() => agregarDatoContacto("telefono")}>+ Teléfono</button><button type="button" onClick={() => agregarDatoContacto("correo")}>+ Correo</button></fieldset>
      <EditorHorario horarios={formContacto.horarios} diasSemana={diasSemana} onChange={(horarios) => setFormContacto({ ...formContacto, horarios })} />
      <label className="form-group provider-active-field"><input type="checkbox" checked={formContacto.activo !== false} onChange={(event) => setFormContacto({ ...formContacto, activo: event.target.checked })} /> Activo</label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setFormRelacion(null)}>Cancelar</button><button className="primary-button">Guardar contacto</button></div>
    </form></Modal>}

    {p.seccion === "proveedores" && confirmacion && <Modal title="Confirmar eliminación" onClose={() => setConfirmacion(null)}><p>¿Eliminar {confirmacion.tipo} <b>{confirmacion.nombre}</b>?</p>{confirmacion.tipo === "proveedor" && <p>También se eliminarán sus contactos y horarios asociados. Si tiene compras, la operación se rechazará para conservar el historial.</p>}<div className="modal-actions"><button className="secondary-button" onClick={() => setConfirmacion(null)}>Cancelar</button><button className="danger-button" onClick={confirmarEliminacion}>Sí, eliminar</button></div></Modal>}
  </>;
}
