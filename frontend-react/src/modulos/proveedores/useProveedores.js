import { useCallback, useState } from "react";
import { API_URL } from "../../compartido/servicios/configuracionApi.js";
import { useConsultaPaginada } from "../../compartido/hooks/useConsultaPaginada.js";

export function useProveedores({ apiRequest, logueado, seccion, esAdministrador }) {
  const [busqueda, setBusqueda] = useState("");
  const [revision, setRevision] = useState(0);
  const [seleccionado, setSeleccionado] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoProveedor, setNuevoProveedor] = useState({ nombre: "", ruc: "", contacto: "", telefono: "", email: "", direccion: "", logo: null });

  const mapearProveedor = useCallback((provider) => ({
    id: provider.id,
    nombre: provider.name,
    ruc: provider.ruc,
    contacto: provider.contact,
    telefono: provider.phone,
    email: provider.email,
    direccion: provider.address,
    logo: provider.logo ? `${API_URL.replace(/\/api\/?$/, "")}/media/${provider.logo}` : "",
    activo: provider.active,
  }), []);
  const consulta = useConsultaPaginada({
    apiRequest,
    ruta: "/providers/manage/",
    habilitada: logueado && seccion === "proveedores" && esAdministrador,
    busqueda,
    revision,
    mapear: mapearProveedor,
  });

  return {
    estado: {
      ...consulta,
      busqueda,
      esAdministrador,
      seleccionado,
      mostrarFormulario,
      nuevoProveedor,
      setBusqueda,
      setSeleccionado,
      setMostrarFormulario,
      setNuevoProveedor,
      guardarProveedor: async (event) => {
        event.preventDefault();
        const form = new FormData();
        form.append("name", nuevoProveedor.nombre.trim());
        form.append("ruc", nuevoProveedor.ruc.trim());
        form.append("contact", nuevoProveedor.contacto.trim());
        form.append("phone", nuevoProveedor.telefono.trim());
        form.append("email", nuevoProveedor.email.trim());
        form.append("address", nuevoProveedor.direccion.trim());
        if (nuevoProveedor.logo) form.append("logo_file", nuevoProveedor.logo);
        try {
          await apiRequest("/providers/manage/", { method: "POST", body: form });
          setNuevoProveedor({ nombre: "", ruc: "", contacto: "", telefono: "", email: "", direccion: "", logo: null });
          setMostrarFormulario(false);
          consulta.setPagina(1);
          setRevision((n) => n + 1);
        } catch (error) {
          alert(error.message);
        }
      },
      refrescar: () => setRevision((n) => n + 1),
    },
  };
}
