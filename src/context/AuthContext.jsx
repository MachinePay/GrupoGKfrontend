import { createContext, useContext, useState, useCallback } from "react";
import { authApi } from "../services/api.js";

const AuthContext = createContext(null);

function loadStoredUser() {
  try {
    const raw = localStorage.getItem("gk_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem("gk_token"));

  const login = useCallback(async (email, senha) => {
    const { data } = await authApi.login({ email, senha });
    localStorage.setItem("gk_token", data.token);
    localStorage.setItem("gk_user", JSON.stringify(data.usuario));
    setToken(data.token);
    setUser(data.usuario);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("gk_token");
    localStorage.removeItem("gk_user");
    setToken(null);
    setUser(null);
  }, []);

  const isAdmin = user?.perfil === "ADMIN";

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isAdmin, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
