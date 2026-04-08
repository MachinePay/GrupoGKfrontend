import { lazy, Suspense, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  RefreshCw,
} from "lucide-react";
import { useConsolidado, useContasSaldo } from "../hooks/useFinanceiro.js";
import { SaldoCard, MiniCard } from "../components/ui/SaldoCard.jsx";
import { movimentacoesApi } from "../services/api.js";
import { formatCurrency } from "../lib/utils.js";

const EmpresaChartSection = lazy(
  () => import("../components/dashboard/EmpresaChartSection.jsx"),
);

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    data: consolidado,
    isLoading: loadConsolidado,
    refetch,
  } = useConsolidado();
  const { data: contas = [], isLoading: loadContas } = useContasSaldo();

  const saldoGeral = contas.reduce((sum, c) => sum + (c.saldoAtual || 0), 0);

  // Data de hoje para filtro
  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Movimentações de hoje
  const { data: movsHoje = [], isLoading: loadMovsHoje } = useQuery({
    queryKey: ["dashboard", "movs-hoje", hoje],
    queryFn: () =>
      movimentacoesApi
        .listar({
          dataInicio: hoje,
          dataFim: hoje,
          status: "REALIZADO",
          limit: 100,
        })
        .then((r) => (Array.isArray(r.data) ? r.data : r.data.items || [])),
    refetchInterval: 30_000, // Atualiza a cada 30s
  });

  // Cálculo de stats de hoje
  const statsHoje = useMemo(() => {
    const entradas = movsHoje
      .filter((m) => m.tipo === "ENTRADA")
      .reduce((s, m) => s + Number(m.valor), 0);
    const saidas = movsHoje
      .filter((m) => m.tipo === "SAIDA")
      .reduce((s, m) => s + Number(m.valor), 0);
    const saldoHoje = entradas - saidas;
    return { entradas, saidas, saldoHoje };
  }, [movsHoje]);

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
          title="Saldo Geral"
          value={formatCurrency(saldoGeral)}
          icon={Wallet}
          color={saldoGeral >= 0 ? "blue" : "red"}
          loading={loadContas}
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
              <button
                key={conta.id}
                onClick={() => navigate(`/bancos?contaId=${conta.id}`)}
                className="glass rounded-xl p-4 text-left hover:bg-white/5 transition-all duration-150 hover:border-blue-500/30 border border-transparent"
              >
                <p className="text-xs text-slate-400 mb-1 truncate">
                  {conta.banco} – {conta.nome}
                </p>
                <p className="text-base font-semibold text-white tabular-nums truncate">
                  {formatCurrency(conta.saldoAtual)}
                </p>
              </button>
            ))}
            {contas.length === 0 && (
              <p className="text-slate-500 text-sm col-span-full">
                Nenhuma conta cadastrada ainda.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Lançamentos de Hoje */}
      <div className="glass card-shadow rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            Lançamentos de Hoje
          </h2>
          <span className="text-xs text-slate-400">
            {movsHoje.length} lançamento(s)
          </span>
        </div>

        {loadMovsHoje ? (
          <div className="divide-y divide-white/5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <div className="h-4 w-24 rounded bg-white/10 animate-pulse" />
                <div className="h-4 flex-1 rounded bg-white/10 animate-pulse" />
                <div className="h-4 w-20 rounded bg-white/10 animate-pulse" />
              </div>
            ))}
          </div>
        ) : movsHoje.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-sm">
            Nenhum lançamento realizado hoje.
          </div>
        ) : (
          <>
            <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
              {movsHoje.map((mov) => (
                <div
                  key={mov.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-white/3 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {mov.referencia || mov.categoria || "Sem referência"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {mov.empresa?.nome ?? "—"} •{" "}
                      {mov.tipo === "ENTRADA"
                        ? mov.contaDestino?.nome
                        : mov.tipo === "SAIDA"
                          ? mov.contaOrigem?.nome
                          : "Transferência"}
                    </p>
                  </div>
                  <p
                    className={`text-right font-semibold tabular-nums whitespace-nowrap ${
                      mov.tipo === "ENTRADA"
                        ? "text-slate-900 dark:text-white" // Crédito em preto
                        : "text-red-400" // Débito em vermelho
                    }`}
                  >
                    {mov.tipo === "ENTRADA" ? "+" : "-"}
                    {formatCurrency(mov.valor)}
                  </p>
                </div>
              ))}
            </div>

            {/* Saldo final do dia */}
            <div className="px-5 py-4 border-t border-white/5 bg-white/3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Saldo do dia:</p>
                <p
                  className={`text-lg font-bold tabular-nums ${
                    statsHoje.saldoHoje >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {statsHoje.saldoHoje >= 0 ? "+" : ""}
                  {formatCurrency(statsHoje.saldoHoje)}
                </p>
              </div>
            </div>
          </>
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
