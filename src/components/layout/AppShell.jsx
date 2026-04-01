import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";

export default function AppShell() {
  const [empresaFiltro, setEmpresaFiltro] = useState("");

  return (
    <div
      className="flex h-full"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <Sidebar />
      <div
        className="flex-1 flex flex-col ml-64 min-h-screen"
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        <Header
          empresaFiltro={empresaFiltro}
          onFilterChange={setEmpresaFiltro}
        />
        <main
          className="flex-1 p-6 overflow-y-auto"
          style={{ backgroundColor: "var(--bg-primary)" }}
        >
          <Outlet context={{ empresaFiltro }} />
        </main>
      </div>
    </div>
  );
}
