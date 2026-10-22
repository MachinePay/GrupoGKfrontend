import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Copy,
  CreditCard,
  Download,
  FileSpreadsheet,
  History,
  Loader2,
  MessageCircle,
  Minus,
  MoreVertical,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cadastrosApi, machinePayApi } from "../services/api.js";
import { cn, formatCurrency, formatDate } from "../lib/utils.js";
import {
  exportarCobrancasExcel,
  lerPlanilhaMachinePay,
} from "../lib/machinePayImport.js";

// ─── Constantes e helpers ───────────────────────────────────────────────────

const MESES = [
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
const PRESETS_VALOR = [30, 35, 40, 49, 60, 65];
const FORMAS_PAGAMENTO = ["PIX", "Boleto", "Transferência", "Dinheiro", "Cartão"];
const TIPOS_MAQUINA = {
  PROPRIA: { label: "Próprias", campo: "maquinasProprias" },
  PLANO36: { label: "Plano 36", campo: "maquinasPlano36" },
  OFF: { label: "Off", campo: "maquinasOff" },
};

function competenciaAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function deslocarCompetencia(comp, delta) {
  const [ano, mes] = comp.split("-").map(Number);
  const d = new Date(ano, mes - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function rotuloCompetencia(comp, curto = false) {
  const [ano, mes] = comp.split("-").map(Number);
  const nome = MESES[mes - 1];
  return curto ? `${nome.slice(0, 3)}/${String(ano).slice(2)}` : `${nome} ${ano}`;
}

function hojeInput() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizarBusca(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function tempoRelativo(dias) {
  if (dias === null || dias === undefined) return "Nunca pagou";
  if (dias === 0) return "Hoje";
  if (dias === 1) return "Há 1 dia";
  if (dias < 60) return `Há ${dias} dias`;
  return `Há ${Math.floor(dias / 30)} meses`;
}

function formatarTelefone(tel) {
  const d = String(tel || "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel || "";
}

// Copia texto para a area de transferencia (com fallback para navegadores antigos).
async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const area = document.createElement("textarea");
    area.value = texto;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    if (!ok) throw new Error("Não foi possível copiar a mensagem.");
  }
}

function linkWhatsApp(telefone, mensagem) {
  let d = String(telefone || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length <= 11) d = `55${d}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(mensagem)}`;
}

function calcularMensal(c) {
  if (c.valorFixo !== null && c.valorFixo !== undefined && c.valorFixo !== "") {
    return Number(c.valorFixo) || 0;
  }
  return (
    (Number(c.maquinasProprias) || 0) * (Number(c.valorMensalidade) || 0) +
    (Number(c.maquinasPlano36) || 0) * (Number(c.valorMensalidade36) || 0)
  );
}

function erroApi(err) {
  return err?.response?.data?.message || err?.message || "Erro inesperado.";
}

// ─── Componentes base ───────────────────────────────────────────────────────

const SITUACAO = {
  PAGO: {
    label: "Pago",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  PENDENTE: {
    label: "A vencer",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  ATRASADO: {
    label: "Atrasado",
    cls: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
  },
  CANCELADO: {
    label: "Cancelado",
    cls: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
  },
  ATIVO: {
    label: "Ativo",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  SUSPENSO: {
    label: "Suspenso",
    cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  INATIVO: {
    label: "Inativo",
    cls: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30",
  },
};

function Pill({ status, children }) {
  const s = SITUACAO[status] ?? SITUACAO.CANCELADO;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap",
        s.cls,
      )}
    >
      {children ?? s.label}
    </span>
  );
}

function Modal({ title, subtitle, onClose, children, width = "max-w-lg" }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={cn(
          "w-full rounded-2xl card-shadow max-h-[90vh] flex flex-col",
          width,
        )}
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
          <div>
            <h3 className="text-base font-semibold text-white">{title}</h3>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 pb-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Campo({ label, hint, children, className }) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="text-xs font-medium text-slate-400">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

function Kpi({ icon: Icon, label, value, detail, tone = "blue", children }) {
  const tones = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    red: "bg-red-500/10 text-red-600 dark:text-red-300",
    slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  };
  return (
    <div className="glass rounded-2xl p-4 card-shadow">
      <div className="flex items-center gap-2.5">
        <span className={cn("p-2 rounded-xl", tones[tone])}>
          <Icon size={16} />
        </span>
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <p className="mt-3 text-xl font-bold text-white tabular-nums">{value}</p>
      {detail && <p className="text-xs text-slate-500 mt-0.5">{detail}</p>}
      {children}
    </div>
  );
}

function Chip({ active, onClick, children, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
        active
          ? "bg-blue-600 text-[#fff]"
          : "text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5",
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "px-1.5 rounded-md text-[10px] tabular-nums",
            active ? "bg-white/20" : "bg-slate-500/10",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function DiaVencimentoChip({ ativo, onClick, count, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={ativo ? "Clique para mostrar todos os vencimentos" : "Mostrar só este vencimento"}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all",
        ativo
          ? "border-blue-600 bg-blue-600 text-[#fff]"
          : "border-[var(--input-border)] text-slate-300 hover:border-blue-500 hover:text-blue-500",
      )}
    >
      {children}
      <span
        className={cn(
          "px-1.5 rounded-md text-[10px] tabular-nums",
          ativo ? "bg-white/20 text-[#fff]" : "bg-slate-500/10 text-slate-500",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative flex-1 min-w-[200px] max-w-sm">
      <Search
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-base pl-9!"
      />
    </div>
  );
}

function Menu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const fechar = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
      >
        <MoreVertical size={15} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-8 z-30 min-w-[180px] rounded-xl py-1 card-shadow"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--glass-border)",
          }}
        >
          {items.filter(Boolean).map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-black/5 dark:hover:bg-white/5",
                item.danger ? "text-red-500" : "text-slate-300",
              )}
            >
              <item.icon size={14} /> {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  function show(message, opts = {}) {
    clearTimeout(timer.current);
    setToast({ message, ...opts });
    timer.current = setTimeout(() => setToast(null), opts.undo ? 6000 : 3500);
  }

  const node = toast && (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl card-shadow bg-slate-900 text-[#fff] text-sm">
      {toast.error ? (
        <AlertTriangle size={16} className="text-red-400" />
      ) : (
        <CheckCircle2 size={16} className="text-emerald-400" />
      )}
      <span className="text-[#fff]">{toast.message}</span>
      {toast.undo && (
        <button
          onClick={() => {
            toast.undo();
            setToast(null);
          }}
          className="ml-2 text-xs font-semibold text-[#93c5fd] hover:underline"
        >
          Desfazer
        </button>
      )}
    </div>
  );

  return { show, node };
}

function EmptyState({ icon: Icon, title, description, children }) {
  return (
    <div className="glass rounded-2xl p-10 text-center">
      <span className="inline-flex p-3 rounded-2xl bg-blue-500/10 text-blue-500">
        <Icon size={26} />
      </span>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
        {description}
      </p>
      {children && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>
      )}
    </div>
  );
}

// ─── Modais de cliente ──────────────────────────────────────────────────────

const CLIENTE_VAZIO = {
  nome: "",
  telefone: "",
  documento: "",
  email: "",
  diaVencimento: 10,
  maquinasProprias: 0,
  maquinasPlano36: 0,
  maquinasOff: 0,
  valorMensalidade: 40,
  valorMensalidade36: 65,
  valorFixo: "",
  status: "ATIVO",
  observacoes: "",
};

function NumberStepper({ value, onChange, min = 0 }) {
  const n = Number(value) || 0;
  return (
    <div className="flex items-center rounded-lg overflow-hidden border border-[var(--input-border)]">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, n - 1))}
        className="px-2.5 py-2 text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
      >
        <Minus size={14} />
      </button>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        className="w-full min-w-0 text-center bg-transparent text-sm text-white outline-none py-2 tabular-nums"
      />
      <button
        type="button"
        onClick={() => onChange(n + 1)}
        className="px-2.5 py-2 text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function ValorPresets({ value, onChange }) {
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
          R$
        </span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-base pl-9! tabular-nums"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {PRESETS_VALOR.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all",
              Number(value) === v
                ? "bg-blue-600 border-blue-600 text-[#fff]"
                : "border-[var(--input-border)] text-slate-400 hover:border-blue-500",
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

function ClienteModal({ cliente, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    cliente
      ? {
          ...CLIENTE_VAZIO,
          ...Object.fromEntries(
            Object.entries(cliente).map(([k, v]) => [k, v ?? ""]),
          ),
        }
      : CLIENTE_VAZIO,
  );
  const [valorCombinado, setValorCombinado] = useState(
    cliente?.valorFixo !== null && cliente?.valorFixo !== undefined,
  );
  const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const mutation = useMutation({
    mutationFn: (payload) =>
      cliente
        ? machinePayApi.atualizarCliente(cliente.id, payload)
        : machinePayApi.criarCliente(payload),
    onSuccess: (res) => onSaved(res.data, !cliente),
  });

  const totalMaquinas =
    (Number(form.maquinasProprias) || 0) + (Number(form.maquinasPlano36) || 0);
  const mensal = calcularMensal({
    ...form,
    valorFixo: valorCombinado ? form.valorFixo : null,
  });

  function submit(e) {
    e.preventDefault();
    mutation.mutate({
      nome: form.nome,
      telefone: form.telefone,
      documento: form.documento,
      email: form.email,
      diaVencimento: Number(form.diaVencimento) || 10,
      maquinasProprias: Number(form.maquinasProprias) || 0,
      maquinasPlano36: Number(form.maquinasPlano36) || 0,
      maquinasOff: Number(form.maquinasOff) || 0,
      valorMensalidade: Number(form.valorMensalidade) || 0,
      valorMensalidade36: Number(form.valorMensalidade36) || 0,
      valorFixo: valorCombinado && form.valorFixo !== "" ? Number(form.valorFixo) : null,
      status: form.status,
      observacoes: form.observacoes,
    });
  }

  return (
    <Modal
      title={cliente ? "Editar cliente" : "Novo cliente"}
      subtitle="Cadastro e plano de mensalidade Machine Pay"
      onClose={onClose}
      width="max-w-2xl"
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo label="Nome do cliente *" className="sm:col-span-2">
            <input
              autoFocus
              required
              value={form.nome}
              onChange={(e) => set("nome")(e.target.value)}
              className="input-base"
              placeholder="Ex.: Fonseca Brinquedos"
            />
          </Campo>
          <Campo label="WhatsApp / telefone">
            <input
              value={form.telefone}
              onChange={(e) => set("telefone")(e.target.value)}
              className="input-base"
              placeholder="(11) 99999-9999"
            />
          </Campo>
          <Campo label="CPF / CNPJ">
            <input
              value={form.documento}
              onChange={(e) => set("documento")(e.target.value)}
              className="input-base"
            />
          </Campo>
        </div>

        <div className="rounded-xl p-4 space-y-4" style={{ background: "var(--input-bg)" }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Máquinas e mensalidade</p>
            <div className="flex items-center gap-1 rounded-lg glass p-0.5">
              <Chip active={!valorCombinado} onClick={() => setValorCombinado(false)}>
                Por máquina
              </Chip>
              <Chip active={valorCombinado} onClick={() => setValorCombinado(true)}>
                Valor combinado
              </Chip>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Campo label="Máquinas próprias">
              <NumberStepper value={form.maquinasProprias} onChange={set("maquinasProprias")} />
            </Campo>
            <Campo label="Máquinas plano 36">
              <NumberStepper value={form.maquinasPlano36} onChange={set("maquinasPlano36")} />
            </Campo>
            <Campo label="Máquinas off" hint="Paradas / sem uso (não altera o valor)">
              <NumberStepper value={form.maquinasOff} onChange={set("maquinasOff")} />
            </Campo>
          </div>

          {valorCombinado ? (
            <Campo
              label="Valor mensal combinado"
              hint="Substitui o cálculo por máquina (ex.: acordos especiais)"
            >
              <ValorPresets value={form.valorFixo} onChange={set("valorFixo")} />
            </Campo>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo label="Valor por máquina própria">
                <ValorPresets value={form.valorMensalidade} onChange={set("valorMensalidade")} />
              </Campo>
              <Campo label="Valor por máquina plano 36">
                <ValorPresets value={form.valorMensalidade36} onChange={set("valorMensalidade36")} />
              </Campo>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg px-4 py-3 bg-blue-500/10 border border-blue-500/20">
            <span className="text-xs text-slate-400">
              {totalMaquinas} máquina(s) cobradas
              {Number(form.maquinasOff) > 0 && ` · ${form.maquinasOff} off`}
            </span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-300 tabular-nums">
              {formatCurrency(mensal)}
              <span className="text-xs font-normal text-slate-500">/mês</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Campo label="Dia do pagamento">
            <input
              type="number"
              min="1"
              max="31"
              value={form.diaVencimento}
              onChange={(e) => set("diaVencimento")(e.target.value)}
              className="input-base"
            />
          </Campo>
          <Campo label="Status">
            <select
              value={form.status}
              onChange={(e) => set("status")(e.target.value)}
              className="input-base"
            >
              <option value="ATIVO">Ativo</option>
              <option value="SUSPENSO">Suspenso</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </Campo>
          <Campo label="E-mail">
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email")(e.target.value)}
              className="input-base"
            />
          </Campo>
          <Campo label="Observações" className="sm:col-span-3">
            <textarea
              rows={2}
              value={form.observacoes}
              onChange={(e) => set("observacoes")(e.target.value)}
              className="input-base resize-none"
              placeholder="Acordos, contatos, detalhes..."
            />
          </Campo>
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-500">{erroApi(mutation.error)}</p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? "Salvando..." : cliente ? "Salvar" : "Cadastrar cliente"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AjusteMaquinasModal({ cliente, competencia, cobrancaAtiva, onClose, onSaved }) {
  const [tipo, setTipo] = useState("PROPRIA");
  const [operacao, setOperacao] = useState("ADD");
  const [quantidade, setQuantidade] = useState(1);
  const [motivo, setMotivo] = useState("");
  const [aplicar, setAplicar] = useState(true);

  const delta = (operacao === "ADD" ? 1 : -1) * (Number(quantidade) || 0);
  const campo = TIPOS_MAQUINA[tipo].campo;
  const novo = { ...cliente, [campo]: cliente[campo] + delta };
  const mensalAtual = calcularMensal(cliente);
  const mensalNovo = calcularMensal(novo);
  const invalido = !delta || novo[campo] < 0;

  const mutation = useMutation({
    mutationFn: () =>
      machinePayApi.ajustarMaquinas(cliente.id, {
        tipo,
        quantidade: delta,
        motivo,
        aplicarNaCompetencia: cobrancaAtiva && aplicar ? competencia : undefined,
      }),
    onSuccess: () => onSaved(delta, tipo),
  });

  return (
    <Modal
      title="Adicionar / remover máquinas"
      subtitle={cliente.nome}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            ["ADD", "Adicionar", Plus, "emerald"],
            ["REM", "Remover", Minus, "red"],
          ].map(([key, label, Icon, cor]) => (
            <button
              key={key}
              onClick={() => setOperacao(key)}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all",
                operacao === key
                  ? cor === "emerald"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                    : "border-red-500 bg-red-500/10 text-red-600 dark:text-red-300"
                  : "border-[var(--input-border)] text-slate-400",
              )}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo label="Tipo de máquina">
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="input-base">
              {Object.entries(TIPOS_MAQUINA).map(([key, t]) => (
                <option key={key} value={key}>
                  {t.label} (hoje: {cliente[t.campo]})
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Quantidade">
            <NumberStepper value={quantidade} onChange={setQuantidade} min={1} />
          </Campo>
        </div>

        <Campo label="Motivo (opcional)">
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="input-base"
            placeholder="Ex.: nova loja no shopping, devolução, manutenção..."
          />
        </Campo>

        <div className="rounded-xl p-4 grid grid-cols-2 gap-3" style={{ background: "var(--input-bg)" }}>
          <div>
            <p className="text-[11px] text-slate-500">{TIPOS_MAQUINA[tipo].label}</p>
            <p className="text-sm font-semibold text-white tabular-nums">
              {cliente[campo]} →{" "}
              <span className={novo[campo] < 0 ? "text-red-500" : ""}>{novo[campo]}</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500">Mensalidade</p>
            <p className="text-sm font-semibold text-white tabular-nums">
              {formatCurrency(mensalAtual)} →{" "}
              <span
                className={cn(
                  mensalNovo > mensalAtual && "text-emerald-600 dark:text-emerald-300",
                  mensalNovo < mensalAtual && "text-red-600 dark:text-red-300",
                )}
              >
                {formatCurrency(mensalNovo)}
              </span>
            </p>
          </div>
          {cliente.valorFixo !== null && tipo !== "OFF" && (
            <p className="col-span-2 text-[11px] text-amber-600 dark:text-amber-300">
              Cliente com valor combinado: a quantidade muda, mas o valor mensal continua fixo.
            </p>
          )}
        </div>

        {cobrancaAtiva && tipo !== "OFF" && (
          <label className="flex items-start gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={aplicar}
              onChange={(e) => setAplicar(e.target.checked)}
              className="mt-0.5"
            />
            Atualizar também a cobrança em aberto de {rotuloCompetencia(competencia)}
          </label>
        )}

        {mutation.isError && <p className="text-sm text-red-500">{erroApi(mutation.error)}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={invalido || mutation.isPending}
            className="btn-primary"
          >
            {mutation.isPending ? "Salvando..." : "Confirmar ajuste"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function HistoricoModal({ clienteId, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ["machinepay", "historico", clienteId],
    queryFn: () => machinePayApi.historicoCliente(clienteId).then((r) => r.data),
  });
  const [aba, setAba] = useState("cobrancas");
  const cliente = data?.cliente;

  return (
    <Modal
      title={cliente?.nome ?? "Histórico"}
      subtitle="Histórico de cobranças e máquinas"
      onClose={onClose}
      width="max-w-2xl"
    >
      {isLoading || !data ? (
        <div className="py-10 flex justify-center text-slate-500">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ["Mensalidade", formatCurrency(cliente.valorCalculado)],
              [
                "Máquinas",
                `${cliente.totalMaquinas}${cliente.maquinasOff ? ` (${cliente.maquinasOff} off)` : ""}${
                  cliente.maquinasOnInativas ? ` · ${cliente.maquinasOnInativas} on inativas` : ""
                }`,
              ],
              [
                "Último pagamento",
                cliente.ultimoPagamento ? formatDate(cliente.ultimoPagamento) : "—",
              ],
              ["Em atraso", formatCurrency(cliente.valorAtrasado)],
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl p-3" style={{ background: "var(--input-bg)" }}>
                <p className="text-[11px] text-slate-500">{l}</p>
                <p className="text-sm font-semibold text-white tabular-nums">{v}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-1 glass rounded-lg p-0.5 w-fit">
            <Chip active={aba === "cobrancas"} onClick={() => setAba("cobrancas")} count={data.cobrancas.length}>
              Cobranças
            </Chip>
            <Chip active={aba === "maquinas"} onClick={() => setAba("maquinas")} count={data.ajustes.length}>
              Máquinas
            </Chip>
            {data.maquinas?.length > 0 && (
              <Chip active={aba === "painel"} onClick={() => setAba("painel")} count={data.maquinas.length}>
                No painel
              </Chip>
            )}
          </div>

          {aba === "painel" ? (
            <div className="divide-y divide-[var(--border-color)]">
              {data.maquinas.map((m) => (
                <div key={m.posId} className="flex items-center justify-between py-2.5 gap-3">
                  <div>
                    <p className="text-sm text-white">{m.nome || `Caixa ${m.posId}`}</p>
                    <p className="text-xs text-slate-500">
                      Caixa {m.posId} · última venda{" "}
                      {m.ultimaVendaEm
                        ? new Date(m.ultimaVendaEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                        : "há mais de 30 dias / nunca"}
                    </p>
                  </div>
                  {!m.ligada ? (
                    <TagMaquina valor="OFF" rotulo="" tom="amber" />
                  ) : m.inativa ? (
                    <TagMaquina valor="ON" rotulo="inativa" tom="red" />
                  ) : (
                    <TagMaquina valor="ON" rotulo="" tom="blue" />
                  )}
                </div>
              ))}
            </div>
          ) : aba === "cobrancas" ? (
            data.cobrancas.length ? (
              <div className="divide-y divide-[var(--border-color)]">
                {data.cobrancas.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2.5 gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {rotuloCompetencia(c.competencia)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Venc. {formatDate(c.vencimento)} · {c.maquinasProprias + c.maquinasPlano36} máq.
                        {c.pagoEm && ` · pago em ${formatDate(c.pagoEm)}`}
                        {c.formaPagamento && ` (${c.formaPagamento})`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-white tabular-nums">
                        {formatCurrency(c.valorPago ?? c.valor)}
                      </span>
                      <Pill status={c.situacao} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-6 text-center">Nenhuma cobrança ainda.</p>
            )
          ) : data.ajustes.length ? (
            <div className="divide-y divide-[var(--border-color)]">
              {data.ajustes.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "p-1.5 rounded-lg",
                        a.quantidade > 0
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                          : "bg-red-500/10 text-red-600 dark:text-red-300",
                      )}
                    >
                      {a.quantidade > 0 ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                    </span>
                    <div>
                      <p className="text-sm text-white">
                        {a.quantidade > 0 ? "+" : ""}
                        {a.quantidade} {TIPOS_MAQUINA[a.tipo]?.label.toLowerCase()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {a.motivo || "Sem motivo informado"}
                        {a.usuario && ` · ${a.usuario}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(a.createdAt).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-6 text-center">
              Nenhum ajuste de máquinas registrado.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function ImportarModal({ onClose, onImported }) {
  const [arquivo, setArquivo] = useState(null);
  const [linhas, setLinhas] = useState([]);
  const [erro, setErro] = useState("");
  const [diaPadrao, setDiaPadrao] = useState(10);
  const inputRef = useRef(null);

  const mutation = useMutation({
    mutationFn: () =>
      machinePayApi.importarClientes(
        linhas.map((linha) => {
          const c = { ...linha, diaVencimento: linha.diaVencimento ?? Number(diaPadrao) };
          delete c.valorCalculado;
          // Nao sobrescreve telefone ja cadastrado quando a planilha nao tem.
          if (!c.telefone) delete c.telefone;
          return c;
        }),
      ),
    onSuccess: (res) => onImported(res.data),
  });

  async function escolher(file) {
    if (!file) return;
    setErro("");
    setArquivo(file);
    try {
      setLinhas(await lerPlanilhaMachinePay(file));
    } catch (e) {
      setLinhas([]);
      setErro(e.message);
    }
  }

  const resumo = useMemo(() => {
    const ativos = linhas.filter((l) => l.status === "ATIVO");
    return {
      ativos: ativos.length,
      outros: linhas.length - ativos.length,
      maquinas: ativos.reduce((a, l) => a + l.maquinasProprias + l.maquinasPlano36, 0),
      total: ativos.reduce((a, l) => a + l.valorCalculado, 0),
      fixos: linhas.filter((l) => l.valorFixo !== null).length,
    };
  }, [linhas]);

  return (
    <Modal
      title="Importar planilha"
      subtitle="Use a planilha de controle atual (Nome do Cliente, Máquinas, Valor da Mensalidade...)"
      onClose={onClose}
      width="max-w-3xl"
    >
      <div className="space-y-4">
        <button
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            escolher(e.dataTransfer.files?.[0]);
          }}
          className="w-full rounded-xl border-2 border-dashed border-[var(--input-border)] hover:border-blue-500 p-6 text-center transition-all"
        >
          <FileSpreadsheet className="mx-auto text-blue-500" size={26} />
          <p className="mt-2 text-sm font-medium text-white">
            {arquivo ? arquivo.name : "Clique ou arraste o arquivo .xlsx aqui"}
          </p>
          <p className="text-xs text-slate-500">
            Clientes com o mesmo nome são atualizados, novos são criados.
          </p>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => escolher(e.target.files?.[0])}
        />

        {erro && <p className="text-sm text-red-500">{erro}</p>}

        {linhas.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                ["Clientes ativos", resumo.ativos],
                ["Inativos/suspensos", resumo.outros],
                ["Máquinas", resumo.maquinas],
                ["Total mensal", formatCurrency(resumo.total)],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl p-3" style={{ background: "var(--input-bg)" }}>
                  <p className="text-[11px] text-slate-500">{l}</p>
                  <p className="text-sm font-semibold text-white tabular-nums">{v}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <Campo label="Dia de pagamento padrão" hint="Usado quando a planilha não informa a data">
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={diaPadrao}
                  onChange={(e) => setDiaPadrao(e.target.value)}
                  className="input-base w-28!"
                />
              </Campo>
              {resumo.fixos > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-300 pb-2">
                  {resumo.fixos} cliente(s) com "Valor a pagar" diferente do cálculo — importados como valor combinado.
                </p>
              )}
            </div>

            <div className="max-h-72 overflow-auto rounded-xl border border-[var(--border-color)]">
              <table className="w-full text-xs">
                <thead className="sticky top-0" style={{ background: "var(--bg-secondary)" }}>
                  <tr className="text-left text-slate-500">
                    <th className="px-3 py-2 font-medium">Cliente</th>
                    <th className="px-3 py-2 font-medium">Telefone</th>
                    <th className="px-3 py-2 font-medium text-right">Próp.</th>
                    <th className="px-3 py-2 font-medium text-right">P36</th>
                    <th className="px-3 py-2 font-medium text-right">Mensal</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {linhas.map((l, i) => (
                    <tr key={i} className="text-slate-300">
                      <td className="px-3 py-1.5">{l.nome}</td>
                      <td className="px-3 py-1.5 text-slate-500">{formatarTelefone(l.telefone)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{l.maquinasProprias}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{l.maquinasPlano36}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {formatCurrency(l.valorCalculado)}
                        {l.valorFixo !== null && <span className="text-amber-500"> *</span>}
                      </td>
                      <td className="px-3 py-1.5"><Pill status={l.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {mutation.isError && <p className="text-sm text-red-500">{erroApi(mutation.error)}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!linhas.length || mutation.isPending}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Upload size={15} />
            {mutation.isPending ? "Importando..." : `Importar ${linhas.length} clientes`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Modais de cobrança ─────────────────────────────────────────────────────

function ReceberModal({ cobrancas, contas, onClose, onDone }) {
  const unica = cobrancas.length === 1 ? cobrancas[0] : null;
  const total = cobrancas.reduce((a, c) => a + c.valor, 0);
  const [valor, setValor] = useState(unica ? unica.valor : "");
  const [data, setData] = useState(hojeInput());
  const [forma, setForma] = useState("PIX");
  const [contaId, setContaId] = useState("");
  const [progresso, setProgresso] = useState(0);

  const mutation = useMutation({
    mutationFn: async () => {
      for (const [i, c] of cobrancas.entries()) {
        await machinePayApi.pagarCobranca(c.id, {
          valorPago: unica ? Number(valor) : c.valor,
          pagoEm: data,
          formaPagamento: forma,
          contaDestinoId: contaId ? Number(contaId) : undefined,
        });
        setProgresso(i + 1);
      }
    },
    onSettled: (_d, err) => !err && onDone(cobrancas.length),
  });

  return (
    <Modal
      title={unica ? "Registrar recebimento" : `Receber ${cobrancas.length} cobranças`}
      subtitle={unica ? `${unica.cliente.nome} · ${rotuloCompetencia(unica.competencia)}` : `Total ${formatCurrency(total)}`}
      onClose={onClose}
    >
      <div className="space-y-4">
        {unica && (
          <Campo
            label="Valor recebido"
            hint={Number(valor) !== unica.valor ? `Valor da cobrança: ${formatCurrency(unica.valor)}` : undefined}
          >
            <input
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="input-base text-lg! font-semibold tabular-nums"
              autoFocus
            />
          </Campo>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Data do pagamento">
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="input-base" />
          </Campo>
          <Campo label="Forma de pagamento">
            <select value={forma} onChange={(e) => setForma(e.target.value)} className="input-base">
              {FORMAS_PAGAMENTO.map((f) => <option key={f}>{f}</option>)}
            </select>
          </Campo>
        </div>
        <Campo
          label="Lançar entrada no financeiro"
          hint="Escolha a conta para creditar o valor no caixa (aparece em Lançamentos). Deixe em branco para só marcar como pago."
        >
          <select value={contaId} onChange={(e) => setContaId(e.target.value)} className="input-base">
            <option value="">Não lançar — apenas marcar como pago</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>{c.nome} · {c.banco}</option>
            ))}
          </select>
        </Campo>

        {mutation.isError && (
          <p className="text-sm text-red-500">
            {erroApi(mutation.error)}
            {cobrancas.length > 1 && ` (${progresso} de ${cobrancas.length} registradas)`}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || (unica && !(Number(valor) > 0))}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-[#fff] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
          >
            <CheckCircle2 size={15} />
            {mutation.isPending
              ? cobrancas.length > 1 ? `Registrando ${progresso}/${cobrancas.length}...` : "Registrando..."
              : "Confirmar recebimento"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function EditarCobrancaModal({ cobranca, onClose, onDone }) {
  const [valor, setValor] = useState(cobranca.valor);
  const [vencimento, setVencimento] = useState(cobranca.vencimento.slice(0, 10));
  const [observacoes, setObservacoes] = useState(cobranca.observacoes || "");
  const mutation = useMutation({
    mutationFn: () =>
      machinePayApi.atualizarCobranca(cobranca.id, { valor: Number(valor), vencimento, observacoes }),
    onSuccess: onDone,
  });

  return (
    <Modal title="Ajustar cobrança" subtitle={`${cobranca.cliente.nome} · ${rotuloCompetencia(cobranca.competencia)}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Valor">
            <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} className="input-base" />
          </Campo>
          <Campo label="Vencimento">
            <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className="input-base" />
          </Campo>
        </div>
        <Campo label="Observações">
          <textarea rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="input-base resize-none" placeholder="Ex.: desconto combinado, pró-rata..." />
        </Campo>
        {mutation.isError && <p className="text-sm text-red-500">{erroApi(mutation.error)}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary">Salvar</button>
        </div>
      </div>
    </Modal>
  );
}

function ConfirmModal({ title, message, confirmLabel = "Confirmar", danger, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  return (
    <Modal title={title} onClose={onClose} width="max-w-md">
      <p className="text-sm text-slate-400">{message}</p>
      {erro && <p className="text-sm text-red-500 mt-3">{erro}</p>}
      <div className="flex justify-end gap-2 mt-5">
        <button onClick={onClose} className="btn-ghost">Cancelar</button>
        <button
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              await onConfirm();
              onClose();
            } catch (e) {
              setErro(erroApi(e));
              setLoading(false);
            }
          }}
          className={cn(
            "px-5 py-2 rounded-lg text-sm font-semibold text-[#fff] disabled:opacity-50",
            danger ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500",
          )}
        >
          {loading ? "Aguarde..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// Rodape padrao das mensagens de cobranca (Pix e envio do comprovante).
const MENSAGEM_RODAPE =
  "💳 Pagamento via Pix\n" +
  "Chave CNPJ:\n" +
  "59996204000177\n\n" +
  "Após o pagamento, por favor, envie o comprovante por este WhatsApp para confirmarmos a baixa.\n\n" +
  "Já realizou o pagamento? Basta nos encaminhar o comprovante. ✅\n\n" +
  "Agradecemos pela parceria! Estamos à disposição para ajudar.\n\n" +
  "Equipe Financeira | MachinePay";

// Mensagem para quem ja passou do vencimento (tom de alerta de bloqueio).
function mensagemAtraso({ dias, maquinas, valor, diaVencimento }) {
  return (
    "Olá! Tudo bem?\n\n" +
    "MachinePay | Financeiro\n\n" +
    `Identificamos que a mensalidade abaixo permanece em aberto, com ${dias} ${dias === 1 ? "dia" : "dias"} de atraso:\n\n` +
    `▪️ Equipamentos ativos: ${maquinas}\n` +
    `▪️ Valor total: ${formatCurrency(valor)}\n` +
    `▪️ Vencimento: dia ${diaVencimento}\n\n` +
    "⚠️ Evite o bloqueio do cadastro e a suspensão dos serviços. Pedimos que regularize o pagamento para manter seus equipamentos conectados à MachinePay.\n\n" +
    "💳 Pagamento via Pix\n" +
    "Chave CNPJ:\n" +
    "59996204000177\n\n" +
    "Após o pagamento, envie o comprovante por este WhatsApp para confirmarmos a baixa.\n\n" +
    "Já realizou o pagamento? Encaminhe o comprovante para conferirmos. Se precisar de ajuda para regularizar, fale com a nossa equipe.\n\n" +
    "Equipe Financeira | MachinePay"
  );
}

// Dias desde o vencimento (gravado ao meio-dia UTC), contando pelo dia de hoje.
function diasDeAtraso(vencimento) {
  const agora = new Date();
  const hoje = Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate(), 12);
  return Math.max(0, Math.round((hoje - new Date(vencimento).getTime()) / 86400000));
}

function mensagemCobranca(cobranca) {
  const maquinas = cobranca.maquinasProprias + cobranca.maquinasPlano36;
  const dia = new Date(cobranca.vencimento).getUTCDate();

  if (cobranca.situacao === "ATRASADO") {
    return mensagemAtraso({
      dias: diasDeAtraso(cobranca.vencimento),
      maquinas,
      valor: cobranca.valor,
      diaVencimento: dia,
    });
  }

  return (
    "Olá! Tudo bem? 😊\n\n" +
    "MachinePay | Financeiro\n\n" +
    "Segue o lembrete da sua mensalidade:\n\n" +
    `▪️ Equipamentos ativos: ${maquinas}\n` +
    `▪️ Valor total: ${formatCurrency(cobranca.valor)}\n` +
    `▪️ Vencimento: dia ${dia}\n\n` +
    MENSAGEM_RODAPE
  );
}

function mensagemInadimplencia(cliente) {
  return mensagemAtraso({
    dias: cliente.diasEmAtraso,
    maquinas: cliente.totalMaquinas,
    valor: cliente.valorAtrasado,
    diaVencimento: cliente.diaVencimento,
  });
}

// ─── Aba: Cobranças ─────────────────────────────────────────────────────────

function CobrancasTab({ competencia, dados, isLoading, clientes, contas, toast, onImportar }) {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState("TODAS");
  const [diaVencimento, setDiaVencimento] = useState(null);
  const [busca, setBusca] = useState("");
  const [selecaoBruta, setSelecionadas] = useState(new Set());
  const [receber, setReceber] = useState(null);
  const [editar, setEditar] = useState(null);
  const [confirmar, setConfirmar] = useState(null);
  const [historico, setHistorico] = useState(null);

  const { data: evolucao = [] } = useQuery({
    queryKey: ["machinepay", "evolucao"],
    queryFn: () => machinePayApi.evolucao(6).then((r) => r.data),
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ["machinepay"] });

  async function copiarMensagem(texto) {
    try {
      await copiarTexto(texto);
      toast.show("Mensagem copiada · cole no WhatsApp ou onde preferir");
    } catch (e) {
      toast.show(erroApi(e), { error: true });
    }
  }

  const gerar = useMutation({
    mutationFn: () => machinePayApi.gerarCobrancas(competencia),
    onSuccess: (res) => {
      invalidar();
      toast.show(
        res.data.geradas
          ? `${res.data.geradas} cobranças geradas para ${rotuloCompetencia(competencia)}`
          : "Nenhuma cobrança nova para gerar",
      );
    },
    onError: (e) => toast.show(erroApi(e), { error: true }),
  });

  const cobrancas = useMemo(() => dados?.cobrancas ?? [], [dados]);
  const resumo = dados?.resumo;

  // Dias de vencimento existentes no mes (vencimento gravado ao meio-dia UTC).
  const diasVencimento = useMemo(() => {
    const porDia = new Map();
    for (const c of cobrancas) {
      const dia = new Date(c.vencimento).getUTCDate();
      porDia.set(dia, (porDia.get(dia) || 0) + 1);
    }
    return [...porDia.entries()].sort((a, b) => a[0] - b[0]);
  }, [cobrancas]);

  // Dia escolhido que nao existe neste mes volta para "todos".
  const diaAtivo = diasVencimento.some(([dia]) => dia === diaVencimento) ? diaVencimento : null;

  const doDia = useMemo(
    () =>
      diaAtivo === null
        ? cobrancas
        : cobrancas.filter((c) => new Date(c.vencimento).getUTCDate() === diaAtivo),
    [cobrancas, diaAtivo],
  );

  const contagem = useMemo(() => {
    const c = { TODAS: doDia.length, ABERTAS: 0, ATRASADO: 0, PAGO: 0, CANCELADO: 0 };
    for (const item of doDia) {
      if (item.situacao === "PENDENTE" || item.situacao === "ATRASADO") c.ABERTAS += 1;
      if (c[item.situacao] !== undefined) c[item.situacao] += 1;
    }
    return c;
  }, [doDia]);

  const lista = useMemo(() => {
    const termo = normalizarBusca(busca.trim());
    return doDia.filter((c) => {
      if (filtro === "ABERTAS" && !["PENDENTE", "ATRASADO"].includes(c.situacao)) return false;
      if (!["TODAS", "ABERTAS"].includes(filtro) && c.situacao !== filtro) return false;
      return !termo || normalizarBusca(`${c.cliente.nome} ${c.cliente.telefone}`).includes(termo);
    });
  }, [doDia, filtro, busca]);

  const abertasVisiveis = lista.filter((c) => c.status === "PENDENTE");
  // Mantem selecionadas apenas as cobrancas abertas visiveis (troca de mes/filtro limpa).
  const selecionadas = new Set(
    abertasVisiveis.filter((c) => selecaoBruta.has(c.id)).map((c) => c.id),
  );
  const todasSelecionadas =
    abertasVisiveis.length > 0 && abertasVisiveis.every((c) => selecionadas.has(c.id));

  function toggle(id) {
    setSelecionadas((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  if (isLoading) {
    return (
      <div className="py-20 flex justify-center text-slate-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!clientes.length) {
    return (
      <EmptyState
        icon={FileSpreadsheet}
        title="Comece importando a planilha"
        description="Importe a planilha de controle que vocês usam hoje. Os clientes, máquinas e valores são cadastrados automaticamente."
      >
        <button onClick={onImportar} className="btn-primary inline-flex items-center gap-2">
          <Upload size={15} /> Importar planilha
        </button>
      </EmptyState>
    );
  }

  const pct = resumo?.previsto ? Math.round((resumo.recebido / resumo.previsto) * 100) : 0;

  return (
    <div className="space-y-5">
      {dados?.clientesSemCobranca > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 border border-blue-500/30 bg-blue-500/5">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-blue-500/15 text-blue-500"><Sparkles size={18} /></span>
            <div>
              <p className="text-sm font-semibold text-white">
                {dados.clientesSemCobranca} cliente(s) ativo(s) sem cobrança em {rotuloCompetencia(competencia)}
              </p>
              <p className="text-xs text-slate-500">
                Gere as cobranças do mês com base nas máquinas e valores atuais de cada cliente.
              </p>
            </div>
          </div>
          <button onClick={() => gerar.mutate()} disabled={gerar.isPending} className="btn-primary inline-flex items-center gap-2">
            {gerar.isPending ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            Gerar cobranças
          </button>
        </div>
      )}

      {cobrancas.length > 0 && resumo && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <Kpi icon={CircleDollarSign} label="Previsto no mês" value={formatCurrency(resumo.previsto)} detail={`${resumo.quantidade} cobranças · ${resumo.maquinas} máquinas`} />
            <Kpi icon={CheckCircle2} tone="green" label="Recebido" value={formatCurrency(resumo.recebido)} detail={`${resumo.qtdPagas} pagas · ${pct}%`}>
              <div className="mt-2 h-1.5 rounded-full bg-slate-500/15 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </Kpi>
            <Kpi icon={Clock} tone="amber" label="Em aberto" value={formatCurrency(resumo.emAberto)} detail={`${resumo.qtdPendentes} cobranças`} />
            <Kpi icon={AlertTriangle} tone="red" label="Atrasado" value={formatCurrency(resumo.atrasado)} detail={`${resumo.qtdAtrasadas} vencidas`} />
          </div>
          <div className="glass rounded-2xl p-4 card-shadow">
            <p className="text-xs font-medium text-slate-500 mb-2">Previsto x recebido (últimos meses)</p>
            <div className="h-[118px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolucao.map((e) => ({ ...e, mes: rotuloCompetencia(e.competencia, true) }))} barGap={2}>
                  <CartesianGrid vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "var(--glass-hover)" }}
                    contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--glass-border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v, n) => [formatCurrency(v), n === "previsto" ? "Previsto" : "Recebido"]}
                  />
                  <Bar dataKey="previsto" fill="#93c5fd" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="recebido" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {cobrancas.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={`Nenhuma cobrança em ${rotuloCompetencia(competencia)}`}
          description="Clique em Gerar cobranças para criar as mensalidades do mês de todos os clientes ativos."
        />
      ) : (
        <div className="glass rounded-2xl card-shadow">
          <div className="flex flex-wrap items-center gap-3 p-3 border-b border-[var(--border-color)]">
            <SearchBox value={busca} onChange={setBusca} placeholder="Buscar cliente ou telefone..." />
            <div className="flex flex-wrap gap-1">
              <Chip active={filtro === "TODAS"} onClick={() => setFiltro("TODAS")} count={contagem.TODAS}>Todas</Chip>
              <Chip active={filtro === "ABERTAS"} onClick={() => setFiltro("ABERTAS")} count={contagem.ABERTAS}>Em aberto</Chip>
              <Chip active={filtro === "ATRASADO"} onClick={() => setFiltro("ATRASADO")} count={contagem.ATRASADO}>Atrasadas</Chip>
              <Chip active={filtro === "PAGO"} onClick={() => setFiltro("PAGO")} count={contagem.PAGO}>Pagas</Chip>
              {contagem.CANCELADO > 0 && (
                <Chip active={filtro === "CANCELADO"} onClick={() => setFiltro("CANCELADO")} count={contagem.CANCELADO}>Canceladas</Chip>
              )}
            </div>
            <button
              onClick={() => exportarCobrancasExcel(lista, rotuloCompetencia(competencia))}
              className="btn-ghost inline-flex items-center gap-1.5 ml-auto py-1.5!"
            >
              <Download size={14} /> Excel
            </button>
          </div>

          {diasVencimento.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-[var(--border-color)]">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 mr-1">
                <CalendarDays size={14} /> Vencimento
              </span>
              {diasVencimento.length > 1 && (
                <DiaVencimentoChip ativo={diaAtivo === null} onClick={() => setDiaVencimento(null)} count={cobrancas.length}>
                  Todos
                </DiaVencimentoChip>
              )}
              {diasVencimento.map(([dia, qtd]) => (
                <DiaVencimentoChip
                  key={dia}
                  ativo={diaAtivo === dia}
                  onClick={() => setDiaVencimento(diaAtivo === dia ? null : dia)}
                  count={qtd}
                >
                  Venc. {dia}
                </DiaVencimentoChip>
              ))}
            </div>
          )}

          {selecionadas.size > 0 && (
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20">
              <span className="text-sm text-emerald-700 dark:text-emerald-300">
                {selecionadas.size} selecionada(s) ·{" "}
                {formatCurrency(cobrancas.filter((c) => selecionadas.has(c.id)).reduce((a, c) => a + c.valor, 0))}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setSelecionadas(new Set())} className="btn-ghost py-1! text-xs!">Limpar</button>
                <button
                  onClick={() => setReceber(cobrancas.filter((c) => selecionadas.has(c.id)))}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-[#fff] bg-emerald-600 hover:bg-emerald-500"
                >
                  <CheckCircle2 size={13} /> Receber selecionadas
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-[var(--border-color)]">
                  <th className="pl-4 pr-1 py-2.5 w-8">
                    <input
                      type="checkbox"
                      checked={todasSelecionadas}
                      disabled={!abertasVisiveis.length}
                      onChange={() =>
                        setSelecionadas(todasSelecionadas ? new Set() : new Set(abertasVisiveis.map((c) => c.id)))
                      }
                    />
                  </th>
                  <th className="px-3 py-2.5 font-medium">Cliente</th>
                  <th className="px-3 py-2.5 font-medium">Vencimento</th>
                  <th className="px-3 py-2.5 font-medium text-right">Máquinas</th>
                  <th className="px-3 py-2.5 font-medium text-right">Valor</th>
                  <th className="px-3 py-2.5 font-medium">Situação</th>
                  <th className="px-3 py-2.5 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {lista.map((c) => {
                  const wa = linkWhatsApp(c.cliente.telefone, mensagemCobranca(c));
                  const aberta = c.status === "PENDENTE";
                  return (
                    <tr key={c.id} className={cn("hover:bg-black/[0.02] dark:hover:bg-white/[0.02]", selecionadas.has(c.id) && "bg-emerald-500/5")}>
                      <td className="pl-4 pr-1 py-2.5">
                        <input type="checkbox" disabled={!aberta} checked={selecionadas.has(c.id)} onChange={() => toggle(c.id)} />
                      </td>
                      <td className="px-3 py-2.5 min-w-[220px]">
                        <button onClick={() => setHistorico(c.clienteId)} className="text-left">
                          <p className="font-medium text-white hover:text-blue-500 transition-colors">{c.cliente.nome}</p>
                          {c.cliente.telefone && <p className="text-xs text-slate-500">{formatarTelefone(c.cliente.telefone)}</p>}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{formatDate(c.vencimento)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-300 whitespace-nowrap">
                        {c.maquinasProprias + c.maquinasPlano36}
                        {c.maquinasPlano36 > 0 && <span className="text-xs text-slate-500"> ({c.maquinasPlano36} p36)</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <p className="font-semibold text-white tabular-nums">{formatCurrency(c.valor)}</p>
                        {c.status === "PAGO" && c.valorPago !== c.valor && (
                          <p className="text-xs text-slate-500">pago {formatCurrency(c.valorPago)}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Pill status={c.situacao} />
                        {c.pagoEm && (
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {formatDate(c.pagoEm)}{c.formaPagamento && ` · ${c.formaPagamento}`}
                          </p>
                        )}
                        {c.observacoes && <p className="text-[11px] text-slate-500 mt-0.5 max-w-[180px] truncate" title={c.observacoes}>{c.observacoes}</p>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {aberta && (
                            <button
                              onClick={() => setReceber([c])}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20"
                            >
                              <CheckCircle2 size={13} /> Receber
                            </button>
                          )}
                          {wa && aberta && (
                            <a href={wa} target="_blank" rel="noreferrer" title="Enviar cobrança no WhatsApp" className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-500/10">
                              <MessageCircle size={15} />
                            </a>
                          )}
                          {aberta && (
                            <button
                              type="button"
                              onClick={() => copiarMensagem(mensagemCobranca(c))}
                              title="Copiar mensagem de cobrança para enviar manualmente"
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-500/10 hover:text-blue-500"
                            >
                              <Copy size={15} />
                            </button>
                          )}
                          <Menu
                            items={[
                              aberta && { label: "Copiar mensagem de cobrança", icon: Copy, onClick: () => copiarMensagem(mensagemCobranca(c)) },
                              aberta && { label: "Ajustar valor/vencimento", icon: Pencil, onClick: () => setEditar(c) },
                              { label: "Histórico do cliente", icon: History, onClick: () => setHistorico(c.clienteId) },
                              c.status === "PAGO" && {
                                label: "Estornar pagamento",
                                icon: RotateCcw,
                                onClick: () =>
                                  setConfirmar({
                                    title: "Estornar pagamento?",
                                    message: "A cobrança volta para em aberto. Se houve lançamento no financeiro, ele é removido e o saldo da conta é ajustado.",
                                    confirmLabel: "Estornar",
                                    onConfirm: async () => {
                                      await machinePayApi.estornarCobranca(c.id);
                                      invalidar();
                                      toast.show("Pagamento estornado");
                                    },
                                  }),
                              },
                              c.status !== "CANCELADO" && {
                                label: "Cancelar cobrança",
                                icon: Ban,
                                onClick: () =>
                                  setConfirmar({
                                    title: "Cancelar cobrança?",
                                    message: `A cobrança de ${c.cliente.nome} não será mais considerada neste mês.`,
                                    confirmLabel: "Cancelar cobrança",
                                    danger: true,
                                    onConfirm: async () => {
                                      await machinePayApi.cancelarCobranca(c.id);
                                      invalidar();
                                      toast.show("Cobrança cancelada");
                                    },
                                  }),
                              },
                              c.status === "CANCELADO" && {
                                label: "Reabrir cobrança",
                                icon: RotateCcw,
                                onClick: async () => {
                                  await machinePayApi.estornarCobranca(c.id);
                                  invalidar();
                                  toast.show("Cobrança reaberta");
                                },
                              },
                              {
                                label: "Excluir",
                                icon: Trash2,
                                danger: true,
                                onClick: () =>
                                  setConfirmar({
                                    title: "Excluir cobrança?",
                                    message: "Ela pode ser gerada novamente depois pelo botão Gerar cobranças.",
                                    confirmLabel: "Excluir",
                                    danger: true,
                                    onConfirm: async () => {
                                      await machinePayApi.removerCobranca(c.id);
                                      invalidar();
                                      toast.show("Cobrança excluída");
                                    },
                                  }),
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!lista.length && <p className="text-sm text-slate-500 text-center py-10">Nenhuma cobrança encontrada.</p>}
          </div>
        </div>
      )}

      {receber && (
        <ReceberModal
          cobrancas={receber}
          contas={contas}
          onClose={() => {
            setReceber(null);
            invalidar();
          }}
          onDone={(n) => {
            setReceber(null);
            setSelecionadas(new Set());
            invalidar();
            qc.invalidateQueries({ queryKey: ["movimentacoes"] });
            toast.show(n > 1 ? `${n} recebimentos registrados` : "Recebimento registrado");
          }}
        />
      )}
      {editar && (
        <EditarCobrancaModal
          cobranca={editar}
          onClose={() => setEditar(null)}
          onDone={() => {
            setEditar(null);
            invalidar();
            toast.show("Cobrança atualizada");
          }}
        />
      )}
      {confirmar && <ConfirmModal {...confirmar} onClose={() => setConfirmar(null)} />}
      {historico && <HistoricoModal clienteId={historico} onClose={() => setHistorico(null)} />}
    </div>
  );
}

// ─── Aba: Clientes ──────────────────────────────────────────────────────────

function SortTh({ label, campo, sort, setSort, className }) {
  const ativo = sort.campo === campo;
  return (
    <th className={cn("px-3 py-2.5 font-medium", className)}>
      <button
        onClick={() => setSort({ campo, dir: ativo && sort.dir === "asc" ? "desc" : "asc" })}
        className={cn("inline-flex items-center gap-1 hover:text-white", ativo && "text-blue-500")}
      >
        {label}
        {ativo && (sort.dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </button>
    </th>
  );
}

function TagMaquina({ valor, rotulo, tom = "slate" }) {
  if (!valor) return null;
  const tons = {
    slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    red: "bg-red-500/10 text-red-600 dark:text-red-300",
  };
  return (
    <span className={cn("px-1.5 py-px rounded-md text-[10px] font-medium whitespace-nowrap", tons[tom])}>
      {valor} {rotulo}
    </span>
  );
}

// Mostra de onde vem o valor: "9 × R$ 40,00 + 2 × R$ 65,00".
function formulaMensalidade(c) {
  if (c.valorFixo !== null) return "Valor combinado";
  const partes = [];
  if (c.maquinasProprias) partes.push(`${c.maquinasProprias} × ${formatCurrency(c.valorMensalidade)}`);
  if (c.maquinasPlano36) partes.push(`${c.maquinasPlano36} × ${formatCurrency(c.valorMensalidade36)}`);
  return partes.join(" + ") || "Sem máquinas";
}

function ClientesTab({ clientes, isLoading, competencia, cobrancaAtiva, toast, onImportar }) {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("ATIVO");
  const [sort, setSort] = useState({ campo: "nome", dir: "asc" });
  const [editando, setEditando] = useState(null);
  const [ajuste, setAjuste] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [confirmar, setConfirmar] = useState(null);
  const [pendente, setPendente] = useState(null);

  const invalidar = () => qc.invalidateQueries({ queryKey: ["machinepay"] });

  // Em modo cadastro nao ha cobranca aberta para atualizar.
  const aplicarNaCompetencia = cobrancaAtiva ? competencia : undefined;

  async function ajusteRapido(cliente, quantidade) {
    setPendente(cliente.id);
    try {
      await machinePayApi.ajustarMaquinas(cliente.id, {
        tipo: "PROPRIA",
        quantidade,
        motivo: "Ajuste rápido",
        aplicarNaCompetencia,
      });
      await invalidar();
      toast.show(
        `${quantidade > 0 ? "+1 máquina" : "-1 máquina"} para ${cliente.nome}`,
        {
          undo: async () => {
            await machinePayApi.ajustarMaquinas(cliente.id, {
              tipo: "PROPRIA",
              quantidade: -quantidade,
              motivo: "Desfeito",
              aplicarNaCompetencia,
            });
            invalidar();
          },
        },
      );
    } catch (e) {
      toast.show(erroApi(e), { error: true });
    } finally {
      setPendente(null);
    }
  }

  const contagem = useMemo(() => {
    const c = { TODOS: clientes.length, ATIVO: 0, SUSPENSO: 0, INATIVO: 0, DEVENDO: 0, ON_INATIVAS: 0 };
    for (const cl of clientes) {
      c[cl.status] += 1;
      if (cl.valorAtrasado > 0) c.DEVENDO += 1;
      if (cl.maquinasOnInativas > 0) c.ON_INATIVAS += 1;
    }
    return c;
  }, [clientes]);

  const totais = useMemo(() => {
    const ativos = clientes.filter((c) => c.status === "ATIVO");
    return {
      ativos: ativos.length,
      proprias: ativos.reduce((a, c) => a + c.maquinasProprias, 0),
      plano36: ativos.reduce((a, c) => a + c.maquinasPlano36, 0),
      off: clientes.reduce((a, c) => a + c.maquinasOff, 0),
      onInativas: clientes.reduce((a, c) => a + (c.maquinasOnInativas || 0), 0),
      mrr: ativos.reduce((a, c) => a + c.valorCalculado, 0),
    };
  }, [clientes]);

  const lista = useMemo(() => {
    const termo = normalizarBusca(busca.trim());
    const valorSort = {
      nome: (c) => normalizarBusca(c.nome),
      maquinas: (c) => c.totalMaquinas,
      valor: (c) => c.valorCalculado,
      dia: (c) => c.diaVencimento,
      ultimo: (c) => (c.ultimoPagamento ? new Date(c.ultimoPagamento).getTime() : 0),
      atraso: (c) => c.valorAtrasado,
    }[sort.campo];

    return clientes
      .filter((c) => {
        if (filtro === "DEVENDO" && !(c.valorAtrasado > 0)) return false;
        if (filtro === "ON_INATIVAS" && !(c.maquinasOnInativas > 0)) return false;
        if (!["TODOS", "DEVENDO", "ON_INATIVAS"].includes(filtro) && c.status !== filtro) return false;
        return !termo || normalizarBusca(`${c.nome} ${c.telefone} ${c.documento} ${c.observacoes}`).includes(termo);
      })
      .sort((a, b) => {
        const va = valorSort(a);
        const vb = valorSort(b);
        const r = va < vb ? -1 : va > vb ? 1 : 0;
        return sort.dir === "asc" ? r : -r;
      });
  }, [clientes, busca, filtro, sort]);

  if (isLoading) {
    return <div className="py-20 flex justify-center text-slate-500"><Loader2 className="animate-spin" /></div>;
  }

  if (!clientes.length) {
    return (
      <>
        <EmptyState
          icon={Users}
          title="Nenhum cliente cadastrado ainda"
          description="Importe a planilha de controle para trazer todos os clientes de uma vez, ou cadastre um por um."
        >
          <button onClick={onImportar} className="btn-primary inline-flex items-center gap-2">
            <Upload size={15} /> Importar planilha
          </button>
          <button onClick={() => setEditando({})} className="btn-ghost inline-flex items-center gap-2">
            <Plus size={15} /> Cadastrar manualmente
          </button>
        </EmptyState>
        {editando && (
          <ClienteModal
            cliente={null}
            onClose={() => setEditando(null)}
            onSaved={(c) => {
              setEditando(null);
              invalidar();
              toast.show(`${c.nome} cadastrado`);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi icon={Users} label="Clientes ativos" value={totais.ativos} detail={`${contagem.SUSPENSO} suspensos · ${contagem.INATIVO} inativos`} />
        <Kpi icon={CreditCard} label="Máquinas próprias" value={totais.proprias} tone="slate" />
        <Kpi icon={CreditCard} label="Máquinas plano 36" value={totais.plano36} tone="slate" />
        <Kpi icon={PowerOff} label="Máquinas off" value={totais.off} tone={totais.off ? "amber" : "slate"} detail="Desligadas no painel" />
        <Kpi
          icon={AlertTriangle}
          label="Máquinas on inativas"
          value={totais.onInativas}
          tone={totais.onInativas ? "red" : "slate"}
          detail="Ligadas, sem venda há 30 dias"
        />
        <Kpi
          icon={Wallet}
          tone="green"
          label={cobrancaAtiva ? "Receita mensal" : "Receita mensal prevista"}
          value={formatCurrency(totais.mrr)}
          detail={`${totais.proprias + totais.plano36} máquinas cobradas`}
        />
      </div>

      <div className="glass rounded-2xl card-shadow">
        <div className="flex flex-wrap items-center gap-3 p-3 border-b border-[var(--border-color)]">
          <SearchBox value={busca} onChange={setBusca} placeholder="Buscar por nome, telefone, documento..." />
          <div className="flex flex-wrap gap-1">
            <Chip active={filtro === "ATIVO"} onClick={() => setFiltro("ATIVO")} count={contagem.ATIVO}>Ativos</Chip>
            {cobrancaAtiva && (
              <Chip active={filtro === "DEVENDO"} onClick={() => setFiltro("DEVENDO")} count={contagem.DEVENDO}>Devendo</Chip>
            )}
            {contagem.ON_INATIVAS > 0 && (
              <Chip active={filtro === "ON_INATIVAS"} onClick={() => setFiltro("ON_INATIVAS")} count={contagem.ON_INATIVAS}>Com on inativas</Chip>
            )}
            <Chip active={filtro === "SUSPENSO"} onClick={() => setFiltro("SUSPENSO")} count={contagem.SUSPENSO}>Suspensos</Chip>
            <Chip active={filtro === "INATIVO"} onClick={() => setFiltro("INATIVO")} count={contagem.INATIVO}>Inativos</Chip>
            <Chip active={filtro === "TODOS"} onClick={() => setFiltro("TODOS")} count={contagem.TODOS}>Todos</Chip>
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={onImportar} className="btn-ghost inline-flex items-center gap-1.5 py-1.5!">
              <Upload size={14} /> Importar
            </button>
            <button onClick={() => setEditando({})} className="btn-primary inline-flex items-center gap-1.5 py-1.5!">
              <Plus size={15} /> Novo cliente
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-[var(--border-color)]">
                <SortTh label="Cliente" campo="nome" sort={sort} setSort={setSort} className="pl-4" />
                <SortTh label="Vencimento" campo="dia" sort={sort} setSort={setSort} />
                <SortTh label="Máquinas" campo="maquinas" sort={sort} setSort={setSort} />
                <SortTh label="Mensalidade" campo="valor" sort={sort} setSort={setSort} className="text-right" />
                {cobrancaAtiva ? (
                  <>
                    <SortTh label="Último pagamento" campo="ultimo" sort={sort} setSort={setSort} />
                    <SortTh label="Situação" campo="atraso" sort={sort} setSort={setSort} />
                  </>
                ) : (
                  <th className="px-3 py-2.5 font-medium">Status</th>
                )}
                <th className="px-3 py-2.5 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {lista.map((c) => (
                <tr key={c.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                  <td className="pl-4 pr-3 py-3 min-w-[220px]">
                    <button onClick={() => setHistorico(c.id)} className="text-left" title="Ver histórico do cliente">
                      <p className="font-medium text-white hover:text-blue-500 transition-colors">{c.nome}</p>
                      <p className="text-xs text-slate-500">
                        {formatarTelefone(c.telefone) || <span className="italic">Sem telefone</span>}
                        {c.observacoes && <span title={c.observacoes}> · {c.observacoes.slice(0, 40)}{c.observacoes.length > 40 && "…"}</span>}
                      </p>
                    </button>
                  </td>
                  <td className="px-3 py-3 text-slate-400 tabular-nums whitespace-nowrap">Todo dia {c.diaVencimento}</td>
                  <td className="px-3 py-3">
                    <div className="inline-flex items-center rounded-lg border border-[var(--input-border)] overflow-hidden">
                      <button
                        disabled={pendente === c.id || c.maquinasProprias === 0}
                        onClick={() => ajusteRapido(c, -1)}
                        title="Remover 1 máquina própria"
                        className="px-1.5 py-1 text-slate-400 hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="min-w-[34px] text-center font-semibold text-white tabular-nums">
                        {pendente === c.id ? <Loader2 size={13} className="animate-spin inline" /> : c.totalMaquinas}
                      </span>
                      <button
                        disabled={pendente === c.id}
                        onClick={() => ajusteRapido(c, 1)}
                        title="Adicionar 1 máquina própria"
                        className="px-1.5 py-1 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-500 disabled:opacity-30"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <TagMaquina valor={c.maquinasProprias} rotulo="próprias" />
                      <TagMaquina valor={c.maquinasPlano36} rotulo="plano 36" tom="blue" />
                      <TagMaquina valor={c.maquinasOff} rotulo="off" tom="amber" />
                      <TagMaquina valor={c.maquinasOnInativas} rotulo="on inativas" tom="red" />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <p className="font-semibold text-white tabular-nums">{formatCurrency(c.valorCalculado)}</p>
                    <p className={cn("text-[11px] tabular-nums", c.valorFixo !== null ? "text-amber-600 dark:text-amber-300" : "text-slate-500")}>
                      {formulaMensalidade(c)}
                    </p>
                  </td>
                  {cobrancaAtiva ? (
                    <>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <p className="text-slate-300">{c.ultimoPagamento ? formatDate(c.ultimoPagamento) : "—"}</p>
                        <p className="text-[11px] text-slate-500">{tempoRelativo(c.diasDesdeUltimoPagamento)}</p>
                      </td>
                      <td className="px-3 py-3">
                        {c.status !== "ATIVO" ? (
                          <Pill status={c.status} />
                        ) : c.valorAtrasado > 0 ? (
                          <div>
                            <Pill status="ATRASADO">Atrasado há {c.diasEmAtraso} dias</Pill>
                            <p className="text-[11px] text-red-500 mt-0.5 tabular-nums">
                              {formatCurrency(c.valorAtrasado)} · {c.cobrancasAtrasadas} {c.cobrancasAtrasadas === 1 ? "mês" : "meses"}
                            </p>
                          </div>
                        ) : (
                          <Pill status="PAGO">Em dia</Pill>
                        )}
                      </td>
                    </>
                  ) : (
                    <td className="px-3 py-3"><Pill status={c.status} /></td>
                  )}
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setAjuste(c)}
                        title="Adicionar ou remover máquinas próprias, plano 36 ou off"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 whitespace-nowrap"
                      >
                        <CreditCard size={13} /> Máquinas
                      </button>
                      <button onClick={() => setEditando(c)} title="Editar cadastro" className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-500/10 hover:text-blue-500">
                        <Pencil size={15} />
                      </button>
                      <Menu
                        items={[
                          { label: "Histórico", icon: History, onClick: () => setHistorico(c.id) },
                          cobrancaAtiva && c.telefone && c.valorAtrasado > 0 && {
                            label: "Cobrar no WhatsApp",
                            icon: MessageCircle,
                            onClick: () => window.open(linkWhatsApp(c.telefone, mensagemInadimplencia(c)), "_blank"),
                          },
                          c.status !== "SUSPENSO" && {
                            label: "Suspender",
                            icon: Ban,
                            onClick: async () => {
                              await machinePayApi.atualizarCliente(c.id, { status: "SUSPENSO" });
                              invalidar();
                              toast.show(`${c.nome} suspenso`);
                            },
                          },
                          c.status !== "ATIVO" && {
                            label: "Reativar",
                            icon: RotateCcw,
                            onClick: async () => {
                              await machinePayApi.atualizarCliente(c.id, { status: "ATIVO" });
                              invalidar();
                              toast.show(`${c.nome} reativado`);
                            },
                          },
                          c.status !== "INATIVO" && {
                            label: "Inativar",
                            icon: PowerOff,
                            onClick: async () => {
                              await machinePayApi.atualizarCliente(c.id, { status: "INATIVO" });
                              invalidar();
                              toast.show(`${c.nome} inativado`);
                            },
                          },
                          {
                            label: "Excluir",
                            icon: Trash2,
                            danger: true,
                            onClick: () =>
                              setConfirmar({
                                title: "Excluir cliente?",
                                message: `${c.nome} e todo o histórico de cobranças serão apagados. Para manter o histórico, prefira Inativar.`,
                                confirmLabel: "Excluir",
                                danger: true,
                                onConfirm: async () => {
                                  await machinePayApi.removerCliente(c.id);
                                  invalidar();
                                  toast.show("Cliente excluído");
                                },
                              }),
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!lista.length && <p className="text-sm text-slate-500 text-center py-10">Nenhum cliente encontrado.</p>}
        </div>
      </div>

      {editando && (
        <ClienteModal
          cliente={editando.id ? editando : null}
          onClose={() => setEditando(null)}
          onSaved={(c, novo) => {
            setEditando(null);
            invalidar();
            toast.show(novo ? `${c.nome} cadastrado` : "Cliente atualizado");
          }}
        />
      )}
      {ajuste && (
        <AjusteMaquinasModal
          cliente={ajuste}
          competencia={competencia}
          cobrancaAtiva={cobrancaAtiva}
          onClose={() => setAjuste(null)}
          onSaved={(delta, tipo) => {
            const nome = ajuste.nome;
            setAjuste(null);
            invalidar();
            toast.show(`${delta > 0 ? "+" : ""}${delta} ${TIPOS_MAQUINA[tipo].label.toLowerCase()} · ${nome}`);
          }}
        />
      )}
      {historico && <HistoricoModal clienteId={historico} onClose={() => setHistorico(null)} />}
      {confirmar && <ConfirmModal {...confirmar} onClose={() => setConfirmar(null)} />}
    </div>
  );
}

// ─── Aba: Inadimplência ─────────────────────────────────────────────────────

function InadimplenciaTab({ clientes, toast }) {
  async function copiarMensagem(texto) {
    try {
      await copiarTexto(texto);
      toast.show("Mensagem copiada · cole no WhatsApp ou onde preferir");
    } catch (e) {
      toast.show(erroApi(e), { error: true });
    }
  }

  const [historico, setHistorico] = useState(null);
  const devedores = useMemo(
    () => clientes.filter((c) => c.valorAtrasado > 0).sort((a, b) => b.diasEmAtraso - a.diasEmAtraso),
    [clientes],
  );

  const faixas = useMemo(() => {
    const f = [
      { label: "1 a 15 dias", min: 0, max: 15, tone: "amber" },
      { label: "16 a 30 dias", min: 16, max: 30, tone: "amber" },
      { label: "31 a 60 dias", min: 31, max: 60, tone: "red" },
      { label: "Mais de 60 dias", min: 61, max: Infinity, tone: "red" },
    ].map((x) => ({ ...x, qtd: 0, valor: 0 }));
    for (const c of devedores) {
      const faixa = f.find((x) => c.diasEmAtraso >= x.min && c.diasEmAtraso <= x.max);
      faixa.qtd += 1;
      faixa.valor += c.valorAtrasado;
    }
    return f;
  }, [devedores]);

  if (!devedores.length) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Nenhum cliente em atraso"
        description="Todas as cobranças vencidas foram pagas. Clientes com mensalidades vencidas e não pagas aparecem aqui."
      />
    );
  }

  const total = devedores.reduce((a, c) => a + c.valorAtrasado, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <Kpi icon={AlertTriangle} tone="red" label="Total em atraso" value={formatCurrency(total)} detail={`${devedores.length} cliente(s)`} />
        {faixas.map((f) => (
          <Kpi key={f.label} icon={Clock} tone={f.tone} label={f.label} value={formatCurrency(f.valor)} detail={`${f.qtd} cliente(s)`} />
        ))}
      </div>

      <div className="glass rounded-2xl card-shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-[var(--border-color)]">
              <th className="pl-4 pr-3 py-2.5 font-medium">Cliente</th>
              <th className="px-3 py-2.5 font-medium">Tempo sem pagar</th>
              <th className="px-3 py-2.5 font-medium">Último pagamento</th>
              <th className="px-3 py-2.5 font-medium text-right">Meses em aberto</th>
              <th className="px-3 py-2.5 font-medium text-right">Valor devido</th>
              <th className="px-3 py-2.5 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {devedores.map((c) => {
              const wa = linkWhatsApp(c.telefone, mensagemInadimplencia(c));
              const grave = c.diasEmAtraso > 30;
              return (
                <tr key={c.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                  <td className="pl-4 pr-3 py-2.5 min-w-[220px]">
                    <p className="font-medium text-white">{c.nome}</p>
                    <p className="text-xs text-slate-500">
                      {c.totalMaquinas} máquinas · {formatCurrency(c.valorCalculado)}/mês
                      {c.status !== "ATIVO" && ` · ${SITUACAO[c.status].label}`}
                    </p>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", grave ? "bg-red-500" : "bg-amber-500")} />
                      <span className={cn("font-semibold tabular-nums whitespace-nowrap", grave ? "text-red-500" : "text-amber-600 dark:text-amber-300")}>
                        {c.diasEmAtraso} dias
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">
                    {c.ultimoPagamento ? `${formatDate(c.ultimoPagamento)} (${tempoRelativo(c.diasDesdeUltimoPagamento).toLowerCase()})` : "Nunca pagou"}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-300">{c.cobrancasAtrasadas}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-red-500 tabular-nums">{formatCurrency(c.valorAtrasado)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      {wa && (
                        <a href={wa} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20">
                          <MessageCircle size={13} /> Cobrar
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => copiarMensagem(mensagemInadimplencia(c))}
                        title="Copiar mensagem para enviar manualmente"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20"
                      >
                        <Copy size={13} /> Copiar
                      </button>
                      <button onClick={() => setHistorico(c.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-500/10 hover:text-blue-500" title="Histórico">
                        <History size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {historico && <HistoricoModal clienteId={historico} onClose={() => setHistorico(null)} />}
    </div>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────

// Busca tudo no painel Machine Pay (clientes, ON/OFF e vendas dos ultimos 30
// dias). Roda em segundo plano no backend; aqui so acompanhamos o status.
function AtualizarPainelButton({ toast }) {
  const qc = useQueryClient();
  const [disparado, setDisparado] = useState(false);
  const { data: status } = useQuery({
    queryKey: ["machinepay", "painel-status"],
    queryFn: () => machinePayApi.statusPainel().then((r) => r.data),
    refetchInterval: 60000,
  });
  const emAndamento = Boolean(status?.emAndamento);

  if (!status?.configurado) return null;

  async function atualizar() {
    setDisparado(true);
    try {
      const anterior = status.ultima?.em;
      await machinePayApi.sincronizarPainel();
      // Espera terminar uma sincronizacao completa iniciada depois do clique.
      let atual;
      do {
        await new Promise((r) => setTimeout(r, 3000));
        atual = (await machinePayApi.statusPainel()).data;
      } while (
        atual.emAndamento ||
        !atual.ultima ||
        atual.ultima.em === anterior ||
        (atual.ultima.ok && !atual.ultima.verificouVendas)
      );

      qc.setQueryData(["machinepay", "painel-status"], atual);
      await qc.invalidateQueries({ queryKey: ["machinepay"] });
      const u = atual.ultima;
      toast.show(
        u.ok
          ? `Painel atualizado: ${u.clientesMachinePay} clientes · ${u.maquinas.off} off · ${u.maquinas.onInativas} on inativas`
          : `Falha ao atualizar: ${u.erro}`,
        { error: !u.ok },
      );
    } catch (e) {
      toast.show(erroApi(e), { error: true });
    } finally {
      setDisparado(false);
    }
  }

  const ultima = status.ultimaVerificacaoVendas || status.ultima?.em;
  return (
    <button
      onClick={atualizar}
      disabled={emAndamento || disparado}
      title={
        ultima
          ? `Última verificação: ${new Date(ultima).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}. Automática todo dia às ${status.horaVerificacaoVendas}h.`
          : `Automática todo dia às ${status.horaVerificacaoVendas}h`
      }
      className="btn-ghost inline-flex items-center gap-2 disabled:opacity-70"
    >
      <RotateCcw size={15} className={cn((emAndamento || disparado) && "animate-spin")} />
      {emAndamento || disparado ? "Buscando na Machine Pay..." : "Atualizar"}
    </button>
  );
}

export default function MachinePayPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [abaEscolhida, setAba] = useState("cobrancas");
  const [competencia, setCompetencia] = useState(competenciaAtual);
  const [importar, setImportar] = useState(false);
  const [confirmarCobranca, setConfirmarCobranca] = useState(null);

  const configQuery = useQuery({
    queryKey: ["machinepay", "config"],
    queryFn: () => machinePayApi.config().then((r) => r.data),
  });
  const cobrancaAtiva = Boolean(configQuery.data?.cobrancaAtiva);

  const clientesQuery = useQuery({
    queryKey: ["machinepay", "clientes"],
    queryFn: () => machinePayApi.listarClientes().then((r) => r.data),
  });
  const competenciaQuery = useQuery({
    queryKey: ["machinepay", "competencia", competencia],
    queryFn: () => machinePayApi.competencia(competencia).then((r) => r.data),
    enabled: cobrancaAtiva,
  });
  const { data: contas = [] } = useQuery({
    queryKey: ["contas"],
    queryFn: () => cadastrosApi.listarContas().then((r) => r.data),
    enabled: cobrancaAtiva,
  });

  const clientes = clientesQuery.data ?? [];
  const devendo = clientes.filter((c) => c.valorAtrasado > 0).length;
  const erro = clientesQuery.error || competenciaQuery.error || configQuery.error;
  // Em modo cadastro so existe a lista de clientes.
  const aba = cobrancaAtiva ? abaEscolhida : "clientes";

  const abas = [
    { key: "cobrancas", label: "Cobranças do mês", icon: CircleDollarSign },
    { key: "clientes", label: "Clientes", icon: Users, count: clientes.length },
    { key: "inadimplencia", label: "Inadimplência", icon: AlertTriangle, count: devendo || undefined },
  ];

  function alternarCobranca(ativar) {
    setConfirmarCobranca({
      title: ativar ? "Ativar a cobrança?" : "Desativar a cobrança?",
      message: ativar
        ? "As abas Cobranças do mês e Inadimplência passam a aparecer e será possível gerar as mensalidades do mês a partir do cadastro de cada cliente. Nenhuma cobrança é criada automaticamente: você ainda precisa clicar em Gerar cobranças."
        : "O Machine Pay volta a ser apenas cadastro de clientes e máquinas. As cobranças já geradas ficam guardadas e reaparecem quando a cobrança for ativada de novo.",
      confirmLabel: ativar ? "Ativar cobrança" : "Desativar",
      danger: !ativar,
      onConfirm: async () => {
        await machinePayApi.salvarConfig({ cobrancaAtiva: ativar });
        await qc.invalidateQueries({ queryKey: ["machinepay"] });
        if (ativar) setAba("cobrancas");
        toast.show(ativar ? "Cobrança ativada" : "Cobrança desativada · modo cadastro");
      },
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Machine Pay</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {cobrancaAtiva
              ? "Clientes, máquinas e mensalidades, com controle de pagamento"
              : "Cadastro de clientes, máquinas e valores de mensalidade"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <AtualizarPainelButton toast={toast} />
          {cobrancaAtiva && (
            <div className="flex items-center gap-1 rounded-xl glass p-1">
              <button onClick={() => setCompetencia((c) => deslocarCompetencia(c, -1))} className="p-1.5 rounded-lg text-slate-400 hover:bg-black/5 dark:hover:bg-white/5" title="Mês anterior">
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 min-w-[130px] text-center text-sm font-semibold text-white">
                {rotuloCompetencia(competencia)}
              </span>
              <button onClick={() => setCompetencia((c) => deslocarCompetencia(c, 1))} className="p-1.5 rounded-lg text-slate-400 hover:bg-black/5 dark:hover:bg-white/5" title="Próximo mês">
                <ChevronRight size={16} />
              </button>
              {competencia !== competenciaAtual() && (
                <button onClick={() => setCompetencia(competenciaAtual())} className="px-2 py-1 rounded-lg text-xs font-medium text-blue-500 hover:bg-blue-500/10">
                  Hoje
                </button>
              )}
            </div>
          )}
          {configQuery.isLoading ? null : cobrancaAtiva ? (
            <button
              onClick={() => alternarCobranca(false)}
              title="Clique para voltar ao modo apenas cadastro"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Cobrança ativa
            </button>
          ) : (
            <button
              onClick={() => alternarCobranca(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#fff] bg-emerald-600 hover:bg-emerald-500 card-shadow"
            >
              <Power size={15} /> Ativar cobrança
            </button>
          )}
        </div>
      </div>

      {!cobrancaAtiva && !configQuery.isLoading && (
        <div className="flex items-start gap-3 rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5">
          <span className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300 shrink-0">
            <PowerOff size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Modo cadastro: a cobrança está desativada</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Use esta tela para cadastrar e conferir clientes, máquinas e valores. Nenhuma mensalidade é gerada e ninguém aparece como devendo.
              Quando quiser começar a cobrar, clique em <b>Ativar cobrança</b>.
            </p>
          </div>
        </div>
      )}

      {cobrancaAtiva && (
        <div className="flex gap-1 border-b border-[var(--border-color)]">
          {abas.map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setAba(key)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded-t-lg",
                aba === key
                  ? "border-blue-600 text-blue-600 dark:text-blue-300"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white",
              )}
            >
              <Icon size={15} /> {label}
              {count !== undefined && (
                <span
                  className={cn(
                    "px-1.5 rounded-md text-[10px] tabular-nums",
                    key === "inadimplencia" ? "bg-red-500/15 text-red-500" : "bg-slate-500/10",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {erro && (
        <div className="rounded-xl p-4 border border-red-500/30 bg-red-500/5 text-sm text-red-500">
          Não foi possível carregar os dados do Machine Pay: {erroApi(erro)}
        </div>
      )}

      {aba === "cobrancas" && (
        <CobrancasTab
          competencia={competencia}
          dados={competenciaQuery.data}
          isLoading={competenciaQuery.isLoading || clientesQuery.isLoading}
          clientes={clientes}
          contas={contas}
          toast={toast}
          onImportar={() => setImportar(true)}
        />
      )}
      {aba === "clientes" && (
        <ClientesTab
          clientes={clientes}
          isLoading={clientesQuery.isLoading || configQuery.isLoading}
          competencia={competencia}
          cobrancaAtiva={cobrancaAtiva}
          toast={toast}
          onImportar={() => setImportar(true)}
        />
      )}
      {aba === "inadimplencia" && <InadimplenciaTab clientes={clientes} toast={toast} />}

      {importar && (
        <ImportarModal
          onClose={() => setImportar(false)}
          onImported={(r) => {
            setImportar(false);
            qc.invalidateQueries({ queryKey: ["machinepay"] });
            toast.show(`${r.criados} clientes criados · ${r.atualizados} atualizados`);
            setAba("clientes");
          }}
        />
      )}
      {confirmarCobranca && <ConfirmModal {...confirmarCobranca} onClose={() => setConfirmarCobranca(null)} />}
      {toast.node}
    </div>
  );
}
