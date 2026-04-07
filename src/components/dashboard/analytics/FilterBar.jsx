import { useEmpresas, useContas } from "../../../hooks/useFinanceiro.js";
import { Calendar } from "lucide-react";

export default function FilterBar({
  filtros,
  onFiltroChange,
  onRefresh,
  isLoading,
}) {
  const { data: empresas = [] } = useEmpresas();
  const { data: contas = [] } = useContas();

  const handleChange = (key, value) => {
    onFiltroChange({ ...filtros, [key]: value });
  };

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
        Filtros
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Seletor de Empresa */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Empresa
          </label>
          <select
            value={filtros.empresaId || "todas"}
            onChange={(e) => handleChange("empresaId", e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todas">Todas</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Seletor de Conta/Banco */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Conta Bancária
          </label>
          <select
            value={filtros.contaId || "todas"}
            onChange={(e) => handleChange("contaId", e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="todas">Todas</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.banco} - {c.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Data Início */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            <Calendar size={14} className="inline mr-1" />
            Data Início
          </label>
          <input
            type="date"
            value={filtros.dataInicio || ""}
            onChange={(e) => handleChange("dataInicio", e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Data Fim */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            <Calendar size={14} className="inline mr-1" />
            Data Fim
          </label>
          <input
            type="date"
            value={filtros.dataFim || ""}
            onChange={(e) => handleChange("dataFim", e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Agrupamento e Botão Atualizar */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Agrupamento
          </label>
          <select
            value={filtros.groupBy || "dia"}
            onChange={(e) => handleChange("groupBy", e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="dia">Por Dia</option>
            <option value="mes">Por Mês</option>
            <option value="ano">Por Ano</option>
          </select>
        </div>

        <div className="flex items-end gap-2">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white text-sm rounded font-medium transition-colors"
          >
            {isLoading ? "Carregando..." : "Atualizar"}
          </button>
        </div>
      </div>
    </div>
  );
}
