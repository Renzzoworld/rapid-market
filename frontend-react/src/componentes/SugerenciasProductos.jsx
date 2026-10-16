export default function SugerenciasProductos({ productos, cargando, pagina, cantidad, alCambiarPagina, alSeleccionar }) {
  const totalPaginas = Math.ceil(cantidad / 10);
  return (
    <div className="product-suggestions">
      <div className="product-suggestions-list" aria-live="polite">
        {cargando ? (
          <p className="product-suggestions-empty">Buscando productos...</p>
        ) : productos.length > 0 ? (
          productos.map((producto) => (
            <button type="button" className="product-suggestion" key={producto.id} onClick={() => alSeleccionar(producto)}>
              <span>{producto.nombre}</span>
            </button>
          ))
        ) : (
          <p className="product-suggestions-empty">No se encontraron productos.</p>
        )}
      </div>
      {totalPaginas > 1 && (
        <div className="product-suggestions-pagination">
          <button type="button" disabled={pagina <= 1 || cargando} onClick={() => alCambiarPagina(pagina - 1)}>Anterior</button>
          <span>Página {pagina} de {totalPaginas}</span>
          <button type="button" disabled={pagina >= totalPaginas || cargando} onClick={() => alCambiarPagina(pagina + 1)}>Siguiente</button>
        </div>
      )}
    </div>
  );
}
