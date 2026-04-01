import { createContext, useContext, useLayoutEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Recuperar tema do localStorage ou usar "light" como padrão
    const saved = localStorage.getItem("app-theme");
    return saved || "light";
  });

  useLayoutEffect(() => {
    // Aplicar tema ao elemento raiz ANTES da renderização visual
    const html = document.documentElement;
    html.setAttribute("data-theme", theme);
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  // Aplicar tema imediatamente ao montar
  useLayoutEffect(() => {
    const html = document.documentElement;
    const savedTheme = localStorage.getItem("app-theme") || "light";
    html.setAttribute("data-theme", savedTheme);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
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
