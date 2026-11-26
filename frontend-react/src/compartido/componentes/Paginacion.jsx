export default function Paginacion({ pagina, cantidad, cargando, alCambiar, tamanoPagina = 10, mostrarRango = false, etiqueta = "registros" }) {
  const totalPaginas = Math.ceil(cantidad / tamanoPagina);
  if (totalPaginas <= 1 && !mostrarRango) return null;
  const inicio = Math.max(1, Math.min(pagina - 2, totalPaginas - 4));
  const paginas = Array.from({ length: Math.min(5, totalPaginas) }, (_, indice) => inicio + indice);
  return (
    <nav className="inventory-pagination" aria-label="Paginación" aria-live="polite">
      <span>{mostrarRango
        ? (cantidad === 0
          ? `0 ${etiqueta} · Página 1 de 1`
          : `Mostrando ${(pagina - 1) * tamanoPagina + 1}–${Math.min(pagina * tamanoPagina, cantidad)} de ${cantidad} ${etiqueta} · Página ${pagina} de ${Math.max(totalPaginas, 1)}`)
        : `Página ${pagina} de ${totalPaginas}`}</span>
      {totalPaginas > 1 && <div className="inventory-page-buttons">
        <button type="button" disabled={pagina === 1 || cargando} onClick={() => alCambiar(Math.max(1, pagina - 1))}>Anterior</button>
        {paginas.map((numero) => (
          <button type="button" key={numero} className={numero === pagina ? "active" : ""} aria-current={numero === pagina ? "page" : undefined} disabled={cargando} onClick={() => alCambiar(numero)}>
            {numero}
          </button>
        ))}
        <button type="button" disabled={pagina === totalPaginas || cargando} onClick={() => alCambiar(Math.min(totalPaginas, pagina + 1))}>Siguiente</button>
      </div>}
    </nav>
  );
}
