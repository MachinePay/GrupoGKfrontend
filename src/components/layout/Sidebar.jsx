import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CalendarCheck,
  Wallet,
  TrendingUp,
  PieChart,
  Settings,
  LogOut,
  ClipboardCheck,
  BarChart3,
  Landmark,
  MonitorCog,
} from "lucide-react";
import logoGrupoGk from "../../assets/Logo Grupo Gk .png";
import { useAuth } from "../../context/AuthContext.jsx";
import { cn } from "../../lib/utils.js";

const NAV = [
  { to: "/", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/lancamentos", label: "Lançamentos", Icon: ArrowLeftRight },
  { to: "/calendario", label: "Calendário", Icon: CalendarCheck },
  { to: "/conciliacao", label: "Conciliação", Icon: ClipboardCheck },
  // { to: "/contas-pagar", label: "Contas a Pagar", Icon: Wallet },
  { to: "/bancos", label: "Bancos", Icon: Landmark },
  // { to: "/fluxo-saldo", label: "Fluxo de Saldo", Icon: TrendingUp },
  { to: "/relatorios", label: "Relatórios", Icon: PieChart },
  { to: "/analytics", label: "Analytics", Icon: BarChart3 },
  { to: "/selfmachine", label: "SelfMachine", Icon: MonitorCog },
  { to: "/configuracoes", label: "Configurações", Icon: Settings },
];

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const isCaixa = user?.perfil === "CAIXA";
  const visibleNav = isCaixa
    ? NAV.filter((item) =>
        ["/lancamentos", "/calendario", "/bancos", "/configuracoes"].includes(
          item.to,
        ),
      )
    : NAV;

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex flex-col w-64 glass card-shadow border-r border-slate-200 dark:border-white/5"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-200 dark:border-white/5">
        <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-slate-300/70 dark:ring-white/10 shadow-lg bg-slate-100 dark:bg-slate-900">
          <img
            src={logoGrupoGk}
            alt="Logo Grupo GK"
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
            Grupo GK
          </p>
          <p className="text-xs text-slate-500">Financeiro</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-blue-600/20 text-blue-600 dark:text-blue-300 border border-blue-500/25"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5",
              )
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white">
            {user?.nome?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {user?.nome ?? "Usuário"}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-500">
              {isAdmin ? "Administrador" : isCaixa ? "Caixa" : "Financeiro"}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="btn-ghost w-full flex items-center gap-2 justify-center text-xs"
        >
          <LogOut size={14} /> Sair
        </button>
      </div>
    </aside>
  );
}
