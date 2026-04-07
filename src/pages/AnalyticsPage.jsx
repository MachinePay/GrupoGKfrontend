import { useState } from "react";
import { Suspense } from "react";
import { useAnalytics } from "../hooks/useAnalytics.js";
import FilterBar from "../components/dashboard/analytics/FilterBar.jsx";
import EvolutionChart from "../components/dashboard/analytics/EvolutionChart.jsx";
import ExpenseCompositionChart from "../components/dashboard/analytics/ExpenseCompositionChart.jsx";
import RevenueDistributionChart from "../components/dashboard/analytics/RevenueDistributionChart.jsx";
import ProjectRankingChart from "../components/dashboard/analytics/ProjectRankingChart.jsx";
import PerformanceTable from "../components/dashboard/analytics/PerformanceTable.jsx";
import MetricsCards from "../components/dashboard/analytics/MetricsCards.jsx";
import ExportButtons from "../components/dashboard/analytics/ExportButtons.jsx";
import { exportToPDF, exportToExcel } from "../lib/exportUtils.js";

export default function AnalyticsPage() {
  const [filtros, setFiltros] = useState({
    empresaId: "todas",
    contaId: "todas",
    dataInicio: null,
    dataFim: null,
    groupBy: "dia",
  });

  const { data: analytics, isLoading, refetch } = useAnalytics(filtros);

  const handleExportPDF = () => {
    if (analytics) {
      exportToPDF(analytics, filtros);
    }
  };

  const handleExportExcel = () => {
    if (analytics) {
      exportToExcel(analytics, filtros);
    }
  };

  return (
    <div className="space-y-6">
      {/* Título e Botões */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">
            Analytics & Performance
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Visão profunda do fluxo financeiro do Grupo GK
          </p>
        </div>
        <ExportButtons
          onExportPDF={handleExportPDF}
          onExportExcel={handleExportExcel}
          isLoading={isLoading}
        />
      </div>

      {/* Filtros */}
      <FilterBar
        filtros={filtros}
        onFiltroChange={setFiltros}
        onRefresh={() => refetch()}
        isLoading={isLoading}
      />

      {/* Métricas Principais */}
      <MetricsCards metricas={analytics?.metricas} isLoading={isLoading} />

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução */}
        <EvolutionChart
          data={analytics?.graficos?.evolucao}
          isLoading={isLoading}
        />

        {/* Composição de Despesas */}
        <ExpenseCompositionChart
          data={analytics?.graficos?.composicaoDespesas}
          isLoading={isLoading}
        />
      </div>

      {/* Distribuição e Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição de Receitas */}
        <RevenueDistributionChart
          data={analytics?.graficos?.distribuicaoReceitas}
          isLoading={isLoading}
        />

        {/* Ranking de Projetos */}
        <ProjectRankingChart
          data={analytics?.graficos?.rankingProjetos}
          isLoading={isLoading}
        />
      </div>

      {/* Tabela de Performance */}
      <PerformanceTable
        data={analytics?.tabelas?.contas}
        isLoading={isLoading}
      />

      {/* Informações Adicionais */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
          💡 Dicas de Otimização
        </h3>
        <ul className="space-y-2 text-sm text-slate-400">
          <li>
            🎯 <strong>Gráfico de Pareto (20/80):</strong> Identifique os 20% de
            custos que representam 80% dos gastos - geralmente aqui está a
            "gordura" a cortar.
          </li>
          <li>
            💰 <strong>Saldos por Banco:</strong> Verifique se não há dinheiro
            parado em contas que não rendem (como Caixa) enquanto outras pagam
            juros (como cheque especial no Santander).
          </li>
          <li>
            📊 <strong>Burn Rate:</strong> Controle a velocidade de consumo de
            caixa. Se {">"} receitas, revise despesas variáveis urgentemente.
          </li>
          <li>
            🎪 <strong>Por Projeto (MaisQuiosque):</strong> Compare margens para
            saber quais projetos realmente são lucrativos vs. só movem estoque.
          </li>
        </ul>
      </div>
    </div>
  );
}
