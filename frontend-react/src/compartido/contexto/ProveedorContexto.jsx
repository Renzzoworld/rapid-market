import ContextoAplicacion from "./ContextoAplicacion.js";

export function ProveedorContexto({ value, children }) {
  return (
    <ContextoAplicacion.Provider value={value}>
      {children}
    </ContextoAplicacion.Provider>
  );
}
