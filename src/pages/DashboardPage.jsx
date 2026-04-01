import { lazy, Suspense } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  RefreshCw,
} from "lucide-react";
import { useConsolidado, useContasSaldo } from "../hooks/useFinanceiro.js";
import { SaldoCard, MiniCard } from "../components/ui/SaldoCard.jsx";
import { formatCurrency } from "../lib/utils.js";

const EmpresaChartSection = lazy(
  () => import("../components/dashboard/EmpresaChartSection.jsx"),
);

export default function DashboardPage() {
  const {
    data: consolidado,
    isLoading: loadConsolidado,
    refetch,
  } = useConsolidado();
  const { data: contas = [], isLoading: loadContas } = useContasSaldo();

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">
            Dashboard Consolidado
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Visão geral financeira do Grupo GK
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn-ghost flex items-center gap-1.5 text-xs"
        >
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SaldoCard
          title="Total Entradas"
          value={formatCurrency(consolidado?.totalEntradas)}
          icon={TrendingUp}
          color="green"
          loading={loadConsolidado}
        />
        <SaldoCard
          title="Total Saídas"
          value={formatCurrency(consolidado?.totalSaidas)}
          icon={TrendingDown}
          color="red"
          loading={loadConsolidado}
        />
        <SaldoCard
          title="Saldo Líquido"
          value={formatCurrency(consolidado?.saldoLiquido)}
          icon={Wallet}
          color={consolidado?.saldoLiquido >= 0 ? "blue" : "red"}
          loading={loadConsolidado}
        />
        <SaldoCard
          title="Contas Ativas"
          value={contas.length}
          icon={Building2}
          color="purple"
          loading={loadContas}
        />
      </div>

      {/* Saldo por banco */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Saldo por Conta Bancária
        </h2>
        {loadContas ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="glass rounded-xl p-4 h-16 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {contas.map((conta) => (
              <MiniCard
                key={conta.id}
                label={`${conta.banco} – ${conta.empresa.nome}`}
                value={formatCurrency(conta.saldoAtual)}
              />
            ))}
            {contas.length === 0 && (
              <p className="text-slate-500 text-sm col-span-full">
                Nenhuma conta cadastrada ainda.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Gráfico por empresa */}
      <div className="glass card-shadow rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">
            Faturamento por Empresa
          </h2>
          <span className="text-xs text-slate-500">
            Entradas vs Saídas (REALIZADO)
          </span>
        </div>
        <Suspense
          fallback={
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
              Carregando gráfico...
            </div>
          }
        >
          <EmpresaChartSection />
        </Suspense>
      </div>
    </div>
  );
}
