import { useCallback, useState } from "react";
import { API_URL } from "../../compartido/servicios/configuracionApi.js";
import { useConsultaPaginada } from "../../compartido/hooks/useConsultaPaginada.js";

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const nuevoProveedorVacio = () => ({ nombre: "", ruc: "", direccion: "", logo: null });
const nuevoContactoVacio = () => ({ nombre: "", cargo: "", email: "", telefono: "", activo: true, horarios: [] });
const nuevoCanalVacio = () => ({ nombre: "", medio: "telefono", valor: "", funcion: "", contacto: "", activo: true });

export function useProveedores({ apiRequest, logueado, seccion, esAdministrador }) {
  const [busqueda, setBusqueda] = useState("");
  const [revision, setRevision] = useState(0);
  const [seleccionado, setSeleccionado] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [proveedorEditando, setProveedorEditando] = useState(null);
  const [nuevoProveedor, setNuevoProveedor] = useState(nuevoProveedorVacio);
  const [contactoDetalle, setContactoDetalle] = useState(null);
  const [canalDetalle, setCanalDetalle] = useState(null);
  const [formRelacion, setFormRelacion] = useState(null);
  const [contactoEditando, setContactoEditando] = useState(null);
  const [canalEditando, setCanalEditando] = useState(null);
  const [formContacto, setFormContacto] = useState(nuevoContactoVacio);
  const [formCanal, setFormCanal] = useState(nuevoCanalVacio);
  const [confirmacion, setConfirmacion] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const mapearProveedor = useCallback((provider) => ({
    id: provider.id,
    nombre: provider.name,
    ruc: provider.ruc || "",
    direccion: provider.address || "",
    logo: provider.logo ? `${API_URL.replace(/\/api\/?$/, "")}/media/${provider.logo}` : "",
    activo: provider.active,
    contactos: provider.contacts || [],
    canales: provider.channels || [],
  }), []);

  const consulta = useConsultaPaginada({
    apiRequest,
    ruta: "/providers/manage/",
    habilitada: logueado && seccion === "proveedores" && esAdministrador,
    busqueda,
    revision,
    mapear: mapearProveedor,
  });

  const cargarDetalle = async (providerId) => {
    setCargandoDetalle(true);
    try {
      const data = await apiRequest(`/providers/manage/${providerId}/`);
      const proveedor = mapearProveedor(data);
      setSeleccionado(proveedor);
      return proveedor;
    } finally {
      setCargandoDetalle(false);
    }
  };

  const abrirProveedor = async (proveedor) => {
    setSeleccionado(proveedor);
    setContactoDetalle(null);
    setCanalDetalle(null);
    try { await cargarDetalle(proveedor.id); }
    catch (error) { alert(error.message); }
  };

  const abrirNuevoProveedor = () => {
    setProveedorEditando(null);
    setNuevoProveedor(nuevoProveedorVacio());
    setMostrarFormulario(true);
  };

  const editarProveedor = () => {
    setProveedorEditando(seleccionado.id);
    setNuevoProveedor({
      nombre: seleccionado.nombre,
      ruc: seleccionado.ruc,
      direccion: seleccionado.direccion,
      logo: null,
    });
    setMostrarFormulario(true);
  };

  const guardarProveedor = async (event) => {
    event.preventDefault();
    const form = new FormData();
    form.append("name", nuevoProveedor.nombre.trim());
    form.append("ruc", nuevoProveedor.ruc.trim());
    form.append("address", nuevoProveedor.direccion.trim());
    if (nuevoProveedor.logo) form.append("logo_file", nuevoProveedor.logo);
    const editando = Boolean(proveedorEditando);
    const ruta = editando ? `/providers/manage/${proveedorEditando}/` : "/providers/manage/";
    try {
      await apiRequest(ruta, { method: editando ? "PATCH" : "POST", body: form });
      setMostrarFormulario(false);
      setNuevoProveedor(nuevoProveedorVacio());
      setProveedorEditando(null);
      setRevision((n) => n + 1);
      if (editando) await cargarDetalle(proveedorEditando);
    } catch (error) { alert(error.message); }
  };

  const cambiarEstadoProveedor = async () => {
    if (!seleccionado) return;
    try {
      await apiRequest(`/providers/manage/${seleccionado.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ active: !seleccionado.activo }),
      });
      await cargarDetalle(seleccionado.id);
      setRevision((n) => n + 1);
    } catch (error) { alert(error.message); }
  };

  const abrirFormularioContacto = (contacto = null) => {
    setContactoEditando(contacto?.id || null);
    setFormContacto(contacto ? {
      nombre: contacto.nombre,
      cargo: contacto.cargo || "",
      email: contacto.email || "",
      telefono: contacto.telefono || "",
      activo: contacto.activo,
      horarios: contacto.horarios || [],
    } : nuevoContactoVacio());
    setFormRelacion("contacto");
  };

  const guardarContacto = async (event) => {
    event.preventDefault();
    const editando = Boolean(contactoEditando);
    const base = `/providers/manage/${seleccionado.id}/contacts/`;
    const ruta = editando ? `${base}${contactoEditando}/` : base;
    try {
      const response = await apiRequest(ruta, {
        method: editando ? "PATCH" : "POST",
        body: JSON.stringify(formContacto),
      });
      setFormRelacion(null);
      setContactoEditando(null);
      await cargarDetalle(seleccionado.id);
      setContactoDetalle(response);
    } catch (error) { alert(error.message); }
  };

  const abrirFormularioCanal = (canal = null) => {
    setCanalEditando(canal?.id || null);
    setFormCanal(canal ? {
      nombre: canal.nombre,
      medio: canal.medio,
      valor: canal.valor,
      funcion: canal.funcion || "",
      contacto: canal.contacto || "",
      activo: canal.activo,
    } : nuevoCanalVacio());
    setFormRelacion("canal");
  };

  const guardarCanal = async (event) => {
    event.preventDefault();
    const editando = Boolean(canalEditando);
    const base = `/providers/manage/${seleccionado.id}/channels/`;
    const ruta = editando ? `${base}${canalEditando}/` : base;
    const payload = { ...formCanal, contacto: formCanal.contacto || null };
    try {
      const response = await apiRequest(ruta, {
        method: editando ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setFormRelacion(null);
      setCanalEditando(null);
      await cargarDetalle(seleccionado.id);
      setCanalDetalle(response);
    } catch (error) { alert(error.message); }
  };

  const solicitarEliminacion = (tipo, registro) => {
    setConfirmacion({ tipo, id: registro.id, nombre: registro.nombre || registro.name });
  };

  const confirmarEliminacion = async () => {
    if (!confirmacion) return;
    const { tipo, id } = confirmacion;
    const rutas = {
      proveedor: `/providers/manage/${id}/`,
      contacto: `/providers/manage/${seleccionado.id}/contacts/${id}/`,
      canal: `/providers/manage/${seleccionado.id}/channels/${id}/`,
    };
    try {
      await apiRequest(rutas[tipo], { method: "DELETE" });
      setConfirmacion(null);
      if (tipo === "proveedor") {
        setSeleccionado(null);
      } else {
        if (tipo === "contacto") setContactoDetalle(null);
        if (tipo === "canal") setCanalDetalle(null);
        await cargarDetalle(seleccionado.id);
      }
      setRevision((n) => n + 1);
    } catch (error) {
      setConfirmacion(null);
      alert(error.message);
    }
  };

  return {
    estado: {
      ...consulta,
      busqueda,
      esAdministrador,
      seleccionado,
      mostrarFormulario,
      proveedorEditando,
      nuevoProveedor,
      contactoDetalle,
      canalDetalle,
      formRelacion,
      contactoEditando,
      canalEditando,
      formContacto,
      formCanal,
      confirmacion,
      cargandoDetalle,
      diasSemana,
      setBusqueda,
      setSeleccionado,
      setMostrarFormulario,
      setNuevoProveedor,
      setContactoDetalle,
      setCanalDetalle,
      setFormRelacion,
      setFormContacto,
      setFormCanal,
      setConfirmacion,
      abrirProveedor,
      abrirNuevoProveedor,
      editarProveedor,
      guardarProveedor,
      cambiarEstadoProveedor,
      abrirFormularioContacto,
      guardarContacto,
      abrirFormularioCanal,
      guardarCanal,
      solicitarEliminacion,
      confirmarEliminacion,
      refrescar: () => setRevision((n) => n + 1),
    },
  };
}
