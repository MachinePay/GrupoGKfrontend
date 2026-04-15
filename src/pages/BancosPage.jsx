import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  ArrowLeft,
  RefreshCw,
  Wallet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useContasSaldo } from "../hooks/useFinanceiro.js";
import { movimentacoesApi } from "../services/api.js";
import { formatCurrency, formatDate } from "../lib/utils.js";
import MovimentacaoForm from "../components/forms/MovimentacaoForm.jsx";

const TIPO_COLOR = {
  ENTRADA: "text-emerald-400",
  SAIDA: "text-red-400",
  TRANSFERENCIA: "text-blue-400",
  AJUSTE_SALDO: "text-amber-400",
};

const TIPO_LABEL = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  TRANSFERENCIA: "Transf.",
  AJUSTE_SALDO: "Ajuste",
};

const TIPO_SIGNAL = {
  ENTRADA: "+",
  SAIDA: "-",
  TRANSFERENCIA: "↔",
  AJUSTE_SALDO: "±",
};

const PAGE_SIZE = 30;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function BancosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const contaIdParam = searchParams.get("contaId") || "";

  const [dataInicio, setDataInicio] = useState(firstDayOfMonth());
  const [dataFim, setDataFim] = useState(today());
  const [page, setPage] = useState(1);

  const contaId = contaIdParam;

  const qc = useQueryClient();

  const {
    data: contas = [],
    isLoading: loadContas,
    refetch: refetchContas,
  } = useContasSaldo();

  const selectedConta = contas.find((c) => String(c.id) === String(contaId));

  const saldoGeral = contas.reduce((sum, c) => sum + (c.saldoAtual || 0), 0);

  const {
    data: movsData,
    isLoading: loadMovs,
    refetch: refetchMovs,
  } = useQuery({
    queryKey: [
      "movimentacoes",
      "bancos-extrato",
      contaId,
      dataInicio,
      dataFim,
      page,
    ],
    queryFn: () =>
      movimentacoesApi
        .listar({ contaId, dataInicio, dataFim, limit: PAGE_SIZE, page })
        .then((r) => r.data),
    enabled: !!contaId,
    keepPreviousData: true,
  });

  const items = useMemo(() => movsData?.items ?? [], [movsData]);
  const pagination = movsData?.pagination ?? {};

  const stats = useMemo(() => {
    if (!items.length) return { entradas: 0, saidas: 0, transferencias: 0 };
    const entradas = items
      .filter((m) => m.tipo === "ENTRADA" && m.status === "REALIZADO")
      .reduce((s, m) => s + Number(m.valor), 0);
    const saidas = items
      .filter((m) => m.tipo === "SAIDA" && m.status === "REALIZADO")
      .reduce((s, m) => s + Number(m.valor), 0);
    const transferencias = items
      .filter((m) => m.tipo === "TRANSFERENCIA" && m.status === "REALIZADO")
      .reduce((s, m) => s + Number(m.valor), 0);
    return { entradas, saidas, transferencias };
  }, [items]);

  function selectConta(id) {
    setSearchParams({ contaId: String(id) });
  }

  function clearConta() {
    setSearchParams({});
  }

  function handleRefresh() {
    if (contaId) {
      // Invalidar queries de movimentações para forçar refetch
      qc.invalidateQueries({
        queryKey: ["movimentacoes", "bancos-extrato"],
      });
      // Também refazer a query atualmente ativa
      refetchMovs();
    } else {
      // Invalidar queries de contas
      qc.invalidateQueries({ queryKey: ["dashboard", "contas"] });
      refetchContas();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {contaId && (
            <button
              onClick={clearConta}
              className="btn-ghost p-2 rounded-xl"
              title="Voltar para visão geral"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-white">
              {selectedConta
                ? `${selectedConta.banco} – ${selectedConta.nome}`
                : "Contas Bancárias"}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {selectedConta
                ? "Extrato de lançamentos por período"
                : "Visão geral de saldos e extratos bancários"}
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="btn-ghost flex items-center gap-1.5 text-xs"
        >
          <RefreshCw size={13} /> Atualizar
        </button>
      </div>

      {/* ── VISÃO GERAL ── */}
      {!contaId && (
        <>
          {/* Saldo geral */}
          <div className="glass card-shadow rounded-2xl p-5 bg-linear-to-br from-blue-600/20 to-blue-800/10 border border-blue-500/20">
            <div className="flex items-start justify-between mb-4">
              <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                Saldo Geral (todos os bancos)
              </p>
              <span className="p-2 rounded-xl text-blue-400 bg-blue-500/15">
                <Wallet size={18} />
              </span>
            </div>
            {loadContas ? (
              <div className="h-8 w-40 bg-white/10 rounded animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-white tabular-nums">
                {formatCurrency(saldoGeral)}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Soma dos saldos atuais de todas as contas cadastradas
            </p>
          </div>

          {/* Grid de contas */}
          <div>
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Clique em uma conta para ver o extrato
            </p>
            {loadContas ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="glass rounded-2xl p-5 h-28 animate-pulse"
                  />
                ))}
              </div>
            ) : contas.length === 0 ? (
              <p className="text-slate-500 text-sm">
                Nenhuma conta cadastrada.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {contas.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectConta(c.id)}
                    className="glass card-shadow rounded-2xl p-5 text-left hover:bg-white/5 transition-all duration-150 border border-white/5 hover:border-blue-500/30 group"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="p-1.5 rounded-lg bg-white/5 text-slate-400 group-hover:text-blue-400 transition-colors">
                        <Landmark size={15} />
                      </span>
                      <p className="text-xs text-slate-400 truncate">
                        {c.banco}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-white truncate mb-1">
                      {c.nome}
                    </p>
                    <p
                      className={`text-xl font-bold tabular-nums ${
                        c.saldoAtual >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {formatCurrency(c.saldoAtual)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 group-hover:text-blue-400 transition-colors">
                      Ver extrato →
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── EXTRATO DE CONTA ESPECÍFICA ── */}
      {contaId && (
        <>
          {/* Saldo atual da conta */}
          <div className="flex flex-wrap gap-4">
            <div className="glass card-shadow rounded-2xl p-4 border border-white/5 flex-1 min-w-48">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
                Saldo Atual
              </p>
              {loadContas ? (
                <div className="h-7 w-32 bg-white/10 rounded animate-pulse" />
              ) : (
                <p
                  className={`text-2xl font-bold tabular-nums ${
                    (selectedConta?.saldoAtual ?? 0) >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {formatCurrency(selectedConta?.saldoAtual ?? 0)}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-0.5">
                Saldo acumulado real
              </p>
            </div>

            <div className="glass card-shadow rounded-2xl p-4 border border-emerald-500/20 flex-1 min-w-48">
              <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">
                Entradas (período)
              </p>
              <p className="text-2xl font-bold text-white tabular-nums">
                {formatCurrency(stats.entradas)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Realizadas no filtro
              </p>
            </div>

            <div className="glass card-shadow rounded-2xl p-4 border border-red-500/20 flex-1 min-w-48">
              <p className="text-xs text-red-400 uppercase tracking-wider mb-1">
                Saídas (período)
              </p>
              <p className="text-2xl font-bold text-white tabular-nums">
                {formatCurrency(stats.saidas)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Realizadas no filtro
              </p>
            </div>

            <div className="glass card-shadow rounded-2xl p-4 border border-blue-500/20 flex-1 min-w-48">
              <p className="text-xs text-blue-400 uppercase tracking-wider mb-1">
                Transferências (período)
              </p>
              <p className="text-2xl font-bold text-white tabular-nums">
                {formatCurrency(stats.transferencias)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Realizadas no filtro
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="glass card-shadow rounded-2xl p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Filtrar por período
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">De</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => {
                    setDataInicio(e.target.value);
                    setPage(1);
                  }}
                  className="input-base text-sm"
                  style={{ width: 155 }}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400">Até</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => {
                    setDataFim(e.target.value);
                    setPage(1);
                  }}
                  className="input-base text-sm"
                  style={{ width: 155 }}
                />
              </div>

              {/* Trocar conta */}
              {contas.length > 1 && (
                <div className="flex items-center gap-2 ml-auto">
                  <label className="text-xs text-slate-400 whitespace-nowrap">
                    Conta
                  </label>
                  <select
                    value={contaId}
                    onChange={(e) => selectConta(e.target.value)}
                    className="input-base text-sm"
                    style={{ minWidth: 200 }}
                  >
                    {contas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.banco} – {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <MovimentacaoForm
            onSuccess={() => {
              refetchMovs();
              refetchContas();
            }}
          />

          {/* Tabela de lançamentos */}
          <div className="glass card-shadow rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Lançamentos</h3>
              <span className="text-xs text-slate-400">
                {pagination.total ?? 0} registro(s)
              </span>
            </div>

            {loadMovs ? (
              <div className="divide-y divide-white/5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-3">
                    <div className="h-4 w-24 rounded bg-white/10 animate-pulse" />
                    <div className="h-4 flex-1 rounded bg-white/10 animate-pulse" />
                    <div className="h-4 w-20 rounded bg-white/10 animate-pulse" />
                    <div className="h-4 w-24 rounded bg-white/10 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                Nenhum lançamento encontrado para este período.
              </div>
            ) : (
              <div className="divide-y divide-white/5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase tracking-wider">
                      <th className="text-left px-5 py-3 font-medium">Data</th>
                      <th className="text-left px-5 py-3 font-medium">
                        Referência
                      </th>
                      <th className="text-left px-5 py-3 font-medium">
                        Empresa
                      </th>
                      <th className="text-left px-5 py-3 font-medium">Conta</th>
                      <th className="text-left px-5 py-3 font-medium">Tipo</th>
                      <th className="text-right px-5 py-3 font-medium">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {items.map((item) => {
                      const isOrigem =
                        String(item.contaOrigemId) === String(contaId);
                      const contaLabel =
                        item.tipo === "TRANSFERENCIA"
                          ? isOrigem
                            ? `→ ${item.contaDestino?.banco ?? ""} ${item.contaDestino?.nome ?? ""}`
                            : `← ${item.contaOrigem?.banco ?? ""} ${item.contaOrigem?.nome ?? ""}`
                          : item.tipo === "AJUSTE_SALDO"
                            ? item.contaDestino
                              ? `${item.contaDestino.banco} – ${item.contaDestino.nome}`
                              : "—"
                            : item.tipo === "ENTRADA"
                              ? item.contaDestino
                                ? `${item.contaDestino.banco} – ${item.contaDestino.nome}`
                                : "—"
                              : item.contaOrigem
                                ? `${item.contaOrigem.banco} – ${item.contaOrigem.nome}`
                                : "—";

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-white/3 transition-colors"
                        >
                          <td className="px-5 py-3 text-slate-400 whitespace-nowrap">
                            {formatDate(item.data)}
                          </td>
                          <td className="px-5 py-3 text-white max-w-xs truncate">
                            {item.referencia || item.categoria || "—"}
                          </td>
                          <td className="px-5 py-3 text-slate-400 whitespace-nowrap">
                            {item.empresa?.nome ?? "—"}
                          </td>
                          <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">
                            {contaLabel}
                          </td>
                          <td className="px-5 py-3 whitespace-nowrap">
                            <span
                              className={`font-medium ${TIPO_COLOR[item.tipo] ?? "text-slate-400"}`}
                            >
                              {TIPO_SIGNAL[item.tipo]}{" "}
                              {TIPO_LABEL[item.tipo] ?? item.tipo}
                            </span>
                          </td>
                          <td
                            className={`px-5 py-3 text-right font-semibold tabular-nums whitespace-nowrap ${
                              item.tipo === "AJUSTE_SALDO"
                                ? Number(item.valor) >= 0
                                  ? "text-amber-400"
                                  : "text-amber-600"
                                : (TIPO_COLOR[item.tipo] ?? "text-white")
                            }`}
                          >
                            {item.tipo === "AJUSTE_SALDO"
                              ? Number(item.valor) >= 0
                                ? "+"
                                : "-"
                              : TIPO_SIGNAL[item.tipo]}
                            {formatCurrency(Math.abs(Number(item.valor)))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginação */}
            {pagination.totalPages > 1 && (
              <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="btn-ghost p-1.5 disabled:opacity-40"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(pagination.totalPages, p + 1))
                    }
                    disabled={page >= pagination.totalPages}
                    className="btn-ghost p-1.5 disabled:opacity-40"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
