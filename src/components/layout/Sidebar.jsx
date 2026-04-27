import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CalendarCheck,
  PieChart,
  Settings,
  LogOut,
  ClipboardCheck,
  BarChart3,
  Landmark,
  MonitorCog,
  Globe,
  ChevronDown,
} from "lucide-react";
import logoGrupoGk from "../../assets/Logo Grupo Gk .png";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTraducao } from "../../context/TraducaoContext.jsx";
import { cn } from "../../lib/utils.js";

const NAV_KEYS = [
  { to: "/", chave: "NAV_DASHBOARD", Icon: LayoutDashboard },
  { to: "/lancamentos", chave: "NAV_LANCAMENTOS", Icon: ArrowLeftRight },
  { to: "/calendario", chave: "NAV_CALENDARIO", Icon: CalendarCheck },
  { to: "/conciliacao", chave: "NAV_CONCILIACAO", Icon: ClipboardCheck },
  { to: "/bancos", chave: "NAV_BANCOS", Icon: Landmark },
  { to: "/relatorios", chave: "NAV_RELATORIOS", Icon: PieChart },
  { to: "/analytics", chave: "NAV_ANALYTICS", Icon: BarChart3 },
  { to: "/selfmachine", chave: "NAV_SELFMACHINE", Icon: MonitorCog },
  { to: "/configuracoes", chave: "NAV_CONFIGURACOES", Icon: Settings },
];

function LanguageSwitcher() {
  const { idioma, setIdioma, IDIOMAS } = useTraducao();
  const [open, setOpen] = useState(false);
  const atual = IDIOMAS.find((i) => i.codigo === idioma) ?? IDIOMAS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
      >
        <Globe size={14} />
        <span className="flex-1 text-left">
          {atual.bandeira} {atual.nome}
        </span>
        <ChevronDown
          size={12}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden z-50">
          {IDIOMAS.map((lang) => (
            <button
              key={lang.codigo}
              onClick={() => {
                setIdioma(lang.codigo);
                setOpen(false);
              }}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 text-xs text-left transition-colors",
                lang.codigo === idioma
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-semibold"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5",
              )}
            >
              <span>{lang.bandeira}</span>
              <span>{lang.nome}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const { t } = useTraducao();
  const isCaixa = user?.perfil === "CAIXA";

  const visibleNav = isCaixa
    ? NAV_KEYS.filter((item) =>
        ["/lancamentos", "/calendario", "/bancos", "/configuracoes"].includes(
          item.to,
        ),
      )
    : NAV_KEYS;

  const perfilLabel = isAdmin
    ? t("PERFIL_ADMIN", "Administrador")
    : isCaixa
      ? t("PERFIL_CAIXA", "Caixa")
      : t("SIDEBAR_FINANCEIRO", "Financeiro");

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
          <p className="text-xs text-slate-500">
            {t("SIDEBAR_FINANCEIRO", "Financeiro")}
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map(({ to, chave, Icon }) => (
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
            {t(chave, chave.replace("NAV_", ""))}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-slate-200 dark:border-white/5 space-y-3">
        {/* Language switcher */}
        <LanguageSwitcher />

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white">
            {user?.nome?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {user?.nome ?? "Usuário"}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-500">
              {perfilLabel}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="btn-ghost w-full flex items-center gap-2 justify-center text-xs"
        >
          <LogOut size={14} /> {t("BTN_SAIR", "Sair")}
        </button>
      </div>
    </aside>
  );
}
