import { useEffect, useState } from "react";

export function useBusquedaProductos({ apiRequest, habilitada, busqueda, mapear, revision = 0, categoryIds = [] }) {
  const [registros, setRegistros] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!habilitada || !busqueda.trim()) return undefined;
    let vigente = true;
    const query = new URLSearchParams({ page: String(pagina), search: busqueda.trim() });
    if (categoryIds.length) query.set("category_ids", categoryIds.join(","));
    const timer = setTimeout(() => {
      setCargando(true);
      apiRequest(`/products/?${query.toString()}`)
        .then((data) => {
          if (!vigente) return;
          setRegistros(data.results.map(mapear));
          setTotal(data.count);
          if (data.page !== pagina) setPagina(data.page);
        })
        .catch((error) => { if (vigente) alert(error.message); })
        .finally(() => { if (vigente) setCargando(false); });
    }, 150);
    return () => { vigente = false; clearTimeout(timer); };
  }, [apiRequest, busqueda, habilitada, mapear, pagina, revision, categoryIds.join(",")]);

  const limpiar = () => {
    setRegistros([]);
    setTotal(0);
    setPagina(1);
    setCargando(false);
  };
  return { registros, setRegistros, total, setTotal, pagina, setPagina, cargando, limpiar };
}
