import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  X,
  Users,
  Building2,
  Briefcase,
  CreditCard,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { cadastrosApi, authApi } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useEmpresas } from "../hooks/useFinanceiro.js";
import { Input, Select } from "../components/ui/FormField.jsx";

/* ─────────────── Contas Bancárias ─────────────── */
function ContasTab() {
  const { data: empresas = [] } = useEmpresas();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: "",
    banco: "",
    saldoInicial: "",
    empresaId: "",
  });
  const [showForm, setShowForm] = useState(false);

  const { data: contas = [], isLoading } = useQuery({
    queryKey: ["contas-config"],
    queryFn: () => cadastrosApi.listarContas().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => cadastrosApi.criarConta(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas-config"] });
      setShowForm(false);
      setForm({ nome: "", banco: "", saldoInicial: "", empresaId: "" });
    },
  });

  const empresaOpts = empresas.map((e) => ({ value: e.id, label: e.nome }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">
          {contas.length} conta(s) cadastrada(s)
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary flex items-center gap-1.5 text-sm px-3 py-2"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Nova Conta"}
        </button>
      </div>

      {showForm && (
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nome da Conta"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
            <Input
              label="Banco"
              value={form.banco}
              onChange={(e) =>
                setForm((f) => ({ ...f, banco: e.target.value }))
              }
            />
            <Input
              label="Saldo Inicial (R$)"
              type="number"
              value={form.saldoInicial}
              onChange={(e) =>
                setForm((f) => ({ ...f, saldoInicial: e.target.value }))
              }
            />
            <Select
              label="Empresa"
              options={empresaOpts}
              value={form.empresaId}
              onChange={(e) =>
                setForm((f) => ({ ...f, empresaId: e.target.value }))
              }
              placeholder="Selecione…"
            />
          </div>
          <button
            onClick={() =>
              createMutation.mutate({
                ...form,
                saldoInicial: Number(form.saldoInicial) || 0,
                empresaId: Number(form.empresaId),
              })
            }
            className="btn-primary w-full"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Salvando…" : "Salvar Conta"}
          </button>
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        {isLoading && (
          <div className="p-6 text-center text-slate-500 text-sm">
            Carregando…
          </div>
        )}
        {contas.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between px-4 py-3 border-b border-white/5"
          >
            <div>
              <p className="text-sm text-white font-medium">
                {c.banco} – {c.nome}
              </p>
              <p className="text-xs text-slate-500">{c.empresa?.nome}</p>
            </div>
            <span
              className={`text-sm font-semibold tabular-nums ${c.saldoAtual >= 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(c.saldoAtual)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── Projetos ─────────────── */
function ProjetosTab() {
  const { data: empresas = [] } = useEmpresas();
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome: "", empresaId: "" });
  const [showForm, setShowForm] = useState(false);

  const { data: projetos = [], isLoading } = useQuery({
    queryKey: ["projetos-config"],
    queryFn: () => cadastrosApi.listarProjetos().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => cadastrosApi.criarProjeto(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projetos-config"] });
      setShowForm(false);
      setForm({ nome: "", empresaId: "" });
    },
  });

  const empresaOpts = empresas.map((e) => ({ value: e.id, label: e.nome }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">
          {projetos.length} projeto(s) cadastrado(s)
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary flex items-center gap-1.5 text-sm px-3 py-2"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Novo Projeto"}
        </button>
      </div>

      {showForm && (
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nome do Projeto"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
            <Select
              label="Empresa"
              options={empresaOpts}
              value={form.empresaId}
              onChange={(e) =>
                setForm((f) => ({ ...f, empresaId: e.target.value }))
              }
              placeholder="Selecione…"
            />
          </div>
          <button
            onClick={() =>
              createMutation.mutate({
                ...form,
                empresaId: Number(form.empresaId),
              })
            }
            className="btn-primary w-full"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Salvando…" : "Salvar Projeto"}
          </button>
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        {isLoading && (
          <div className="p-6 text-center text-slate-500 text-sm">
            Carregando…
          </div>
        )}
        {projetos.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between px-4 py-3 border-b border-white/5"
          >
            <div>
              <p className="text-sm text-white font-medium">{p.nome}</p>
              <p className="text-xs text-slate-500">{p.empresa?.nome}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── Usuários (ADMIN) ─────────────── */
function UsuariosTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    perfil: "FINANCEIRO",
  });
  const [showForm, setShowForm] = useState(false);

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["users-config"],
    queryFn: () => authApi.listUsers().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => authApi.createUser(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-config"] });
      setShowForm(false);
      setForm({ nome: "", email: "", senha: "", perfil: "FINANCEIRO" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => authApi.toggleUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users-config"] }),
  });

  const perfilOpts = [
    { value: "ADMIN", label: "Administrador" },
    { value: "FINANCEIRO", label: "Financeiro" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">{usuarios.length} usuário(s)</p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary flex items-center gap-1.5 text-sm px-3 py-2"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Novo Usuário"}
        </button>
      </div>

      {showForm && (
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nome"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            />
            <Input
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />
            <Input
              label="Senha"
              type="password"
              value={form.senha}
              onChange={(e) =>
                setForm((f) => ({ ...f, senha: e.target.value }))
              }
            />
            <Select
              label="Perfil"
              options={perfilOpts}
              value={form.perfil}
              onChange={(e) =>
                setForm((f) => ({ ...f, perfil: e.target.value }))
              }
            />
          </div>
          <button
            onClick={() => createMutation.mutate(form)}
            className="btn-primary w-full"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Salvando…" : "Criar Usuário"}
          </button>
          {createMutation.isError && (
            <p className="text-xs text-red-400">
              {createMutation.error?.response?.data?.message ??
                "Erro ao criar usuário"}
            </p>
          )}
        </div>
      )}

      <div className="glass rounded-xl overflow-hidden">
        {isLoading && (
          <div className="p-6 text-center text-slate-500 text-sm">
            Carregando…
          </div>
        )}
        {usuarios.map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between px-4 py-3 border-b border-white/5"
          >
            <div>
              <p className="text-sm text-white font-medium">{u.nome}</p>
              <p className="text-xs text-slate-500">
                {u.email} · {u.perfil}
              </p>
            </div>
            <button
              onClick={() => toggleMutation.mutate(u.id)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {u.ativo ? (
                <ToggleRight size={22} className="text-emerald-400" />
              ) : (
                <ToggleLeft size={22} />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── Page ─────────────── */
const TABS = [
  {
    key: "contas",
    label: "Contas Bancárias",
    icon: CreditCard,
    component: ContasTab,
  },
  {
    key: "projetos",
    label: "Projetos",
    icon: Briefcase,
    component: ProjetosTab,
  },
];

const ADMIN_TABS = [
  ...TABS,
  { key: "usuarios", label: "Usuários", icon: Users, component: UsuariosTab },
];

export default function ConfiguracoesPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("contas");
  const tabs = isAdmin ? ADMIN_TABS : TABS;

  function renderTab() {
    switch (activeTab) {
      case "contas":
        return <ContasTab />;
      case "projetos":
        return <ProjetosTab />;
      case "usuarios":
        return isAdmin ? <UsuariosTab /> : null;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Configurações</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Gerencie contas, projetos e usuários
        </p>
      </div>

      <div className="inline-flex gap-1 p-1 glass rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {renderTab()}
    </div>
  );
}
