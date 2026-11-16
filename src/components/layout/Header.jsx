import { Bell, ChevronDown, Menu } from "lucide-react";
import { useConsolidado, useContasSaldo } from "../../hooks/useFinanceiro.js";
import { formatCurrency } from "../../lib/utils.js";
import { useTraducao } from "../../context/TraducaoContext.jsx";

export default function Header({ onContaFilterChange, contaFiltro, onMenuClick }) {
  const { t } = useTraducao();
  const { data: consolidado, isLoading } = useConsolidado();
  const { data: contas = [] } = useContasSaldo();

  const contaSelecionada = contaFiltro
    ? contas.find((conta) => String(conta.id) === String(contaFiltro))
    : null;

  const saldoConsolidadoExibido = contaSelecionada
    ? Number(contaSelecionada.saldoAtual || 0)
    : Number(consolidado?.saldoLiquido || 0);

  const saldoLabel = contaSelecionada
    ? `${t("HEADER_SALDO_BANCO", "Saldo")} ${contaSelecionada.banco}`
    : t("HEADER_SALDO_CONSOLIDADO", "Saldo Consolidado");

  return (
    <header
      className="sticky top-0 z-30 border-b border-slate-200 dark:border-white/5 glass"
      style={{
        backgroundColor: "var(--glass-bg)",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-4 lg:px-6 lg:h-16 lg:py-0">
        {/* Botão do menu (celular/tablet) */}
        <button
          onClick={onMenuClick}
          aria-label="Abrir menu"
          className="lg:hidden -ml-1 p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
        >
          <Menu size={22} />
        </button>

        {/* Saldo consolidado destaque */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 min-w-0 leading-tight">
          <span className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-500 truncate">
            {saldoLabel}
          </span>
          {isLoading ? (
            <div className="h-5 w-28 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
          ) : (
            <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(saldoConsolidadoExibido)}
            </span>
          )}
        </div>

        <div className="flex-1" />

        <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 dark:hover:text-white hover:text-slate-900 transition-colors relative sm:order-last">
          <Bell size={18} />
        </button>

        {/* Filtro por conta bancaria */}
        <div className="relative w-full sm:w-56">
          <select
            value={contaFiltro}
            onChange={(e) => onContaFilterChange(e.target.value)}
            className="appearance-none input-base pr-8 py-1.5 text-sm"
          >
            <option value="">
              {t("HEADER_TODOS_BANCOS", "Todos os Bancos")}
            </option>
            {contas.map((conta) => (
              <option key={conta.id} value={conta.id}>
                {`${conta.banco} - ${conta.nome}`}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none"
          />
        </div>
      </div>
    </header>
  );
}
