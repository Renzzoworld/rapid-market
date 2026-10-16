export function InicioSesion({ usuario, setUsuario, password, setPassword, error, onSubmit }) {
  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Rapid Market</h1>
        <p>Sistema de Gestión Comercial</p>
        <form onSubmit={onSubmit}>
          <label htmlFor="usuario">Usuario</label>
          <input id="usuario" type="text" placeholder="Ingrese su usuario" value={usuario} onChange={(event) => setUsuario(event.target.value)} />
          <label htmlFor="contrasena">Contraseña</label>
          <input id="contrasena" type="password" placeholder="Ingrese su contraseña" value={password} onChange={(event) => setPassword(event.target.value)} />
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-button">Iniciar sesión</button>
        </form>
      </div>
    </div>
  );
}
