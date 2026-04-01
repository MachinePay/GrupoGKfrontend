import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Filter,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  TrendingDown,
} from "lucide-react";
import { agendaApi } from "../services/api.js";
import { useEmpresas } from "../hooks/useFinanceiro.js";
import { formatCurrency, formatDate } from "../lib/utils.js";
import { Select } from "../components/ui/FormField.jsx";
import { Badge } from "../components/ui/Badge.jsx";

function ContaDetailModal({ conta, onClose, onBaixa, onEdit, onDelete }) {
  if (!conta) return null;

  const daysUntilDue = Math.ceil(
    (new Date(conta.data) - new Date()) / (1000 * 60 * 60 * 24),
  );
  const isOverdue = daysUntilDue < 0;
  const isUrgent = daysUntilDue >= 0 && daysUntilDue <= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass card-shadow rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-bold text-white">{conta.titulo}</h2>
              <Badge status={conta.status} />
            </div>
            <p className="text-sm text-slate-400">{conta.empresa?.nome}</p>
          </div>
          <button onClick={onClose} className="btn-ghost text-xs">
            ✕
          </button>
        </div>

        {/* Main Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-white/3 border border-white/5 p-4">
            <p className="text-xs text-slate-500 mb-1">Valor</p>
            <p className="text-2xl font-bold text-red-400">
              {formatCurrency(conta.valor)}
            </p>
          </div>
          <div className="rounded-xl bg-white/3 border border-white/5 p-4">
            <p className="text-xs text-slate-500 mb-1">Vencimento</p>
            <p className="text-lg font-semibold text-white">
              {formatDate(conta.data)}
            </p>
            <p
              className={`text-xs mt-1 ${
                isOverdue
                  ? "text-red-400"
                  : isUrgent
                    ? "text-yellow-400"
                    : "text-emerald-400"
              }`}
            >
              {isOverdue
                ? `Atrasado há ${Math.abs(daysUntilDue)} dias`
                : isUrgent
                  ? `Vence em ${daysUntilDue} dias`
                  : `Vence em ${daysUntilDue} dias`}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3">
          {conta.descricao && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Descrição</p>
              <p className="text-sm text-slate-300">{conta.descricao}</p>
            </div>
          )}
          {conta.origem && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Origem</p>
              <p className="text-sm text-slate-300">{conta.origem}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Prioridade</p>
              <p
                className={`text-sm font-medium ${
                  conta.prioridade === "ALTA"
                    ? "text-red-400"
                    : conta.prioridade === "MEDIA"
                      ? "text-yellow-400"
                      : "text-blue-400"
                }`}
              >
                {conta.prioridade}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Status</p>
              <Badge status={conta.status} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-white/5">
          {conta.status !== "REALIZADO" && (
            <>
              <button
                onClick={() => {
                  onEdit(conta);
                  onClose();
                }}
                className="btn-ghost flex-1 inline-flex items-center justify-center gap-2 text-xs"
              >
                <Pencil size={14} /> Editar
              </button>
              <button
                onClick={() => {
                  onBaixa(conta);
                  onClose();
                }}
                className="btn-primary flex-1 inline-flex items-center justify-center gap-2 text-xs"
              >
                <CheckCircle size={14} /> Dar Baixa
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Excluir "${conta.titulo}"?`)) {
                    onDelete(conta.id);
                    onClose();
                  }
                }}
                className="btn-ghost text-red-400 hover:text-red-300 text-xs"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ContaRow({ conta, onViewDetails, isExpanded, onToggle }) {
  const daysUntilDue = Math.ceil(
    (new Date(conta.data) - new Date()) / (1000 * 60 * 60 * 24),
  );
  const isOverdue = daysUntilDue < 0;
  const isUrgent = daysUntilDue >= 0 && daysUntilDue <= 3;

  return (
    <>
      <div
        className="grid grid-cols-12 gap-2 px-5 py-3.5 border-b border-white/5 hover:bg-white/2 transition-colors items-center cursor-pointer"
        onClick={onToggle}
      >
        <div className="col-span-1">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        <div className="col-span-3 text-sm text-white font-medium">
          <div className="truncate">{conta.titulo}</div>
          {conta.origem && (
            <div className="text-xs text-slate-500 truncate mt-0.5">
              {conta.origem}
            </div>
          )}
        </div>
        <div className="col-span-2 text-xs text-slate-400 truncate">
          {conta.empresa?.nome}
        </div>
        <div className="col-span-2 text-right">
          <p className="text-sm font-semibold text-red-400">
            {formatCurrency(conta.valor)}
          </p>
        </div>
        <div className="col-span-2 text-center">
          <p
            className={`text-xs font-medium ${
              isOverdue
                ? "text-red-400"
                : isUrgent
                  ? "text-yellow-400"
                  : "text-slate-400"
            }`}
          >
            {isOverdue
              ? `Atrasado ${Math.abs(daysUntilDue)}d`
              : `${daysUntilDue}d`}
          </p>
        </div>
        <div className="col-span-2 text-center">
          <Badge status={conta.status} />
        </div>
      </div>

      {isExpanded && (
        <div className="px-5 py-4 border-b border-white/5 bg-white/2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {conta.descricao && (
              <div className="col-span-2">
                <p className="text-xs text-slate-500 mb-1">Descrição</p>
                <p className="text-sm text-slate-300">{conta.descricao}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-slate-500 mb-1">Prioridade</p>
              <p
                className={`text-sm font-medium ${
                  conta.prioridade === "ALTA"
                    ? "text-red-400"
                    : conta.prioridade === "MEDIA"
                      ? "text-yellow-400"
                      : "text-blue-400"
                }`}
              >
                {conta.prioridade}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Vencimento</p>
              <p className="text-sm text-white">{formatDate(conta.data)}</p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <button
                onClick={() => onViewDetails(conta)}
                className="btn-primary w-full text-xs inline-flex items-center justify-center gap-1.5"
              >
                <Eye size={13} /> Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ContasPagarPage() {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [dataInicio, setDataInicio] = useState(
    today.toISOString().slice(0, 10),
  );
  const [dataFim, setDataFim] = useState(nextMonth.toISOString().slice(0, 10));
  const [empresaFiltro, setEmpresaFiltro] = useState("");
  const [prioridadeFiltro, setPrioridadeFiltro] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [viewDetails, setViewDetails] = useState(null);

  const { data: empresas = [] } = useEmpresas();
  const qc = useQueryClient();

  const { data: contas = [], isLoading } = useQuery({
    queryKey: [
      "agenda",
      "pagar",
      dataInicio,
      dataFim,
      empresaFiltro,
      prioridadeFiltro,
    ],
    queryFn: () =>
      agendaApi
        .listar({
          dataInicio,
          dataFim,
          tipo: "PAGAR",
          ...(empresaFiltro && { empresaId: empresaFiltro }),
          ...(prioridadeFiltro && { prioridade: prioridadeFiltro }),
        })
        .then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => agendaApi.remover(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda"] });
    },
  });

  const stats = useMemo(() => {
    const total = contas.reduce((s, c) => s + Number(c.valor), 0);
    const hoje = new Date().toISOString().split("T")[0];
    const atrasadas = contas.filter(
      (c) => c.data < hoje && c.status !== "REALIZADO",
    );
    const atrasadosTotal = atrasadas.reduce((s, c) => s + Number(c.valor), 0);
    const prevists = contas.filter((c) => c.status === "PREVISTO");
    const urgentes = contas.filter((c) => {
      const daysLeft = Math.ceil(
        (new Date(c.data) - new Date()) / (1000 * 60 * 60 * 24),
      );
      return daysLeft >= 0 && daysLeft <= 3 && c.status !== "REALIZADO";
    });

    return {
      total,
      atrasadosTotal,
      atrasadosCount: atrasadas.length,
      urgentesCount: urgentes.length,
      previstoCount: prevists.length,
      realizadoCount: contas.filter((c) => c.status === "REALIZADO").length,
    };
  }, [contas]);

  const categorizedContas = useMemo(() => {
    const hoje = new Date().toISOString().split("T")[0];
    return {
      atrasadas: contas.filter(
        (c) => c.data < hoje && c.status !== "REALIZADO",
      ),
      urgentes: contas.filter((c) => {
        const daysLeft = Math.ceil(
          (new Date(c.data) - new Date()) / (1000 * 60 * 60 * 24),
        );
        return (
          daysLeft >= 0 &&
          daysLeft <= 3 &&
          c.status !== "REALIZADO" &&
          c.data >= hoje
        );
      }),
      proximos: contas.filter((c) => {
        const daysLeft = Math.ceil(
          (new Date(c.data) - new Date()) / (1000 * 60 * 60 * 24),
        );
        return daysLeft > 3 && c.status !== "REALIZADO" && c.data >= hoje;
      }),
      realizadas: contas.filter((c) => c.status === "REALIZADO"),
    };
  }, [contas]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Contas a Pagar</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Gestão de contas pendentes com priorização e vencimentos
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass card-shadow rounded-2xl p-4 border border-red-500/20">
          <p className="text-xs text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <AlertCircle size={12} /> Total a Pagar
          </p>
          <p className="text-xl font-bold text-red-400">
            {formatCurrency(stats.total)}
          </p>
        </div>

        <div className="glass card-shadow rounded-2xl p-4 border border-orange-500/20">
          <p className="text-xs text-orange-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <AlertCircle size={12} /> Atrasadas
          </p>
          <div>
            <p className="text-xl font-bold text-orange-400">
              {stats.atrasadosCount}
            </p>
            <p className="text-xs text-orange-300 mt-1">
              {formatCurrency(stats.atrasadosTotal)}
            </p>
          </div>
        </div>

        <div className="glass card-shadow rounded-2xl p-4 border border-yellow-500/20">
          <p className="text-xs text-yellow-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Clock size={12} /> Urgentes
          </p>
          <p className="text-xl font-bold text-yellow-400">
            {stats.urgentesCount}
          </p>
        </div>

        <div className="glass card-shadow rounded-2xl p-4 border border-blue-500/20">
          <p className="text-xs text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Calendar size={12} /> Próximos
          </p>
          <p className="text-xl font-bold text-blue-400">
            {categorizedContas.proximos.length}
          </p>
        </div>

        <div className="glass card-shadow rounded-2xl p-4 border border-emerald-500/20">
          <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <CheckCircle size={12} /> Realizadas
          </p>
          <p className="text-xl font-bold text-emerald-400">
            {stats.realizadoCount}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter size={14} className="text-slate-400" />
        <input
          type="date"
          value={dataInicio}
          onChange={(e) => setDataInicio(e.target.value)}
          className="input-base"
          style={{ width: 140 }}
        />
        <span className="text-slate-500 text-sm">até</span>
        <input
          type="date"
          value={dataFim}
          onChange={(e) => setDataFim(e.target.value)}
          className="input-base"
          style={{ width: 140 }}
        />
        <div className="min-w-40">
          <Select
            value={empresaFiltro}
            onChange={(e) => setEmpresaFiltro(e.target.value)}
            options={empresas.map((emp) => ({
              value: emp.id,
              label: emp.nome,
            }))}
            placeholder="Todas as empresas"
          />
        </div>
        <div className="min-w-40">
          <Select
            value={prioridadeFiltro}
            onChange={(e) => setPrioridadeFiltro(e.target.value)}
            options={[
              { value: "ALTA", label: "Prioridade Alta" },
              { value: "MEDIA", label: "Prioridade Média" },
              { value: "BAIXA", label: "Prioridade Baixa" },
            ]}
            placeholder="Todas as prioridades"
          />
        </div>
      </div>

      {/* Tabs/Sections */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">
          Carregando contas...
        </div>
      ) : contas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <DollarSign size={32} className="mb-2 opacity-40" />
          <p className="text-sm">Nenhuma conta encontrada para este período.</p>
        </div>
      ) : (
        <>
          {/* Atrasadas */}
          {categorizedContas.atrasadas.length > 0 && (
            <div className="glass card-shadow rounded-2xl overflow-hidden border-l-4 border-l-red-500">
              <div className="px-5 py-3 border-b border-white/5 bg-red-500/10">
                <h2 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                  <AlertCircle size={16} />
                  Atrasadas ({categorizedContas.atrasadas.length})
                </h2>
              </div>
              <div className="divide-y divide-white/5">
                {categorizedContas.atrasadas.map((conta) => (
                  <ContaRow
                    key={conta.id}
                    conta={conta}
                    onViewDetails={setViewDetails}
                    isExpanded={expandedId === conta.id}
                    onToggle={() =>
                      setExpandedId(expandedId === conta.id ? null : conta.id)
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Urgentes */}
          {categorizedContas.urgentes.length > 0 && (
            <div className="glass card-shadow rounded-2xl overflow-hidden border-l-4 border-l-yellow-500">
              <div className="px-5 py-3 border-b border-white/5 bg-yellow-500/10">
                <h2 className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
                  <Clock size={16} />
                  Vencimento Próximo ({categorizedContas.urgentes.length})
                </h2>
              </div>
              <div className="divide-y divide-white/5">
                {categorizedContas.urgentes.map((conta) => (
                  <ContaRow
                    key={conta.id}
                    conta={conta}
                    onViewDetails={setViewDetails}
                    isExpanded={expandedId === conta.id}
                    onToggle={() =>
                      setExpandedId(expandedId === conta.id ? null : conta.id)
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Próximos */}
          {categorizedContas.proximos.length > 0 && (
            <div className="glass card-shadow rounded-2xl overflow-hidden border-l-4 border-l-blue-500">
              <div className="px-5 py-3 border-b border-white/5 bg-blue-500/10">
                <h2 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                  <Calendar size={16} />
                  Próximos Vencimentos ({categorizedContas.proximos.length})
                </h2>
              </div>
              <div className="divide-y divide-white/5">
                {categorizedContas.proximos.map((conta) => (
                  <ContaRow
                    key={conta.id}
                    conta={conta}
                    onViewDetails={setViewDetails}
                    isExpanded={expandedId === conta.id}
                    onToggle={() =>
                      setExpandedId(expandedId === conta.id ? null : conta.id)
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Realizadas */}
          {categorizedContas.realizadas.length > 0 && (
            <div className="glass card-shadow rounded-2xl overflow-hidden border-l-4 border-l-emerald-500">
              <div className="px-5 py-3 border-b border-white/5 bg-emerald-500/10">
                <h2 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                  <CheckCircle size={16} />
                  Realizadas ({categorizedContas.realizadas.length})
                </h2>
              </div>
              <div className="divide-y divide-white/5">
                {categorizedContas.realizadas.map((conta) => (
                  <ContaRow
                    key={conta.id}
                    conta={conta}
                    onViewDetails={setViewDetails}
                    isExpanded={expandedId === conta.id}
                    onToggle={() =>
                      setExpandedId(expandedId === conta.id ? null : conta.id)
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {viewDetails && (
        <ContaDetailModal
          conta={viewDetails}
          onClose={() => setViewDetails(null)}
          onBaixa={() => {}}
          onEdit={() => {}}
          onDelete={(id) => {
            deleteMutation.mutate(id);
            setViewDetails(null);
          }}
        />
      )}
    </div>
  );
}
