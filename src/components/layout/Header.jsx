import { useState } from "react";
import { Bell, ChevronDown } from "lucide-react";
import { useConsolidado, useEmpresas } from "../../hooks/useFinanceiro.js";
import { formatCurrency } from "../../lib/utils.js";

export default function Header({ onFilterChange, empresaFiltro }) {
  const { data: consolidado, isLoading } = useConsolidado();
  const { data: empresas = [] } = useEmpresas();

  return (
    <header className="h-16 flex items-center px-6 gap-4 border-b border-slate-200 dark:border-white/5 glass bg-white dark:bg-navy-900/70 sticky top-0 z-30">
      {/* Saldo consolidado destaque */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-600 dark:text-slate-500 hidden sm:inline">
          Saldo Consolidado
        </span>
        {isLoading ? (
          <div className="h-5 w-32 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
        ) : (
          <span className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
            {formatCurrency(consolidado?.saldoLiquido)}
          </span>
        )}
      </div>

      <div className="flex-1" />

      {/* Filtro por empresa */}
      <div className="relative">
        <select
          value={empresaFiltro}
          onChange={(e) => onFilterChange(e.target.value)}
          className="appearance-none input-base pr-8 py-1.5 text-sm"
          style={{ width: 180 }}
        >
          <option value="">Todas as Empresas</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
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
