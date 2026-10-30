import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../../compartido/servicios/configuracionApi.js";
import { useConsultaPaginada } from "../../compartido/hooks/useConsultaPaginada.js";

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const vacioProveedor = () => ({ razon_social: "", nombre: "", ruc: "", direccion: "", categorias: [], horarios: [], logo: null, activo: true });
const vacioContacto = (direccion = "") => ({ nombre: "", cargo: "", cargo_otro: "", direccion, activo: true, datos_contacto: [{ tipo: "telefono", valor: "" }], horarios: [] });
const mediosSeccion = ["telefono", "whatsapp", "correo", "web", "red_social"];

export function useProveedores({ apiRequest, logueado, seccion, esAdministrador }) {
  const [busqueda, setBusqueda] = useState(""); const [revision, setRevision] = useState(0);
  const [seleccionado, setSeleccionado] = useState(null); const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [proveedorEditando, setProveedorEditando] = useState(null); const [nuevoProveedor, setNuevoProveedor] = useState(vacioProveedor);
  const [catalogos, setCatalogos] = useState({ categorias: [], cargos: [], departamentos: [], redes_sociales: [] });
  const [contactoDetalle, setContactoDetalle] = useState(null); const [canalDetalle, setCanalDetalle] = useState(null);
  const [formRelacion, setFormRelacion] = useState(null); const [contactoEditando, setContactoEditando] = useState(null); const [canalEditando, setCanalEditando] = useState(null);
  const [formContacto, setFormContacto] = useState(vacioContacto()); const [formCanal, setFormCanal] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null); const [cargandoDetalle, setCargandoDetalle] = useState(false);
  useEffect(() => { if (logueado && esAdministrador && seccion === "proveedores") apiRequest("/providers/catalogs/").then(setCatalogos).catch((e) => alert(e.message)); }, [apiRequest, logueado, esAdministrador, seccion]);
  const mapearProveedor = useCallback((x) => ({ id:x.id, nombre:x.name, razon_social:x.razon_social, ruc:x.ruc, direccion:x.address, activo:x.active, categorias:x.categorias||[], horarios:x.horarios||[], contactos:x.contacts||[], canales:x.channels||[], logo:x.logo?`${API_URL.replace(/\/api\/?$/,"")}/media/${x.logo}`:"" }), []);
  const consulta = useConsultaPaginada({ apiRequest, ruta:"/providers/manage/", habilitada:logueado&&seccion==="proveedores"&&esAdministrador, busqueda, revision, mapear:mapearProveedor });
  const cargarDetalle = async (id) => { setCargandoDetalle(true); try { const data=mapearProveedor(await apiRequest(`/providers/manage/${id}/`)); setSeleccionado(data); return data; } finally { setCargandoDetalle(false); } };
  const abrirProveedor = async (p) => { setSeleccionado(p); setContactoDetalle(null); setCanalDetalle(null); try { await cargarDetalle(p.id); } catch(e) { alert(e.message); } };
  const abrirNuevoProveedor = () => { setProveedorEditando(null); setNuevoProveedor(vacioProveedor()); setMostrarFormulario(true); };
  const editarProveedor = () => { setProveedorEditando(seleccionado.id); setNuevoProveedor({ razon_social:seleccionado.razon_social, nombre:seleccionado.nombre, ruc:seleccionado.ruc, direccion:seleccionado.direccion, categorias:seleccionado.categorias.map(c=>c.id), horarios:seleccionado.horarios, logo:null, activo:seleccionado.activo }); setMostrarFormulario(true); };
  const guardarProveedor = async (e) => { e.preventDefault(); const edit=Boolean(proveedorEditando); const form=new FormData();
    for (const key of ["razon_social","name","ruc","address"]) form.append(key, key==="name"?nuevoProveedor.nombre.trim():key==="address"?nuevoProveedor.direccion.trim():nuevoProveedor[key].trim());
    form.append("categorias",JSON.stringify(nuevoProveedor.categorias)); form.append("horarios",JSON.stringify(nuevoProveedor.horarios)); if(edit)form.append("active",String(nuevoProveedor.activo)); if(nuevoProveedor.logo)form.append("logo_file",nuevoProveedor.logo);
    try { await apiRequest(edit?`/providers/manage/${proveedorEditando}/`:"/providers/manage/",{method:edit?"PATCH":"POST",body:form}); setMostrarFormulario(false); setRevision(n=>n+1); if(edit)await cargarDetalle(proveedorEditando); } catch(err){alert(err.message);} };
  const cambiarEstadoProveedor = async () => { try { await apiRequest(`/providers/manage/${seleccionado.id}/`,{method:"PATCH",body:JSON.stringify({active:!seleccionado.activo})}); await cargarDetalle(seleccionado.id); setRevision(n=>n+1); } catch(e){alert(e.message);} };
  const abrirFormularioContacto = (c=null) => { setContactoEditando(c?.id||null); setFormContacto(c?{...c,datos_contacto:c.datos_contacto.map(d=>({...d}))}:vacioContacto(seleccionado.direccion)); setFormRelacion("contacto"); };
  const guardarContacto = async (e) => { e.preventDefault(); const base=`/providers/manage/${seleccionado.id}/contacts/`; const payload={...formContacto,datos_contacto:formContacto.datos_contacto.filter(d=>d.valor.trim())}; try {await apiRequest(contactoEditando?`${base}${contactoEditando}/`:base,{method:contactoEditando?"PATCH":"POST",body:JSON.stringify(payload)}); await cargarDetalle(seleccionado.id); setContactoDetalle(null); setFormRelacion(null);}catch(err){alert(err.message);} };
  const abrirFormularioCanal = (medio, canal=null) => { setCanalEditando(canal?.id||null); setFormCanal(canal?{...canal}:{medio,valor:"",departamento:"",departamento_otro:"",red_social:"",red_social_otro:"",activo:true}); setFormRelacion("canal"); };
  const guardarCanal = async (e) => { e.preventDefault(); const base=`/providers/manage/${seleccionado.id}/channels/`; const body={...formCanal,departamento:formCanal.departamento||null,red_social:formCanal.red_social||null}; try {const r=await apiRequest(canalEditando?`${base}${canalEditando}/`:base,{method:canalEditando?"PATCH":"POST",body:JSON.stringify(body)}); await cargarDetalle(seleccionado.id); setCanalDetalle(r); setFormRelacion(null);}catch(err){alert(err.message);} };
  const solicitarEliminacion=(tipo,r)=>setConfirmacion({tipo,id:r.id,nombre:r.nombre||r.valor});
  const confirmarEliminacion=async()=>{if(!confirmacion)return;const {tipo,id}=confirmacion;const paths={proveedor:`/providers/manage/${id}/`,contacto:`/providers/manage/${seleccionado.id}/contacts/${id}/`,canal:`/providers/manage/${seleccionado.id}/channels/${id}/`};try{await apiRequest(paths[tipo],{method:"DELETE"});setConfirmacion(null);if(tipo==="proveedor")setSeleccionado(null);else{if(tipo==="contacto")setContactoDetalle(null);if(tipo==="canal")setCanalDetalle(null);await cargarDetalle(seleccionado.id);}setRevision(n=>n+1);}catch(e){setConfirmacion(null);alert(e.message);}};
  return { estado:{...consulta,busqueda,esAdministrador,seleccionado,mostrarFormulario,proveedorEditando,nuevoProveedor,catalogos,mediosSeccion,diasSemana,contactoDetalle,canalDetalle,formRelacion,contactoEditando,canalEditando,formContacto,formCanal,confirmacion,cargandoDetalle,setBusqueda,setPagina:consulta.setPagina,setSeleccionado,setMostrarFormulario,setNuevoProveedor,setContactoDetalle,setCanalDetalle,setFormRelacion,setFormContacto,setFormCanal,setConfirmacion,abrirProveedor,abrirNuevoProveedor,editarProveedor,guardarProveedor,cambiarEstadoProveedor,abrirFormularioContacto,guardarContacto,abrirFormularioCanal,guardarCanal,solicitarEliminacion,confirmarEliminacion,refrescar:()=>setRevision(n=>n+1)}};
}
