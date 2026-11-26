import { useState } from "react";
import rapidMarketLogo from "../../assets/rapid-market-logo.svg";

export function InicioSesion({ usuario, setUsuario, password, setPassword, error, onSubmit, requestPublic }) {
  const params = new URLSearchParams(window.location.search);
  const traeToken = window.location.pathname === "/restablecer-contrasena" && params.has("uid") && params.has("token");
  const [vista, setVista] = useState(traeToken ? "restablecer" : "login");
  const [correo, setCorreo] = useState("");
  const [usuarioRecuperacion, setUsuarioRecuperacion] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [errorLocal, setErrorLocal] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const volverLogin = () => {
    setVista("login"); setMensaje(""); setErrorLocal("");
    window.history.replaceState({}, "", "/");
  };

  const solicitar = async (event) => {
    event.preventDefault(); setCargando(true); setErrorLocal(""); setMensaje("");
    try {
      const resultado = await requestPublic("/password-reset/", { method: "POST", body: JSON.stringify({ username: usuarioRecuperacion, email: correo }) });
      setMensaje(resultado.detail); setVista("mensaje");
    } catch (err) { setErrorLocal(err.message); }
    finally { setCargando(false); }
  };

  const guardar = async (event) => {
    event.preventDefault(); setCargando(true); setErrorLocal(""); setMensaje("");
    if (nueva !== confirmacion) { setErrorLocal("Las contraseñas no coinciden."); setCargando(false); return; }
    try {
      const resultado = await requestPublic("/password-reset/confirm/", {
        method: "POST", body: JSON.stringify({ uid: params.get("uid"), token: params.get("token"), new_password: nueva }),
      });
      setMensaje(resultado.detail); setVista("mensaje");
    } catch (err) { setErrorLocal(err.message); }
    finally { setCargando(false); }
  };

  const titulo = vista === "solicitar" ? "Recuperar contraseña" : vista === "restablecer" ? "Crear contraseña nueva" : vista === "mensaje" ? "Revisa el resultado" : "Rapid Market";
  return (
    <div className="login-container">
      <div className="login-card">
        <img src={rapidMarketLogo} alt="Rapid Market" className="login-brand-logo" />
        <h1>{titulo}</h1>
        <p>{vista === "login" ? "Sistema de Gestión Comercial" : "Recuperación segura de tu cuenta"}</p>
        {vista === "login" && <form onSubmit={onSubmit}>
          <label htmlFor="usuario">Usuario</label>
          <input id="usuario" type="text" autoComplete="username" placeholder="Ingrese su usuario" value={usuario} onChange={(event) => setUsuario(event.target.value)} required />
          <label htmlFor="contrasena">Contraseña</label>
          <div className="login-password-wrap">
            <input id="contrasena" type={mostrarPassword ? "text" : "password"} autoComplete="current-password" placeholder="Ingrese su contraseña" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button
              type="button"
              className="password-visibility-button"
              aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={mostrarPassword}
              title={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              onClick={() => setMostrarPassword((visible) => !visible)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                {mostrarPassword ? (
                  <><path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9.5 6-.4.6-1.3 1.8-2.8 2.9" /><path d="M6.2 6.2C3.9 7.5 2.7 9.2 2.5 11c.8 1.2 4.2 6 9.5 6 1.1 0 2.1-.2 3-.6" /></>
                ) : (
                  <><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>
                )}
              </svg>
            </button>
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-button">Iniciar sesión</button>
          <button type="button" className="login-link" onClick={() => { setVista("solicitar"); setErrorLocal(""); }}>¿Olvidaste tu contraseña?</button>
        </form>}
        {vista === "solicitar" && <form onSubmit={solicitar}>
          <label htmlFor="usuario-recuperacion">Usuario</label>
          <input id="usuario-recuperacion" type="text" autoComplete="username" value={usuarioRecuperacion} onChange={(event) => setUsuarioRecuperacion(event.target.value)} required />
          <label htmlFor="correo-recuperacion">Correo registrado en tu cuenta</label>
          <input id="correo-recuperacion" type="email" autoComplete="email" value={correo} onChange={(event) => setCorreo(event.target.value)} required />
          {errorLocal && <div className="login-error">{errorLocal}</div>}
          <button type="submit" className="login-button" disabled={cargando}>{cargando ? "Enviando…" : "Enviar instrucciones"}</button>
          <button type="button" className="login-link" onClick={volverLogin}>Volver al inicio de sesión</button>
        </form>}
        {vista === "restablecer" && <form onSubmit={guardar}>
          <label htmlFor="nueva-contrasena">Nueva contraseña (mínimo 12 caracteres)</label>
          <input id="nueva-contrasena" type="password" autoComplete="new-password" value={nueva} onChange={(event) => setNueva(event.target.value)} minLength={12} required />
          <label htmlFor="confirmar-contrasena">Repite la contraseña</label>
          <input id="confirmar-contrasena" type="password" autoComplete="new-password" value={confirmacion} onChange={(event) => setConfirmacion(event.target.value)} minLength={12} required />
          {errorLocal && <div className="login-error">{errorLocal}</div>}
          <button type="submit" className="login-button" disabled={cargando}>{cargando ? "Guardando…" : "Cambiar contraseña"}</button>
        </form>}
        {vista === "mensaje" && <div className="login-message"><p>{mensaje}</p>{errorLocal && <div className="login-error">{errorLocal}</div>}<button type="button" className="login-button" onClick={volverLogin}>Volver al inicio de sesión</button></div>}
        {errorLocal && vista !== "solicitar" && vista !== "restablecer" && <div className="login-error">{errorLocal}</div>}
      </div>
    </div>
  );
}
