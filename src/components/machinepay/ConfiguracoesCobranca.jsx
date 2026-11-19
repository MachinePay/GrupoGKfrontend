import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Copy, KeyRound, Loader2, PlugZap, RotateCcw, Save } from "lucide-react";
import { cadastrosApi, compactPayApi, machinePayApi } from "../../services/api.js";
import { cn, formatCurrency } from "../../lib/utils.js";
import {
  MODELO_ATRASO_PADRAO,
  MODELO_LEMBRETE_PADRAO,
  VARIAVEIS,
  montarMensagemCobranca,
} from "../../lib/machinePayMensagens.js";
import { SumupTab, WhatsappCard } from "../../pages/MachinePayPage.jsx";
import { useToast } from "./useToast.jsx";

// Configuracoes compartilhadas do Machine Pay e do CompactPay: conexao com o
// CompactPay, Pix SumUp e WhatsApp (aba Integracoes) e os modelos das
// mensagens de cada produto (aba Mensagens).

const PRODUTOS = [
  { produto: "MACHINEPAY", nome: "Machine Pay", chave: "machinepay", api: machinePayApi },
  { produto: "COMPACTPAY", nome: "CompactPay", chave: "compactpay", api: compactPayApi },
];

const erroApi = (error, fallback = "Erro inesperado.") =>
  error?.response?.data?.message || error?.message || fallback;

function Campo({ label, hint, children, className }) {
  return (
    <label className={cn("block space-y-1 min-w-0", className)}>
      <span className="text-xs font-medium text-slate-400">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

function Abas({ valor, onChange }) {
  return (
    <div className="inline-flex gap-1 p-1 glass rounded-xl">
      {PRODUTOS.map((p) => (
        <button
          key={p.produto}
          type="button"
          onClick={() => onChange(p.produto)}
          className={cn(
            "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
            valor === p.produto
              ? "bg-blue-600 text-[#fff]"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white",
          )}
        >
          {p.nome}
        </button>
      ))}
    </div>
  );
}

function gerarChave() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/* ─────────────── Conexao com o CompactPay ─────────────── */
function CompactpayConexao({ toast }) {
  const qc = useQueryClient();
  const { data: config, isLoading } = useQuery({
    queryKey: ["compactpay", "config"],
    queryFn: () => compactPayApi.config().then((r) => r.data),
  });
  const [url, setUrl] = useState(null);
  const [chave, setChave] = useState("");
  const [chaveGerada, setChaveGerada] = useState(null);
  const [teste, setTeste] = useState(null);

  const salvar = useMutation({
    mutationFn: (payload) => compactPayApi.salvarConfig(payload).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(["compactpay", "config"], data);
      setChave("");
      setUrl(null);
      toast.show("Conexão com o CompactPay salva");
    },
    onError: (e) => toast.show(erroApi(e), { error: true }),
  });

  const testar = useMutation({
    mutationFn: () => compactPayApi.testarIntegracao().then((r) => r.data),
    onSuccess: (r) => setTeste({ ok: true, ...r }),
    onError: (e) => setTeste({ ok: false, erro: erroApi(e) }),
  });

  if (isLoading || !config) {
    return <p className="text-sm text-slate-500">Carregando…</p>;
  }

  const urlAtual = url ?? config.integracaoUrl ?? "";

  return (
    <section className="glass rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <PlugZap size={16} /> Conexão com o CompactPay
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          O GK busca no CompactPay os clientes, as máquinas e os valores das mensalidades (endpoint de integração com a chave
          <code className="mx-1">GRUPOGK_API_KEY</code>). Sincroniza sozinho a cada 15 minutos e pelo botão Atualizar da tela CompactPay.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Campo label="Endereço da API do CompactPay">
          <input
            value={urlAtual}
            onChange={(e) => setUrl(e.target.value)}
            className="input-base"
            placeholder="https://compactpayback.onrender.com/api/v1"
          />
        </Campo>
        <Campo
          label="Chave da integração"
          hint={config.integracaoKeyConfigurada ? `Chave salva: ${config.integracaoKeyMascarada}. Deixe em branco para manter.` : "Nenhuma chave salva ainda."}
        >
          <div className="flex gap-2">
            <input
              value={chave}
              onChange={(e) => {
                setChave(e.target.value);
                setChaveGerada(null);
              }}
              className="input-base font-mono"
              placeholder="Cole a chave ou gere uma nova"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => {
                const nova = gerarChave();
                setChave(nova);
                setChaveGerada(nova);
              }}
              className="btn-ghost inline-flex items-center gap-1.5 shrink-0"
              title="Gera uma chave aleatória"
            >
              <KeyRound size={14} /> Gerar
            </button>
          </div>
        </Campo>
      </div>

      {chaveGerada && (
        <div className="rounded-lg p-3 border border-amber-500/30 bg-amber-500/5 text-xs text-slate-600 dark:text-slate-400 space-y-2">
          <p>
            Copie esta chave e crie a variável <b>GRUPOGK_API_KEY</b> com ela no backend do CompactPay (Render). Depois clique em
            <b> Salvar</b> aqui. Ela não aparece de novo depois de salva.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-black/5 dark:bg-white/5 px-2 py-1 font-mono">{chaveGerada}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(chaveGerada).then(() => toast.show("Chave copiada"))}
              className="btn-ghost inline-flex items-center gap-1 py-1! text-xs!"
            >
              <Copy size={13} /> Copiar
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            salvar.mutate({ integracaoUrl: urlAtual, ...(chave.trim() ? { integracaoKey: chave.trim() } : {}) })
          }
          disabled={salvar.isPending}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Save size={14} /> {salvar.isPending ? "Salvando…" : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => testar.mutate()}
          disabled={testar.isPending || !config.integracaoKeyConfigurada}
          className="btn-ghost inline-flex items-center gap-2"
          title={config.integracaoKeyConfigurada ? "Busca os dados no CompactPay sem alterar nada" : "Salve a chave primeiro"}
        >
          {testar.isPending ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />} Testar conexão
        </button>
        {teste && (
          <span className={cn("text-xs", teste.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
            {teste.ok
              ? `Conectado: ${teste.clientes} clientes (${teste.comMaquinas} com máquinas) · ${teste.maquinas} máquinas · ${formatCurrency(teste.totalMensal)}/mês`
              : teste.erro}
          </span>
        )}
      </div>
    </section>
  );
}

export function IntegracoesCobrancaTab() {
  const toast = useToast();
  const { data: contas = [] } = useQuery({
    queryKey: ["contas"],
    queryFn: () => cadastrosApi.listarContas().then((r) => r.data),
  });

  return (
    <div className="space-y-8">
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Integrações usadas pelo <b>Machine Pay</b> e pelo <b>CompactPay</b>. A conta SumUp e o número de WhatsApp são os mesmos para os dois.
      </p>
      <CompactpayConexao toast={toast} />
      <SumupTab contas={contas} toast={toast} />
      <WhatsappCard toast={toast} />
      {toast.node}
    </div>
  );
}

/* ─────────────── Mensagens por produto ─────────────── */

// Cobranca de exemplo para a pre-visualizacao.
function cobrancaExemplo(atrasada) {
  const hoje = new Date();
  const comp = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const vencimento = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), atrasada ? 1 : 28, 12)).toISOString();
  const anterior = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth() - 1, 10, 12));
  const compAnterior = `${anterior.getUTCFullYear()}-${String(anterior.getUTCMonth() + 1).padStart(2, "0")}`;
  return {
    competencia: comp,
    vencimento,
    maquinasProprias: 9,
    maquinasPlano36: 0,
    maquinasParceria: 0,
    valor: atrasada ? 720 : 360,
    valorAnterior: atrasada ? 360 : 0,
    anteriores: atrasada ? [{ competencia: compAnterior, vencimento: anterior.toISOString(), valor: 360 }] : [],
    cliente: { nome: "Cliente Exemplo" },
  };
}

function EditorModelo({ titulo, descricao, valor, padrao, onChange }) {
  const ref = useRef(null);

  function inserir(chave) {
    const el = ref.current;
    const texto = valor ?? padrao;
    const inicio = el?.selectionStart ?? texto.length;
    const fim = el?.selectionEnd ?? texto.length;
    const novo = `${texto.slice(0, inicio)}{${chave}}${texto.slice(fim)}`;
    onChange(novo);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = inicio + chave.length + 2;
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{titulo}</p>
          <p className="text-xs text-slate-500">{descricao}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="btn-ghost inline-flex items-center gap-1 py-1! text-xs!"
          title="Volta para o texto padrão do sistema"
        >
          <RotateCcw size={12} /> Texto padrão
        </button>
      </div>
      <textarea
        ref={ref}
        rows={14}
        value={valor ?? padrao}
        onChange={(e) => onChange(e.target.value)}
        className="input-base font-mono text-xs! leading-relaxed resize-y"
      />
      <div className="flex flex-wrap gap-1">
        {VARIAVEIS.map((v) => (
          <button
            key={v.chave}
            type="button"
            onClick={() => inserir(v.chave)}
            title={v.descricao}
            className="px-1.5 py-0.5 rounded-md text-[11px] font-mono border border-[var(--input-border)] text-slate-500 hover:border-blue-500 hover:text-blue-500"
          >
            {`{${v.chave}}`}
          </button>
        ))}
      </div>
    </div>
  );
}

function Previa({ titulo, texto }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-slate-500">{titulo}</p>
      <div className="rounded-xl p-3 text-xs whitespace-pre-wrap leading-relaxed bg-[#dcf8c6] text-[#111b21] border border-[#b7e4a0] max-h-[420px] overflow-y-auto">
        {texto}
      </div>
    </div>
  );
}

function MensagensProduto({ info, toast }) {
  const qc = useQueryClient();
  const { data: config, isLoading } = useQuery({
    queryKey: [info.chave, "config"],
    queryFn: () => info.api.config().then((r) => r.data),
  });
  // null = sem alteracao local; no modelo, null tambem quer dizer "texto padrao".
  const [edicao, setEdicao] = useState({});

  const salvar = useMutation({
    mutationFn: (payload) => info.api.salvarConfig(payload).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData([info.chave, "config"], data);
      setEdicao({});
      toast.show(`Mensagens do ${info.nome} salvas`);
    },
    onError: (e) => toast.show(erroApi(e), { error: true }),
  });

  const valor = (campo) => (campo in edicao ? edicao[campo] : config?.[campo] ?? null);
  const set = (campo) => (v) => setEdicao((e) => ({ ...e, [campo]: v }));

  const configPrevia = useMemo(
    () => ({
      marca: valor("marca") || info.nome.replace(" ", ""),
      chavePix: valor("chavePix") || "",
      mensagemLembrete: valor("mensagemLembrete"),
      mensagemAtraso: valor("mensagemAtraso"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [edicao, config],
  );

  if (isLoading || !config) {
    return <p className="text-sm text-slate-500">Carregando…</p>;
  }

  const alterado = Object.keys(edicao).length > 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Campo label="Nome nas mensagens ({marca})" hint="Aparece no cabeçalho e na assinatura.">
          <input value={valor("marca") || ""} onChange={(e) => set("marca")(e.target.value)} className="input-base" />
        </Campo>
        <Campo label="Chave Pix ({chave_pix})" hint="Usada quando a cobrança não tem Pix SumUp.">
          <input value={valor("chavePix") || ""} onChange={(e) => set("chavePix")(e.target.value)} className="input-base font-mono" />
        </Campo>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-6">
          <EditorModelo
            titulo="Lembrete (antes do vencimento)"
            descricao="Enviado para cobranças que ainda não venceram."
            valor={valor("mensagemLembrete")}
            padrao={MODELO_LEMBRETE_PADRAO}
            onChange={set("mensagemLembrete")}
          />
          <EditorModelo
            titulo="Atraso"
            descricao="Enviado para cobranças vencidas ou com meses em aberto somados."
            valor={valor("mensagemAtraso")}
            padrao={MODELO_ATRASO_PADRAO}
            onChange={set("mensagemAtraso")}
          />
        </div>
        <div className="space-y-6">
          <Previa titulo="Prévia do lembrete" texto={montarMensagemCobranca(cobrancaExemplo(false), configPrevia)} />
          <Previa
            titulo="Prévia do atraso (com 1 mês em aberto somado)"
            texto={montarMensagemCobranca(cobrancaExemplo(true), configPrevia)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => salvar.mutate(edicao)}
          disabled={!alterado || salvar.isPending}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Save size={14} /> {salvar.isPending ? "Salvando…" : "Salvar mensagens"}
        </button>
        {alterado && (
          <button type="button" onClick={() => setEdicao({})} className="btn-ghost">
            Descartar alterações
          </button>
        )}
        {!alterado && config.updatedBy && (
          <span className="text-xs text-slate-500 inline-flex items-center gap-1">
            <CheckCircle2 size={13} className="text-emerald-500" /> Salvo por {config.updatedBy}
          </span>
        )}
      </div>
    </div>
  );
}

export function MensagensCobrancaTab() {
  const toast = useToast();
  const [produto, setProduto] = useState("MACHINEPAY");
  const info = PRODUTOS.find((p) => p.produto === produto);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl">
          Textos usados no envio automático pelo WhatsApp e nos botões copiar e WhatsApp das telas. Cada produto tem os seus.
          Clique numa variável para inserir no ponto do cursor.
        </p>
        <Abas valor={produto} onChange={setProduto} />
      </div>
      <section className="glass rounded-2xl p-5">
        <MensagensProduto key={produto} info={info} toast={toast} />
      </section>
      {toast.node}
    </div>
  );
}

export { PRODUTOS as PRODUTOS_COBRANCA, Abas as AbasProduto };
