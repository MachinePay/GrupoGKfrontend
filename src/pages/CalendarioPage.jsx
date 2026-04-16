import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCheck,
  Filter,
  History,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Pencil,
  PlusCircle,
  Trash2,
  X,
} from "lucide-react";
import api, { agendaApi, fornecedoresApi } from "../services/api.js";
import { useContas, useEmpresas, useProjetos } from "../hooks/useFinanceiro.js";
import { Badge } from "../components/ui/Badge.jsx";
import { Input, Select } from "../components/ui/FormField.jsx";
import { formatCurrency, formatDate } from "../lib/utils.js";

const STATUS_FILTER = [
  { value: "", label: "Todos" },
  { value: "PREVISTO", label: "Previsto" },
  { value: "ATRASADO", label: "Atrasado" },
  { value: "REALIZADO", label: "Realizado" },
];

const TIPO_FILTER = [
  { value: "", label: "Todos" },
  { value: "PAGAR", label: "Pagar" },
  { value: "RECEBER", label: "Receber" },
];

const CATEGORIAS_ENTRADA = [
  { value: "PEDIDO", label: "Pedido" },
  { value: "COMISSAO", label: "Comissão" },
  { value: "RECOLHE_LOJAS", label: "Recolhe Lojas" },
  { value: "BOLETO", label: "Boleto" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "AJUSTE_SALDO", label: "Ajuste de Saldo" },
];

const CATEGORIAS_SAIDA = [
  { value: "FORNECEDOR", label: "Fornecedor" },
  { value: "CUSTO_FIXO", label: "Custo Fixo" },
  { value: "CUSTO_VARIAVEL", label: "Custo Variável" },
  { value: "INVESTIMENTO", label: "Investimento" },
  { value: "PREJUIZO", label: "Prejuízo" },
];

const SUBCATEGORIAS_GIRAKIDS = [
  { value: "TAKE_PARCERIA", label: "TakeParceria" },
  { value: "PELUCIA_PARCERIA", label: "PelúciaParceria" },
  { value: "OUTROS", label: "Outros" },
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

const PRIORIDADE_OPTIONS = [
  { value: "ALTA", label: "Alta" },
  { value: "MEDIA", label: "Média" },
  { value: "BAIXA", label: "Baixa" },
];

const STATUS_OPTIONS = [
  { value: "PREVISTO", label: "Previsto" },
  { value: "ATRASADO", label: "Atrasado" },
  { value: "REALIZADO", label: "Realizado" },
];

const TIPO_OPTIONS = [
  { value: "PAGAR", label: "Pagar" },
  { value: "RECEBER", label: "Receber" },
];

const TIPO_PAGAMENTO_OPTIONS = [
  { value: "PIX", label: "Pix" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "BOLETO", label: "Boleto" },
];

const ORIGEM_TIPO_OPTIONS = [
  { value: "DOACAO", label: "Doação" },
  { value: "FORNECEDOR", label: "Fornecedor" },
  { value: "CF", label: "CF" },
  { value: "CV", label: "CV" },
  { value: "DIVERSOS", label: "Diversos" },
  { value: "FP", label: "FP" },
];

const INITIAL_FORM = {
  titulo: "",
  descricao: "",
  origem: "",
  origemTipo: "",
  tipoPagamento: "",
  fornecedorId: "",
  empresaId: "",
  data: "",
  valor: "",
  prioridade: "MEDIA",
  status: "PREVISTO",
  tipo: "PAGAR",
  recurrenteAte: "",
};

function getCreatorName(item) {
  return item?.usuarioCriacao?.nome || "Sistema";
}

function AgendaForm({ item, onCancel, onSuccess }) {
  const qc = useQueryClient();
  const { data: empresas = [] } = useEmpresas();
  const { data: fornecedores = [] } = useQuery({
    queryKey: ["fornecedores"],
    queryFn: () =>
      fornecedoresApi
        .listar({ ativo: true })
        .then((r) => r.data)
        .catch(() => []),
  });

  const [form, setForm] = useState(() => ({
    titulo: item?.titulo ?? INITIAL_FORM.titulo,
    descricao: item?.descricao ?? INITIAL_FORM.descricao,
    origem: item?.origem ?? INITIAL_FORM.origem,
    origemTipo: item?.origemTipo ?? INITIAL_FORM.origemTipo,
    tipoPagamento: item?.tipoPagamento ?? INITIAL_FORM.tipoPagamento,
    fornecedorId: item?.fornecedorId
      ? String(item.fornecedorId)
      : INITIAL_FORM.fornecedorId,
    empresaId: item?.empresaId
      ? String(item.empresaId)
      : INITIAL_FORM.empresaId,
    data: item?.data
      ? new Date(item.data).toISOString().slice(0, 10)
      : INITIAL_FORM.data,
    valor: item?.valor ? String(item.valor) : INITIAL_FORM.valor,
    prioridade: item?.prioridade ?? INITIAL_FORM.prioridade,
    status: item?.status ?? INITIAL_FORM.status,
    tipo: item?.tipo ?? INITIAL_FORM.tipo,
    tipoPagamento: item?.tipoPagamento ?? INITIAL_FORM.tipoPagamento,
    origemTipo: item?.origemTipo ?? INITIAL_FORM.origemTipo,
    fornecedorId: item?.fornecedorId
      ? String(item.fornecedorId)
      : INITIAL_FORM.fornecedorId,
    recurrenteAte: item?.recurrenteAte
      ? new Date(item.recurrenteAte).toISOString().slice(0, 10)
      : INITIAL_FORM.recurrenteAte,
  }));
  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: (payload) =>
      item ? agendaApi.atualizar(item.id, payload) : agendaApi.criar(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda"] });
      onSuccess?.();
    },
  });

  function set(field) {
    return (event) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  function validate() {
    const nextErrors = {};
    if (!form.titulo.trim()) nextErrors.titulo = "Obrigatório";
    if (!form.empresaId) nextErrors.empresaId = "Obrigatório";
    if (!form.data) nextErrors.data = "Obrigatório";
    if (!form.valor || Number(form.valor) <= 0)
      nextErrors.valor = "Valor inválido";
    if (!form.prioridade) nextErrors.prioridade = "Obrigatório";
    if (!form.status) nextErrors.status = "Obrigatório";
    if (!form.tipo) nextErrors.tipo = "Obrigatório";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      ...form,
      empresaId: Number(form.empresaId),
      valor: Number(form.valor),
      descricao: form.descricao || undefined,
      origem: form.origem || undefined,
      origemTipo: form.origemTipo || undefined,
      tipoPagamento: form.tipoPagamento || undefined,
      fornecedorId: form.fornecedorId ? Number(form.fornecedorId) : undefined,
      recurrenteAte: form.recurrenteAte || undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glass card-shadow rounded-2xl p-6 space-y-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PlusCircle size={18} className="text-blue-400" />
          <div>
            <h2 className="text-base font-semibold text-white">
              {item ? "Editar compromisso" : "Novo compromisso"}
            </h2>
            <p className="text-xs text-slate-500">
              Cadastre contas a pagar e receber sem impactar o saldo até a
              baixa.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="btn-ghost inline-flex items-center gap-1.5 text-xs"
        >
          <X size={14} /> Fechar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Input
          label="Título"
          value={form.titulo}
          onChange={set("titulo")}
          error={errors.titulo}
        />
        <Select
          label="Empresa"
          value={form.empresaId}
          onChange={set("empresaId")}
          options={empresas.map((empresa) => ({
            value: empresa.id,
            label: empresa.nome,
          }))}
          placeholder="Selecione…"
          error={errors.empresaId}
        />
        <Input
          label="Data"
          type="date"
          value={form.data}
          onChange={set("data")}
          error={errors.data}
        />
        <Input
          label="Valor (R$)"
          type="number"
          step="0.01"
          min="0"
          value={form.valor}
          onChange={set("valor")}
          error={errors.valor}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          label="Prioridade"
          value={form.prioridade}
          onChange={set("prioridade")}
          options={PRIORIDADE_OPTIONS}
          error={errors.prioridade}
        />
        <Select
          label="Status"
          value={form.status}
          onChange={set("status")}
          options={STATUS_OPTIONS}
          error={errors.status}
        />
        <Select
          label="Tipo"
          value={form.tipo}
          onChange={set("tipo")}
          options={TIPO_OPTIONS}
          error={errors.tipo}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Select
          label="Tipo de Pagamento"
          value={form.tipoPagamento}
          onChange={set("tipoPagamento")}
          options={TIPO_PAGAMENTO_OPTIONS}
          placeholder="Selecione…"
        />
        <Select
          label="Origem"
          value={form.origemTipo}
          onChange={set("origemTipo")}
          options={ORIGEM_TIPO_OPTIONS}
          placeholder="Selecione…"
        />
        {form.origemTipo === "FORNECEDOR" && (
          <Select
            label="Fornecedor"
            value={form.fornecedorId}
            onChange={set("fornecedorId")}
            options={fornecedores.map((f) => ({
              value: f.id,
              label: f.nome,
            }))}
            placeholder="Selecione…"
          />
        )}
        <Input
          label="Recorrente até"
          type="date"
          value={form.recurrenteAte}
          onChange={set("recurrenteAte")}
          placeholder="Deixe em branco se não for recorrente"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Descrição
          </label>
          <textarea
            value={form.descricao}
            onChange={set("descricao")}
            rows={3}
            className="input-base resize-none"
            placeholder="Detalhes adicionais, observações ou contexto operacional"
          />
        </div>
      </div>

      {mutation.isError && (
        <p
          className={`text-sm rounded-xl px-4 py-2 ${mutation.error?.response?.status === 409 ? "text-amber-300 bg-amber-500/10" : "text-red-400 bg-red-500/10"}`}
        >
          {mutation.error?.response?.data?.message ??
            "Erro ao salvar compromisso."}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          className="btn-primary"
          disabled={mutation.isPending}
        >
          {mutation.isPending
            ? "Salvando…"
            : item
              ? "Salvar alterações"
              : "Criar compromisso"}
        </button>
      </div>
    </form>
  );
}

function DarBaixaModal({ item, onConfirm, onCancel, isLoading }) {
  const { data: contas = [] } = useContas(item?.empresaId);
  const { data: projetos = [] } = useProjetos(
    item?.empresa?.nome === "MaisQuiosque" ? item?.empresaId : undefined,
  );
  const [contaId, setContaId] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tipoDespesa, setTipoDespesa] = useState("");
  const [projetoId, setProjetoId] = useState("");
  const [subcategoria, setSubcategoria] = useState("");
  const [dataBaixa, setDataBaixa] = useState(
    item?.data ? new Date(item.data).toISOString().slice(0, 10) : "",
  );

  const isMaisQuiosque = item?.empresa?.nome === "MaisQuiosque";
  const isGiraKids = item?.empresa?.nome === "GiraKids";
  const categoriaOptions =
    item?.tipo === "PAGAR" ? CATEGORIAS_SAIDA : CATEGORIAS_ENTRADA;
  const tipoDespesaOptions =
    categoria === "CUSTO_FIXO"
      ? TIPOS_DESPESA_CUSTO_FIXO
      : categoria === "CUSTO_VARIAVEL"
        ? TIPOS_DESPESA_CUSTO_VARIAVEL
        : [];
  const canSubmit =
    !!contaId &&
    !!categoria &&
    !!dataBaixa &&
    (categoria !== "CUSTO_FIXO" && categoria !== "CUSTO_VARIAVEL"
      ? true
      : !!tipoDespesa) &&
    (!isMaisQuiosque || !!projetoId) &&
    (!isGiraKids || !!subcategoria);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass card-shadow rounded-2xl p-6 w-full max-w-md space-y-4">
        <div className="flex items-center gap-2">
          <CheckCheck size={18} className="text-emerald-400" />
          <h3 className="font-semibold text-white">Dar Baixa</h3>
        </div>
        <div className="text-sm text-slate-400 space-y-1">
          <p>
            <span className="text-white font-medium">{item?.titulo}</span>
          </p>
          {item?.descricao && <p>{item.descricao}</p>}
          <p>
            Valor:{" "}
            <span className="text-white">{formatCurrency(item?.valor)}</span>
          </p>
          <p>
            Empresa: <span className="text-white">{item?.empresa?.nome}</span>
          </p>
          <p>
            Criado por:{" "}
            <span className="text-white">{getCreatorName(item)}</span>
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {item?.tipo === "PAGAR" ? "Conta Debitada" : "Conta Creditada"}
            </label>
            <select
              value={contaId}
              onChange={(e) => setContaId(e.target.value)}
              className="input-base"
            >
              <option value="">Selecione a conta…</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.banco} – {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Categoria
            </label>
            <select
              value={categoria}
              onChange={(e) => {
                setCategoria(e.target.value);
                if (
                  e.target.value !== "CUSTO_FIXO" &&
                  e.target.value !== "CUSTO_VARIAVEL"
                ) {
                  setTipoDespesa("");
                }
              }}
              className="input-base"
            >
              <option value="">Selecione a categoria…</option>
              {categoriaOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {(categoria === "CUSTO_FIXO" || categoria === "CUSTO_VARIAVEL") && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Tipo de Despesa
              </label>
              <select
                value={tipoDespesa}
                onChange={(e) => setTipoDespesa(e.target.value)}
                className="input-base"
              >
                <option value="">Selecione o tipo de despesa…</option>
                {tipoDespesaOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Data da baixa
            </label>
            <input
              type="date"
              value={dataBaixa}
              onChange={(e) => setDataBaixa(e.target.value)}
              className="input-base"
            />
          </div>
          {isMaisQuiosque && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Projeto
              </label>
              <select
                value={projetoId}
                onChange={(e) => setProjetoId(e.target.value)}
                className="input-base"
              >
                <option value="">Selecione o projeto…</option>
                {projetos.map((projeto) => (
                  <option key={projeto.id} value={projeto.id}>
                    {projeto.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
          {isGiraKids && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Subcategoria
              </label>
              <select
                value={subcategoria}
                onChange={(e) => setSubcategoria(e.target.value)}
                className="input-base"
              >
                <option value="">Selecione a subcategoria…</option>
                {SUBCATEGORIAS_GIRAKIDS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-ghost flex-1">
            Cancelar
          </button>
          <button
            onClick={() =>
              onConfirm(item, {
                contaId,
                categoria,
                tipoDespesa: tipoDespesa || undefined,
                projetoId: projetoId || undefined,
                subcategoria: subcategoria || undefined,
                data: dataBaixa,
              })
            }
            disabled={!canSubmit || isLoading}
            className="btn-primary flex-1"
          >
            {isLoading ? "Confirmando…" : "Confirmar Baixa"}
          </button>
        </div>
      </div>
    </div>
  );
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const WEEKDAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function CalendarGrid({
  year,
  month,
  itens,
  onPrevMonth,
  onNextMonth,
  onBaixa,
  onEdit,
}) {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDay = useMemo(() => {
    const map = {};
    for (const item of itens) {
      const d = new Date(item.data);
      const key = d.getUTCDate();
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [itens]);

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayDate = new Date();
  const isCurrentMonth =
    todayDate.getFullYear() === year && todayDate.getMonth() === month;

  return (
    <div className="glass card-shadow rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <button
          onClick={onPrevMonth}
          className="btn-ghost inline-flex items-center gap-1 text-xs"
        >
          <ChevronLeft size={14} /> Anterior
        </button>
        <h3 className="text-sm font-semibold text-white">
          {MONTH_NAMES[month]} {year}
        </h3>
        <button
          onClick={onNextMonth}
          className="btn-ghost inline-flex items-center gap-1 text-xs"
        >
          Próximo <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 border-b border-white/5">
        {WEEKDAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-xs text-slate-500 py-2 font-medium uppercase tracking-wide"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-24 border-b border-r border-white/5 bg-transparent"
              />
            );
          }
          const dayItems = byDay[day] ?? [];
          const isToday = isCurrentMonth && todayDate.getDate() === day;
          const pagar = dayItems.filter(
            (i) => i.tipo === "PAGAR" && i.status !== "REALIZADO",
          );
          const receber = dayItems.filter(
            (i) => i.tipo === "RECEBER" && i.status !== "REALIZADO",
          );
          const totalPagar = pagar.reduce((s, i) => s + Number(i.valor), 0);
          const totalReceber = receber.reduce((s, i) => s + Number(i.valor), 0);

          return (
            <div
              key={day}
              className={`min-h-24 border-b border-r border-white/5 p-1.5 flex flex-col gap-1 ${isToday ? "bg-blue-500/10" : ""}`}
            >
              <span
                className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full ${isToday ? "bg-blue-500 text-white" : "text-slate-400"}`}
              >
                {day}
              </span>
              {totalPagar > 0 && (
                <div className="text-xs text-red-400 font-medium truncate">
                  -{formatCurrency(totalPagar)}
                </div>
              )}
              {totalReceber > 0 && (
                <div className="text-xs text-emerald-400 font-medium truncate">
                  +{formatCurrency(totalReceber)}
                </div>
              )}
              <div className="space-y-0.5 overflow-hidden">
                {dayItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className={`text-xs rounded px-1 py-0.5 cursor-pointer transition-opacity hover:opacity-80 ${
                      item.status === "REALIZADO"
                        ? "text-slate-500 bg-white/5 line-through"
                        : item.tipo === "RECEBER"
                          ? "text-emerald-300 bg-emerald-500/10"
                          : "text-red-300 bg-red-500/10"
                    }`}
                    title={`${item.titulo}${item.origem ? ` — ${item.origem}` : ""} (${item.empresa?.nome}) · Criado por: ${getCreatorName(item)}`}
                    onClick={() => item.status !== "REALIZADO" && onBaixa(item)}
                  >
                    <div className="truncate">{item.titulo}</div>
                    <div className="truncate text-[10px] opacity-80">
                      {getCreatorName(item)}
                    </div>
                  </div>
                ))}
                {dayItems.length > 3 && (
                  <div className="text-xs text-slate-500 pl-1">
                    +{dayItems.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarioPage() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const { data: empresas = [] } = useEmpresas();

  const [dataInicio, setDataInicio] = useState(
    firstDay.toISOString().slice(0, 10),
  );
  const [dataFim, setDataFim] = useState(lastDay.toISOString().slice(0, 10));
  const [statusFiltro, setStatusFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [empresaFiltro, setEmpresaFiltro] = useState("");
  const [criadorFiltro, setCriadorFiltro] = useState("");
  const [baixaItem, setBaixaItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState("lista");
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [historicoPage, setHistoricoPage] = useState(1);
  const qc = useQueryClient();

  const { data: usuariosCriadores = [] } = useQuery({
    queryKey: ["agenda", "criadores"],
    queryFn: () => api.get("/usuarios").then((r) => r.data),
  });

  const { data: itens = [], isLoading } = useQuery({
    queryKey: [
      "agenda",
      dataInicio,
      dataFim,
      statusFiltro,
      tipoFiltro,
      empresaFiltro,
      criadorFiltro,
    ],
    queryFn: () =>
      agendaApi
        .listar({
          dataInicio,
          dataFim,
          ...(statusFiltro && { status: statusFiltro }),
          ...(tipoFiltro && { tipo: tipoFiltro }),
          ...(empresaFiltro && { empresaId: empresaFiltro }),
          ...(criadorFiltro && { usuarioCriacaoId: criadorFiltro }),
        })
        .then((r) => r.data),
  });

  const {
    data: historicoBaixas = { items: [], pagination: null },
    isLoading: loadingHistorico,
  } = useQuery({
    queryKey: [
      "agenda",
      "baixas",
      dataInicio,
      dataFim,
      empresaFiltro,
      criadorFiltro,
      historicoPage,
    ],
    queryFn: () =>
      agendaApi
        .listarBaixas({
          dataInicio,
          dataFim,
          ...(empresaFiltro && { empresaId: empresaFiltro }),
          ...(criadorFiltro && { usuarioCriacaoId: criadorFiltro }),
          limit: 10,
          page: historicoPage,
        })
        .then((r) => r.data),
  });

  const calendarDataInicio = useMemo(
    () => new Date(calendarYear, calendarMonth, 1).toISOString().slice(0, 10),
    [calendarYear, calendarMonth],
  );
  const calendarDataFim = useMemo(
    () =>
      new Date(calendarYear, calendarMonth + 1, 0).toISOString().slice(0, 10),
    [calendarYear, calendarMonth],
  );

  const { data: calendarItens = [], isLoading: loadingCalendar } = useQuery({
    queryKey: [
      "agenda",
      "calendar",
      calendarDataInicio,
      calendarDataFim,
      empresaFiltro,
      criadorFiltro,
    ],
    queryFn: () =>
      agendaApi
        .listar({
          dataInicio: calendarDataInicio,
          dataFim: calendarDataFim,
          ...(empresaFiltro && { empresaId: empresaFiltro }),
          ...(criadorFiltro && { usuarioCriacaoId: criadorFiltro }),
        })
        .then((r) => r.data),
    enabled: viewMode === "calendario",
  });

  const historicoItems = Array.isArray(historicoBaixas)
    ? historicoBaixas
    : (historicoBaixas.items ?? []);
  const historicoPagination = Array.isArray(historicoBaixas)
    ? {
        page: 1,
        totalPages: 1,
        total: historicoBaixas.length,
        hasNextPage: false,
        hasPrevPage: false,
      }
    : historicoBaixas.pagination;

  const baixaMutation = useMutation({
    mutationFn: ({ item, payload }) =>
      agendaApi.baixar(item.id, {
        contaId: Number(payload.contaId),
        categoria: payload.categoria,
        tipoDespesa: payload.tipoDespesa || undefined,
        projetoId: payload.projetoId ? Number(payload.projetoId) : undefined,
        subcategoria: payload.subcategoria || undefined,
        data: payload.data || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setBaixaItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => agendaApi.remover(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agenda"] });
    },
  });

  function handleBaixa(item, payload) {
    baixaMutation.mutate({ item, payload });
  }

  function handleDelete(item) {
    const isRealizado = item.status === "REALIZADO";
    const ok = window.confirm(
      isRealizado
        ? `Deseja excluir o compromisso "${item.titulo}"? A movimentacao financeira vinculada tambem sera removida e o saldo sera estornado.`
        : `Deseja excluir o compromisso "${item.titulo}"?`,
    );
    if (!ok) return;
    deleteMutation.mutate(item.id);
  }

  function handleStartEdit(item) {
    setEditingItem(item);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const sortedItens = useMemo(
    () =>
      [...itens].sort(
        (left, right) => new Date(left.data) - new Date(right.data),
      ),
        function handleStartEdit(item) {
          setEditingItem(item);
          setShowForm(true);
          // Usar setTimeout para garantir que o estado foi atualizado antes de fazer scroll
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            // Fallback se smooth scroll não funcionar
            const formElement = document.querySelector("form");
            if (formElement) {
              formElement.focus();
            }
          }, 0);
        }
    .filter((i) => i.tipo === "PAGAR")
    .reduce((s, i) => s + Number(i.valor), 0);
  const totalReceber = totaisPrevisto
    .filter((i) => i.tipo === "RECEBER")
    .reduce((s, i) => s + Number(i.valor), 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">
              Calendário Financeiro
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Contas a pagar e receber organizadas por data
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-xl glass p-1 shrink-0">
            <button
              onClick={() => setViewMode("lista")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === "lista" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              <List size={13} /> Lista
            </button>
            <button
              onClick={() => setViewMode("calendario")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === "calendario" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              <LayoutGrid size={13} /> Calendário
            </button>
          </div>
        </div>
      </div>

      {showForm ? (
        <AgendaForm
          item={editingItem}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      ) : (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setEditingItem(null);
              setShowForm(true);
            }}
            className="btn-primary inline-flex items-center gap-2"
          >
            <PlusCircle size={16} /> Novo compromisso
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-4 border border-red-500/20">
          <p className="text-xs text-red-400 uppercase tracking-wider mb-1">
            A Pagar (previsto)
          </p>
          <p className="text-xl font-bold text-white">
            {formatCurrency(totalPagar)}
          </p>
        </div>
        <div className="glass rounded-2xl p-4 border border-emerald-500/20">
          <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">
            A Receber (previsto)
          </p>
          <p className="text-xl font-bold text-white">
            {formatCurrency(totalReceber)}
          </p>
        </div>
      </div>
      {viewMode === "calendario" ? (
        <>
          <div className="flex flex-wrap gap-3 items-center">
            <Filter size={14} className="text-slate-400" />
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
            <div className="min-w-52">
              <Select
                value={criadorFiltro}
                onChange={(e) => setCriadorFiltro(e.target.value)}
                options={usuariosCriadores.map((usuario) => ({
                  value: usuario.id,
                  label: usuario.nome,
                }))}
                placeholder="Todos os criadores"
              />
            </div>
          </div>
          {loadingCalendar ? (
            <div className="text-sm text-slate-500 py-8 text-center">
              Carregando calendário…
            </div>
          ) : (
            <CalendarGrid
              year={calendarYear}
              month={calendarMonth}
              itens={calendarItens}
              onPrevMonth={() => {
                if (calendarMonth === 0) {
                  setCalendarMonth(11);
                  setCalendarYear((y) => y - 1);
                } else {
                  setCalendarMonth((m) => m - 1);
                }
              }}
              onNextMonth={() => {
                if (calendarMonth === 11) {
                  setCalendarMonth(0);
                  setCalendarYear((y) => y + 1);
                } else {
                  setCalendarMonth((m) => m + 1);
                }
              }}
              onBaixa={setBaixaItem}
              onEdit={handleStartEdit}
            />
          )}
        </>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 items-center">
            <Filter size={14} className="text-slate-400" />
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => {
                setDataInicio(e.target.value);
                setHistoricoPage(1);
              }}
              className="input-base"
              style={{ width: 150 }}
            />
            <span className="text-slate-500 text-sm">até</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => {
                setDataFim(e.target.value);
                setHistoricoPage(1);
              }}
              className="input-base"
              style={{ width: 150 }}
            />
            <div className="min-w-48">
              <Select
                value={empresaFiltro}
                onChange={(e) => {
                  setEmpresaFiltro(e.target.value);
                  setHistoricoPage(1);
                }}
                options={empresas.map((empresa) => ({
                  value: empresa.id,
                  label: empresa.nome,
                }))}
                placeholder="Todas as empresas"
              />
            </div>
            <div className="min-w-52">
              <Select
                value={criadorFiltro}
                onChange={(e) => {
                  setCriadorFiltro(e.target.value);
                  setHistoricoPage(1);
                }}
                options={usuariosCriadores.map((usuario) => ({
                  value: usuario.id,
                  label: usuario.nome,
                }))}
                placeholder="Todos os criadores"
              />
            </div>
            <div className="flex gap-1">
              {STATUS_FILTER.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStatusFiltro(s.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    statusFiltro === s.value
                      ? "bg-blue-600 text-white"
                      : "glass text-slate-400 hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              {TIPO_FILTER.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setTipoFiltro(s.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    tipoFiltro === s.value
                      ? "bg-slate-100 text-slate-900"
                      : "glass text-slate-400 hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="glass card-shadow rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-white/5 text-xs text-slate-500 uppercase tracking-wider">
              <div className="col-span-2">Data</div>
              <div className="col-span-3">Título</div>
              <div className="col-span-2">Empresa</div>
              <div className="col-span-2 text-right">Valor</div>
              <div className="col-span-1 text-center">Tipo</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-1 text-center">Ação</div>
            </div>
            {isLoading && (
              <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
                Carregando agenda…
              </div>
            )}
            {!isLoading && itens.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <CalendarDays size={32} className="mb-2 opacity-40" />
                <p className="text-sm">
                  Nenhum item encontrado para este período.
                </p>
              </div>
            )}
            {sortedItens.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2 px-5 py-3.5 border-b border-white/5 hover:bg-white/2 transition-colors items-center"
              >
                <div className="col-span-2 text-sm text-slate-300">
                  {formatDate(item.data)}
                </div>
                <div className="col-span-3 text-sm text-white font-medium">
                  <div className="truncate">{item.titulo}</div>
                  {item.descricao && (
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {item.descricao}
                    </div>
                  )}
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    Criado por: {getCreatorName(item)}
                  </div>
                  <div className="text-xs text-slate-400 truncate mt-0.5 space-x-2">
                    {item.tipoPagamento && <span>💳 {item.tipoPagamento}</span>}
                    {item.fornecedor && <span>🤝 {item.fornecedor.nome}</span>}
                  </div>
                </div>
                <div className="col-span-2 text-xs text-slate-400 truncate">
                  {item.empresa?.nome}
                </div>
                <div
                  className={`col-span-2 text-sm font-semibold text-right tabular-nums ${item.tipo === "RECEBER" ? "text-emerald-400" : "text-red-400"}`}
                >
                  {item.tipo === "RECEBER" ? "+" : "-"}{" "}
                  {formatCurrency(item.valor)}
                </div>
                <div className="col-span-1 text-center">
                  <span
                    className={`text-xs font-medium ${item.tipo === "RECEBER" ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {item.tipo === "RECEBER" ? "Receber" : "Pagar"}
                  </span>
                </div>
                <div className="col-span-1 text-center">
                  <Badge status={item.status} />
                </div>
                <div className="col-span-1 text-center space-y-1">
                  <button
                    onClick={() => handleStartEdit(item)}
                    className="block w-full text-xs text-slate-300 hover:text-white font-medium transition-colors"
                  >
                    <span className="inline-flex items-center gap-1">
                      <Pencil size={11} /> Editar
                    </span>
                  </button>
                  {item.status !== "REALIZADO" && (
                    <button
                      onClick={() => setBaixaItem(item)}
                      className="block w-full text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      Baixar
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item)}
                    className="block w-full text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
                    disabled={deleteMutation.isPending}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Trash2 size={11} /> Excluir
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="glass card-shadow rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History size={16} className="text-emerald-300" />
            <h2 className="text-sm font-semibold text-white">
              Histórico de Baixas
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Últimos itens realizados
          </span>
        </div>

        {loadingHistorico ? (
          <div className="text-sm text-slate-500 py-4">
            Carregando histórico...
          </div>
        ) : historicoItems.length === 0 ? (
          <div className="text-sm text-slate-500 py-4">
            Nenhuma baixa registrada neste período.
          </div>
        ) : (
          <div className="space-y-2">
            {historicoItems.map((item) => (
              <div
                key={`hist-${item.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{item.titulo}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {item.empresa?.nome} · {formatDate(item.data)}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    Criado por: {getCreatorName(item)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-semibold ${item.tipo === "RECEBER" ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {item.tipo === "RECEBER" ? "+" : "-"}{" "}
                    {formatCurrency(item.valor)}
                  </p>
                  <div className="mt-1">
                    <Badge status={item.status} />
                  </div>
                </div>
              </div>
            ))}

            {historicoPagination && historicoPagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-500">
                  Página {historicoPagination.page} de{" "}
                  {historicoPagination.totalPages} · {historicoPagination.total}{" "}
                  registros
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHistoricoPage((p) => Math.max(1, p - 1))}
                    disabled={!historicoPagination.hasPrevPage}
                    className="btn-ghost inline-flex items-center gap-1 text-xs disabled:opacity-40"
                  >
                    <ChevronLeft size={13} /> Anterior
                  </button>
                  <button
                    onClick={() => setHistoricoPage((p) => p + 1)}
                    disabled={!historicoPagination.hasNextPage}
                    className="btn-ghost inline-flex items-center gap-1 text-xs disabled:opacity-40"
                  >
                    Próxima <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {baixaItem && (
        <DarBaixaModal
          item={baixaItem}
          onConfirm={handleBaixa}
          onCancel={() => setBaixaItem(null)}
          isLoading={baixaMutation.isPending}
        />
      )}
    </div>
  );
}
