import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useEmpresasIntegradas,
  usePendenciasIntegracao,
} from "../hooks/useIntegracao.js";
import { useContas } from "../hooks/useFinanceiro.js";
import { integracaoApi, logisticsApi } from "../services/api.js";
import { formatCurrency, formatDate } from "../lib/utils.js";
import { Input, Select } from "../components/ui/FormField.jsx";
import Badge from "../components/ui/Badge.jsx";

const CATEGORIAS_AJUSTE = [
  { value: "CUSTO_FIXO", label: "Custo Fixo" },
  { value: "CUSTO_VARIAVEL", label: "Custo Variavel" },
  { value: "FORNECEDOR", label: "Fornecedor" },
];

const TIPOS_DESPESA_AJUSTE = [
  { value: "DESPESAS_ADMINISTRATIVAS", label: "Despesas Administrativas" },
  { value: "RETIRADA_SOCIOS", label: "Retirada de Socios" },
  { value: "FOLHA_PAGAMENTO", label: "Folha de Pagamento" },
  { value: "DESPESAS_DIVERSAS", label: "Despesas Diversas" },
  { value: "CUSTOS_OPERACIONAIS", label: "Custos Operacionais" },
];

const FILTROS_SENTIDO = [
  { value: "TODOS", label: "Todos" },
  { value: "GASTOS", label: "Gastos (Negativo)" },
  { value: "ENTRADAS", label: "Entradas (Positivo)" },
];

function getValorAssinado(item) {
  const valor = parseFloat(item?.valor || 0);

  if (item?.tipo === "PAGAR") {
    return -Math.abs(valor);
  }

  if (item?.tipo === "RECEBER") {
    return Math.abs(valor);
  }

  return valor;
}

function getSentidoItem(item) {
  if (item?.tipo === "PAGAR") return "GASTOS";
  if (item?.tipo === "RECEBER") return "ENTRADAS";
  return "TODOS";
}

function isItemFechamentoMensal(item) {
  return String(item?.referenciaExternaId || "").startsWith("fechamento:");
}

function extrairLojaItem(item) {
  const descricao = String(item?.descricao || "");
  const matchLojaDescricao = descricao.match(/(?:^|\|)\s*Loja:\s*([^|]+)/i);
  if (matchLojaDescricao?.[1]) {
    return matchLojaDescricao[1].trim();
  }

  const titulo = String(item?.titulo || "");
  const partes = titulo.split(" - ");
  if (partes.length > 1) {
    return partes[partes.length - 1].trim();
  }

  return "Sem loja";
}

function buildFormState(item) {
  return {
    contaId: "",
    valorAjustado: item ? String(item.valor ?? "") : "",
    categoriaAjustada: "CUSTO_FIXO",
    tipoDespesaAjustada: "CUSTOS_OPERACIONAIS",
  };
}

function getCurrentReferenceMonth() {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default function ConciliacaoPage() {
  const qc = useQueryClient();
  const [selectedEmpresaId, setSelectedEmpresaId] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [modalState, setModalState] = useState({
    item: null,
    mode: "confirmar",
  });
  const [filtroSentido, setFiltroSentido] = useState("TODOS");
  const [filtroLoja, setFiltroLoja] = useState("TODAS");
  const [referenceMonth, setReferenceMonth] = useState(
    getCurrentReferenceMonth,
  );
  const [fechamentoForm, setFechamentoForm] = useState({
    custoGeralAtivo: "0",
    receitaVinculada: "0",
    lucroLiquido: "0",
    lucroBruto: "0",
    custosAplicadosPreAprovados: "0",
  });
  const [form, setForm] = useState(() => buildFormState(null));

  const { data: empresasIntegradasData = {} } = useEmpresasIntegradas();
  const empresasIntegradas = useMemo(
    () => empresasIntegradasData?.empresas ?? [],
    [empresasIntegradasData],
  );
  const selectedEmpresaIdResolved = useMemo(() => {
    if (!empresasIntegradas.length) return "";

    const selectedIsValid = empresasIntegradas.some(
      (empresa) => String(empresa.id) === String(selectedEmpresaId),
    );

    if (selectedEmpresaId && selectedIsValid) {
      return String(selectedEmpresaId);
    }

    return String(empresasIntegradas[0].id);
  }, [empresasIntegradas, selectedEmpresaId]);

  const empresaSelecionada = useMemo(
    () =>
      empresasIntegradas.find(
        (empresa) => String(empresa.id) === String(selectedEmpresaIdResolved),
      ) ?? null,
    [empresasIntegradas, selectedEmpresaIdResolved],
  );

  const isMaisQuiosqueSelecionada =
    empresaSelecionada?.nome?.toLowerCase() === "maisquiosque";

  const origemSelecionadaLabel =
    empresaSelecionada?.integracaoLabel || "Integração";

  const { data: contas = [] } = useContas(
    selectedEmpresaIdResolved || undefined,
  );
  const { data: pendenciasData = {} } = usePendenciasIntegracao(
    selectedEmpresaIdResolved ? Number(selectedEmpresaIdResolved) : null,
  );

  const pendencias = useMemo(
    () => (pendenciasData?.dados ?? []).filter(isItemFechamentoMensal),
    [pendenciasData],
  );

  const { data: fechamentosData = [], isLoading: fechamentosLoading } =
    useQuery({
      queryKey: ["logistics", "fechamentos", referenceMonth],
      queryFn: () =>
        logisticsApi
          .listarFechamentos(referenceMonth ? { referenceMonth } : undefined)
          .then((response) => response.data?.data ?? []),
      enabled: isMaisQuiosqueSelecionada && !!referenceMonth,
    });

  const fechamentoMutation = useMutation({
    mutationFn: (payload) => logisticsApi.salvarFechamento(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["logistics", "fechamentos"] });
    },
  });

  const fechamentoSelecionado = useMemo(() => {
    if (!Array.isArray(fechamentosData)) return null;

    const sorted = [...fechamentosData].sort((a, b) =>
      String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")),
    );

    return sorted[0] || null;
  }, [fechamentosData]);

  const opcoesLoja = useMemo(() => {
    const lojas = Array.from(
      new Set(pendencias.map((item) => extrairLojaItem(item)).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));

    return [
      { value: "TODAS", label: "Todas" },
      ...lojas.map((loja) => ({ value: loja, label: loja })),
    ];
  }, [pendencias]);

  const pendenciasFiltradas = useMemo(() => {
    let resultado = pendencias;

    if (filtroSentido !== "TODOS") {
      resultado = resultado.filter(
        (item) => getSentidoItem(item) === filtroSentido,
      );
    }

    if (filtroLoja !== "TODAS") {
      resultado = resultado.filter(
        (item) => extrairLojaItem(item) === filtroLoja,
      );
    }

    return resultado;
  }, [filtroLoja, filtroSentido, pendencias]);

  // Mutations
  const approveMutation = useMutation({
    mutationFn: ({ agendaId, payload }) =>
      integracaoApi.aprovarPendencia(agendaId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendencias-integracao"] });
      setModalState({ item: null, mode: "confirmar" });
      setForm(buildFormState(null));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ agendaId, motivo }) =>
      integracaoApi.rejeitarPendencia(agendaId, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendencias-integracao"] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () =>
      integracaoApi.syncIntegracao(empresaSelecionada?.integracao, {
        empresaId: Number(selectedEmpresaIdResolved),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pendencias-integracao"] });
      qc.invalidateQueries({ queryKey: ["integracao", "empresas-integradas"] });
    },
  });

  // Handlers
  function handleSync() {
    if (!selectedEmpresaIdResolved) return;
    syncMutation.mutate();
  }

  function abrirModal(item, mode) {
    setModalState({ item, mode });
    setForm(buildFormState(item));
  }

  function fecharModal() {
    setModalState({ item: null, mode: "confirmar" });
    setForm(buildFormState(null));
  }

  function handleApprove() {
    if (!modalState.item) {
      return;
    }

    if (modalState.item.permiteAprovacaoFinanceira && !form.contaId) {
      alert("Selecione uma conta bancária para vincular");
      return;
    }

    approveMutation.mutate({
      agendaId: modalState.item.id,
      payload: {
        contaId: form.contaId ? Number(form.contaId) : undefined,
        valorAjustado:
          modalState.mode === "ajustar" && form.valorAjustado
            ? Number(form.valorAjustado)
            : undefined,
        categoriaAjustada:
          modalState.mode === "ajustar" ? form.categoriaAjustada : undefined,
        tipoDespesaAjustada:
          modalState.mode === "ajustar" ? form.tipoDespesaAjustada : undefined,
      },
    });
  }

  function handleReject(agendaId) {
    const motivo = prompt("Qual o motivo da rejeição?");
    if (motivo) {
      rejectMutation.mutate({ agendaId, motivo });
    }
  }

  function handleSalvarFechamento() {
    if (!referenceMonth) {
      alert("Selecione o mês de referência (YYYY-MM).");
      return;
    }

    fechamentoMutation.mutate({
      referenceMonth,
      custoGeralAtivo: toNumber(fechamentoForm.custoGeralAtivo),
      receitaVinculada: toNumber(fechamentoForm.receitaVinculada),
      lucroLiquido: toNumber(fechamentoForm.lucroLiquido),
      lucroBruto: toNumber(fechamentoForm.lucroBruto),
      custosAplicadosPreAprovados: toNumber(
        fechamentoForm.custosAplicadosPreAprovados,
      ),
    });
  }

  const valorTotalPendente = useMemo(
    () => pendenciasFiltradas.reduce((sum, p) => sum + getValorAssinado(p), 0),
    [pendenciasFiltradas],
  );

  const syncResultado = syncMutation.data?.data;
  const syncDetalhes = Array.isArray(syncResultado?.detalhes)
    ? syncResultado.detalhes
    : [];
  const syncAvisos = syncDetalhes.filter((item) => item?.status === "aviso");
  const syncSincronizados = Number(syncResultado?.sincronizados || 0);
  const syncTemSomenteAviso =
    syncMutation.isSuccess && syncSincronizados === 0 && syncAvisos.length > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Conciliação de Gastos</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Itens importados automaticamente da integração selecionada aguardando
          sua conferência e aprovação para entrar no fluxo de caixa.
        </p>
      </div>

      {/* Legenda */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-200">
          <span className="font-semibold">Informação:</span> Itens marcados com{" "}
          <Badge
            label={`VIA ${origemSelecionadaLabel.toUpperCase()}`}
            variant="agarramais"
          />{" "}
          são automáticos e precisam de sua conferência antes de entrarem no
          sistema financeiro.
        </p>
      </div>

      {/* Controls */}
      <div className="glass card-shadow rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Empresa"
            value={selectedEmpresaIdResolved}
            onChange={(e) => setSelectedEmpresaId(e.target.value)}
            options={empresasIntegradas.map((e) => ({
              value: String(e.id),
              label: e.nome,
            }))}
            placeholder={
              empresasIntegradas.length
                ? "Selecione uma empresa"
                : "Nenhuma integração ativa"
            }
          />

          <button
            onClick={handleSync}
            disabled={
              !selectedEmpresaIdResolved ||
              !empresaSelecionada?.integracao ||
              !empresaSelecionada?.syncDisponivel ||
              !empresasIntegradas.length ||
              syncMutation.isPending
            }
            className="btn-primary mt-6"
          >
            {!empresaSelecionada?.syncDisponivel
              ? "Sincronização indisponível"
              : syncMutation.isPending
                ? "Sincronizando..."
                : `Sincronizar ${origemSelecionadaLabel}`}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Filtro de Valor"
            value={filtroSentido}
            onChange={(e) => setFiltroSentido(e.target.value)}
            options={FILTROS_SENTIDO}
            placeholder="Todos"
          />
          <Select
            label="Loja"
            value={filtroLoja}
            onChange={(e) => setFiltroLoja(e.target.value)}
            options={opcoesLoja}
            placeholder="Todas"
          />
        </div>

        {syncMutation.isError && (
          <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-4 py-2">
            Erro na sincronização:{" "}
            {syncMutation.error?.response?.data?.message ||
              syncMutation.error?.message ||
              "falha ao sincronizar"}
          </p>
        )}

        {syncMutation.isSuccess && !syncTemSomenteAviso && (
          <p className="text-sm text-green-400 bg-green-500/10 rounded-lg px-4 py-2">
            Sincronização concluída ({syncSincronizados} item(ns) novo(s))
          </p>
        )}

        {syncTemSomenteAviso && (
          <p className="text-sm text-amber-300 bg-amber-500/10 rounded-lg px-4 py-2">
            Nenhum item novo foi sincronizado. Verifique os avisos de fechamento
            mensal abaixo.
          </p>
        )}

        {syncMutation.isSuccess && syncAvisos.length > 0 && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 space-y-1">
            <p className="text-sm font-medium text-amber-200">
              Avisos da integração
            </p>
            {syncAvisos.map((aviso, index) => (
              <p
                key={`${aviso.lojaId || aviso.lojaNome || "aviso"}-${index}`}
                className="text-xs text-amber-100"
              >
                - {aviso.mensagem}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {selectedEmpresaIdResolved && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass card-shadow rounded-2xl p-4">
            <p className="text-sm text-slate-400">Total Pendente</p>
            <p className="text-2xl font-bold text-white mt-1">
              {pendenciasFiltradas.length}
            </p>
            <p className="text-xs text-slate-500 mt-2">item(ns)</p>
          </div>

          <div className="glass card-shadow rounded-2xl p-4">
            <p className="text-sm text-slate-400">Valor Total</p>
            <p
              className={`text-2xl font-bold mt-1 ${
                valorTotalPendente > 0
                  ? "text-emerald-300"
                  : valorTotalPendente < 0
                    ? "text-red-300"
                    : "text-white"
              }`}
            >
              {formatCurrency(valorTotalPendente)}
            </p>
          </div>

          <div className="glass card-shadow rounded-2xl p-4">
            <p className="text-sm text-slate-400">Origem</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">
              {origemSelecionadaLabel}
            </p>
          </div>
        </div>
      )}

      {isMaisQuiosqueSelecionada && (
        <div className="glass card-shadow rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-white">
              Fechamento Mensal - MaisQuiosque
            </h2>
            {fechamentoSelecionado && (
              <p className="text-xs text-slate-400">
                Atualizado em {formatDate(fechamentoSelecionado.updatedAt)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Mês de Referência"
              type="month"
              value={referenceMonth}
              onChange={(e) => setReferenceMonth(e.target.value)}
            />
          </div>

          {fechamentosLoading && (
            <p className="text-sm text-slate-400">Carregando fechamento...</p>
          )}

          {!fechamentosLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              <Input
                label="Custo Geral Ativo"
                type="number"
                step="0.01"
                min="0"
                value={fechamentoForm.custoGeralAtivo}
                onChange={(e) =>
                  setFechamentoForm((prev) => ({
                    ...prev,
                    custoGeralAtivo: e.target.value,
                  }))
                }
              />
              <Input
                label="Receita Vinculada"
                type="number"
                step="0.01"
                min="0"
                value={fechamentoForm.receitaVinculada}
                onChange={(e) =>
                  setFechamentoForm((prev) => ({
                    ...prev,
                    receitaVinculada: e.target.value,
                  }))
                }
              />
              <Input
                label="Lucro Líquido"
                type="number"
                step="0.01"
                value={fechamentoForm.lucroLiquido}
                onChange={(e) =>
                  setFechamentoForm((prev) => ({
                    ...prev,
                    lucroLiquido: e.target.value,
                  }))
                }
              />
              <Input
                label="Lucro Bruto"
                type="number"
                step="0.01"
                value={fechamentoForm.lucroBruto}
                onChange={(e) =>
                  setFechamentoForm((prev) => ({
                    ...prev,
                    lucroBruto: e.target.value,
                  }))
                }
              />
              <Input
                label="Custos Aplicados Pré-Aprovados"
                type="number"
                step="0.01"
                min="0"
                value={fechamentoForm.custosAplicadosPreAprovados}
                onChange={(e) =>
                  setFechamentoForm((prev) => ({
                    ...prev,
                    custosAplicadosPreAprovados: e.target.value,
                  }))
                }
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSalvarFechamento}
              disabled={fechamentoMutation.isPending || !referenceMonth}
              className="btn-primary"
            >
              {fechamentoMutation.isPending
                ? "Salvando..."
                : "Salvar fechamento"}
            </button>
            <p className="text-xs text-slate-400">
              A rota utiliza upsert (cria/atualiza) para o mês informado.
            </p>
          </div>

          {fechamentoMutation.isError && (
            <p className="text-sm text-red-400 bg-red-500/10 rounded-lg px-4 py-2">
              Erro ao salvar fechamento:{" "}
              {fechamentoMutation.error?.response?.data?.message ||
                "falha ao salvar"}
            </p>
          )}

          {fechamentoMutation.isSuccess && (
            <p className="text-sm text-green-400 bg-green-500/10 rounded-lg px-4 py-2">
              Fechamento salvo com sucesso.
            </p>
          )}

          <div className="rounded-lg border border-white/10 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="px-3 py-2 text-left">Mês</th>
                  <th className="px-3 py-2 text-right">Custo Geral</th>
                  <th className="px-3 py-2 text-right">Receita</th>
                  <th className="px-3 py-2 text-right">Lucro Líquido</th>
                  <th className="px-3 py-2 text-right">Lucro Bruto</th>
                  <th className="px-3 py-2 text-right">Custos Pré-Aprov.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {(fechamentosData || []).length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-slate-400" colSpan={6}>
                      Nenhum fechamento encontrado para o mês selecionado.
                    </td>
                  </tr>
                ) : (
                  (fechamentosData || []).map((fechamento) => (
                    <tr key={fechamento.id} className="text-slate-200">
                      <td className="px-3 py-2">{fechamento.referenceMonth}</td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(fechamento.custoGeralAtivo)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(fechamento.receitaVinculada)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(fechamento.lucroLiquido)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(fechamento.lucroBruto)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(fechamento.custosAplicadosPreAprovados)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lista de Pendências */}
      <div className="glass card-shadow rounded-2xl p-5 space-y-3">
        <h2 className="text-base font-semibold text-white">
          Itens Pendentes ({pendenciasFiltradas.length})
        </h2>

        {!selectedEmpresaIdResolved && (
          <p className="text-sm text-slate-400 py-8 text-center">
            Selecione uma empresa para visualizar pendências
          </p>
        )}

        {selectedEmpresaIdResolved && pendenciasFiltradas.length === 0 && (
          <p className="text-sm text-slate-400 py-8 text-center">
            Nenhum item pendente. Clique em "Sincronizar{" "}
            {origemSelecionadaLabel}" para buscar novos dados.
          </p>
        )}

        {pendenciasFiltradas.length > 0 && (
          <div className="space-y-2">
            {pendenciasFiltradas.map((item) => (
              <div
                key={item.id}
                className="border border-white/10 rounded-lg p-4 space-y-3 hover:border-white/20 transition"
              >
                {/* Header do Item */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div>
                      <p className="font-medium text-white">{item.titulo}</p>
                      <p className="text-xs text-slate-400">
                        {item.empresa?.nome}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      label={`VIA ${origemSelecionadaLabel.toUpperCase()}`}
                      variant="agarramais"
                    />
                    <Badge
                      label={
                        item.classificacaoExterna === "RELATORIO"
                          ? "RELATORIO"
                          : item.classificacaoExterna === "ENTRADA_BRUTA"
                            ? "ENTRADA BRUTA"
                            : item.classificacaoExterna === "CUSTO_DASHBOARD"
                              ? "CUSTO DASHBOARD"
                              : "GASTO FIXO"
                      }
                      variant={
                        item.classificacaoExterna === "RELATORIO"
                          ? "relatorio"
                          : item.classificacaoExterna === "ENTRADA_BRUTA"
                            ? "agarramais"
                            : item.classificacaoExterna === "CUSTO_DASHBOARD"
                              ? "default"
                              : "default"
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(expandedId === item.id ? null : item.id)
                      }
                      className="text-slate-500 hover:text-slate-300 transition"
                    >
                      {expandedId === item.id ? "▼" : "▶"}
                    </button>
                  </div>
                </div>

                {/* Info do Item */}
                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Data</p>
                    <p className="font-medium text-white">
                      {formatDate(item.data)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Tipo</p>
                    <p className="font-medium text-white">
                      {item.classificacaoExterna}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Valor</p>
                    <p
                      className={`font-medium ${
                        item.tipo === "PAGAR"
                          ? "text-red-300"
                          : item.tipo === "RECEBER"
                            ? "text-emerald-300"
                            : "text-white"
                      }`}
                    >
                      {item.tipo === "PAGAR"
                        ? "- "
                        : item.tipo === "RECEBER"
                          ? "+ "
                          : ""}
                      {formatCurrency(item.valor)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Status</p>
                    <Badge status={item.status} />
                  </div>
                </div>

                {/* Detalhes */}
                {item.descricao && (
                  <p className="text-xs text-slate-400 border-t border-white/10 pt-3">
                    {item.descricao}
                  </p>
                )}

                {/* Expandido - Ações */}
                {expandedId === item.id && (
                  <div className="border-t border-white/10 pt-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {item.permiteAprovacaoFinanceira ? (
                        <>
                          <button
                            type="button"
                            onClick={() => abrirModal(item, "confirmar")}
                            disabled={approveMutation.isPending}
                            className="btn-primary"
                          >
                            Confirmar Gasto
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirModal(item, "ajustar")}
                            disabled={approveMutation.isPending}
                            className="btn-ghost"
                          >
                            Ajustar
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => abrirModal(item, "confirmar")}
                          disabled={approveMutation.isPending}
                          className="btn-primary"
                        >
                          Marcar Conferido
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleReject(item.id)}
                        disabled={rejectMutation.isPending}
                        className="btn-ghost text-red-400 hover:text-red-300"
                      >
                        Rejeitar
                      </button>
                    </div>

                    {(approveMutation.isError || rejectMutation.isError) && (
                      <p className="text-xs text-red-400">
                        Erro na operação. Tente novamente.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modalState.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-950 p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {modalState.mode === "ajustar"
                    ? "Ajustar pendência"
                    : modalState.item.permiteAprovacaoFinanceira
                      ? "Confirmar gasto"
                      : "Marcar relatório como conferido"}
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  {modalState.item.titulo}
                </p>
              </div>
              <button type="button" onClick={fecharModal} className="btn-ghost">
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Data"
                value={formatDate(modalState.item.data)}
                readOnly
              />
              <Input
                label="Valor original"
                value={formatCurrency(modalState.item.valor)}
                readOnly
              />
              {modalState.item.permiteAprovacaoFinanceira && (
                <Select
                  label="Conta bancária"
                  value={form.contaId}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, contaId: e.target.value }))
                  }
                  options={contas.map((c) => ({
                    value: c.id,
                    label: `${c.banco} - ${c.nome}`,
                  }))}
                  placeholder="Selecione a conta"
                />
              )}
              {modalState.mode === "ajustar" &&
                modalState.item.permiteAprovacaoFinanceira && (
                  <>
                    <Input
                      label="Valor ajustado"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.valorAjustado}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          valorAjustado: e.target.value,
                        }))
                      }
                    />
                    <Select
                      label="Categoria"
                      value={form.categoriaAjustada}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          categoriaAjustada: e.target.value,
                        }))
                      }
                      options={CATEGORIAS_AJUSTE}
                    />
                    <Select
                      label="Tipo de despesa"
                      value={form.tipoDespesaAjustada}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          tipoDespesaAjustada: e.target.value,
                        }))
                      }
                      options={TIPOS_DESPESA_AJUSTE}
                    />
                  </>
                )}
            </div>

            {modalState.item.descricao && (
              <p className="text-sm text-slate-400 rounded-xl border border-white/10 p-3">
                {modalState.item.descricao}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={fecharModal} className="btn-ghost">
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                className="btn-primary"
              >
                {approveMutation.isPending
                  ? "Salvando..."
                  : modalState.item.permiteAprovacaoFinanceira
                    ? "Confirmar"
                    : "Marcar conferido"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
