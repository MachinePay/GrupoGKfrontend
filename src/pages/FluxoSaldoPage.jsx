import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Filter,
  Download,
  Calendar,
} from "lucide-react";
import { useEmpresas } from "../hooks/useFinanceiro.js";
import { movimentacoesApi } from "../services/api.js";
import { formatCurrency, formatDate } from "../lib/utils.js";
import { Select } from "../components/ui/FormField.jsx";

function groupByMonth(items) {
  const grouped = {};
  for (const item of items) {
    const date = new Date(item.data);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!grouped[monthKey]) {
      grouped[monthKey] = [];
    }
    grouped[monthKey].push(item);
  }
  return grouped;
}

function HorizontalBarChart({ data, height = 300 }) {
  const maxSaldo = Math.max(...data.map((d) => d.saldo || 0), 0) || 1;
  const minSaldo = Math.min(...data.map((d) => d.saldo || 0), 0);
  const range = Math.max(Math.abs(maxSaldo), Math.abs(minSaldo)) || 1;

  return (
    <div
      style={{ height }}
      className="flex flex-col justify-end gap-1 px-4 py-4"
    >
      {data.slice(-12).map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-12 text-right truncate">
            {item.label}
          </span>
          <div className="flex-1 relative h-6 bg-white/5 rounded">
            <div
              className={`absolute top-0 h-full rounded transition-all flex items-center justify-end ${
                item.saldo >= 0 ? "bg-emerald-500/40" : "bg-red-500/40"
              }`}
              style={{
                width: `${(Math.abs(item.saldo) / range) * 100}%`,
                [item.saldo >= 0 ? "left" : "right"]: 0,
              }}
            >
              <span className="text-xs font-medium text-white px-2">
                {formatCurrency(item.saldo)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SaldoTimeline({ data }) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => new Date(a.data) - new Date(b.data)),
    [data],
  );

  const timeline = useMemo(() => {
    const result = [];
    let accumulated = 0;
    for (const item of sorted) {
      const valor = Number(item.valor);
      if (item.tipo === "ENTRADA" || item.tipo === "TRANSFERENCIA") {
        accumulated += valor;
      } else if (item.tipo === "SAIDA") {
        accumulated -= valor;
      }
      result.push({ ...item, balance: accumulated });
    }
    return result;
  }, [sorted]);

  const monthlyData = useMemo(() => {
    const months = {};
    for (const item of timeline) {
      const date = new Date(item.data);
      const monthKey = date.toLocaleDateString("pt-BR", {
        year: "numeric",
        month: "short",
      });
      if (!months[monthKey]) {
        months[monthKey] = item.balance;
      }
      months[monthKey] = item.balance;
    }
    return Object.entries(months).map(([label, saldo]) => ({ label, saldo }));
  }, [timeline]);

  return (
    <div className="space-y-6">
      <div className="glass card-shadow rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-white mb-4">
          Evolução Mensal do Saldo
        </h3>
        <HorizontalBarChart data={monthlyData} />
      </div>

      <div className="glass card-shadow rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-sm font-semibold text-white">
            Histórico Detalhado (Últimas 30 movimentações)
          </h3>
        </div>
        <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
          {timeline
            .slice(-30)
            .reverse()
            .map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between px-6 py-3 hover:bg-white/3 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    {item.referencia || item.categoria || "—"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(item.data)}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div
                    className={`text-right tabular-nums ${
                      item.tipo === "ENTRADA" || item.tipo === "TRANSFERENCIA"
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    <p className="text-sm font-medium">
                      {item.tipo === "ENTRADA" || item.tipo === "TRANSFERENCIA"
                        ? "+"
                        : "-"}
                      {formatCurrency(item.valor)}
                    </p>
                  </div>
                  <div className="text-right min-w-32">
                    <p className="text-sm font-semibold text-white">
                      {formatCurrency(item.balance)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.status === "PREVISTO" && "Previsto"}
                      {item.status === "REALIZADO" && "Realizado"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default function FluxoSaldoPage() {
  const today = new Date();
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);

  const [dataInicio, setDataInicio] = useState(
    sixMonthsAgo.toISOString().slice(0, 10),
  );
  const [dataFim, setDataFim] = useState(today.toISOString().slice(0, 10));
  const [empresaFiltro, setEmpresaFiltro] = useState("");

  const { data: empresas = [] } = useEmpresas();

  const { data: movimentacoes = [], isLoading } = useQuery({
    queryKey: ["movimentacoes", "fluxo", dataInicio, dataFim, empresaFiltro],
    queryFn: () =>
      movimentacoesApi
        .listar({
          dataInicio,
          dataFim,
          ...(empresaFiltro && { empresaId: empresaFiltro }),
          limit: 500,
        })
        .then((r) => (Array.isArray(r.data) ? r.data : r.data.items || [])),
  });

  const stats = useMemo(() => {
    const entradas = movimentacoes
      .filter((m) => m.tipo === "ENTRADA")
      .reduce((s, m) => s + Number(m.valor), 0);

    const saidas = movimentacoes
      .filter((m) => m.tipo === "SAIDA")
      .reduce((s, m) => s + Number(m.valor), 0);

    const transferencias = movimentacoes
      .filter((m) => m.tipo === "TRANSFERENCIA")
      .reduce((s, m) => s + Number(m.valor), 0);

    const saldoLiquido = entradas - saidas;

    return { entradas, saidas, transferencias, saldoLiquido };
  }, [movimentacoes]);

  const mensalData = useMemo(() => {
    const months = groupByMonth(movimentacoes);
    return Object.entries(months)
      .map(([monthKey, items]) => {
        const [year, month] = monthKey.split("-");
        const entradas = items
          .filter((i) => i.tipo === "ENTRADA")
          .reduce((s, i) => s + Number(i.valor), 0);
        const saidas = items
          .filter((i) => i.tipo === "SAIDA")
          .reduce((s, i) => s + Number(i.valor), 0);
        return {
          periodo: `${month}/${year}`,
          entradas,
          saidas,
          liquido: entradas - saidas,
        };
      })
      .sort();
  }, [movimentacoes]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Fluxo de Saldo</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Evolução temporal do saldo consolidado com histórico detalhado
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="glass card-shadow rounded-2xl p-4 border border-emerald-500/20">
          <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">
            Entradas
          </p>
          <p className="text-xl font-bold text-white">
            {formatCurrency(stats.entradas)}
          </p>
        </div>
        <div className="glass card-shadow rounded-2xl p-4 border border-red-500/20">
          <p className="text-xs text-red-400 uppercase tracking-wider mb-1">
            Saídas
          </p>
          <p className="text-xl font-bold text-white">
            {formatCurrency(stats.saidas)}
          </p>
        </div>
        <div className="glass card-shadow rounded-2xl p-4 border border-blue-500/20">
          <p className="text-xs text-blue-400 uppercase tracking-wider mb-1">
            Transferências
          </p>
          <p className="text-xl font-bold text-white">
            {formatCurrency(stats.transferencias)}
          </p>
        </div>
        <div className="glass card-shadow rounded-2xl p-4 border border-slate-500/20">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
            Saldo Líquido
          </p>
          <p
            className={`text-xl font-bold ${
              stats.saldoLiquido >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {formatCurrency(stats.saldoLiquido)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Filter size={14} className="text-slate-400" />
        <input
          type="date"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
          className="input-base"
          style={{ width: 150 }}
        />
        <span className="text-slate-500 text-sm">até</span>
        <input
          type="date"
          value={dataFim}
          onChange={(e) => setDataFim(e.target.value)}
          className="input-base"
          style={{ width: 150 }}
        />
        <div className="min-w-48">
          <Select
            value={empresaFiltro}
            onChange={(e) => setEmpresaFiltro(e.target.value)}
            options={empresas.map((empresa) => ({
              value: empresa.id,
              label: empresa.nome,
            }))}
            placeholder="Todas as empresas"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">
          Carregando fluxo de saldo...
        </div>
      ) : (
        <>
          {mensalData.length > 0 && (
            <div className="glass card-shadow rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5">
                <h3 className="text-sm font-semibold text-white">
                  Resumo Mensal
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-6">
                {mensalData.map((mes, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-white/5 bg-white/3 p-4 space-y-2"
                  >
                    <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">
                      {mes.periodo}
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Entradas</span>
                        <span className="text-sm text-emerald-400 font-medium">
                          +{formatCurrency(mes.entradas)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">Saídas</span>
                        <span className="text-sm text-red-400 font-medium">
                          -{formatCurrency(mes.saidas)}
                        </span>
                      </div>
                      <div className="border-t border-white/10 pt-1.5 flex justify-between items-center">
                        <span className="text-xs text-slate-300 font-medium">
                          Líquido
                        </span>
                        <span
                          className={`text-sm font-semibold ${
                            mes.liquido >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {mes.liquido >= 0 ? "+" : ""}
                          {formatCurrency(mes.liquido)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {movimentacoes.length > 0 ? (
            <SaldoTimeline data={movimentacoes} />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Calendar size={32} className="mb-2 opacity-40" />
              <p className="text-sm">
                Nenhuma movimentação encontrada para este período.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
