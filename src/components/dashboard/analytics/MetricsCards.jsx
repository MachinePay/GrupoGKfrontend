import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { formatCurrency } from "../../../lib/utils.js";

function MetricCard({
  title,
  value,
  subtext,
  icon: Icon,
  color = "blue",
  loading = false,
}) {
  const colorClasses = {
    blue: "from-blue-900/30 to-blue-800/20 border-blue-700",
    green: "from-green-900/30 to-green-800/20 border-green-700",
    red: "from-red-900/30 to-red-800/20 border-red-700",
    yellow: "from-yellow-900/30 to-yellow-800/20 border-yellow-700",
    purple: "from-purple-900/30 to-purple-800/20 border-purple-700",
  };

  const iconColorClasses = {
    blue: "text-blue-400",
    green: "text-green-400",
    red: "text-red-400",
    yellow: "text-yellow-400",
    purple: "text-purple-400",
  };

  return (
    <div
      className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur border rounded-lg p-4`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {title}
          </p>
          {loading ? (
            <div className="mt-2 h-8 bg-slate-700/30 rounded animate-pulse"></div>
          ) : (
            <p className="mt-2 text-2xl font-bold text-white">{value}</p>
          )}
          {subtext && <p className="mt-1 text-xs text-slate-400">{subtext}</p>}
        </div>
        <Icon
          className={`${iconColorClasses[color]} flex-shrink-0`}
          size={24}
        />
      </div>
    </div>
  );
}

export default function MetricsCards({ metricas, isLoading }) {
  if (!metricas) {
    return null;
  }

  const { burnRate, ticketMedio, margemContribuicao, pontoAtencao } = metricas;

  return (
    <div className="space-y-4">
      {/* Primeira linha de cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Burn Rate (Diário)"
          value={formatCurrency(burnRate?.burnRateDiario || 0)}
          subtext={`${burnRate?.dias || 0} dias analisados`}
          icon={TrendingDown}
          color="red"
          loading={isLoading}
        />

        <MetricCard
          title="Burn Rate (Mensal)"
          value={formatCurrency(burnRate?.burnRateMensal || 0)}
          subtext="Projeção de 30 dias"
          icon={TrendingDown}
          color="red"
          loading={isLoading}
        />

        <MetricCard
          title="Ticket Médio"
          value={formatCurrency(ticketMedio?.ticketMedio || 0)}
          subtext={`${ticketMedio?.quantidade || 0} transações`}
          icon={DollarSign}
          color="green"
          loading={isLoading}
        />

        <MetricCard
          title="Margem de Contribuição"
          value={`${margemContribuicao?.percentualMargem || 0}%`}
          subtext={formatCurrency(margemContribuicao?.margem || 0)}
          icon={TrendingUp}
          color="purple"
          loading={isLoading}
        />
      </div>

      {/* Card de Ponto de Atenção */}
      {pontoAtencao && pontoAtencao.categoria !== "N/A" && (
        <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 border border-yellow-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="text-yellow-400 flex-shrink-0 mt-1"
              size={20}
            />
            <div className="flex-1">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Ponto de Atenção
              </p>
              <p className="mt-2 text-white font-semibold">
                {pontoAtencao.categoria}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-slate-400">Mês Anterior</p>
                  <p className="text-yellow-400 font-semibold">
                    {formatCurrency(pontoAtencao.mesAnterior)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Mês Atual</p>
                  <p className="text-yellow-400 font-semibold">
                    {formatCurrency(pontoAtencao.mesAtual)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Crescimento</p>
                  <p className="text-red-400 font-semibold">
                    +{pontoAtencao.crescimentoPercentual}%
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                💡 Dica: Revise os processos e custos nesta categoria para
                otimizar
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
