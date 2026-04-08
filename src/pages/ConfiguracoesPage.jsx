import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Palette,
  Sun,
  Moon,
  Pencil,
  Trash2,
  ExternalLink,
  Store,
} from "lucide-react";
import { cadastrosApi, authApi, fornecedoresApi } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useEmpresas } from "../hooks/useFinanceiro.js";
import { Input, Select } from "../components/ui/FormField.jsx";

/* ─────────────── Empresas ─────────────── */
function EmpresasTab() {
  const qc = useQueryClient();
  const { data: empresas = [], isLoading } = useEmpresas();
  const [nome, setNome] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingNome, setEditingNome] = useState("");

  const createMutation = useMutation({
    mutationFn: (data) => cadastrosApi.criarEmpresa(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["empresas"] });
      setNome("");
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => cadastrosApi.atualizarEmpresa(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["empresas"] });
      setEditingId(null);
      setEditingNome("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => cadastrosApi.removerEmpresa(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["empresas"] });
      qc.invalidateQueries({ queryKey: ["contas-config"] });
      qc.invalidateQueries({ queryKey: ["projetos-config"] });
    },
  });

  function startEdit(empresa) {
    setEditingId(empresa.id);
    setEditingNome(empresa.nome);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingNome("");
  }

  function saveEdit() {
    if (!editingId || !editingNome.trim()) return;
    updateMutation.mutate({ id: editingId, payload: { nome: editingNome } });
  }

  function removeEmpresa(empresa) {
    const ok = window.confirm(
      `Deseja excluir a empresa \"${empresa.nome}\"? Esta acao nao pode ser desfeita.`,
    );

    if (!ok) return;
    deleteMutation.mutate(empresa.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">
          {empresas.length} empresa(s) cadastrada(s)
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary flex items-center gap-1.5 text-sm px-3 py-2"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Nova Empresa"}
        </button>
      </div>

      {showForm && (
        <div className="glass rounded-xl p-4 space-y-3">
          <Input
            label="Nome da Empresa"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: GiraKids"
          />
          <button
            onClick={() => createMutation.mutate({ nome })}
            className="btn-primary w-full"
            disabled={createMutation.isPending || !nome.trim()}
          >
            {createMutation.isPending ? "Salvando…" : "Salvar Empresa"}
          </button>
        </div>
      )}

      {createMutation.isError && (
        <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-2">
          {createMutation.error?.response?.data?.message ??
            "Erro ao salvar empresa."}
        </p>
      )}

      {updateMutation.isError && (
        <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-2">
          {updateMutation.error?.response?.data?.message ??
            "Erro ao atualizar empresa."}
        </p>
      )}

      {deleteMutation.isError && (
        <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-2">
          {deleteMutation.error?.response?.data?.message ??
            "Erro ao excluir empresa."}
        </p>
      )}

      <div className="glass rounded-xl overflow-hidden">
        {isLoading && (
          <div className="p-6 text-center text-slate-500 text-sm">
            Carregando…
          </div>
        )}

        {!isLoading && empresas.length === 0 && (
          <div className="p-6 text-center text-slate-500 text-sm">
            Nenhuma empresa cadastrada.
          </div>
        )}

        {empresas.map((empresa) => (
          <div
            key={empresa.id}
            className="flex items-center justify-between px-4 py-3 border-b border-white/5"
          >
            {editingId === empresa.id ? (
              <div className="flex-1 flex items-center gap-2">
                <Input
                  className="max-w-sm"
                  value={editingNome}
                  onChange={(e) => setEditingNome(e.target.value)}
                />
                <button
                  type="button"
                  onClick={saveEdit}
                  className="btn-primary px-3 py-1.5 text-xs"
                  disabled={updateMutation.isPending || !editingNome.trim()}
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="btn-ghost px-3 py-1.5 text-xs"
                  disabled={updateMutation.isPending}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Building2 size={14} className="text-slate-400" />
                  <p className="text-sm text-white font-medium">
                    {empresa.nome}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(empresa)}
                    className="btn-ghost px-2 py-1 text-xs flex items-center gap-1"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => removeEmpresa(empresa)}
                    className="btn-ghost px-2 py-1 text-xs text-red-300 hover:text-red-200 flex items-center gap-1"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={12} /> Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── Contas Bancárias ─────────────── */
function ContasTab() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nome: "",
    banco: "",
    saldoInicial: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingForm, setEditingForm] = useState({
    nome: "",
    banco: "",
  });

  const { data: contas = [], isLoading } = useQuery({
    queryKey: ["contas-config"],
    queryFn: () => cadastrosApi.listarContas().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => cadastrosApi.criarConta(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas-config"] });
      setShowForm(false);
      setForm({ nome: "", banco: "", saldoInicial: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => cadastrosApi.atualizarConta(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas-config"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "contas"] });
      setEditingId(null);
      setEditingForm({ nome: "", banco: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => cadastrosApi.removerConta(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas-config"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "contas"] });
    },
  });

  function startEdit(conta) {
    setEditingId(conta.id);
    setEditingForm({
      nome: conta.nome,
      banco: conta.banco,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingForm({ nome: "", banco: "" });
  }

  function saveEdit() {
    if (!editingId) return;

    updateMutation.mutate({
      id: editingId,
      payload: {
        nome: editingForm.nome,
        banco: editingForm.banco,
      },
    });
  }

  function removeConta(conta) {
    const ok = window.confirm(
      `Deseja excluir a conta \"${conta.banco} - ${conta.nome}\"?`,
    );

    if (!ok) return;
    deleteMutation.mutate(conta.id);
  }

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
          </div>
          <button
            onClick={() =>
              createMutation.mutate({
                ...form,
                saldoAtual: Number(form.saldoInicial) || 0,
              })
            }
            className="btn-primary w-full"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Salvando…" : "Salvar Conta"}
          </button>
        </div>
      )}

      {updateMutation.isError && (
        <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-2">
          {updateMutation.error?.response?.data?.message ??
            "Erro ao atualizar conta."}
        </p>
      )}

      {deleteMutation.isError && (
        <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-2">
          {deleteMutation.error?.response?.data?.message ??
            "Erro ao excluir conta."}
        </p>
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
            {editingId === c.id ? (
              <div className="w-full grid grid-cols-1 md:grid-cols-[1fr_1fr_220px_auto] gap-2 items-center">
                <Input
                  value={editingForm.banco}
                  onChange={(e) =>
                    setEditingForm((prev) => ({
                      ...prev,
                      banco: e.target.value,
                    }))
                  }
                />
                <Input
                  value={editingForm.nome}
                  onChange={(e) =>
                    setEditingForm((prev) => ({
                      ...prev,
                      nome: e.target.value,
                    }))
                  }
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    className="btn-primary px-3 py-1.5 text-xs"
                    onClick={saveEdit}
                    disabled={
                      updateMutation.isPending ||
                      !editingForm.nome.trim() ||
                      !editingForm.banco.trim()
                    }
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    className="btn-ghost px-3 py-1.5 text-xs"
                    onClick={cancelEdit}
                    disabled={updateMutation.isPending}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm text-white font-medium">
                    {c.banco} – {c.nome}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-semibold tabular-nums ${c.saldoAtual >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(c.saldoAtual)}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate(`/bancos?contaId=${c.id}`)}
                    className="btn-ghost px-2 py-1 text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300"
                  >
                    <ExternalLink size={12} /> Extrato
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="btn-ghost px-2 py-1 text-xs flex items-center gap-1"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => removeConta(c)}
                    className="btn-ghost px-2 py-1 text-xs text-red-300 hover:text-red-200 flex items-center gap-1"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={12} /> Excluir
                  </button>
                </div>
              </>
            )}
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

/* ─────────────── Fornecedores ─────────────── */
function FornecedoresTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome: "", descricao: "" });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingForm, setEditingForm] = useState({ nome: "", descricao: "" });

  const { data: fornecedores = [], isLoading } = useQuery({
    queryKey: ["fornecedores-config"],
    queryFn: () => fornecedoresApi.listar().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => fornecedoresApi.criar(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fornecedores-config"] });
      qc.invalidateQueries({ queryKey: ["fornecedores"] });
      setForm({ nome: "", descricao: "" });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => fornecedoresApi.atualizar(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fornecedores-config"] });
      qc.invalidateQueries({ queryKey: ["fornecedores"] });
      setEditingId(null);
      setEditingForm({ nome: "", descricao: "" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => fornecedoresApi.toggle(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fornecedores-config"] });
      qc.invalidateQueries({ queryKey: ["fornecedores"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => fornecedoresApi.remover(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fornecedores-config"] });
      qc.invalidateQueries({ queryKey: ["fornecedores"] });
    },
  });

  function startEdit(fornecedor) {
    setEditingId(fornecedor.id);
    setEditingForm({ nome: fornecedor.nome, descricao: fornecedor.descricao });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingForm({ nome: "", descricao: "" });
  }

  function saveEdit() {
    if (!editingId || !editingForm.nome.trim()) return;
    updateMutation.mutate({
      id: editingId,
      payload: editingForm,
    });
  }

  function removeFornecedor(fornecedor) {
    const ok = window.confirm(
      `Deseja excluir o fornecedor "${fornecedor.nome}"? Esta ação não pode ser desfeita.`,
    );

    if (!ok) return;
    deleteMutation.mutate(fornecedor.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">
          {fornecedores.length} fornecedor(es) cadastrado(s)
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary flex items-center gap-1.5 text-sm px-3 py-2"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancelar" : "Novo Fornecedor"}
        </button>
      </div>

      {showForm && (
        <div className="glass rounded-xl p-4 space-y-3">
          <Input
            label="Nome do Fornecedor"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              Descrição
            </label>
            <textarea
              value={form.descricao}
              onChange={(e) =>
                setForm((f) => ({ ...f, descricao: e.target.value }))
              }
              rows={3}
              className="input-base resize-none"
              placeholder="Informações adicionais sobre o fornecedor"
            />
          </div>
          <button
            onClick={() => createMutation.mutate(form)}
            className="btn-primary w-full"
            disabled={createMutation.isPending || !form.nome.trim()}
          >
            {createMutation.isPending ? "Salvando…" : "Salvar Fornecedor"}
          </button>
          {createMutation.isError && (
            <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-2">
              {createMutation.error?.response?.data?.message ??
                "Erro ao criar fornecedor."}
            </p>
          )}
        </div>
      )}

      {updateMutation.isError && (
        <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-2">
          {updateMutation.error?.response?.data?.message ??
            "Erro ao atualizar fornecedor."}
        </p>
      )}

      {deleteMutation.isError && (
        <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-2">
          {deleteMutation.error?.response?.data?.message ??
            "Erro ao excluir fornecedor."}
        </p>
      )}

      <div className="glass rounded-xl overflow-hidden">
        {isLoading && (
          <div className="p-6 text-center text-slate-500 text-sm">
            Carregando…
          </div>
        )}
        {fornecedores.length === 0 && !isLoading && (
          <div className="p-6 text-center text-slate-500 text-sm">
            Nenhum fornecedor cadastrado
          </div>
        )}
        {fornecedores.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between px-4 py-3 border-b border-white/5"
          >
            {editingId === f.id ? (
              <div className="w-full space-y-3">
                <Input
                  label="Nome"
                  value={editingForm.nome}
                  onChange={(e) =>
                    setEditingForm((prev) => ({
                      ...prev,
                      nome: e.target.value,
                    }))
                  }
                />
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Descrição
                  </label>
                  <textarea
                    value={editingForm.descricao}
                    onChange={(e) =>
                      setEditingForm((prev) => ({
                        ...prev,
                        descricao: e.target.value,
                      }))
                    }
                    rows={2}
                    className="input-base resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-primary px-3 py-1.5 text-xs flex-1"
                    onClick={saveEdit}
                    disabled={
                      updateMutation.isPending || !editingForm.nome.trim()
                    }
                  >
                    Salvar
                  </button>
                  <button
                    className="btn-ghost px-3 py-1.5 text-xs flex-1"
                    onClick={cancelEdit}
                    disabled={updateMutation.isPending}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm text-white font-medium">{f.nome}</p>
                  {f.descricao && (
                    <p className="text-xs text-slate-500 truncate">
                      {f.descricao}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleMutation.mutate(f.id)}
                    className="text-slate-400 hover:text-white transition-colors"
                    disabled={toggleMutation.isPending}
                  >
                    {f.ativo ? (
                      <ToggleRight size={22} className="text-emerald-400" />
                    ) : (
                      <ToggleLeft size={22} />
                    )}
                  </button>
                  <button
                    onClick={() => startEdit(f)}
                    className="btn-ghost px-2 py-1 text-xs flex items-center gap-1"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                  <button
                    onClick={() => removeFornecedor(f)}
                    className="btn-ghost px-2 py-1 text-xs text-red-300 hover:text-red-200 flex items-center gap-1"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={12} /> Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────── Tema ─────────────── */
function TemaTab() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
          Tema da Aplicação
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-6">
          Escolha entre tema claro ou escuro
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Tema Claro */}
        <button
          onClick={() => theme !== "light" && toggleTheme()}
          className={`glass rounded-xl p-4 text-center transition-all cursor-pointer ${
            theme === "light"
              ? "ring-2 ring-blue-600 bg-white dark:bg-slate-800"
              : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
          }`}
        >
          <div className="flex justify-center mb-3">
            <Sun
              size={32}
              className={`${
                theme === "light"
                  ? "text-blue-600"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            />
          </div>
          <p
            className={`text-sm font-medium ${
              theme === "light"
                ? "text-slate-900"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Claro
          </p>
          <p
            className={`text-xs mt-1 ${
              theme === "light"
                ? "text-blue-600"
                : "text-slate-500 dark:text-slate-500"
            }`}
          >
            {theme === "light" ? "Ativo" : "Clique para ativar"}
          </p>
        </button>

        {/* Tema Escuro */}
        <button
          onClick={() => theme !== "dark" && toggleTheme()}
          className={`glass rounded-xl p-4 text-center transition-all cursor-pointer ${
            theme === "dark"
              ? "ring-2 ring-blue-600 bg-slate-900 dark:bg-slate-800"
              : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
          }`}
        >
          <div className="flex justify-center mb-3">
            <Moon
              size={32}
              className={`${
                theme === "dark"
                  ? "text-blue-600"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            />
          </div>
          <p
            className={`text-sm font-medium ${
              theme === "dark"
                ? "text-white"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Escuro
          </p>
          <p
            className={`text-xs mt-1 ${
              theme === "dark"
                ? "text-blue-600"
                : "text-slate-500 dark:text-slate-500"
            }`}
          >
            {theme === "dark" ? "Ativo" : "Clique para ativar"}
          </p>
        </button>
      </div>

      <div
        className={`glass rounded-xl p-4 text-sm ${
          theme === "light"
            ? "bg-blue-50/50 text-blue-900 border border-blue-200/50"
            : "bg-blue-950/30 text-blue-100 border border-blue-900/50"
        }`}
      >
        Tema {theme === "light" ? "claro" : "escuro"} ativado. A preferência
        será salva automaticamente.
      </div>
    </div>
  );
}

/* ─────────────── Page ─────────────── */
const TABS = [
  {
    key: "empresas",
    label: "Empresas",
    icon: Building2,
    component: EmpresasTab,
  },
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
  {
    key: "fornecedores",
    label: "Fornecedores",
    icon: Store,
    component: FornecedoresTab,
  },
  {
    key: "tema",
    label: "Tema",
    icon: Palette,
    component: TemaTab,
  },
];

const ADMIN_TABS = [
  ...TABS,
  { key: "usuarios", label: "Usuários", icon: Users, component: UsuariosTab },
];

export default function ConfiguracoesPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("empresas");
  const tabs = isAdmin ? ADMIN_TABS : TABS;

  function renderTab() {
    switch (activeTab) {
      case "empresas":
        return <EmpresasTab />;
      case "contas":
        return <ContasTab />;
      case "projetos":
        return <ProjetosTab />;
      case "fornecedores":
        return <FornecedoresTab />;
      case "usuarios":
        return isAdmin ? <UsuariosTab /> : null;
      case "tema":
        return <TemaTab />;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
          Configurações
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-500 mt-0.5">
          Gerencie contas, projetos, usuários e tema
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
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
