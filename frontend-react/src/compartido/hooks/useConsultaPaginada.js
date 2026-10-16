import { useEffect, useState } from "react";

export function useConsultaPaginada({ apiRequest, ruta, habilitada, busqueda, revision = 0, mapear }) {
  const [registros, setRegistros] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!habilitada) return undefined;
    let vigente = true;
    const query = new URLSearchParams({ page: String(pagina), search: busqueda.trim() });
    const timer = setTimeout(() => {
      setCargando(true);
      setError("");
      apiRequest(`${ruta}?${query.toString()}`)
        .then((data) => {
          if (!vigente) return;
          setRegistros(data.results.map(mapear));
          setTotal(data.count);
          if (data.page !== pagina) setPagina(data.page);
        })
        .catch((cause) => { if (vigente) setError(cause.message); })
        .finally(() => { if (vigente) setCargando(false); });
    }, 0);
    return () => { vigente = false; clearTimeout(timer); };
  }, [apiRequest, busqueda, habilitada, mapear, pagina, revision, ruta]);

  return { registros, total, pagina, setPagina, cargando, error };
}
