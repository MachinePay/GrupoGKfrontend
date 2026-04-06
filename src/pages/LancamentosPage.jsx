import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import MovimentacaoForm from "../components/forms/MovimentacaoForm.jsx";
import {
  useContas,
  useEmpresas,
  useMovimentacoes,
} from "../hooks/useFinanceiro.js";
import { movimentacoesApi } from "../services/api.js";
import { formatCurrency, formatDate } from "../lib/utils.js";
import { Input, Select } from "../components/ui/FormField.jsx";

const CATEGORIAS = [
  { value: "PEDIDO", label: "Pedido" },
  { value: "COMISSAO", label: "Comissao" },
  { value: "RECOLHE_LOJAS", label: "Recolhe Lojas" },
  { value: "BOLETO", label: "Boleto" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "AJUSTE_SALDO", label: "Ajuste de Saldo" },
  { value: "FORNECEDOR", label: "Fornecedor" },
  { value: "CUSTO_FIXO", label: "Custo Fixo" },
  { value: "CUSTO_VARIAVEL", label: "Custo Variavel" },
  { value: "INVESTIMENTO", label: "Investimento" },
  { value: "PREJUIZO", label: "Prejuizo" },
];

const TIPOS = [
  { value: "ENTRADA", label: "Entrada" },
  { value: "SAIDA", label: "Saida" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
];

const STATUS = [
  { value: "PREVISTO", label: "Previsto" },
  { value: "REALIZADO", label: "Realizado" },
];

const TIPOS_DESPESA = [
  { value: "DESPESAS_ADMINISTRATIVAS", label: "Despesas Administrativas" },
  { value: "RETIRADA_SOCIOS", label: "Retirada de Socios" },
  { value: "FOLHA_PAGAMENTO", label: "Folha de Pagamento" },
  { value: "DESPESAS_DIVERSAS", label: "Despesas Diversas" },
  { value: "GASOLINA", label: "Gasolina" },
  { value: "MATERIAL_ESCRITORIO", label: "Material Escritorio" },
  {
    value: "MATERIAL_ESTOQUE_EMBALAGENS",
    label: "Material Estoque/Embalagens",
  },
  { value: "CUSTOS_OPERACIONAIS", label: "Custos Operacionais" },
];

const INITIAL_FILTERS = {
  empresaId: "",
  contaId: "",
  categoria: "",
  tipoDespesa: "",
  tipo: "",
  status: "",
  canalOrigem: "",
  centroOperacao: "",
  referencia: "",
  dataInicio: "",
  dataFim: "",
  page: 1,
  limit: 20,
};

function cleanFilters(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(
      ([, value]) => value !== "" && value != null,
    ),
  );
}

function resolveContaLabel(item) {
  if (item.tipo === "ENTRADA") {
    return item.contaDestino
      ? `${item.contaDestino.banco} - ${item.contaDestino.nome}`
      : "-";
  }

  if (item.tipo === "SAIDA") {
    return item.contaOrigem
      ? `${item.contaOrigem.banco} - ${item.contaOrigem.nome}`
      : "-";
  }

  const origem = item.contaOrigem
    ? `${item.contaOrigem.banco} - ${item.contaOrigem.nome}`
    : "-";
  const destino = item.contaDestino
    ? `${item.contaDestino.banco} - ${item.contaDestino.nome}`
    : "-";
  return `${origem} -> ${destino}`;
}

export default function LancamentosPage() {
  const qc = useQueryClient();
  const [draftFilters, setDraftFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);

  const { data: empresas = [] } = useEmpresas();
  const { data: contas = [] } = useContas(draftFilters.empresaId || undefined);

  const queryParams = useMemo(
    () => cleanFilters(appliedFilters),
    [appliedFilters],
  );

  const {
    data: historico,
    isLoading,
    isError,
    error,
  } = useMovimentacoes(queryParams);

  const items = historico?.items ?? [];
  const pagination = historico?.pagination;

  const deleteMutation = useMutation({
    mutationFn: (id) => movimentacoesApi.remover(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movimentacoes"] });
      qc.invalidateQueries({ queryKey: ["agenda"] });
    },
  });

  function setFilter(field) {
    return (e) => {
      const next = e.target.value;
      setDraftFilters((prev) => ({
        ...prev,
        [field]: next,
        ...(field === "empresaId" ? { contaId: "" } : {}),
      }));
    };
  }

  function applyFilters(e) {
    e.preventDefault();
    setAppliedFilters((prev) => ({
      ...prev,
      ...draftFilters,
      page: 1,
    }));
  }

  function clearFilters() {
    setDraftFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
  }

  function changePage(nextPage) {
    setAppliedFilters((prev) => ({ ...prev, page: nextPage }));
  }

  function handleDelete(item) {
    const ok = window.confirm(
      `Excluir lançamento previsto de ${formatCurrency(item.valor)} em ${formatDate(item.data)}?`,
    );

    if (!ok) {
      return;
    }

    deleteMutation.mutate(item.id);
  }

  return (
    <div className="mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Lançamentos</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Registre entradas, saídas e transferências e consulte o histórico com
          filtros.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6 items-start">
        <MovimentacaoForm />

        <section className="glass card-shadow rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-white">
              Histórico de Movimentações
            </h2>
            <span className="text-xs text-slate-400">
              {pagination?.total ?? 0} registro(s)
            </span>
          </div>

          <form onSubmit={applyFilters} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <Select
                label="Empresa"
                value={draftFilters.empresaId}
                onChange={setFilter("empresaId")}
                options={empresas.map((e) => ({ value: e.id, label: e.nome }))}
                placeholder="Todas"
              />
              <Select
                label="Conta"
                value={draftFilters.contaId}
                onChange={setFilter("contaId")}
                options={contas.map((c) => ({
                  value: c.id,
                  label: `${c.banco} - ${c.nome}`,
                }))}
                placeholder="Todas"
              />
              <Select
                label="Categoria"
                value={draftFilters.categoria}
                onChange={setFilter("categoria")}
                options={CATEGORIAS}
                placeholder="Todas"
              />
              <Select
                label="Tipo de Despesa"
                value={draftFilters.tipoDespesa}
                onChange={setFilter("tipoDespesa")}
                options={TIPOS_DESPESA}
                placeholder="Todos"
              />
              <Select
                label="Tipo"
                value={draftFilters.tipo}
                onChange={setFilter("tipo")}
                options={TIPOS}
                placeholder="Todos"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <Select
                label="Status"
                value={draftFilters.status}
                onChange={setFilter("status")}
                options={STATUS}
                placeholder="Todos"
              />
              <Input
                label="Canal / Origem"
                placeholder="Marketplace, Loja, ERP..."
                value={draftFilters.canalOrigem}
                onChange={setFilter("canalOrigem")}
              />
              <Input
                label="Centro de Operacao"
                placeholder="Matriz, Quiosque, Operacao..."
                value={draftFilters.centroOperacao}
                onChange={setFilter("centroOperacao")}
              />
              <Input
                label="Referência"
                placeholder="Pedido, boleto, comissão..."
                value={draftFilters.referencia}
                onChange={setFilter("referencia")}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <Input
                label="Data inicial"
                type="date"
                value={draftFilters.dataInicio}
                onChange={setFilter("dataInicio")}
              />
              <Input
                label="Data final"
                type="date"
                value={draftFilters.dataFim}
                onChange={setFilter("dataFim")}
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={clearFilters}
                className="btn-ghost"
              >
                Limpar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading}
              >
                Filtrar
              </button>
            </div>
          </form>

          {isError && (
            <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-2">
              {error?.response?.data?.message ??
                "Erro ao consultar movimentações."}
            </p>
          )}

          {deleteMutation.isError && (
            <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-2">
              {deleteMutation.error?.response?.data?.message ??
                "Erro ao excluir movimentação."}
            </p>
          )}

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-230 text-sm">
              <thead className="bg-slate-900/60 text-slate-400">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Data</th>
                  <th className="px-3 py-2 text-left font-medium">Empresa</th>
                  <th className="px-3 py-2 text-left font-medium">Tipo</th>
                  <th className="px-3 py-2 text-left font-medium">Categoria</th>
                  <th className="px-3 py-2 text-left font-medium">
                    Tipo Despesa
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Canal</th>
                  <th className="px-3 py-2 text-left font-medium">Centro</th>
                  <th className="px-3 py-2 text-left font-medium">Conta</th>
                  <th className="px-3 py-2 text-left font-medium">
                    Referência
                  </th>
                  <th className="px-3 py-2 text-right font-medium">Valor</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-3 py-8 text-center text-slate-500"
                    >
                      Carregando histórico...
                    </td>
                  </tr>
                )}

                {!isLoading && items.length === 0 && (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-3 py-8 text-center text-slate-500"
                    >
                      Nenhuma movimentação encontrada para os filtros aplicados.
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-white/5 text-slate-200"
                    >
                      <td className="px-3 py-2">{formatDate(item.data)}</td>
                      <td className="px-3 py-2">{item.empresa?.nome ?? "-"}</td>
                      <td className="px-3 py-2">{item.tipo}</td>
                      <td className="px-3 py-2">{item.categoria ?? "-"}</td>
                      <td className="px-3 py-2">{item.tipoDespesa ?? "-"}</td>
                      <td className="px-3 py-2">{item.canalOrigem ?? "-"}</td>
                      <td className="px-3 py-2">
                        {item.centroOperacao ?? "-"}
                      </td>
                      <td className="px-3 py-2">{resolveContaLabel(item)}</td>
                      <td className="px-3 py-2">{item.referencia ?? "-"}</td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {formatCurrency(item.valor)}
                      </td>
                      <td className="px-3 py-2">{item.status}</td>
                      <td className="px-3 py-2 text-right">
                        {item.status === "PREVISTO" ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            disabled={deleteMutation.isPending}
                            className="btn-ghost text-red-400 hover:text-red-300"
                          >
                            Excluir
                          </button>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-slate-400">
              Página {pagination?.page ?? 1} de {pagination?.totalPages ?? 1}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-ghost"
                disabled={!pagination?.hasPrevPage}
                onClick={() => changePage((pagination?.page ?? 1) - 1)}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn-ghost"
                disabled={!pagination?.hasNextPage}
                onClick={() => changePage((pagination?.page ?? 1) + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
