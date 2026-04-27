import { Bell, ChevronDown } from "lucide-react";
import { useConsolidado, useContasSaldo } from "../../hooks/useFinanceiro.js";
import { formatCurrency } from "../../lib/utils.js";
import { useTraducao } from "../../context/TraducaoContext.jsx";

export default function Header({ onContaFilterChange, contaFiltro }) {
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
      className="h-16 flex items-center px-6 gap-4 border-b border-slate-200 dark:border-white/5 glass sticky top-0 z-30"
      style={{ backgroundColor: "var(--glass-bg)" }}
    >
      {/* Saldo consolidado destaque */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-600 dark:text-slate-500 hidden sm:inline">
          {saldoLabel}
        </span>
        {isLoading ? (
          <div className="h-5 w-32 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
        ) : (
          <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
            {formatCurrency(saldoConsolidadoExibido)}
          </span>
        )}
      </div>

      <div className="flex-1" />

      {/* Filtro por conta bancaria */}
      <div className="relative">
        <select
          value={contaFiltro}
          onChange={(e) => onContaFilterChange(e.target.value)}
          className="appearance-none input-base pr-8 py-1.5 text-sm"
          style={{ width: 220 }}
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

      <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 dark:hover:text-white hover:text-slate-900 transition-colors relative">
        <Bell size={17} />
      </button>
    </header>
  );
}
