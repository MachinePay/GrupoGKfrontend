import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, PlusCircle } from "lucide-react";
import {
  useEmpresas,
  useContas,
  useProjetos,
} from "../../hooks/useFinanceiro.js";
import { movimentacoesApi, selfMachineApi } from "../../services/api.js";
import { Input, Select } from "../ui/FormField.jsx";

const TIPOS = [
  { value: "ENTRADA", label: "Entrada" },
  { value: "SAIDA", label: "Saída" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "AJUSTE_SALDO", label: "Ajuste de Saldo" },
];

const AJUSTE_SALDO_OPERACOES = [
  { value: "SOMAR", label: "Somar ao saldo" },
  { value: "SUBTRAIR", label: "Subtrair do saldo" },
];

const CATEGORIAS = [
  { value: "PEDIDO", label: "Pedido" },
  { value: "SISTEMA", label: "Sistema" },
  { value: "COMISSAO", label: "Comissão" },
  { value: "RECOLHE_LOJAS", label: "Recolhe Lojas" },
  { value: "BOLETO", label: "Boleto" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "AJUSTE_SALDO", label: "Ajuste de Saldo" },
  { value: "FORNECEDOR", label: "Fornecedor" },
  { value: "CUSTO_FIXO", label: "Custo Fixo" },
  { value: "CUSTO_VARIAVEL", label: "Custo Variável" },
  { value: "INVESTIMENTO", label: "Investimento" },
  { value: "PREJUIZO", label: "Prejuízo" },
];

const CATEGORIAS_ENTRADA = [
  { value: "PEDIDO", label: "Pedido" },
  { value: "SISTEMA", label: "Sistema" },
  { value: "COMISSAO", label: "Comissão" },
  { value: "RECOLHE_LOJAS", label: "Recolhe Lojas" },
  { value: "BOLETO", label: "Boleto" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "AJUSTE_SALDO", label: "Ajuste de Saldo" },
];

const CATEGORIAS_SAIDA = [
  { value: "SISTEMA", label: "Sistema" },
  { value: "FORNECEDOR", label: "Fornecedor" },
  { value: "CUSTO_FIXO", label: "Custo Fixo" },
  { value: "CUSTO_VARIAVEL", label: "Custo Variável" },
  { value: "INVESTIMENTO", label: "Investimento" },
  { value: "PREJUIZO", label: "Prejuízo" },
];

const TIPOS_DESPESA_CUSTO_FIXO = [
  { value: "DESPESAS_ADMINISTRATIVAS", label: "Despesas Administrativas" },
  { value: "RETIRADA_SOCIOS", label: "Retirada de Socios" },
  { value: "FOLHA_PAGAMENTO", label: "Folha de Pagamento" },
];

const TIPOS_DESPESA_CUSTO_VARIAVEL = [
  { value: "DESPESAS_DIVERSAS", label: "Despesas Diversas" },
  { value: "GASOLINA", label: "Gasolina" },
  { value: "MATERIAL_ESCRITORIO", label: "Material Escritorio" },
  {
    value: "MATERIAL_ESTOQUE_EMBALAGENS",
    label: "Material Estoque/Embalagens",
  },
  { value: "CUSTOS_OPERACIONAIS", label: "Custos Operacionais" },
];

const STATUS_OPTS = [
  { value: "REALIZADO", label: "Realizado" },
  { value: "PREVISTO", label: "Previsto" },
];

const TIPOS_SELFMACHINE = [
  { value: "MENSALIDADE", label: "Mensalidade" },
  { value: "PAGAMENTO", label: "Pagamento" },
];

const SUBCATEGORIAS_GIRAKIDS = [
  { value: "TAKE_PARCERIA", label: "TakeParceria" },
  { value: "PELUCIA_PARCERIA", label: "PelúciaParceria" },
  { value: "OUTROS", label: "Outros" },
];

const INITIAL = {
  data: "",
  empresaId: "",
  contaOrigemId: "",
  contaDestinoId: "",
  tipo: "ENTRADA",
  valor: "",
  categoria: "",
  tipoDespesa: "",
  canalOrigem: "",
  centroOperacao: "",
  referencia: "",
  status: "REALIZADO",
  projetoId: "",
  subcategoria: "",
  saasClienteId: "",
  saasLancamentoTipo: "",
  ajusteSaldoOperacao: "SOMAR",
};

export default function MovimentacaoForm({ onSuccess }) {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const qc = useQueryClient();

  const { data: empresas = [] } = useEmpresas();
  const empresaSelecionada = empresas.find(
    (e) => String(e.id) === String(form.empresaId),
  );
  const isMaisQuiosque = empresaSelecionada?.nome === "MaisQuiosque";
  const isGiraKids = empresaSelecionada?.nome === "GiraKids";
  const isSelfMachine =
    String(empresaSelecionada?.nome || "")
      .trim()
      .toLowerCase() === "selfmachine";

  const { data: contas = [] } = useContas(form.empresaId || undefined);
  const { data: projetos = [] } = useProjetos(
    isMaisQuiosque ? form.empresaId : undefined,
  );
  const { data: contratosSaas = [] } = useQuery({
    queryKey: ["selfmachine", "saas", "form"],
    queryFn: () => selfMachineApi.listar().then((res) => res.data),
    enabled: isSelfMachine,
  });
  const categoriaOptions =
    form.tipo === "AJUSTE_SALDO"
      ? [{ value: "AJUSTE_SALDO", label: "Ajuste de Saldo" }]
      : form.tipo === "ENTRADA"
        ? CATEGORIAS_ENTRADA
        : form.tipo === "SAIDA"
          ? CATEGORIAS_SAIDA
          : CATEGORIAS;
  const tipoDespesaOptions =
    form.categoria === "CUSTO_FIXO"
      ? TIPOS_DESPESA_CUSTO_FIXO
      : form.categoria === "CUSTO_VARIAVEL"
        ? TIPOS_DESPESA_CUSTO_VARIAVEL
        : [];

  const mutation = useMutation({
    mutationFn: (payload) => movimentacoesApi.criar(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard", "consolidado"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "contas"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "empresa"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "bancos"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "maisquiosque"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes"] });
      setSuccess(true);
      setForm(INITIAL);
      setTimeout(() => setSuccess(false), 3000);
      onSuccess?.();
    },
  });

  function set(field) {
    return (e) => {
      const nextValue = e.target.value;

      if (field === "empresaId") {
        const nextEmpresa = empresas.find(
          (item) => String(item.id) === String(nextValue),
        );
        const nextIsSelfMachine =
          String(nextEmpresa?.nome || "")
            .trim()
            .toLowerCase() === "selfmachine";

        setForm((prev) => ({
          ...prev,
          empresaId: nextValue,
          projetoId: "",
          subcategoria: "",
          saasClienteId: nextIsSelfMachine ? prev.saasClienteId : "",
          saasLancamentoTipo: nextIsSelfMachine ? prev.saasLancamentoTipo : "",
        }));

        setErrors((prev) => ({ ...prev, [field]: undefined }));
        return;
      }

      if (field === "tipo") {
        setForm((prev) => {
          if (nextValue === "AJUSTE_SALDO") {
            return {
              ...prev,
              tipo: nextValue,
              status: "REALIZADO",
              categoria: "AJUSTE_SALDO",
              tipoDespesa: "",
              contaOrigemId: "",
              ajusteSaldoOperacao: prev.ajusteSaldoOperacao || "SOMAR",
            };
          }

          return {
            ...prev,
            tipo: nextValue,
            categoria: prev.categoria === "AJUSTE_SALDO" ? "" : prev.categoria,
            ajusteSaldoOperacao: "SOMAR",
          };
        });

        setErrors((prev) => ({ ...prev, [field]: undefined }));
        return;
      }

      setForm((prev) => ({ ...prev, [field]: nextValue }));
      if (
        field === "categoria" &&
        nextValue !== "CUSTO_FIXO" &&
        nextValue !== "CUSTO_VARIAVEL"
      ) {
        setForm((prev) => ({ ...prev, tipoDespesa: "" }));
      }
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  function validate() {
    const e = {};
    if (!form.data) e.data = "Obrigatório";
    if (!form.empresaId) e.empresaId = "Obrigatório";
    if (!form.valor || Number(form.valor) <= 0)
      e.valor = "Deve ser maior que zero";
    if (!form.tipo) e.tipo = "Obrigatório";
    if (!form.status) e.status = "Obrigatório";
    if (form.tipo !== "TRANSFERENCIA" && !form.categoria)
      e.categoria = "Obrigatório";
    if (form.tipo === "AJUSTE_SALDO" && form.status !== "REALIZADO") {
      e.status = "Ajuste de saldo deve ser realizado";
    }
    if (form.tipo === "AJUSTE_SALDO" && !form.ajusteSaldoOperacao) {
      e.ajusteSaldoOperacao = "Obrigatório";
    }
    if (
      (form.categoria === "CUSTO_FIXO" ||
        form.categoria === "CUSTO_VARIAVEL") &&
      !form.tipoDespesa
    ) {
      e.tipoDespesa = "Obrigatório para custo";
    }
    if (isMaisQuiosque && form.tipo !== "AJUSTE_SALDO" && !form.projetoId)
      e.projetoId = "Obrigatório para MaisQuiosque";
    if (isGiraKids && form.tipo !== "AJUSTE_SALDO" && !form.subcategoria)
      e.subcategoria = "Obrigatório para GiraKids";
    if (isSelfMachine && form.saasClienteId && !form.saasLancamentoTipo)
      e.saasLancamentoTipo = "Selecione o tipo quando informar cliente SaaS";
    if (isSelfMachine && form.saasLancamentoTipo && !form.saasClienteId)
      e.saasClienteId = "Selecione cliente SaaS quando informar tipo";
    if (
      (form.tipo === "ENTRADA" || form.tipo === "AJUSTE_SALDO") &&
      !form.contaDestinoId
    )
      e.contaDestinoId = "Obrigatório";
    if (form.tipo === "SAIDA" && !form.contaOrigemId)
      e.contaOrigemId = "Obrigatório para Saída";
    if (form.tipo === "TRANSFERENCIA") {
      if (!form.contaOrigemId)
        e.contaOrigemId = "Obrigatório para Transferência";
      if (!form.contaDestinoId)
        e.contaDestinoId = "Obrigatório para Transferência";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    const payload = {
      data: form.data,
      empresaId: Number(form.empresaId),
      tipo: form.tipo,
      valor: form.valor,
      categoria:
        form.tipo === "AJUSTE_SALDO"
          ? "AJUSTE_SALDO"
          : form.categoria || undefined,
      tipoDespesa:
        form.tipo === "AJUSTE_SALDO"
          ? undefined
          : form.tipoDespesa || undefined,
      canalOrigem: form.canalOrigem || undefined,
      centroOperacao: form.centroOperacao || undefined,
      referencia: form.referencia || undefined,
      status: form.tipo === "AJUSTE_SALDO" ? "REALIZADO" : form.status,
      contaOrigemId: form.contaOrigemId
        ? Number(form.contaOrigemId)
        : undefined,
      contaDestinoId: form.contaDestinoId
        ? Number(form.contaDestinoId)
        : undefined,
      ajusteSaldoOperacao:
        form.tipo === "AJUSTE_SALDO" ? form.ajusteSaldoOperacao : undefined,
      projetoId: form.projetoId ? Number(form.projetoId) : undefined,
      subcategoria: form.subcategoria || undefined,
      saasClienteId: form.saasClienteId
        ? Number(form.saasClienteId)
        : undefined,
      saasLancamentoTipo: form.saasLancamentoTipo || undefined,
    };
    mutation.mutate(payload);
  }

  const contaOptions = contas.map((c) => ({
    value: c.id,
    label: `${c.banco} – ${c.nome}`,
  }));
  const projetoOptions = projetos.map((p) => ({ value: p.id, label: p.nome }));
  const contratosOptions = contratosSaas.map((item) => ({
    value: item.id,
    label: `${item.nomeCliente} - ${item.nomeSistema}`,
  }));

  return (
    <form
      onSubmit={handleSubmit}
      className="glass card-shadow rounded-2xl p-6 space-y-5"
    >
      <div className="flex items-center gap-2 mb-1">
        <PlusCircle size={18} className="text-blue-400" />
        <h2 className="text-base font-semibold text-white">Novo Lançamento</h2>
      </div>

      {/* linha 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Input
          label="Data"
          type="date"
          value={form.data}
          onChange={set("data")}
          error={errors.data}
        />
        <Select
          label="Empresa"
          value={form.empresaId}
          onChange={set("empresaId")}
          options={empresas.map((e) => ({ value: e.id, label: e.nome }))}
          placeholder="Selecione…"
          error={errors.empresaId}
        />
        <Select
          label="Tipo"
          value={form.tipo}
          onChange={set("tipo")}
          options={TIPOS}
          error={errors.tipo}
        />
      </div>

      {/* linha 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Input
          label="Valor (R$)"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          value={form.valor}
          onChange={set("valor")}
          error={errors.valor}
        />
        <Select
          label="Categoria"
          value={form.categoria}
          onChange={set("categoria")}
          options={categoriaOptions}
          placeholder="Selecione…"
          error={errors.categoria}
        />
        {form.tipo === "AJUSTE_SALDO" ? (
          <Select
            label="Operação do Ajuste"
            value={form.ajusteSaldoOperacao}
            onChange={set("ajusteSaldoOperacao")}
            options={AJUSTE_SALDO_OPERACOES}
            error={errors.ajusteSaldoOperacao}
          />
        ) : (
          <Select
            label="Status"
            value={form.status}
            onChange={set("status")}
            options={STATUS_OPTS}
            error={errors.status}
          />
        )}
      </div>

      {(form.categoria === "CUSTO_FIXO" ||
        form.categoria === "CUSTO_VARIAVEL") && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Tipo de Despesa"
            value={form.tipoDespesa}
            onChange={set("tipoDespesa")}
            options={tipoDespesaOptions}
            placeholder="Selecione…"
            error={errors.tipoDespesa}
          />
        </div>
      )}

      {/* Contas dependem do tipo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(form.tipo === "SAIDA" || form.tipo === "TRANSFERENCIA") && (
          <Select
            label="Conta Origem"
            value={form.contaOrigemId}
            onChange={set("contaOrigemId")}
            options={contaOptions}
            placeholder="Selecione conta…"
            error={errors.contaOrigemId}
          />
        )}
        {(form.tipo === "ENTRADA" ||
          form.tipo === "TRANSFERENCIA" ||
          form.tipo === "AJUSTE_SALDO") && (
          <Select
            label={
              form.tipo === "AJUSTE_SALDO" ? "Conta do Ajuste" : "Conta Destino"
            }
            value={form.contaDestinoId}
            onChange={set("contaDestinoId")}
            options={contaOptions}
            placeholder="Selecione conta…"
            error={errors.contaDestinoId}
          />
        )}
      </div>

      {/* Condicional MaisQuiosque */}
      {isMaisQuiosque && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-blue-500/25 bg-blue-500/5">
          <p className="col-span-full text-xs text-blue-300 font-medium">
            MaisQuiosque – Projeto obrigatório
          </p>
          <Select
            label="Projeto *"
            value={form.projetoId}
            onChange={set("projetoId")}
            options={projetoOptions}
            placeholder="Selecione projeto…"
            error={errors.projetoId}
          />
        </div>
      )}

      {/* Condicional GiraKids */}
      {isGiraKids && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-violet-500/25 bg-violet-500/5">
          <p className="col-span-full text-xs text-violet-300 font-medium">
            GiraKids – Subcategoria de Parceria
          </p>
          <Select
            label="Subcategoria"
            value={form.subcategoria}
            onChange={set("subcategoria")}
            options={SUBCATEGORIAS_GIRAKIDS}
            placeholder="Nenhuma…"
            error={errors.subcategoria}
          />
        </div>
      )}

      {isSelfMachine && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-amber-500/25 bg-amber-500/5">
          <p className="col-span-full text-xs text-amber-300 font-medium">
            SelfMachine - Vinculo opcional de cliente e tipo de lancamento
          </p>
          <Select
            label="Cliente SaaS"
            value={form.saasClienteId}
            onChange={set("saasClienteId")}
            options={contratosOptions}
            placeholder="Selecione cliente..."
            error={errors.saasClienteId}
          />
          <Select
            label="Tipo (SelfMachine)"
            value={form.saasLancamentoTipo}
            onChange={set("saasLancamentoTipo")}
            options={TIPOS_SELFMACHINE}
            placeholder="Selecione tipo..."
            error={errors.saasLancamentoTipo}
          />
        </div>
      )}

      {/* Referência */}
      <Input
        label="Referência / Descrição"
        placeholder="Ex: Pedido #123, Comissão, Boleto…"
        value={form.referencia}
        onChange={set("referencia")}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Canal / Origem"
          placeholder="Ex: Marketplace, Loja fisica, ERP"
          value={form.canalOrigem}
          onChange={set("canalOrigem")}
        />
        <Input
          label="Centro de Operacao"
          placeholder="Ex: Matriz, Quiosques, Operacao X"
          value={form.centroOperacao}
          onChange={set("centroOperacao")}
        />
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-2">
          {mutation.error?.response?.data?.message ??
            "Erro ao salvar lançamento."}
        </p>
      )}

      {success && (
        <p className="text-sm text-emerald-400 bg-emerald-500/10 rounded-xl px-4 py-2 flex items-center gap-2">
          <CheckCircle size={14} /> Lançamento salvo com sucesso!
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          className="btn-primary"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Salvando…" : "Salvar Lançamento"}
        </button>
      </div>
    </form>
  );
}
