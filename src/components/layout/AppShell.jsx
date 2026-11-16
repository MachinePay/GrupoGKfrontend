import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";

export default function AppShell() {
  const [contaFiltro, setContaFiltro] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);
  const location = useLocation();

  // Fecha o menu ao trocar de página
  useEffect(() => {
    setMenuAberto(false);
  }, [location.pathname]);

  // Trava a rolagem da página enquanto o menu está aberto no celular
  useEffect(() => {
    document.body.style.overflow = menuAberto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuAberto]);

  return (
    <div
      className="flex min-h-full"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <Sidebar open={menuAberto} onClose={() => setMenuAberto(false)} />
      <div
        className="flex-1 min-w-0 flex flex-col lg:ml-64 min-h-screen"
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        <Header
          contaFiltro={contaFiltro}
          onContaFilterChange={setContaFiltro}
          onMenuClick={() => setMenuAberto(true)}
        />
        <main
          className="flex-1 min-w-0 overflow-x-clip p-3 sm:p-4 lg:p-6"
          style={{
            backgroundColor: "var(--bg-primary)",
            paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
          }}
        >
          <Outlet context={{ contaFiltro }} />
        </main>
      </div>
    </div>
  );
}
