import { useContext } from "react";
import ContextoAplicacion from "./ContextoAplicacion.js";

export function useContextoAplicacion() {
  const contexto = useContext(ContextoAplicacion);
  if (!contexto) {
    throw new Error("Las áreas de Rapid Market requieren el contexto de aplicación.");
  }
  return contexto;
}
