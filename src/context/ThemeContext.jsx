import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext.jsx";
import { authApi } from "../services/api.js";

const ThemeContext = createContext();

function normalizeTheme(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized === "light" || normalized === "dark" ? normalized : null;
}

export function ThemeProvider({ children }) {
  const { user, isAuthenticated, updateUser } = useAuth();

  const [theme, setTheme] = useState(() => {
    const userTheme = normalizeTheme(user?.tema);
    const savedTheme = normalizeTheme(localStorage.getItem("app-theme"));
    return userTheme || savedTheme || "light";
  });

  useLayoutEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-theme", theme);
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  useEffect(() => {
    const userTheme = normalizeTheme(user?.tema);
    if (userTheme && userTheme !== theme) {
      setTheme(userTheme);
    }
  }, [user?.tema, theme]);

  const persistTheme = useCallback(
    async (nextTheme) => {
      if (!isAuthenticated) return;

      try {
        const { data } = await authApi.updateTheme({
          tema: nextTheme.toUpperCase(),
        });
        updateUser(data);
      } catch {
        // Mantem o tema local aplicado mesmo que o backend esteja indisponivel.
      }
    },
    [isAuthenticated, updateUser],
  );

  const setThemePreference = useCallback(
    (nextTheme) => {
      const normalized = normalizeTheme(nextTheme);
      if (!normalized || normalized === theme) return;

      setTheme(normalized);
      void persistTheme(normalized);
    },
    [persistTheme, theme],
  );

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setThemePreference(nextTheme);
  };

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, setTheme: setThemePreference }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
