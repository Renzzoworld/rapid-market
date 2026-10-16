import { useState } from "react";

export function useAutenticacion() {
  const [logueado, setLogueado] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [errorLogin, setErrorLogin] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [rol, setRol] = useState("");

  const iniciarSesion = async (event, cargarDatos, requestPublic) => {
    event.preventDefault();
    setErrorLogin("");
    try {
      const data = await requestPublic("/login/", {
        method: "POST",
        body: JSON.stringify({ username: usuario, password }),
      });
      setAccessToken(data.access);
      setRefreshToken(data.refresh);
      setRol(data.user.role);
      await cargarDatos(data.access);
      setLogueado(true);
    } catch (error) {
      setErrorLogin(error.message?.includes("Usuario o contraseña incorrectos")
        ? "Usuario o contraseña incorrectos"
        : error.message || "No se pudo conectar con el servidor. Inténtalo de nuevo.");
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
