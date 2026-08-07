import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeDollarSign,
  Eye,
  FileSpreadsheet,
  Pencil,
  Plus,
  Trash2,
  LoaderCircle,
  ReceiptText,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Input, Select } from "../components/ui/FormField.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { selfMachineApi } from "../services/api.js";
import { formatCurrency, formatDate } from "../lib/utils.js";
import {
  generatePedidoPagamentoPdf,
  generatePropostaSistemaPdf,
} from "../lib/selfMachinePdf.js";

const STATUS_STYLE = {
  PAUSADO:
    "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-400/30",
  ATRASADO:
    "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-400/30",
  NAO_PAGO:
    "bg-slate-100 dark:bg-[#1b1b1b] text-slate-600 dark:text-[#c4c4c4] border-slate-300 dark:border-[#3e3e3e]",
  SISTEMA_PAGO:
    "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-400/30",
  EM_DIA:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-400/30",
};

const STATUS_LABEL = {
  PAUSADO: "PAUSADO",
  ATRASADO: "MENSALIDADE ATRASADA",
  NAO_PAGO: "NAO PAGO",
  SISTEMA_PAGO: "SISTEMA PAGO / MENSALIDADE PENDENTE",
  EM_DIA: "EM DIA",
};

const BASE_FORM = {
  nomeCliente: "",
  nomeSistema: "",
  logoParceiraUrl: "",
  logoSelfMachineUrl: "",
  vendedor: "",
  numeroPc: "",
  dataEmissao: "",
  tipoRemessa: "RECORRENTE",
  valorDesenvolvimento: "",
  valorMensalidade: "",
  custoServidor: "",
  custoBancoDados: "",
  custoFrontend: "",
  custoOutros: "",
  dataInicioMensalidade: "",
  condicoesPagamento: "Avista Integral Pos entrega",
  meioPagamento: "PIX",
  chavePix: "",
  statusSistema: "ATIVO",
  statusMensalidade: "AGUARDANDO_PAGAMENTO",
  tipoPlano: "FULL",
  descricao: "Desenvolvimento sistema Web",
  prazosDescricao:
    "Kickoff imediato apos aceite. Entrega inicial prevista em ate 30 dias, com evolucao continua sob contrato mensal.",
};

function toInputDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function toNullableNumber(value) {
  return value === "" || value === null || value === undefined
    ? null
    : Number(value);
}

function buildPayload(form) {
  return {
    ...form,
    valorDesenvolvimento:
      form.valorDesenvolvimento === ""
        ? null
        : Number(form.valorDesenvolvimento),
    valorMensalidade: Number(form.valorMensalidade),
    custoServidor: toNullableNumber(form.custoServidor),
    custoBancoDados: toNullableNumber(form.custoBancoDados),
    custoFrontend: toNullableNumber(form.custoFrontend),
    custoOutros: toNullableNumber(form.custoOutros),
  };
}

function getStatusVisual(contrato) {
  if (
    contrato.statusSistema === "PAUSADO" ||
    contrato.statusMensalidade === "PAUSADO"
  ) {
    return "PAUSADO";
  }

  if (
    contrato.statusSistema === "ATRASADO" ||
    contrato.statusMensalidade === "ATRASADO"
  ) {
    return "ATRASADO";
  }

  if (contrato.statusMensalidade === "PAGO") {
    return "EM_DIA";
  }

  if (
    contrato.statusMensalidade === "AGUARDANDO_PAGAMENTO" &&
    contrato.temPagamentoLancado
  ) {
    return "SISTEMA_PAGO";
  }

  if (
    contrato.statusMensalidade === "AGUARDANDO_PAGAMENTO" &&
    contrato.temPedidoLancado
  ) {
    return "EM_DIA";
  }

  return "NAO_PAGO";
}

function LogoUpload({ value, onChange }) {
  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onChange(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-[#a4a4a4]">
        Logo da Empresa Parceira
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#d0862b] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#161616]"
        />
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ou cole a URL da logo"
        />
      </div>
    </div>
  );
}

function SelfMachineFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading,
}) {
  const [form, setForm] = useState(initialData || BASE_FORM);

  useEffect(() => {
    setForm(initialData || BASE_FORM);
  }, [initialData]);

  if (!isOpen) return null;

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 dark:border-[#2f2f2f] bg-white dark:bg-[#121212] text-slate-900 dark:text-[#f3f3f3] shadow-2xl shadow-black/10 dark:shadow-black/60">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2d2d2d]">
          <h2 className="text-lg font-semibold tracking-wide">
            {initialData?.id ? "Editar SaaS" : "Novo SaaS"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-3 py-1 rounded-lg border border-slate-300 dark:border-[#3c3c3c] text-slate-500 dark:text-[#9f9f9f] hover:text-slate-900 dark:hover:text-white"
          >
            Fechar
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome do Cliente"
              value={form.nomeCliente}
              onChange={(e) => setField("nomeCliente", e.target.value)}
              required
            />
            <Input
              label="Nome do Sistema"
              value={form.nomeSistema}
              onChange={(e) => setField("nomeSistema", e.target.value)}
              required
            />
            <Input
              label="Vendedor"
              value={form.vendedor}
              onChange={(e) => setField("vendedor", e.target.value)}
              required
            />
            <Input
              label="Numero do PC"
              value={form.numeroPc}
              onChange={(e) => setField("numeroPc", e.target.value)}
              required
            />
            <Input
              label="Data de Emissao"
              type="date"
              value={form.dataEmissao}
              onChange={(e) => setField("dataEmissao", e.target.value)}
              required
            />
            <Select
              label="Tipo de Remessa"
              value={form.tipoRemessa}
              onChange={(e) => setField("tipoRemessa", e.target.value)}
              options={[
                { value: "UNICA", label: "Unica" },
                { value: "RECORRENTE", label: "Recorrente" },
              ]}
            />
            <Input
              label="Valor do Desenvolvimento (Setup)"
              type="number"
              min="0"
              step="0.01"
              value={form.valorDesenvolvimento}
              onChange={(e) => setField("valorDesenvolvimento", e.target.value)}
            />
            <Input
              label="Valor da Mensalidade"
              type="number"
              min="0"
              step="0.01"
              value={form.valorMensalidade}
              onChange={(e) => setField("valorMensalidade", e.target.value)}
              required
            />
            <Input
              label="Data de Inicio da Mensalidade"
              type="date"
              value={form.dataInicioMensalidade}
              onChange={(e) =>
                setField("dataInicioMensalidade", e.target.value)
              }
              required
            />
            <Select
              label="Tipo de Plano"
              value={form.tipoPlano}
              onChange={(e) => setField("tipoPlano", e.target.value)}
              options={[
                { value: "FULL", label: "Full" },
                { value: "SMALL", label: "Small" },
              ]}
            />
            <Input
              label="Condicoes de Pagamento"
              value={form.condicoesPagamento}
              onChange={(e) => setField("condicoesPagamento", e.target.value)}
            />
            <Input
              label="Meio de Pagamento"
              value={form.meioPagamento}
              onChange={(e) => setField("meioPagamento", e.target.value)}
            />
            {form.meioPagamento?.toUpperCase() === "PIX" && (
              <Input
                label="Chave PIX"
                value={form.chavePix}
                onChange={(e) => setField("chavePix", e.target.value)}
                placeholder="Email, CPF/CNPJ, Telefone ou Chave Aleatoria"
                required
              />
            )}
            <Select
              label="Status do Sistema"
              value={form.statusSistema}
              onChange={(e) => setField("statusSistema", e.target.value)}
              options={[
                { value: "ATIVO", label: "Ativo" },
                { value: "PAUSADO", label: "Pausado" },
                { value: "ATRASADO", label: "Atrasado" },
                { value: "ENTREGUE", label: "Entregue" },
              ]}
            />
            <Select
              label="Status Mensalidade"
              value={form.statusMensalidade}
              onChange={(e) => setField("statusMensalidade", e.target.value)}
              options={[
                {
                  value: "AGUARDANDO_PAGAMENTO",
                  label: "Aguardando Pagamento",
                },
                { value: "EM_ABERTO", label: "Em Aberto" },
                { value: "PAGO", label: "Pago" },
                { value: "ATRASADO", label: "Atrasado" },
                { value: "PAUSADO", label: "Pausado" },
              ]}
            />
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-[#a4a4a4]">
              Custos do Sistema (opcional)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="Servidor (Backend)"
                type="number"
                min="0"
                step="0.01"
                value={form.custoServidor}
                onChange={(e) => setField("custoServidor", e.target.value)}
              />
              <Input
                label="Banco de Dados"
                type="number"
                min="0"
                step="0.01"
                value={form.custoBancoDados}
                onChange={(e) => setField("custoBancoDados", e.target.value)}
              />
              <Input
                label="Frontend (Vercel)"
                type="number"
                min="0"
                step="0.01"
                value={form.custoFrontend}
                onChange={(e) => setField("custoFrontend", e.target.value)}
              />
              <Input
                label="Outros"
                type="number"
                min="0"
                step="0.01"
                value={form.custoOutros}
                onChange={(e) => setField("custoOutros", e.target.value)}
              />
            </div>
          </div>

          <LogoUpload
            value={form.logoParceiraUrl}
            onChange={(value) => setField("logoParceiraUrl", value)}
          />

          <Input
            label="Logo SelfMachine (URL)"
            value={form.logoSelfMachineUrl}
            onChange={(e) => setField("logoSelfMachineUrl", e.target.value)}
          />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-[#a4a4a4]">
              Descricao
            </label>
            <textarea
              value={form.descricao}
              onChange={(e) => setField("descricao", e.target.value)}
              className="input-base min-h-24"
              placeholder="Detalhes do servico"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold tracking-[0.16em] uppercase text-slate-500 dark:text-[#a4a4a4]">
              Prazos e Timelines
            </label>
            <textarea
              value={form.prazosDescricao}
              onChange={(e) => setField("prazosDescricao", e.target.value)}
              className="input-base min-h-20"
              placeholder="Ex: Kickoff imediato apos aceite. Entrega inicial prevista em ate 30 dias..."
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#d0862b] px-5 py-2 text-sm font-semibold text-[#171717] hover:brightness-110 disabled:opacity-50"
            >
              {isLoading ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : null}
              {initialData?.id ? "Salvar Alteracoes" : "Cadastrar SaaS"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DetalhesModal({ data, onClose, onGerarPedido }) {
  if (!data) return null;

  const status = getStatusVisual(data);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/65 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white dark:bg-[#131313] border border-slate-200 dark:border-[#2c2c2c] text-slate-900 dark:text-[#f2f2f2]">
        <div className="p-5 border-b border-slate-200 dark:border-[#2d2d2d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Detalhes do Contrato SaaS</h3>
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] ${STATUS_STYLE[status] || "bg-slate-100 dark:bg-[#2c2c2c] text-slate-600 dark:text-[#ddd] border-slate-300 dark:border-[#4a4a4a]"}`}
            >
              {STATUS_LABEL[status] || status}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-sm border border-slate-300 dark:border-[#414141] rounded-lg text-slate-500 dark:text-[#9f9f9f] hover:text-slate-900 dark:hover:text-white"
          >
            Fechar
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <p>
              <span className="text-slate-500 dark:text-[#999]">
                Cliente:
              </span>{" "}
              {data.nomeCliente}
            </p>
            <p>
              <span className="text-slate-500 dark:text-[#999]">
                Sistema:
              </span>{" "}
              {data.nomeSistema}
            </p>
            <p>
              <span className="text-slate-500 dark:text-[#999]">PC:</span>{" "}
              {data.numeroPc}
            </p>
            <p>
              <span className="text-slate-500 dark:text-[#999]">
                Vendedor:
              </span>{" "}
              {data.vendedor}
            </p>
            <p>
              <span className="text-slate-500 dark:text-[#999]">Plano:</span>{" "}
              {data.tipoPlano}
            </p>
            <p>
              <span className="text-slate-500 dark:text-[#999]">
                Remessa:
              </span>{" "}
              {data.tipoRemessa}
            </p>
            <p>
              <span className="text-slate-500 dark:text-[#999]">
                Mensalidade:
              </span>{" "}
              {formatCurrency(data.valorMensalidade)}
            </p>
            <p>
              <span className="text-slate-500 dark:text-[#999]">Setup:</span>{" "}
              {formatCurrency(data.valorDesenvolvimento)}
            </p>
            <p>
              <span className="text-slate-500 dark:text-[#999]">
                Inicio:
              </span>{" "}
              {formatDate(data.dataInicioMensalidade)}
            </p>
            <p>
              <span className="text-slate-500 dark:text-[#999]">
                Ultima Mensalidade Paga:
              </span>{" "}
              {formatDate(data.ultimaMensalidadePagaEm)}
            </p>
            <p>
              <span className="text-slate-500 dark:text-[#999]">Meio:</span>{" "}
              {data.meioPagamento || "-"}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-[#2f2f2f] bg-slate-50 dark:bg-[#0f0f0f] p-4 text-sm text-slate-700 dark:text-[#c7c7c7]">
            {data.descricao || "Sem descricao."}
          </div>

          {(data.custoServidor ||
            data.custoBancoDados ||
            data.custoFrontend ||
            data.custoOutros) && (
            <div className="rounded-xl border border-slate-200 dark:border-[#2f2f2f] bg-slate-50 dark:bg-[#0f0f0f] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-[#9b9b9b] mb-3">
                Custos do Sistema
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <p>
                  <span className="text-slate-500 dark:text-[#999] block text-xs">
                    Servidor
                  </span>
                  {formatCurrency(data.custoServidor)}
                </p>
                <p>
                  <span className="text-slate-500 dark:text-[#999] block text-xs">
                    Banco de Dados
                  </span>
                  {formatCurrency(data.custoBancoDados)}
                </p>
                <p>
                  <span className="text-slate-500 dark:text-[#999] block text-xs">
                    Frontend
                  </span>
                  {formatCurrency(data.custoFrontend)}
                </p>
                <p>
                  <span className="text-slate-500 dark:text-[#999] block text-xs">
                    Outros
                  </span>
                  {formatCurrency(data.custoOutros)}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-[#242424] flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-[#999]">
                  Custo Total / Margem
                </span>
                <span>
                  <span className="text-rose-600 dark:text-rose-300">
                    {formatCurrency(data.custoTotalSistema)}
                  </span>
                  <span className="text-slate-400 dark:text-[#666]"> / </span>
                  <span className="text-emerald-600 dark:text-emerald-300">
                    {formatCurrency(
                      Number(data.valorMensalidade || 0) -
                        Number(data.custoTotalSistema || 0),
                    )}
                  </span>
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onGerarPedido(data)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#d0862b] px-4 py-2 text-sm font-semibold text-[#171717] hover:brightness-110"
            >
              <ReceiptText size={15} />
              Gerar Pedido de Pagamento
            </button>
            <button
              type="button"
              onClick={() => generatePropostaSistemaPdf(data)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#d0862b]/40 px-4 py-2 text-sm font-semibold text-amber-700 dark:text-[#f6c37f] hover:bg-[#d0862b]/10"
            >
              <FileSpreadsheet size={15} />
              Gerar Proposta de Sistema
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color = "text-slate-900 dark:text-[#f4f4f4]",
}) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-[#2f2f2f] bg-white dark:bg-[#111]/90 p-4 flex flex-col gap-1">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-[#9a9a9a]">
        {label}
      </p>
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
      {sub && (
        <p className="text-xs text-slate-400 dark:text-[#666]">{sub}</p>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-[#3c3c3c] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-500 dark:text-[#c0c0c0] mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

function RelatorioModal({ isOpen, onClose }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const chartGridColor = isDark ? "#2d2d2d" : "#e2e8f0";
  const chartAxisColor = isDark ? "#555" : "#94a3b8";
  const chartTickColor = isDark ? "#888" : "#64748b";
  const chartLegendColor = isDark ? "#999" : "#475569";

  const { data: rel, isLoading } = useQuery({
    queryKey: ["selfmachine", "relatorio"],
    queryFn: () => selfMachineApi.relatorio().then((r) => r.data),
    enabled: isOpen,
    staleTime: 60_000,
  });

  if (!isOpen) return null;

  const crescTrend = rel?.crescimento?.taxaCrescimento ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/75 backdrop-blur-sm overflow-y-auto p-3 sm:p-6">
      <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 dark:border-[#2e2e2e] bg-white dark:bg-[#111] text-slate-900 dark:text-[#f3f3f3] shadow-2xl shadow-black/10 dark:shadow-black/70">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2d2d2d]">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#d0862b]">
              SelfMachine
            </p>
            <h2 className="text-xl font-semibold">
              Relatório de Operações SaaS
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg border border-slate-300 dark:border-[#3c3c3c] text-slate-500 dark:text-[#9a9a9a] hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-[#666]"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {isLoading && (
            <div className="flex items-center justify-center h-48 text-slate-500 dark:text-[#9c9c9c] gap-2">
              <LoaderCircle size={20} className="animate-spin" />
              Gerando relatório...
            </div>
          )}

          {!isLoading && rel && (
            <>
              {/* Financeiro principal */}
              <section>
                <h3 className="text-xs uppercase tracking-[0.18em] text-[#d0862b] mb-3">
                  Financeiro (Lançamentos Vinculados)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <KpiCard
                    label="Receita Realizada"
                    value={formatCurrency(rel.financeiro.receitaRealizada)}
                    sub="Entradas registradas"
                    color="text-emerald-700 dark:text-emerald-300"
                  />
                  <KpiCard
                    label="Despesas (Lançamentos)"
                    value={formatCurrency(rel.financeiro.despesasTotal)}
                    sub="Saídas registradas"
                    color="text-rose-700 dark:text-rose-300"
                  />
                  <KpiCard
                    label="Custos de Sistema"
                    value={formatCurrency(rel.financeiro.custosSistema)}
                    sub="Servidor, banco, frontend, outros"
                    color="text-rose-700 dark:text-rose-300"
                  />
                  <KpiCard
                    label="Total de Despesas"
                    value={formatCurrency(rel.financeiro.despesasGerais)}
                    sub="Lançamentos + custos de sistema"
                    color="text-rose-700 dark:text-rose-300"
                  />
                  <KpiCard
                    label="Lucro Líquido"
                    value={formatCurrency(rel.financeiro.lucro)}
                    sub={`Margem ${rel.financeiro.margemLucro.toFixed(1)}%`}
                    color={
                      rel.financeiro.lucro >= 0
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-rose-700 dark:text-rose-300"
                    }
                  />
                  <KpiCard
                    label="Lucro Operacional"
                    value={formatCurrency(rel.financeiro.lucroOperacional)}
                    sub={`Margem ${rel.financeiro.margemOperacional.toFixed(1)}% (com custos de sistema)`}
                    color={
                      rel.financeiro.lucroOperacional >= 0
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-rose-700 dark:text-rose-300"
                    }
                  />
                  <KpiCard
                    label="Receita (30 dias)"
                    value={formatCurrency(rel.resumo.receita30Dias)}
                    sub="Últimos 30 dias"
                    color="text-sky-700 dark:text-sky-300"
                  />
                </div>
              </section>

              {/* Cobrancas de mensalidade */}
              <section>
                <h3 className="text-xs uppercase tracking-[0.18em] text-[#d0862b] mb-3">
                  Cobrança de Mensalidades
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 mb-3">
                  <KpiCard
                    label="Em Atraso"
                    value={formatCurrency(rel.resumo.totalCobrancasAtrasadas)}
                    sub={`${rel.cobrancas.filter((c) => c.status === "ATRASADO").length} cliente(s)`}
                    color="text-rose-700 dark:text-rose-300"
                  />
                  <KpiCard
                    label="A Vencer"
                    value={formatCurrency(rel.resumo.totalCobrancasAVencer)}
                    sub={`${rel.cobrancas.filter((c) => c.status === "A_VENCER").length} cliente(s)`}
                    color="text-amber-700 dark:text-[#f6c37f]"
                  />
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#0e0e0e] p-4">
                  {rel.cobrancas.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-[#666] text-center py-6">
                      Nenhum sistema ativo para cobrança.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {rel.cobrancas.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 dark:border-[#1e1e1e] last:border-0"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {c.nomeCliente}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-[#666] truncate">
                              {c.nomeSistema} · Vencimento{" "}
                              {formatDate(c.vencimento)}
                            </p>
                          </div>
                          <div className="text-right whitespace-nowrap">
                            <p className="text-sm font-semibold text-slate-900 dark:text-[#f4f4f4]">
                              {formatCurrency(c.valorMensalidade)}
                            </p>
                            {c.status === "ATRASADO" && (
                              <p className="text-xs text-rose-700 dark:text-rose-300">
                                {c.dias} dia{c.dias !== 1 ? "s" : ""} em atraso
                              </p>
                            )}
                            {c.status === "A_VENCER" && (
                              <p className="text-xs text-amber-700 dark:text-[#f6c37f]">
                                {c.dias === 0
                                  ? "Vence hoje"
                                  : `Cobrar em ${c.dias} dia${c.dias !== 1 ? "s" : ""}`}
                              </p>
                            )}
                            {c.status === "PAGO" && (
                              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                                Pago este mês
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* MRR / ARR */}
              <section>
                <h3 className="text-xs uppercase tracking-[0.18em] text-[#d0862b] mb-3">
                  Recorrência e Contratos
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <KpiCard
                    label="MRR"
                    value={formatCurrency(rel.resumo.mrr)}
                    sub="Mensalidade recorrente"
                    color="text-amber-700 dark:text-[#f6c37f]"
                  />
                  <KpiCard
                    label="ARR"
                    value={formatCurrency(rel.resumo.arr)}
                    sub="Receita anual estimada"
                    color="text-amber-700 dark:text-[#f6c37f]"
                  />
                  <KpiCard
                    label="Ticket Médio"
                    value={formatCurrency(rel.resumo.ticketMedio)}
                    sub={`${rel.resumo.contratosAtivos} contratos ativos`}
                  />
                  <KpiCard
                    label="Setup Total"
                    value={formatCurrency(rel.resumo.totalSetupCobrado)}
                    sub="Soma de todos os setups"
                  />
                </div>
              </section>

              {/* Status contratos */}
              <section>
                <h3 className="text-xs uppercase tracking-[0.18em] text-[#d0862b] mb-3">
                  Status da Base
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <KpiCard
                    label="Total Contratos"
                    value={rel.resumo.totalContratos}
                  />
                  <KpiCard
                    label="Ativos"
                    value={rel.resumo.contratosAtivos}
                    color="text-emerald-700 dark:text-emerald-300"
                  />
                  <KpiCard
                    label="Atrasados"
                    value={rel.resumo.contratosAtrasados}
                    color="text-rose-700 dark:text-rose-300"
                  />
                  <KpiCard
                    label="Pausados"
                    value={rel.resumo.contratosPausados}
                    color="text-orange-700 dark:text-orange-300"
                  />
                </div>
              </section>

              {/* Histórico mensal */}
              <section>
                <h3 className="text-xs uppercase tracking-[0.18em] text-[#d0862b] mb-3">
                  Histórico Mensal (12 meses)
                </h3>
                <div className="rounded-2xl border border-slate-200 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#0e0e0e] p-4">
                  {rel.historicoMensal.every(
                    (m) => m.entradas === 0 && m.saidas === 0,
                  ) ? (
                    <p className="text-sm text-slate-400 dark:text-[#666] text-center py-6">
                      Nenhum lançamento vinculado a clientes SaaS ainda.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={rel.historicoMensal}
                        margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={chartGridColor}
                        />
                        <XAxis
                          dataKey="label"
                          stroke={chartAxisColor}
                          tick={{ fill: chartTickColor, fontSize: 11 }}
                        />
                        <YAxis
                          stroke={chartAxisColor}
                          tick={{ fill: chartTickColor, fontSize: 11 }}
                          tickFormatter={(v) =>
                            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                          }
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          wrapperStyle={{ fontSize: 12, color: chartLegendColor }}
                        />
                        <Bar
                          dataKey="entradas"
                          name="Entradas"
                          fill="#34d399"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="saidas"
                          name="Saídas"
                          fill="#f87171"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </section>

              {/* Gastos e Clientes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gastos por categoria */}
                <section>
                  <h3 className="text-xs uppercase tracking-[0.18em] text-[#d0862b] mb-3">
                    Despesas por Categoria
                  </h3>
                  <div className="rounded-2xl border border-slate-200 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#0e0e0e] p-4 space-y-2">
                    {rel.gastosPorCategoria.length === 0 ? (
                      <p className="text-sm text-slate-400 dark:text-[#666] py-4 text-center">
                        Sem despesas registradas.
                      </p>
                    ) : (
                      rel.gastosPorCategoria.map((g) => (
                        <div key={g.categoria} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-600 dark:text-[#c0c0c0] truncate pr-2">
                              {g.categoria.replace(/_/g, " ")}
                            </span>
                            <span className="text-rose-700 dark:text-rose-300 whitespace-nowrap">
                              {formatCurrency(g.valor)}{" "}
                              <span className="text-slate-400 dark:text-[#666]">
                                ({g.percentual.toFixed(0)}%)
                              </span>
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-[#2a2a2a]">
                            <div
                              className="h-full rounded-full bg-rose-500/60"
                              style={{ width: `${g.percentual}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Receita por cliente */}
                <section>
                  <h3 className="text-xs uppercase tracking-[0.18em] text-[#d0862b] mb-3">
                    Receita por Cliente
                  </h3>
                  <div className="rounded-2xl border border-slate-200 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#0e0e0e] p-4 space-y-2">
                    {rel.receitasPorCliente.length === 0 ? (
                      <p className="text-sm text-slate-400 dark:text-[#666] py-4 text-center">
                        Nenhuma receita registrada por cliente.
                      </p>
                    ) : (
                      rel.receitasPorCliente.map((c, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 py-1 border-b border-slate-100 dark:border-[#1e1e1e] last:border-0"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {c.nomeCliente}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-[#666]">
                              {c.nomeSistema} · {c.count} lançamento
                              {c.count !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <span className="text-emerald-700 dark:text-emerald-300 text-sm font-semibold whitespace-nowrap">
                            {formatCurrency(c.valor)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>

              {/* Custos por sistema */}
              <section>
                <h3 className="text-xs uppercase tracking-[0.18em] text-[#d0862b] mb-3">
                  Custos de Infraestrutura por Sistema
                </h3>
                <div className="rounded-2xl border border-slate-200 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#0e0e0e] p-4 space-y-2">
                  {rel.custosPorSistema.length === 0 ? (
                    <p className="text-sm text-slate-400 dark:text-[#666] py-4 text-center">
                      Nenhum custo de sistema cadastrado.
                    </p>
                  ) : (
                    rel.custosPorSistema.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-2 py-1 border-b border-slate-100 dark:border-[#1e1e1e] last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {c.nomeCliente}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-[#666] truncate">
                            {c.nomeSistema}
                          </p>
                        </div>
                        <span className="text-rose-700 dark:text-rose-300 text-sm font-semibold whitespace-nowrap">
                          {formatCurrency(c.total)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Crescimento e Planos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Crescimento */}
                <section>
                  <h3 className="text-xs uppercase tracking-[0.18em] text-[#d0862b] mb-3">
                    Taxa de Crescimento
                  </h3>
                  <div className="rounded-2xl border border-slate-200 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#0e0e0e] p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-xl ${crescTrend > 0 ? "bg-emerald-500/15" : crescTrend < 0 ? "bg-rose-500/15" : "bg-slate-200 dark:bg-[#1e1e1e]"}`}
                      >
                        {crescTrend > 0 ? (
                          <TrendingUp size={22} className="text-emerald-600 dark:text-emerald-400" />
                        ) : crescTrend < 0 ? (
                          <TrendingDown size={22} className="text-rose-600 dark:text-rose-400" />
                        ) : (
                          <Minus size={22} className="text-slate-400 dark:text-[#666]" />
                        )}
                      </div>
                      <div>
                        <p
                          className={`text-2xl font-semibold ${crescTrend > 0 ? "text-emerald-700 dark:text-emerald-300" : crescTrend < 0 ? "text-rose-700 dark:text-rose-300" : "text-slate-500 dark:text-[#aaa]"}`}
                        >
                          {crescTrend > 0 ? "+" : ""}
                          {crescTrend.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-400 dark:text-[#666]">
                          vs. mês anterior
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="flex-1 rounded-xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#272727] p-3 text-center">
                        <p className="text-slate-400 dark:text-[#666] text-xs mb-1">
                          Este Mês
                        </p>
                        <p className="text-lg font-semibold">
                          {rel.crescimento.contratosEsteMes}
                        </p>
                        <p className="text-slate-400 dark:text-[#555] text-xs">
                          novos
                        </p>
                      </div>
                      <div className="flex-1 rounded-xl bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#272727] p-3 text-center">
                        <p className="text-slate-400 dark:text-[#666] text-xs mb-1">
                          Mês Anterior
                        </p>
                        <p className="text-lg font-semibold">
                          {rel.crescimento.contratosMesAnterior}
                        </p>
                        <p className="text-slate-400 dark:text-[#555] text-xs">
                          novos
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Distribuição planos */}
                <section>
                  <h3 className="text-xs uppercase tracking-[0.18em] text-[#d0862b] mb-3">
                    Distribuição por Plano
                  </h3>
                  <div className="rounded-2xl border border-slate-200 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#0e0e0e] p-5 space-y-4">
                    {rel.distribuicaoPlanos.map((p) => {
                      const pct =
                        rel.resumo.totalContratos > 0
                          ? (p.count / rel.resumo.totalContratos) * 100
                          : 0;
                      return (
                        <div key={p.plano} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{p.plano}</span>
                            <span className="text-slate-500 dark:text-[#aaa]">
                              {p.count} contrato{p.count !== 1 ? "s" : ""} ·{" "}
                              <span className="text-amber-700 dark:text-[#f6c37f]">
                                {formatCurrency(p.mrr)}/mês
                              </span>
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-200 dark:bg-[#1e1e1e]">
                            <div
                              className="h-full rounded-full bg-[#d0862b]/60"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-400 dark:text-[#555]">
                            Potencial: {formatCurrency(p.mrrPotencial)}/mês ·{" "}
                            {pct.toFixed(0)}% dos contratos
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SelfMachinePage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detalhes, setDetalhes] = useState(null);
  const [showRelatorio, setShowRelatorio] = useState(false);

  const { data: contratos = [], isLoading } = useQuery({
    queryKey: ["selfmachine", "saas"],
    queryFn: () => selfMachineApi.listar().then((res) => res.data),
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (payload.id) {
        return selfMachineApi.atualizar(payload.id, buildPayload(payload));
      }
      return selfMachineApi.criar(buildPayload(payload));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["selfmachine", "saas"] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => selfMachineApi.remover(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["selfmachine", "saas"] });
    },
  });

  const gerarPedidoMutation = useMutation({
    mutationFn: (id) => selfMachineApi.gerarPedido(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["selfmachine", "saas"] });
      generatePedidoPagamentoPdf(res.data);
      setDetalhes(res.data);
    },
  });

  const metricas = useMemo(() => {
    const total = contratos.length;
    const ativos = contratos.filter((c) => c.statusSistema === "ATIVO").length;
    const atrasados = contratos.filter(
      (c) =>
        c.statusMensalidade === "ATRASADO" || c.statusSistema === "ATRASADO",
    ).length;
    const mrr = contratos.reduce(
      (acc, item) => acc + Number(item.valorMensalidade || 0),
      0,
    );

    return { total, ativos, atrasados, mrr };
  }, [contratos]);

  function openCreate() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(contrato) {
    setEditing({
      ...contrato,
      dataEmissao: toInputDate(contrato.dataEmissao),
      dataInicioMensalidade: toInputDate(contrato.dataInicioMensalidade),
      valorDesenvolvimento:
        contrato.valorDesenvolvimento === null
          ? ""
          : String(contrato.valorDesenvolvimento),
      valorMensalidade: String(contrato.valorMensalidade ?? ""),
      custoServidor:
        contrato.custoServidor === null || contrato.custoServidor === undefined
          ? ""
          : String(contrato.custoServidor),
      custoBancoDados:
        contrato.custoBancoDados === null ||
        contrato.custoBancoDados === undefined
          ? ""
          : String(contrato.custoBancoDados),
      custoFrontend:
        contrato.custoFrontend === null || contrato.custoFrontend === undefined
          ? ""
          : String(contrato.custoFrontend),
      custoOutros:
        contrato.custoOutros === null || contrato.custoOutros === undefined
          ? ""
          : String(contrato.custoOutros),
    });
    setShowForm(true);
  }

  function removeItem(contrato) {
    const confirmado = window.confirm(
      `Excluir o contrato de ${contrato.nomeCliente}?`,
    );

    if (confirmado) {
      deleteMutation.mutate(contrato.id);
    }
  }

  return (
    <section className="min-h-full rounded-3xl bg-amber-50/40 dark:bg-linear-to-br dark:from-[#121212] dark:via-[#16130d] dark:to-[#0e0e0e] p-4 sm:p-6 text-slate-900 dark:text-[#f4f4f4] border border-slate-200 dark:border-[#262626] shadow-[0_24px_80px_rgba(0,0,0,0.06)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#d0862b]">
            SelfMachine
          </p>
          <h1 className="text-2xl font-semibold">Centro de Comando SaaS</h1>
          <p className="text-sm text-slate-500 dark:text-[#a5a5a5] mt-1">
            Dashboard de clientes, contratos e cobrancas recorrentes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowRelatorio(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-[#3a3a3a] bg-white dark:bg-[#1a1a1a] px-4 py-2 text-sm font-semibold text-slate-600 dark:text-[#d0c3a5] hover:border-[#d0862b]/50 hover:text-amber-700 dark:hover:text-[#f6c37f] transition-colors"
          >
            <BarChart2 size={16} />
            Relatório
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#d0862b] px-4 py-2 text-sm font-semibold text-[#171717] hover:brightness-110"
          >
            <Plus size={16} />
            Novo SaaS
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 dark:border-[#2f2f2f] bg-white dark:bg-[#151515]/90 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-[#9a9a9a]">
            Contratos
          </p>
          <p className="text-2xl font-semibold mt-1">{metricas.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-[#2f2f2f] bg-white dark:bg-[#151515]/90 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-[#9a9a9a]">
            Sistemas Ativos
          </p>
          <p className="text-2xl font-semibold mt-1">{metricas.ativos}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-[#2f2f2f] bg-white dark:bg-[#151515]/90 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-[#9a9a9a]">
            Clientes em Atraso
          </p>
          <p className="text-2xl font-semibold mt-1 text-rose-700 dark:text-rose-300">
            {metricas.atrasados}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-[#2f2f2f] bg-white dark:bg-[#151515]/90 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-[#9a9a9a]">
            MRR Estimado
          </p>
          <p className="text-2xl font-semibold mt-1 text-amber-700 dark:text-[#f4c074]">
            {formatCurrency(metricas.mrr)}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="mt-8 text-sm text-slate-500 dark:text-[#9c9c9c]">
          Carregando contratos...
        </div>
      )}

      {!isLoading && contratos.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 dark:border-[#3b3b3b] bg-white dark:bg-[#111] p-8 text-center text-sm text-slate-500 dark:text-[#999]">
          Nenhum SaaS cadastrado. Clique em "Novo SaaS" para comecar.
        </div>
      )}

      {!isLoading && contratos.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {contratos.map((contrato) => {
            const status = getStatusVisual(contrato);
            return (
              <article
                key={contrato.id}
                className="rounded-2xl border border-slate-200 dark:border-[#2e2e2e] bg-white dark:bg-[#111]/90 p-4 hover:border-[#d0862b]/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-[#1d1d1d] border border-slate-300 dark:border-[#353535] flex items-center justify-center text-[9px] font-bold tracking-[0.12em] text-amber-700 dark:text-[#f5be6d]">
                      SELF
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-[#1d1d1d] border border-slate-300 dark:border-[#353535] overflow-hidden">
                      {contrato.logoParceiraUrl ? (
                        <img
                          src={contrato.logoParceiraUrl}
                          alt={`Logo ${contrato.nomeCliente}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[9px] text-slate-400 dark:text-[#8a8a8a]">
                          LOGO
                        </div>
                      )}
                    </div>
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] ${STATUS_STYLE[status] || "bg-slate-100 dark:bg-[#2c2c2c] text-slate-600 dark:text-[#ddd] border-slate-300 dark:border-[#4a4a4a]"}`}
                  >
                    {STATUS_LABEL[status] || status}
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-semibold">
                  {contrato.nomeSistema}
                </h3>
                <p className="text-sm text-slate-500 dark:text-[#a5a5a5]">
                  {contrato.nomeCliente}
                </p>

                <div className="mt-4 rounded-xl border border-slate-200 dark:border-[#2f2f2f] bg-slate-50 dark:bg-[#171717] p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-[#9b9b9b]">
                    Proxima Mensalidade
                  </p>
                  <p className="mt-1 text-xl font-semibold text-amber-700 dark:text-[#f6c37f]">
                    {formatCurrency(contrato.valorMensalidade)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-[#8f8f8f]">
                    Inicio: {formatDate(contrato.dataInicioMensalidade)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-[#8f8f8f]">
                    Ult. pagamento:{" "}
                    {formatDate(contrato.ultimaMensalidadePagaEm)}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(contrato)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-[#404040] px-3 py-1.5 text-xs text-slate-700 dark:text-[#e7e7e7] hover:border-[#d0862b]/50"
                  >
                    <Pencil size={13} /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(contrato)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-[#4f2b2b] px-3 py-1.5 text-xs text-rose-700 dark:text-rose-200 hover:bg-rose-500/10"
                  >
                    <Trash2 size={13} /> Excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetalhes(contrato)}
                    className="inline-flex items-center gap-1 rounded-lg border border-sky-200 dark:border-[#2f4d66] px-3 py-1.5 text-xs text-sky-700 dark:text-sky-200 hover:bg-sky-500/10"
                  >
                    <Eye size={13} /> Detalhes
                  </button>
                  <button
                    type="button"
                    onClick={() => gerarPedidoMutation.mutate(contrato.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-200 dark:border-[#5e4d2f] px-3 py-1.5 text-xs text-amber-700 dark:text-[#ffd797] hover:bg-[#d0862b]/10"
                  >
                    <BadgeDollarSign size={13} /> Pedido
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <SelfMachineFormModal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
        onSubmit={(form) => saveMutation.mutate(form)}
        initialData={editing || BASE_FORM}
        isLoading={saveMutation.isPending}
      />

      <DetalhesModal
        data={detalhes}
        onClose={() => setDetalhes(null)}
        onGerarPedido={(contrato) => gerarPedidoMutation.mutate(contrato.id)}
      />

      <RelatorioModal
        isOpen={showRelatorio}
        onClose={() => setShowRelatorio(false)}
      />

      {(saveMutation.isError ||
        deleteMutation.isError ||
        gerarPedidoMutation.isError) && (
        <p className="mt-4 text-sm text-rose-700 dark:text-rose-300">
          {saveMutation.error?.response?.data?.message ||
            deleteMutation.error?.response?.data?.message ||
            gerarPedidoMutation.error?.response?.data?.message ||
            "Erro ao processar operacao no modulo SelfMachine."}
        </p>
      )}
    </section>
  );
}
