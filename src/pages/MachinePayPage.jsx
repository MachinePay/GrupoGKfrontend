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
  KeyRound,
  Plus,
  Power,
  PowerOff,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
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
const PRESETS_PARCERIA = [0, 10, 20, 30, 40];
const FORMAS_PAGAMENTO = ["PIX", "Boleto", "Transferência", "Dinheiro", "Cartão"];
const TIPOS_MAQUINA = {
  PROPRIA: { label: "Próprias", campo: "maquinasProprias" },
  PLANO36: { label: "Plano 36", campo: "maquinasPlano36" },
  OFF: { label: "Off", campo: "maquinasOff" },
  PARCERIA: { label: "Parceria", campo: "maquinasParceria" },
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
  if (c.semMensalidade) return 0;
  if (c.valorFixo !== null && c.valorFixo !== undefined && c.valorFixo !== "") {
    return Number(c.valorFixo) || 0;
  }
  return (
    (Number(c.maquinasProprias) || 0) * (Number(c.valorMensalidade) || 0) +
    (Number(c.maquinasPlano36) || 0) * (Number(c.valorMensalidade36) || 0) +
    (Number(c.maquinasParceria) || 0) * (Number(c.valorMensalidadeParceria) || 0)
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
  maquinasParceria: 0,
  valorMensalidade: 40,
  valorMensalidade36: 65,
  valorMensalidadeParceria: 0,
  valorFixo: "",
  status: "ATIVO",
  observacoes: "",
  agrupadoComId: "",
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

function ValorPresets({ value, onChange, presets = PRESETS_VALOR }) {
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
        {presets.map((v) => (
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

function ClienteModal({ cliente, clientes = [], onClose, onSaved }) {
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
  // "maquina" (por máquina), "combinado" (valor fixo) ou "sem" (sem mensalidade).
  const [modo, setModo] = useState(() => {
    if (cliente?.semMensalidade) return "sem";
    if (cliente?.valorFixo !== null && cliente?.valorFixo !== undefined) return "combinado";
    return "maquina";
  });
  const valorCombinado = modo === "combinado";
  const set = (campo) => (valor) => setForm((f) => ({ ...f, [campo]: valor }));
  // Marcar parceria tira das proprias (sao as mesmas maquinas ligadas no painel).
  const setParceria = (valor) =>
    setForm((f) => {
      const delta = (Number(valor) || 0) - (Number(f.maquinasParceria) || 0);
      return {
        ...f,
        maquinasParceria: valor,
        maquinasProprias: Math.max(0, (Number(f.maquinasProprias) || 0) - delta),
      };
    });

  const mutation = useMutation({
    mutationFn: (payload) =>
      cliente
        ? machinePayApi.atualizarCliente(cliente.id, payload)
        : machinePayApi.criarCliente(payload),
    onSuccess: (res) => onSaved(res.data, !cliente),
  });

  const parceria = Number(form.maquinasParceria) || 0;
  const parceriaCobrada = parceria > 0 && Number(form.valorMensalidadeParceria) > 0;
  const totalMaquinas =
    (Number(form.maquinasProprias) || 0) +
    (Number(form.maquinasPlano36) || 0) +
    (parceriaCobrada ? parceria : 0);
  const mensal = calcularMensal({
    ...form,
    valorFixo: valorCombinado ? form.valorFixo : null,
    semMensalidade: modo === "sem",
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
      maquinasParceria: parceria,
      valorMensalidade: Number(form.valorMensalidade) || 0,
      valorMensalidade36: Number(form.valorMensalidade36) || 0,
      valorMensalidadeParceria: Number(form.valorMensalidadeParceria) || 0,
      valorFixo: valorCombinado && form.valorFixo !== "" ? Number(form.valorFixo) : null,
      semMensalidade: modo === "sem",
      status: form.status,
      observacoes: form.observacoes,
      agrupadoComId: form.agrupadoComId ? Number(form.agrupadoComId) : null,
    });
  }

  // Quem ja e responsavel por outros nao pode ser agrupado (um nivel so).
  const dependentes = cliente ? clientes.filter((c) => c.agrupadoComId === cliente.id) : [];
  const opcoesResponsavel = clientes
    .filter((c) => c.id !== cliente?.id && !c.agrupadoComId)
    .sort((a, b) => a.nome.localeCompare(b.nome));

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
          {dependentes.length > 0 ? (
            <div className="sm:col-span-2 rounded-lg px-3 py-2 text-xs border border-violet-500/30 bg-violet-500/5 text-slate-400">
              <b className="text-violet-600 dark:text-violet-300">Responsável pela cobrança unificada</b> de:{" "}
              {dependentes.map((d) => d.nome).join(", ")}. Para mudar, edite esses clientes.
            </div>
          ) : (
            <Campo
              label="Cobrar junto com"
              className="sm:col-span-2"
              hint={
                form.agrupadoComId
                  ? "Este cliente não gera cobrança própria: entra na cobrança do responsável, com um Pix só e a mensagem para o telefone dele."
                  : "Escolha outro cliente para juntar as cobranças dos dois numa só."
              }
            >
              <select
                value={form.agrupadoComId}
                onChange={(e) => set("agrupadoComId")(e.target.value)}
                className="input-base"
              >
                <option value="">Cobrança própria (não juntar)</option>
                {opcoesResponsavel.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}{c.telefone ? ` · ${formatarTelefone(c.telefone)}` : ""}
                  </option>
                ))}
              </select>
            </Campo>
          )}
        </div>

        <div className="rounded-xl p-4 space-y-4" style={{ background: "var(--input-bg)" }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Máquinas e mensalidade</p>
            <div className="flex items-center gap-1 rounded-lg glass p-0.5">
              <Chip active={modo === "maquina"} onClick={() => setModo("maquina")}>
                Por máquina
              </Chip>
              <Chip active={modo === "combinado"} onClick={() => setModo("combinado")}>
                Valor combinado
              </Chip>
              <Chip active={modo === "sem"} onClick={() => setModo("sem")}>
                Sem mensalidade
              </Chip>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Campo label="Máquinas próprias">
              <NumberStepper value={form.maquinasProprias} onChange={set("maquinasProprias")} />
            </Campo>
            <Campo label="Máquinas plano 36">
              <NumberStepper value={form.maquinasPlano36} onChange={set("maquinasPlano36")} />
            </Campo>
            <Campo label="Máquinas parceria" hint="Saem das próprias e a sincronização mantém">
              <NumberStepper value={form.maquinasParceria} onChange={setParceria} />
            </Campo>
            <Campo label="Máquinas off" hint="Paradas / sem uso (não altera o valor)">
              <NumberStepper value={form.maquinasOff} onChange={set("maquinasOff")} />
            </Campo>
          </div>

          {modo === "sem" ? (
            <p className="text-xs text-slate-500">
              O cliente continua no cadastro e as máquinas seguem sendo atualizadas pelo painel, mas ele não gera cobrança nem entra na receita.
            </p>
          ) : valorCombinado ? (
            <Campo
              label="Valor mensal combinado"
              hint="Substitui o cálculo por máquina (ex.: acordos especiais)"
            >
              <ValorPresets value={form.valorFixo} onChange={set("valorFixo")} />
            </Campo>
          ) : (
            <div className={cn("grid grid-cols-1 gap-3", parceria > 0 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
              <Campo label="Valor por máquina própria">
                <ValorPresets value={form.valorMensalidade} onChange={set("valorMensalidade")} />
              </Campo>
              <Campo label="Valor por máquina plano 36">
                <ValorPresets value={form.valorMensalidade36} onChange={set("valorMensalidade36")} />
              </Campo>
              {parceria > 0 && (
                <Campo label="Valor por máquina parceria" hint="0 = parceria sem cobrança">
                  <ValorPresets
                    value={form.valorMensalidadeParceria}
                    onChange={set("valorMensalidadeParceria")}
                    presets={PRESETS_PARCERIA}
                  />
                </Campo>
              )}
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg px-4 py-3 bg-blue-500/10 border border-blue-500/20">
            <span className="text-xs text-slate-400">
              {totalMaquinas} máquina(s) cobradas
              {parceria > 0 && !parceriaCobrada && ` · ${parceria} parceria sem cobrança`}
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
                  cliente.maquinasOnInativas
                    ? ` · ${semVenda30(cliente)} / ${cliente.maquinasOnInativas60 || 0} sem venda 30d+/60d+`
                    : ""
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
                        : "nenhuma nos últimos 60 dias"}
                    </p>
                  </div>
                  {!m.ligada ? (
                    <TagMaquina valor="OFF" rotulo="" tom="amber" />
                  ) : m.inativa60 ? (
                    <TagMaquina valor="ON" rotulo="· sem venda 60d+" tom="red" />
                  ) : m.inativa ? (
                    <TagMaquina valor="ON" rotulo="· sem venda 30d+" tom="amber" />
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

// Detalhe dos clientes quando a cobranca junta varios (vazio se for um so).
function detalheItens(itens) {
  if (!Array.isArray(itens) || itens.length < 2) return "";
  return (
    "Cobrança unificada:\n" +
    itens
      .map((i) => `   • ${i.nome}: ${i.maquinas} ${i.maquinas === 1 ? "equipamento" : "equipamentos"} · ${formatCurrency(i.valor)}`)
      .join("\n") +
    "\n\n"
  );
}

// Mensagem para quem ja passou do vencimento (tom de alerta de bloqueio).
function mensagemAtraso({ dias, maquinas, valor, diaVencimento, itens }) {
  return (
    "Olá! Tudo bem?\n\n" +
    "MachinePay | Financeiro\n\n" +
    `Identificamos que a mensalidade abaixo permanece em aberto, com ${dias} ${dias === 1 ? "dia" : "dias"} de atraso:\n\n` +
    `▪️ Equipamentos ativos: ${maquinas}\n` +
    `▪️ Valor total: ${formatCurrency(valor)}\n` +
    `▪️ Vencimento: dia ${diaVencimento}\n\n` +
    detalheItens(itens) +
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
  const maquinas = cobranca.maquinasProprias + cobranca.maquinasPlano36 + (cobranca.maquinasParceria || 0);
  const dia = new Date(cobranca.vencimento).getUTCDate();

  if (cobranca.situacao === "ATRASADO") {
    return mensagemAtraso({
      dias: diasDeAtraso(cobranca.vencimento),
      maquinas,
      valor: cobranca.valor,
      diaVencimento: dia,
      itens: cobranca.itens,
    });
  }

  return (
    "Olá! Tudo bem? 😊\n\n" +
    "MachinePay | Financeiro\n\n" +
    "Segue o lembrete da sua mensalidade:\n\n" +
    `▪️ Equipamentos ativos: ${maquinas}\n` +
    `▪️ Valor total: ${formatCurrency(cobranca.valor)}\n` +
    `▪️ Vencimento: dia ${dia}\n\n` +
    detalheItens(cobranca.itens) +
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

// Mensagem de cobranca com o Pix copia e cola da SumUp no lugar da chave CNPJ.
function mensagemPixSumup(cobranca, copiaCola) {
  const maquinas = cobranca.maquinasProprias + cobranca.maquinasPlano36 + (cobranca.maquinasParceria || 0);
  const dia = new Date(cobranca.vencimento).getUTCDate();
  return (
    "Olá! Tudo bem? 😊\n\n" +
    "MachinePay | Financeiro\n\n" +
    "Segue a sua mensalidade:\n\n" +
    `▪️ Equipamentos ativos: ${maquinas}\n` +
    `▪️ Valor total: ${formatCurrency(cobranca.valor)}\n` +
    `▪️ Vencimento: dia ${dia}\n\n` +
    detalheItens(cobranca.itens) +
    "💳 Pague com o Pix copia e cola abaixo. A baixa é automática, não precisa enviar comprovante:\n\n" +
    `${copiaCola}\n\n` +
    "Agradecemos pela parceria! Estamos à disposição para ajudar.\n\n" +
    "Equipe Financeira | MachinePay"
  );
}

function PixSumupModal({ cobranca, onClose, onPago, toast }) {
  const [pix, setPix] = useState(null);
  const [qrFalhou, setQrFalhou] = useState(false);

  const gerar = useMutation({
    mutationFn: (novo) => machinePayApi.gerarPix(cobranca.id, novo).then((r) => r.data),
    onSuccess: (data) => {
      setQrFalhou(false);
      setPix(data);
    },
  });

  const verificar = useMutation({
    mutationFn: () => machinePayApi.verificarPix(cobranca.id).then((r) => r.data),
    onSuccess: (r, origem) => {
      if (r.baixado) onPago();
      else if (origem === "manual") toast.show(`Ainda não pago · status na SumUp: ${r.status || "?"}`);
    },
  });

  const { mutate: gerarPix } = gerar;
  useEffect(() => {
    gerarPix(false);
  }, [gerarPix]);

  // Enquanto o modal esta aberto, confere o pagamento a cada 10 segundos.
  const { mutate: verificarPix } = verificar;
  useEffect(() => {
    if (!pix) return undefined;
    const id = setInterval(() => verificarPix("auto"), 10000);
    return () => clearInterval(id);
  }, [pix, verificarPix]);

  async function copiar(texto, aviso) {
    try {
      await copiarTexto(texto);
      toast.show(aviso);
    } catch (e) {
      toast.show(erroApi(e), { error: true });
    }
  }

  const mensagem = pix?.copiaCola ? mensagemPixSumup(cobranca, pix.copiaCola) : "";
  const wa = mensagem && linkWhatsApp(cobranca.cliente.telefone, mensagem);
  const verificandoManual = verificar.isPending && verificar.variables === "manual";

  return (
    <Modal
      title="Pix da cobrança"
      subtitle={`${cobranca.cliente.nome} · ${rotuloCompetencia(cobranca.competencia)} · ${formatCurrency(cobranca.valor)}`}
      onClose={onClose}
    >
      {gerar.isPending && (
        <div className="flex flex-col items-center gap-3 py-10 text-sm text-slate-500">
          <Loader2 size={22} className="animate-spin text-blue-500" /> Gerando Pix na SumUp...
        </div>
      )}

      {gerar.isError && (
        <div className="space-y-3">
          <p className="text-sm text-red-500">{erroApi(gerar.error)}</p>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="btn-ghost">Fechar</button>
            <button onClick={() => gerar.mutate(false)} className="btn-primary">Tentar de novo</button>
          </div>
        </div>
      )}

      {pix && !gerar.isPending && !gerar.isError && (
        <div className="space-y-4">
          {pix.qrUrl && !qrFalhou && (
            <div className="flex justify-center">
              <img
                src={pix.qrUrl}
                alt="QR Code Pix"
                onError={() => setQrFalhou(true)}
                className="w-52 h-52 rounded-xl bg-[#fff] p-2 object-contain"
              />
            </div>
          )}

          {pix.copiaCola && (
            <Campo label="Pix copia e cola">
              <div className="flex gap-2">
                <input readOnly value={pix.copiaCola} className="input-base font-mono text-xs!" onFocus={(e) => e.target.select()} />
                <button
                  type="button"
                  onClick={() => copiar(pix.copiaCola, "Pix copia e cola copiado")}
                  className="btn-ghost inline-flex items-center gap-1 shrink-0"
                >
                  <Copy size={14} /> Copiar
                </button>
              </div>
            </Campo>
          )}

          <div className="flex items-start gap-2 rounded-xl p-3 border border-emerald-500/30 bg-emerald-500/5 text-xs text-slate-400">
            <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
            <span>
              Este Pix é exclusivo desta cobrança. Quando o cliente pagar, a baixa acontece sozinha.
              {pix.validoAte && <> Válido até <b>{new Date(pix.validoAte).toLocaleString("pt-BR")}</b>.</>}
            </span>
          </div>

          {verificar.isError && verificar.variables === "manual" && (
            <p className="text-sm text-red-500">{erroApi(verificar.error)}</p>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              onClick={() => gerar.mutate(true)}
              className="btn-ghost inline-flex items-center gap-1"
              title="Cria outro Pix (por exemplo, se o atual venceu ou o valor mudou)"
            >
              <RefreshCw size={14} /> Gerar novo
            </button>
            <button
              onClick={() => verificar.mutate("manual")}
              disabled={verificandoManual}
              className="btn-ghost inline-flex items-center gap-1"
            >
              {verificandoManual ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Verificar pagamento
            </button>
            {mensagem && (
              <button onClick={() => copiar(mensagem, "Mensagem com Pix copiada")} className="btn-ghost inline-flex items-center gap-1">
                <Copy size={14} /> Copiar mensagem
              </button>
            )}
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-[#fff] bg-emerald-600 hover:bg-emerald-500"
              >
                <MessageCircle size={15} /> Enviar no WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

// Telefone valido para envio automatico (DDD + numero, com ou sem 55).
function telefoneValido(tel) {
  const d = String(tel || "").replace(/\D/g, "").replace(/^0+/, "");
  return d.length === 10 || d.length === 11 || /^55\d{10,11}$/.test(d);
}

const HORAS_REENVIO = 12;

function EnviarWhatsappModal({ cobrancas, sumupAtivo, intervaloSegundos, onClose, onDone }) {
  const [reenviar, setReenviar] = useState(false);
  const [limite] = useState(() => Date.now() - HORAS_REENVIO * 60 * 60 * 1000);

  const semTelefone = cobrancas.filter((c) => !telefoneValido(c.cliente.telefone));
  const naFila = cobrancas.filter(
    (c) => telefoneValido(c.cliente.telefone) && (c.whatsappStatus === "FILA" || c.whatsappStatus === "ENVIANDO"),
  );
  const recentes = cobrancas.filter(
    (c) =>
      telefoneValido(c.cliente.telefone) &&
      !naFila.includes(c) &&
      c.whatsappEnviadoEm &&
      new Date(c.whatsappEnviadoEm).getTime() > limite,
  );
  const vaoSair = cobrancas.length - semTelefone.length - naFila.length - (reenviar ? 0 : recentes.length);
  const minutos = Math.max(1, Math.round((vaoSair * intervaloSegundos) / 60));

  const mutation = useMutation({
    mutationFn: () =>
      machinePayApi.enviarWhatsapp(cobrancas.map((c) => c.id), reenviar).then((r) => r.data),
    onSuccess: onDone,
  });

  return (
    <Modal title="Enviar cobranças no WhatsApp" subtitle={`${cobrancas.length} selecionada(s)`} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/5">
          <p className="text-2xl font-bold text-white tabular-nums">{vaoSair}</p>
          <p className="text-sm text-slate-400">
            {vaoSair === 1 ? "cliente vai receber" : "clientes vão receber"} a mensagem
            {sumupAtivo ? " e o Pix exclusivo da cobrança" : " com a chave Pix CNPJ"}
            {vaoSair > 0 && <>, uma por vez, em cerca de <b>{minutos} min</b></>}.
          </p>
        </div>

        {!sumupAtivo && (
          <p className="text-xs text-amber-600 dark:text-amber-300">
            A SumUp está desativada: a mensagem vai com a chave CNPJ e a baixa não será automática. Ative a SumUp em Integrações para mandar Pix com baixa automática.
          </p>
        )}

        {(semTelefone.length > 0 || naFila.length > 0 || recentes.length > 0) && (
          <div className="space-y-2 text-xs text-slate-400">
            {semTelefone.length > 0 && (
              <p>
                <b className="text-red-500">{semTelefone.length} sem telefone válido</b> (não serão enviadas):{" "}
                {semTelefone.slice(0, 5).map((c) => c.cliente.nome).join(", ")}
                {semTelefone.length > 5 && "..."}
              </p>
            )}
            {naFila.length > 0 && <p><b>{naFila.length} já estão na fila</b> e não serão duplicadas.</p>}
            {recentes.length > 0 && (
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={reenviar} onChange={(e) => setReenviar(e.target.checked)} className="mt-0.5" />
                <span>
                  <b>{recentes.length} já receberam</b> nas últimas {HORAS_REENVIO}h. Marque para enviar de novo.
                </span>
              </label>
            )}
          </div>
        )}

        <p className="text-xs text-slate-500">
          Pode fechar esta tela: o envio continua no servidor. Quem pagar antes da vez não recebe a mensagem.
        </p>

        {mutation.isError && <p className="text-sm text-red-500">{erroApi(mutation.error)}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancelar</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || vaoSair <= 0}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-[#fff] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
          >
            {mutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Enviar para {vaoSair}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Barra de progresso da fila de envio (aparece enquanto ha mensagens saindo).
function FilaWhatsappBanner({ fila, onCancelar }) {
  if (!fila || (!fila.fila && !fila.enviando)) return null;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 border",
        fila.pausa ? "border-amber-500/30 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/5",
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn("p-2 rounded-xl", fila.pausa ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600")}>
          {fila.pausa ? <AlertTriangle size={16} /> : <Loader2 size={16} className="animate-spin" />}
        </span>
        <div>
          <p className="text-sm font-semibold text-white">
            {fila.pausa ? "Envio pausado" : "Enviando cobranças no WhatsApp"}
            {" · "}
            {fila.fila + (fila.enviando ? 1 : 0)} restante(s)
          </p>
          <p className="text-xs text-slate-500">
            {fila.pausa
              ? fila.pausa
              : fila.enviando
                ? `Agora: ${fila.enviando.nome}`
                : `Próxima em instantes (intervalo de ~${fila.intervaloSegundos}s entre clientes)`}
          </p>
        </div>
      </div>
      {fila.fila > 0 && (
        <button onClick={onCancelar} className="btn-ghost py-1! text-xs! inline-flex items-center gap-1">
          <X size={13} /> Parar envio
        </button>
      )}
    </div>
  );
}

function StatusWhatsapp({ cobranca }) {
  const s = cobranca.whatsappStatus;
  if (!s) return null;
  if (s === "ENVIADO") {
    return (
      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 inline-flex items-center gap-1" title="Cobrança enviada no WhatsApp">
        <MessageCircle size={11} /> enviada {cobranca.whatsappEnviadoEm && new Date(cobranca.whatsappEnviadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
      </p>
    );
  }
  if (s === "ERRO") {
    return (
      <p className="text-[11px] text-red-500 mt-0.5 inline-flex items-center gap-1 max-w-[200px] truncate" title={cobranca.whatsappErro || "Falha no envio"}>
        <MessageCircle size={11} /> falhou no WhatsApp
      </p>
    );
  }
  return (
    <p className="text-[11px] text-slate-500 mt-0.5 inline-flex items-center gap-1">
      <Clock size={11} /> {s === "ENVIANDO" ? "enviando agora" : "na fila do WhatsApp"}
    </p>
  );
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
  const [pixCobranca, setPixCobranca] = useState(null);

  const { data: sumup } = useQuery({
    queryKey: ["machinepay", "sumup"],
    queryFn: () => machinePayApi.sumupConfig().then((r) => r.data),
  });
  const sumupAtivo = Boolean(sumup?.ativo);
  const [enviarWa, setEnviarWa] = useState(null);

  const conferirPix = useMutation({
    mutationFn: () => machinePayApi.conferirPixPagos().then((r) => r.data),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["machinepay"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes"] });
      if (!r.conferidos) {
        toast.show("Nenhum Pix em aberto para verificar");
      } else if (r.baixas) {
        const nomes = r.pagos.slice(0, 3).join(", ") + (r.pagos.length > 3 ? "..." : "");
        toast.show(`${r.baixas} Pix pago(s) com baixa: ${nomes}`);
      } else {
        toast.show(`${r.conferidos} Pix verificado(s) · nenhum pagamento novo${r.falhas ? ` · ${r.falhas} sem resposta` : ""}`);
      }
    },
    onError: (e) => toast.show(erroApi(e), { error: true }),
  });

  const { data: whatsapp } = useQuery({
    queryKey: ["machinepay", "whatsapp"],
    queryFn: () => machinePayApi.whatsappConfig().then((r) => r.data),
  });
  const whatsappAtivo = Boolean(whatsapp?.ativo);

  // Acompanha a fila enquanto houver envio; a lista atualiza junto.
  const { data: filaWa } = useQuery({
    queryKey: ["machinepay", "whatsapp", "fila"],
    queryFn: () => machinePayApi.filaWhatsapp().then((r) => r.data),
    enabled: whatsappAtivo,
    refetchInterval: (q) => (q.state.data?.fila || q.state.data?.enviando ? 4000 : false),
  });
  const filaAtiva = Boolean(filaWa?.fila || filaWa?.enviando);
  useEffect(() => {
    if (!filaAtiva) return undefined;
    const id = setInterval(() => qc.invalidateQueries({ queryKey: ["machinepay", "competencia"] }), 8000);
    return () => clearInterval(id);
  }, [filaAtiva, qc]);

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
      <FilaWhatsappBanner
        fila={filaWa}
        onCancelar={() =>
          setConfirmar({
            title: "Parar o envio?",
            message: "As cobranças que ainda não saíram voltam a ficar sem envio. As que já foram enviadas não mudam.",
            confirmLabel: "Parar envio",
            danger: true,
            onConfirm: async () => {
              const r = await machinePayApi.cancelarWhatsapp();
              qc.invalidateQueries({ queryKey: ["machinepay"] });
              toast.show(`${r.data.canceladas} envio(s) cancelado(s)`);
            },
          })
        }
      />
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
            {sumupAtivo && (
              <button
                onClick={() => conferirPix.mutate()}
                disabled={conferirPix.isPending}
                title="Consulta na SumUp todos os Pix enviados das cobranças em aberto e dá baixa nos que foram pagos"
                className="btn-ghost inline-flex items-center gap-1.5 ml-auto py-1.5!"
              >
                {conferirPix.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {conferirPix.isPending ? "Verificando..." : "Verificar Pix pagos"}
              </button>
            )}
            <button
              onClick={() => exportarCobrancasExcel(lista, rotuloCompetencia(competencia))}
              className={cn("btn-ghost inline-flex items-center gap-1.5 py-1.5!", !sumupAtivo && "ml-auto")}
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
                {whatsappAtivo && (
                  <button
                    onClick={() => setEnviarWa(cobrancas.filter((c) => selecionadas.has(c.id)))}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-[#fff] bg-green-600 hover:bg-green-500"
                  >
                    <Send size={13} /> Enviar no WhatsApp
                  </button>
                )}
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
                          {Array.isArray(c.itens) && c.itens.length > 1 && (
                            <p
                              className="text-[11px] text-blue-600 dark:text-blue-300"
                              title={c.itens.map((i) => `${i.nome}: ${i.maquinas} máq. · ${formatCurrency(i.valor)}`).join("\n")}
                            >
                              Unificada · {c.itens.length} clientes ({c.itens.slice(1).map((i) => i.nome).join(", ")})
                            </p>
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{formatDate(c.vencimento)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-300 whitespace-nowrap">
                        {c.maquinasProprias + c.maquinasPlano36 + (c.maquinasParceria || 0)}
                        {c.maquinasPlano36 > 0 && <span className="text-xs text-slate-500"> ({c.maquinasPlano36} p36)</span>}
                        {c.maquinasParceria > 0 && <span className="text-xs text-violet-500"> ({c.maquinasParceria} parc.)</span>}
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
                        {aberta && <StatusWhatsapp cobranca={c} />}
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
                          {aberta && sumupAtivo && (
                            <button
                              onClick={() => setPixCobranca(c)}
                              title={c.pixCopiaCola ? "Ver o Pix SumUp desta cobrança" : "Gerar Pix SumUp exclusivo desta cobrança"}
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300",
                                c.pixCopiaCola ? "bg-blue-500/20 hover:bg-blue-500/30" : "bg-blue-500/10 hover:bg-blue-500/20",
                              )}
                            >
                              <QrCode size={13} /> Pix
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
      {enviarWa && (
        <EnviarWhatsappModal
          cobrancas={enviarWa}
          sumupAtivo={sumupAtivo}
          intervaloSegundos={whatsapp?.intervaloSegundos ?? 20}
          onClose={() => setEnviarWa(null)}
          onDone={(r) => {
            setEnviarWa(null);
            setSelecionadas(new Set());
            invalidar();
            toast.show(
              r.enfileiradas
                ? `${r.enfileiradas} cobrança(s) na fila do WhatsApp${r.ignoradas.length ? ` · ${r.ignoradas.length} ignorada(s)` : ""}`
                : "Nenhuma cobrança entrou na fila",
              r.enfileiradas ? undefined : { error: true },
            );
          }}
        />
      )}
      {pixCobranca && (
        <PixSumupModal
          cobranca={pixCobranca}
          toast={toast}
          onClose={() => {
            setPixCobranca(null);
            invalidar();
          }}
          onPago={() => {
            setPixCobranca(null);
            invalidar();
            qc.invalidateQueries({ queryKey: ["movimentacoes"] });
            toast.show(`Pix recebido · baixa automática de ${pixCobranca.cliente.nome}`);
          }}
        />
      )}
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
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  };
  return (
    <span className={cn("px-1.5 py-px rounded-md text-[10px] font-medium whitespace-nowrap", tons[tom])}>
      {valor} {rotulo}
    </span>
  );
}

// Maquinas ON que venderam entre 30 e 60 dias atras (maquinasOnInativas inclui
// as de 60+ dias, que nao venderam em todo o historico do painel).
function semVenda30(c) {
  return Math.max(0, (c.maquinasOnInativas || 0) - (c.maquinasOnInativas60 || 0));
}

// Mostra de onde vem o valor: "9 × R$ 40,00 + 2 × R$ 65,00".
function formulaMensalidade(c) {
  if (c.semMensalidade) return "Sem mensalidade";
  if (c.valorFixo !== null) return "Valor combinado";
  const partes = [];
  if (c.maquinasProprias) partes.push(`${c.maquinasProprias} × ${formatCurrency(c.valorMensalidade)}`);
  if (c.maquinasPlano36) partes.push(`${c.maquinasPlano36} × ${formatCurrency(c.valorMensalidade36)}`);
  if (c.maquinasParceria && c.valorMensalidadeParceria) {
    partes.push(`${c.maquinasParceria} parceria × ${formatCurrency(c.valorMensalidadeParceria)}`);
  }
  return partes.join(" + ") || (c.maquinasParceria ? "Só parceria (sem cobrança)" : "Sem máquinas");
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
    const c = { TODOS: clientes.length, ATIVO: 0, SUSPENSO: 0, INATIVO: 0, DEVENDO: 0, COM_OFF: 0, SEM_VENDA_30: 0, SEM_VENDA_60: 0, SEM_MENSALIDADE: 0 };
    for (const cl of clientes) {
      c[cl.status] += 1;
      if (cl.valorAtrasado > 0) c.DEVENDO += 1;
      if (cl.maquinasOff > 0) c.COM_OFF += 1;
      if (cl.semMensalidade) c.SEM_MENSALIDADE += 1;
      if (semVenda30(cl) > 0) c.SEM_VENDA_30 += 1;
      if (cl.maquinasOnInativas60 > 0) c.SEM_VENDA_60 += 1;
    }
    return c;
  }, [clientes]);

  const nomePorId = useMemo(() => new Map(clientes.map((c) => [c.id, c.nome])), [clientes]);
  const qtdAgrupados = useMemo(() => {
    const m = new Map();
    for (const c of clientes) {
      if (c.agrupadoComId) m.set(c.agrupadoComId, (m.get(c.agrupadoComId) || 0) + 1);
    }
    return m;
  }, [clientes]);

  const totais = useMemo(() => {
    const ativos = clientes.filter((c) => c.status === "ATIVO");
    return {
      ativos: ativos.length,
      proprias: ativos.reduce((a, c) => a + c.maquinasProprias, 0),
      plano36: ativos.reduce((a, c) => a + c.maquinasPlano36, 0),
      parceria: ativos.reduce((a, c) => a + (c.maquinasParceria || 0), 0),
      off: clientes.reduce((a, c) => a + c.maquinasOff, 0),
      semVenda30: clientes.reduce((a, c) => a + semVenda30(c), 0),
      semVenda60: clientes.reduce((a, c) => a + (c.maquinasOnInativas60 || 0), 0),
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
        if (filtro === "COM_OFF" && !(c.maquinasOff > 0)) return false;
        if (filtro === "SEM_MENSALIDADE" && !c.semMensalidade) return false;
        if (filtro === "SEM_VENDA_30" && !(semVenda30(c) > 0)) return false;
        if (filtro === "SEM_VENDA_60" && !(c.maquinasOnInativas60 > 0)) return false;
        if (!["TODOS", "DEVENDO", "COM_OFF", "SEM_VENDA_30", "SEM_VENDA_60", "SEM_MENSALIDADE"].includes(filtro) && c.status !== filtro) return false;
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
            clientes={clientes}
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
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <Kpi icon={Users} label="Clientes ativos" value={totais.ativos} detail={`${contagem.SUSPENSO} suspensos · ${contagem.INATIVO} inativos`} />
        <Kpi icon={CreditCard} label="Máquinas próprias" value={totais.proprias} tone="slate" />
        <Kpi icon={CreditCard} label="Máquinas plano 36" value={totais.plano36} tone="slate" detail={totais.parceria ? `${totais.parceria} de parceria` : undefined} />
        <Kpi icon={PowerOff} label="Máquinas off" value={totais.off} tone={totais.off ? "amber" : "slate"} detail="Desligadas no painel" />
        <Kpi
          icon={Clock}
          label="Sem venda há 30+ dias"
          value={totais.semVenda30}
          tone={totais.semVenda30 ? "amber" : "slate"}
          detail="Ligadas, venderam entre 30 e 60 dias atrás"
        />
        <Kpi
          icon={AlertTriangle}
          label="Sem venda há 60+ dias"
          value={totais.semVenda60}
          tone={totais.semVenda60 ? "red" : "slate"}
          detail="Ligadas, nenhuma venda nos 60 dias do painel"
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
            <Chip active={filtro === "COM_OFF"} onClick={() => setFiltro("COM_OFF")} count={contagem.COM_OFF}>Com máquinas off</Chip>
            {contagem.SEM_MENSALIDADE > 0 && (
              <Chip active={filtro === "SEM_MENSALIDADE"} onClick={() => setFiltro("SEM_MENSALIDADE")} count={contagem.SEM_MENSALIDADE}>Sem mensalidade</Chip>
            )}
            <Chip active={filtro === "SEM_VENDA_30"} onClick={() => setFiltro("SEM_VENDA_30")} count={contagem.SEM_VENDA_30}>Sem venda 30d+</Chip>
            <Chip active={filtro === "SEM_VENDA_60"} onClick={() => setFiltro("SEM_VENDA_60")} count={contagem.SEM_VENDA_60}>Sem venda 60d+</Chip>
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
                      <p className="font-medium text-white hover:text-blue-500 transition-colors">
                        {c.nome}
                        {c.painelUsrId && c.painelRevenda !== "Machine Pay" && (
                          <span className="ml-1.5 px-1.5 py-px rounded-md text-[10px] font-medium bg-violet-500/10 text-violet-600 dark:text-violet-300 align-middle">
                            {c.painelRevenda || "Sem revenda"}
                          </span>
                        )}
                      </p>
                      {c.agrupadoComId && nomePorId.get(c.agrupadoComId) && (
                        <p className="text-[11px] text-blue-600 dark:text-blue-300">
                          Cobrado junto com {nomePorId.get(c.agrupadoComId)}
                        </p>
                      )}
                      {qtdAgrupados.get(c.id) > 0 && (
                        <p className="text-[11px] text-blue-600 dark:text-blue-300">
                          Cobrança unificada · +{qtdAgrupados.get(c.id)} cliente(s)
                        </p>
                      )}
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
                      <TagMaquina valor={c.maquinasParceria} rotulo="parceria" tom="violet" />
                      <TagMaquina valor={c.maquinasOff} rotulo="off" tom="amber" />
                      <TagMaquina valor={semVenda30(c)} rotulo="sem venda 30d+" tom="amber" />
                      <TagMaquina valor={c.maquinasOnInativas60} rotulo="sem venda 60d+" tom="red" />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <p className="font-semibold text-white tabular-nums">{formatCurrency(c.valorCalculado)}</p>
                    <p className={cn("text-[11px] tabular-nums", c.semMensalidade ? "text-violet-600 dark:text-violet-300" : c.valorFixo !== null ? "text-amber-600 dark:text-amber-300" : "text-slate-500")}>
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
          clientes={clientes}
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
          ? `Painel atualizado: ${u.clientesMachinePay} clientes · ${u.maquinas.off} off · ${u.maquinas.onInativas - u.maquinas.onInativas60} sem venda 30d+ · ${u.maquinas.onInativas60} sem venda 60d+`
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

// ─── Aba: SumUp (Pix com baixa automática) ──────────────────────────────────

function SumupTab({ contas, toast }) {
  const { data: config, isLoading, error } = useQuery({
    queryKey: ["machinepay", "sumup"],
    queryFn: () => machinePayApi.sumupConfig().then((r) => r.data),
  });

  if (isLoading || !config) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-10 justify-center">
        {error ? <span className="text-red-500">{erroApi(error)}</span> : <><Loader2 size={16} className="animate-spin" /> Carregando configuração...</>}
      </div>
    );
  }

  return <SumupForm config={config} contas={contas} toast={toast} />;
}

function SumupForm({ config, contas, toast }) {
  const qc = useQueryClient();
  // A chave da API nunca volta inteira do servidor: o campo comeca vazio.
  const [form, setForm] = useState(() => ({
    ativo: config.ativo,
    apiKey: "",
    merchantCode: config.merchantCode || "",
    tipoPix: config.tipoPix,
    validadeHoras: config.validadeHoras,
    contaDestinoId: config.contaDestinoId ? String(config.contaDestinoId) : "",
    urlPublica: config.urlPublica || "",
  }));
  const [teste, setTeste] = useState(null);

  const set = (campo) => (e) =>
    setForm((f) => ({ ...f, [campo]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const salvar = useMutation({
    mutationFn: () =>
      machinePayApi
        .salvarSumupConfig({
          ...form,
          apiKey: form.apiKey.trim() || undefined,
          validadeHoras: Number(form.validadeHoras),
          contaDestinoId: form.contaDestinoId ? Number(form.contaDestinoId) : null,
        })
        .then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(["machinepay", "sumup"], data);
      setForm((f) => ({ ...f, apiKey: "", merchantCode: data.merchantCode || "" }));
      toast.show("Configuração da SumUp salva");
    },
    onError: (e) => toast.show(erroApi(e), { error: true }),
  });

  const testar = useMutation({
    mutationFn: () => machinePayApi.testarSumup().then((r) => r.data),
    onSuccess: (data) => {
      setTeste(data);
      qc.invalidateQueries({ queryKey: ["machinepay", "sumup"] });
      setForm((f) => ({ ...f, merchantCode: f.merchantCode || data.merchantCode || "" }));
    },
    onError: (e) => setTeste({ erro: erroApi(e) }),
  });

  async function copiarWebhook() {
    try {
      await copiarTexto(config.webhookUrl);
      toast.show("URL do webhook copiada");
    } catch (e) {
      toast.show(erroApi(e), { error: true });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="glass rounded-2xl p-5 card-shadow space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Conta SumUp</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gera um Pix exclusivo para cada cobrança. Quando o cliente paga, a cobrança recebe baixa sozinha.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-white cursor-pointer shrink-0">
            <input type="checkbox" checked={form.ativo} onChange={set("ativo")} />
            {form.ativo ? "Ativa" : "Desativada"}
          </label>
        </div>

        <Campo
          label="Chave da API (secret key)"
          hint={config.apiKeyConfigurada ? `Chave salva: ${config.apiKeyMascarada}. Deixe em branco para manter.` : "Começa com sup_sk_. Fica guardada só no servidor."}
        >
          <input
            type="password"
            autoComplete="off"
            value={form.apiKey}
            onChange={set("apiKey")}
            placeholder={config.apiKeyConfigurada ? "••••••••" : "sup_sk_..."}
            className="input-base font-mono"
          />
        </Campo>

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Código do estabelecimento (merchant code)" hint="Preenchido automaticamente pelo Testar conexão.">
            <input value={form.merchantCode} onChange={set("merchantCode")} placeholder="Ex.: MH4H92C7" className="input-base font-mono uppercase" />
          </Campo>
          <Campo label="Tipo de Pix">
            <select value={form.tipoPix} onChange={set("tipoPix")} className="input-base">
              <option value="pix">Pix (cai na conta SumUp Bank)</option>
              <option value="qr_code_pix">QR Code Pix (repasse normal, com taxa)</option>
            </select>
          </Campo>
          <Campo label="Validade de cada Pix (horas)" hint="Depois disso, gere um Pix novo na cobrança.">
            <input type="number" min={1} max={720} value={form.validadeHoras} onChange={set("validadeHoras")} className="input-base" />
          </Campo>
          <Campo label="Lançar entrada na conta" hint="Conta que recebe o lançamento quando o Pix é pago.">
            <select value={form.contaDestinoId} onChange={set("contaDestinoId")} className="input-base">
              <option value="">Não lançar, só marcar como pago</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>{c.nome} · {c.banco}</option>
              ))}
            </select>
          </Campo>
        </div>

        <Campo
          label="Endereço público do sistema (para o aviso automático)"
          hint="URL https onde o backend está publicado. Sem ela, o sistema confere os Pix a cada 5 minutos."
        >
          <input value={form.urlPublica} onChange={set("urlPublica")} placeholder="https://api.seudominio.com.br" className="input-base" />
        </Campo>

        {config.webhookUrl && (
          <div className="rounded-xl p-3 border border-[var(--border-color)] text-xs text-slate-400 space-y-1">
            <p className="font-medium text-slate-300">URL de aviso enviada à SumUp em cada Pix</p>
            <div className="flex items-center gap-2">
              <code className="truncate">{config.webhookUrl}</code>
              <button type="button" onClick={copiarWebhook} className="p-1 rounded text-slate-400 hover:text-blue-500 shrink-0" title="Copiar">
                <Copy size={13} />
              </button>
            </div>
          </div>
        )}

        {teste && (
          <div
            className={cn(
              "rounded-xl p-3 border text-sm",
              teste.erro ? "border-red-500/30 bg-red-500/5 text-red-500" : "border-emerald-500/30 bg-emerald-500/5 text-slate-300",
            )}
          >
            {teste.erro ? (
              teste.erro
            ) : (
              <div className="space-y-1">
                <p className="font-semibold text-white">
                  Conexão ok{teste.nomeConta ? ` · ${teste.nomeConta}` : ""} · {teste.merchantCode}
                </p>
                <p className="text-xs">
                  Formas liberadas na API: {teste.metodos.length ? teste.metodos.join(", ") : "não informado"}
                </p>
                {!teste.pixDisponivel && (
                  <p className="text-xs text-amber-500">
                    {teste.erroMetodos
                      ? `Não foi possível confirmar se o Pix está liberado: ${teste.erroMetodos}`
                      : "O Pix não apareceu na lista. Peça à SumUp para liberar Pix na API da sua conta."}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={() => testar.mutate()}
            disabled={testar.isPending || !config.apiKeyConfigurada}
            title={config.apiKeyConfigurada ? undefined : "Salve a chave antes de testar"}
            className="btn-ghost inline-flex items-center gap-2"
          >
            {testar.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Testar conexão
          </button>
          <button onClick={() => salvar.mutate()} disabled={salvar.isPending} className="btn-primary inline-flex items-center gap-2">
            {salvar.isPending && <Loader2 size={14} className="animate-spin" />}
            Salvar
          </button>
        </div>
        {config.updatedBy && (
          <p className="text-[11px] text-slate-500 text-right">
            Alterado por {config.updatedBy}{config.updatedAt && ` em ${new Date(config.updatedAt).toLocaleString("pt-BR")}`}
          </p>
        )}
      </div>

      <div className="glass rounded-2xl p-5 card-shadow space-y-3 text-sm text-slate-400 h-fit">
        <h3 className="text-sm font-semibold text-white">Como funciona</h3>
        <ol className="list-decimal pl-4 space-y-2 text-xs">
          <li>No painel da SumUp, crie uma chave de API em <b>Desenvolvedores › Chaves de API</b> e cole aqui.</li>
          <li>Salve e clique em <b>Testar conexão</b> para confirmar a conta e se o Pix está liberado.</li>
          <li>Ative a integração. Nas cobranças em aberto aparece o botão <b>Pix</b>.</li>
          <li>O botão gera um QR Code e um copia e cola só daquela cobrança, prontos para mandar no WhatsApp.</li>
          <li>Quando o cliente paga, a cobrança vira <b>Pago</b> (forma "PIX SumUp") e a entrada é lançada na conta escolhida.</li>
        </ol>
        <p className="text-xs">Só administradores podem alterar esta configuração.</p>
      </div>
    </div>
  );
}

// ─── Integração: WhatsApp (Evolution API) ───────────────────────────────────

const ESTADO_WHATSAPP = {
  open: { label: "Conectado", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  connecting: { label: "Aguardando leitura do QR", cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  close: { label: "Desconectado", cls: "bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/30" },
  inexistente: { label: "Instância ainda não criada · clique em Conectar número", cls: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30" },
  erro: { label: "Sem resposta da Evolution API", cls: "bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/30" },
};

function WhatsappCard({ toast }) {
  const { data: config, isLoading, error } = useQuery({
    queryKey: ["machinepay", "whatsapp"],
    queryFn: () => machinePayApi.whatsappConfig().then((r) => r.data),
  });

  if (isLoading || !config) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-10 justify-center">
        {error ? <span className="text-red-500">{erroApi(error)}</span> : <><Loader2 size={16} className="animate-spin" /> Carregando WhatsApp...</>}
      </div>
    );
  }

  return <WhatsappForm config={config} toast={toast} />;
}

function WhatsappForm({ config, toast }) {
  const qc = useQueryClient();
  const [form, setForm] = useState(() => ({
    ativo: config.ativo,
    evolutionUrl: config.evolutionUrl || "",
    apiKey: "",
    instancia: config.instancia || "machinepay",
    intervaloSegundos: config.intervaloSegundos,
  }));
  const [qrGerado, setQr] = useState(null);

  const conexao = useQuery({
    queryKey: ["machinepay", "whatsapp", "conexao"],
    queryFn: () => machinePayApi.whatsappConexao().then((r) => r.data),
    // Enquanto o QR esta na tela, confere a cada 3s se o numero conectou.
    refetchInterval: (q) => (qrGerado && q.state.data?.estado !== "open" ? 3000 : false),
  });
  const estado = conexao.data?.estado;
  const conectado = estado === "open";
  // Conectou: o QR some sozinho e o selo mostra "Conectado".
  const qr = conectado ? null : qrGerado;

  const set = (campo) => (e) =>
    setForm((f) => ({ ...f, [campo]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const salvar = useMutation({
    mutationFn: () =>
      machinePayApi
        .salvarWhatsappConfig({
          ...form,
          apiKey: form.apiKey.trim() || undefined,
          intervaloSegundos: Number(form.intervaloSegundos),
        })
        .then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(["machinepay", "whatsapp"], data);
      qc.invalidateQueries({ queryKey: ["machinepay", "whatsapp", "conexao"] });
      setForm((f) => ({ ...f, apiKey: "" }));
      toast.show("Configuração do WhatsApp salva");
    },
    onError: (e) => toast.show(erroApi(e), { error: true }),
  });

  const conectar = useMutation({
    mutationFn: () => machinePayApi.conectarWhatsapp().then((r) => r.data),
    onSuccess: (data) => {
      if (data.estado === "open") {
        toast.show("Este número já está conectado");
        qc.invalidateQueries({ queryKey: ["machinepay", "whatsapp", "conexao"] });
      } else {
        setQr(data);
      }
    },
    onError: (e) => toast.show(erroApi(e), { error: true }),
  });

  const estadoInfo = ESTADO_WHATSAPP[estado];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="glass rounded-2xl p-5 card-shadow space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">WhatsApp</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Envia as cobranças selecionadas sozinho, uma por vez, com a mensagem e o Pix de cada cliente.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-white cursor-pointer shrink-0">
            <input type="checkbox" checked={form.ativo} onChange={set("ativo")} />
            {form.ativo ? "Ativo" : "Desativado"}
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {conexao.isLoading ? (
            <span className="text-xs text-slate-500">Verificando conexão...</span>
          ) : conexao.data?.configurado ? (
            <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border", estadoInfo?.cls ?? ESTADO_WHATSAPP.erro.cls)}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" /> {estadoInfo?.label ?? estado}
            </span>
          ) : (
            <span className="text-xs text-slate-500">Preencha e salve os dados abaixo para conectar o número.</span>
          )}
          {conexao.data?.erro && <span className="text-xs text-red-500">{conexao.data.erro}</span>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="URL da Evolution API" className="sm:col-span-2" hint="Endereço onde a sua Evolution API está rodando.">
            <input value={form.evolutionUrl} onChange={set("evolutionUrl")} placeholder="https://evolution.seudominio.com.br" className="input-base" />
          </Campo>
          <Campo
            label="Chave (apikey)"
            hint={config.apiKeyConfigurada ? `Chave salva: ${config.apiKeyMascarada}. Deixe em branco para manter.` : "A AUTHENTICATION_API_KEY da Evolution. Fica guardada só no servidor."}
          >
            <input type="password" autoComplete="off" value={form.apiKey} onChange={set("apiKey")} placeholder={config.apiKeyConfigurada ? "••••••••" : "apikey"} className="input-base font-mono" />
          </Campo>
          <Campo label="Nome da instância" hint="Se ainda não existir, é criada ao conectar.">
            <input value={form.instancia} onChange={set("instancia")} placeholder="machinepay" className="input-base font-mono" />
          </Campo>
          <Campo label="Intervalo entre clientes (segundos)" hint="Varia ±30% sozinho. Quanto maior, menor o risco de bloqueio do número.">
            <input type="number" min={8} max={600} value={form.intervaloSegundos} onChange={set("intervaloSegundos")} className="input-base" />
          </Campo>
        </div>

        {qr && (
          <div className="flex flex-col items-center gap-2 rounded-xl p-4 border border-[var(--border-color)]">
            {qr.qrBase64 ? (
              <img src={qr.qrBase64} alt="QR Code para conectar o WhatsApp" className="w-56 h-56 rounded-xl bg-[#fff] p-2" />
            ) : (
              <p className="text-sm text-slate-400">A Evolution não devolveu o QR Code. Tente de novo.</p>
            )}
            {qr.pairingCode && <p className="text-sm text-slate-300">Ou use o código: <b className="font-mono">{qr.pairingCode}</b></p>}
            <p className="text-xs text-slate-500 text-center">
              No celular: WhatsApp › Aparelhos conectados › Conectar aparelho, e leia o QR.
            </p>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            onClick={() => conectar.mutate()}
            disabled={conectar.isPending || !conexao.data?.configurado}
            title={conexao.data?.configurado ? undefined : "Salve URL, chave e instância antes"}
            className="btn-ghost inline-flex items-center gap-2"
          >
            {conectar.isPending ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
            {conectado ? "Verificar conexão" : qr ? "Gerar novo QR" : "Conectar número"}
          </button>
          <button onClick={() => salvar.mutate()} disabled={salvar.isPending} className="btn-primary inline-flex items-center gap-2">
            {salvar.isPending && <Loader2 size={14} className="animate-spin" />}
            Salvar
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 card-shadow space-y-3 text-sm text-slate-400 h-fit">
        <h3 className="text-sm font-semibold text-white">Como enviar</h3>
        <ol className="list-decimal pl-4 space-y-2 text-xs">
          <li>Salve a URL, a chave e a instância, e clique em <b>Conectar número</b> para ler o QR no celular.</li>
          <li>Em <b>Cobranças do mês</b>, filtre (em aberto, atrasadas, dia de vencimento, busca) e marque quem vai receber. O "selecionar todos" pega só o que está no filtro.</li>
          <li>Clique em <b>Enviar no WhatsApp</b>, confira o resumo e confirme.</li>
          <li>O sistema manda uma por vez: a mensagem e, em seguida, o Pix copia e cola da cobrança.</li>
          <li>Quem pagar recebe a baixa na hora, e quem pagar antes da vez não recebe a mensagem.</li>
        </ol>
        <p className="text-xs">
          A Evolution API não é oficial do WhatsApp. Use um intervalo folgado e mande só para clientes, para não ter o número bloqueado.
        </p>
      </div>
    </div>
  );
}

function IntegracoesTab({ contas, toast }) {
  return (
    <div className="space-y-8">
      <SumupTab contas={contas} toast={toast} />
      <WhatsappCard toast={toast} />
    </div>
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
    enabled: cobrancaAtiva || abaEscolhida === "integracoes",
  });

  const clientes = clientesQuery.data ?? [];
  const devendo = clientes.filter((c) => c.valorAtrasado > 0).length;
  const erro = clientesQuery.error || competenciaQuery.error || configQuery.error;
  // Em modo cadastro so existem a lista de clientes e as integracoes.
  const aba = cobrancaAtiva || abaEscolhida === "integracoes" ? abaEscolhida : "clientes";

  const abas = [
    cobrancaAtiva && { key: "cobrancas", label: "Cobranças do mês", icon: CircleDollarSign },
    { key: "clientes", label: "Clientes", icon: Users, count: clientes.length },
    cobrancaAtiva && { key: "inadimplencia", label: "Inadimplência", icon: AlertTriangle, count: devendo || undefined },
    { key: "integracoes", label: "Integrações", icon: KeyRound },
  ].filter(Boolean);

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

      {!configQuery.isLoading && (
        <div className="flex gap-1 border-b border-[var(--border-color)] overflow-x-auto">
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
      {aba === "integracoes" && <IntegracoesTab contas={contas} toast={toast} />}

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
