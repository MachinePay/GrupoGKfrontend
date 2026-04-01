import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Header from "./Header.jsx";

export default function AppShell() {
  const [empresaFiltro, setEmpresaFiltro] = useState("");

  return (
    <div className="flex h-full bg-white dark:bg-[#0f1729]">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64 min-h-screen">
        <Header
          empresaFiltro={empresaFiltro}
          onFilterChange={setEmpresaFiltro}
        />
        <main className="flex-1 p-6 overflow-y-auto bg-white dark:bg-[#0f1729]">
          <Outlet context={{ empresaFiltro }} />
        </main>
      </div>
    </div>
  );
}
