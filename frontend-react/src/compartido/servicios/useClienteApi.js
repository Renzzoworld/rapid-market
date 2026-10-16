import { useCallback } from "react";
import { API_URL } from "./configuracionApi.js";

async function leerRespuesta(response) {
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.detail || Object.values(data).flat().join(" ") || "No se pudo completar la operación.";
    throw new Error(detail);
  }
  return data;
}

function opcionesConToken(options, token) {
  return {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  };
}

export function useClienteApi({ accessToken, refreshToken, onTokensRenovados }) {
  const requestPublic = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_URL}${path}`, opcionesConToken(options, null));
    return leerRespuesta(response);
  }, []);

  const apiRequest = useCallback(async (path, options = {}, token = accessToken) => {
    let response = await fetch(`${API_URL}${path}`, opcionesConToken(options, token));
    if (response.status === 401 && refreshToken && path !== "/login/refresh/" && path !== "/login/") {
      try {
        const tokens = await requestPublic("/login/refresh/", {
          method: "POST", body: JSON.stringify({ refresh: refreshToken }),
        });
        onTokensRenovados(tokens);
        response = await fetch(`${API_URL}${path}`, opcionesConToken(options, tokens.access));
      } catch {
        // Se conserva la respuesta 401 original si el refresh expiró o falló.
      }
    }
    return leerRespuesta(response);
  }, [accessToken, onTokensRenovados, refreshToken, requestPublic]);

  return { apiRequest, requestPublic };
}
