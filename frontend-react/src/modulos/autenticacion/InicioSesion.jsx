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
          <input id="contrasena" type="password" autoComplete="current-password" placeholder="Ingrese su contraseña" value={password} onChange={(event) => setPassword(event.target.value)} required />
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
