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
} from "lucide-react";
import { Input, Select } from "../components/ui/FormField.jsx";
import { selfMachineApi } from "../services/api.js";
import { formatCurrency, formatDate } from "../lib/utils.js";
import {
  generatePedidoPagamentoPdf,
  generatePropostaSistemaPdf,
} from "../lib/selfMachinePdf.js";

const STATUS_STYLE = {
  PAUSADO: "bg-orange-500/20 text-orange-300 border-orange-400/30",
  ATRASADO: "bg-rose-500/20 text-rose-300 border-rose-400/30",
  NAO_PAGO: "bg-[#1b1b1b] text-[#c4c4c4] border-[#3e3e3e]",
  EM_DIA: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
};

const STATUS_LABEL = {
  PAUSADO: "PAUSADO",
  ATRASADO: "MENSALIDADE ATRASADA",
  NAO_PAGO: "NAO PAGO",
  EM_DIA: "PAGO EM DIA",
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
  dataInicioMensalidade: "",
  condicoesPagamento: "Avista Integral Pos entrega",
  meioPagamento: "PIX",
  chavePix: "",
  statusSistema: "ATIVO",
  statusMensalidade: "AGUARDANDO_PAGAMENTO",
  tipoPlano: "FULL",
  descricao: "Desenvolvimento sistema Web",
};

function toInputDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function buildPayload(form) {
  return {
    ...form,
    valorDesenvolvimento:
      form.valorDesenvolvimento === ""
        ? null
        : Number(form.valorDesenvolvimento),
    valorMensalidade: Number(form.valorMensalidade),
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
      <label className="text-xs font-semibold tracking-[0.16em] uppercase text-[#a4a4a4]">
        Logo da Empresa Parceira
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#d0862b] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#161616]"
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="mx-auto max-w-4xl rounded-2xl border border-[#2f2f2f] bg-[#121212] text-[#f3f3f3] shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2d2d2d]">
          <h2 className="text-lg font-semibold tracking-wide">
            {initialData?.id ? "Editar SaaS" : "Novo SaaS"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-3 py-1 rounded-lg border border-[#3c3c3c] text-[#9f9f9f] hover:text-white"
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
            <label className="text-xs font-semibold tracking-[0.16em] uppercase text-[#a4a4a4]">
              Descricao
            </label>
            <textarea
              value={form.descricao}
              onChange={(e) => setField("descricao", e.target.value)}
              className="input-base min-h-24"
              placeholder="Detalhes do servico"
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
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="mx-auto max-w-3xl rounded-2xl bg-[#131313] border border-[#2c2c2c] text-[#f2f2f2]">
        <div className="p-5 border-b border-[#2d2d2d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Detalhes do Contrato SaaS</h3>
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] ${STATUS_STYLE[status] || "bg-[#2c2c2c] text-[#ddd] border-[#4a4a4a]"}`}
            >
              {STATUS_LABEL[status] || status}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-sm border border-[#414141] rounded-lg text-[#9f9f9f] hover:text-white"
          >
            Fechar
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <p>
              <span className="text-[#999]">Cliente:</span> {data.nomeCliente}
            </p>
            <p>
              <span className="text-[#999]">Sistema:</span> {data.nomeSistema}
            </p>
            <p>
              <span className="text-[#999]">PC:</span> {data.numeroPc}
            </p>
            <p>
              <span className="text-[#999]">Vendedor:</span> {data.vendedor}
            </p>
            <p>
              <span className="text-[#999]">Plano:</span> {data.tipoPlano}
            </p>
            <p>
              <span className="text-[#999]">Remessa:</span> {data.tipoRemessa}
            </p>
            <p>
              <span className="text-[#999]">Mensalidade:</span>{" "}
              {formatCurrency(data.valorMensalidade)}
            </p>
            <p>
              <span className="text-[#999]">Setup:</span>{" "}
              {formatCurrency(data.valorDesenvolvimento)}
            </p>
            <p>
              <span className="text-[#999]">Inicio:</span>{" "}
              {formatDate(data.dataInicioMensalidade)}
            </p>
            <p>
              <span className="text-[#999]">Ultima Mensalidade Paga:</span>{" "}
              {formatDate(data.ultimaMensalidadePagaEm)}
            </p>
            <p>
              <span className="text-[#999]">Meio:</span>{" "}
              {data.meioPagamento || "-"}
            </p>
          </div>

          <div className="rounded-xl border border-[#2f2f2f] bg-[#0f0f0f] p-4 text-sm text-[#c7c7c7]">
            {data.descricao || "Sem descricao."}
          </div>

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
              className="inline-flex items-center gap-2 rounded-lg border border-[#d0862b]/40 px-4 py-2 text-sm font-semibold text-[#f6c37f] hover:bg-[#d0862b]/10"
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

export default function SelfMachinePage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detalhes, setDetalhes] = useState(null);

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
    <section className="min-h-full rounded-3xl bg-linear-to-br from-[#121212] via-[#16130d] to-[#0e0e0e] p-4 sm:p-6 text-[#f4f4f4] border border-[#262626] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#d0862b]">
            SelfMachine
          </p>
          <h1 className="text-2xl font-semibold">Centro de Comando SaaS</h1>
          <p className="text-sm text-[#a5a5a5] mt-1">
            Dashboard de clientes, contratos e cobrancas recorrentes.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-[#d0862b] px-4 py-2 text-sm font-semibold text-[#171717] hover:brightness-110"
        >
          <Plus size={16} />
          Novo SaaS
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[#2f2f2f] bg-[#151515]/90 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[#9a9a9a]">
            Contratos
          </p>
          <p className="text-2xl font-semibold mt-1">{metricas.total}</p>
        </div>
        <div className="rounded-2xl border border-[#2f2f2f] bg-[#151515]/90 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[#9a9a9a]">
            Sistemas Ativos
          </p>
          <p className="text-2xl font-semibold mt-1">{metricas.ativos}</p>
        </div>
        <div className="rounded-2xl border border-[#2f2f2f] bg-[#151515]/90 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[#9a9a9a]">
            Clientes em Atraso
          </p>
          <p className="text-2xl font-semibold mt-1 text-rose-300">
            {metricas.atrasados}
          </p>
        </div>
        <div className="rounded-2xl border border-[#2f2f2f] bg-[#151515]/90 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[#9a9a9a]">
            MRR Estimado
          </p>
          <p className="text-2xl font-semibold mt-1 text-[#f4c074]">
            {formatCurrency(metricas.mrr)}
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="mt-8 text-sm text-[#9c9c9c]">
          Carregando contratos...
        </div>
      )}

      {!isLoading && contratos.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-[#3b3b3b] bg-[#111] p-8 text-center text-sm text-[#999]">
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
                className="rounded-2xl border border-[#2e2e2e] bg-[#111]/90 p-4 hover:border-[#d0862b]/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-xl bg-[#1d1d1d] border border-[#353535] flex items-center justify-center text-[9px] font-bold tracking-[0.12em] text-[#f5be6d]">
                      SELF
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-[#1d1d1d] border border-[#353535] overflow-hidden">
                      {contrato.logoParceiraUrl ? (
                        <img
                          src={contrato.logoParceiraUrl}
                          alt={`Logo ${contrato.nomeCliente}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[9px] text-[#8a8a8a]">
                          LOGO
                        </div>
                      )}
                    </div>
                  </div>

                  <span
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] ${STATUS_STYLE[status] || "bg-[#2c2c2c] text-[#ddd] border-[#4a4a4a]"}`}
                  >
                    {STATUS_LABEL[status] || status}
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-semibold">
                  {contrato.nomeSistema}
                </h3>
                <p className="text-sm text-[#a5a5a5]">{contrato.nomeCliente}</p>

                <div className="mt-4 rounded-xl border border-[#2f2f2f] bg-[#171717] p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#9b9b9b]">
                    Proxima Mensalidade
                  </p>
                  <p className="mt-1 text-xl font-semibold text-[#f6c37f]">
                    {formatCurrency(contrato.valorMensalidade)}
                  </p>
                  <p className="mt-1 text-xs text-[#8f8f8f]">
                    Inicio: {formatDate(contrato.dataInicioMensalidade)}
                  </p>
                  <p className="mt-1 text-xs text-[#8f8f8f]">
                    Ult. pagamento:{" "}
                    {formatDate(contrato.ultimaMensalidadePagaEm)}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(contrato)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#404040] px-3 py-1.5 text-xs text-[#e7e7e7] hover:border-[#d0862b]/50"
                  >
                    <Pencil size={13} /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(contrato)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#4f2b2b] px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/10"
                  >
                    <Trash2 size={13} /> Excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetalhes(contrato)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#2f4d66] px-3 py-1.5 text-xs text-sky-200 hover:bg-sky-500/10"
                  >
                    <Eye size={13} /> Detalhes
                  </button>
                  <button
                    type="button"
                    onClick={() => gerarPedidoMutation.mutate(contrato.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#5e4d2f] px-3 py-1.5 text-xs text-[#ffd797] hover:bg-[#d0862b]/10"
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

      {(saveMutation.isError ||
        deleteMutation.isError ||
        gerarPedidoMutation.isError) && (
        <p className="mt-4 text-sm text-rose-300">
          {saveMutation.error?.response?.data?.message ||
            deleteMutation.error?.response?.data?.message ||
            gerarPedidoMutation.error?.response?.data?.message ||
            "Erro ao processar operacao no modulo SelfMachine."}
        </p>
      )}
    </section>
  );
}
