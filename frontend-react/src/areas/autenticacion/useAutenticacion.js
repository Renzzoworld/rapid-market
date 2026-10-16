import { useState } from "react";
import { API_URL } from "../../servicios/configuracionApi.js";

export function useAutenticacion() {
  const [logueado, setLogueado] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [errorLogin, setErrorLogin] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [rol, setRol] = useState("");

  const iniciarSesion = async (event, cargarDatos) => {
    event.preventDefault();
    setErrorLogin("");
    try {
      const response = await fetch(`${API_URL}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usuario, password }),
      });
      if (!response.ok) {
        setErrorLogin("Usuario o contraseña incorrectos");
        return;
      }
      const data = await response.json();
      setAccessToken(data.access);
      setRefreshToken(data.refresh);
      setRol(data.user.role);
      await cargarDatos(data.access);
      setLogueado(true);
    } catch (error) {
      setErrorLogin(error.message || "No se pudo conectar con el servidor. Inténtalo de nuevo.");
    }
  };

  const cerrarSesion = async (apiRequest, alCerrarSesion) => {
    try {
      if (refreshToken) {
        await apiRequest("/logout/", { method: "POST", body: JSON.stringify({ refresh: refreshToken }) });
      }
    } catch { /* Se limpia la sesión local incluso si el servidor no responde. */ }
    setLogueado(false);
    setAccessToken("");
    setRefreshToken("");
    setRol("");
    setUsuario("");
    setPassword("");
    alCerrarSesion();
  };

  return {
    logueado, usuario, setUsuario, password, setPassword, errorLogin,
    accessToken, setAccessToken, refreshToken, setRefreshToken, rol,
    iniciarSesion, cerrarSesion,
  };
}
