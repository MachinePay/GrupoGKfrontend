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
  DollarSign,
  Wallet,
  AlertTriangle,
  Smartphone,
} from "lucide-react";
import api, {
  cadastrosApi,
  cotacoesApi,
  fornecedoresApi,
  machinePayApi,
  sumupContasApi,
} from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { useEmpresas } from "../hooks/useFinanceiro.js";
import { Input, Select } from "../components/ui/FormField.jsx";
import { formatCurrency, formatDate } from "../lib/utils.js";

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
    observacoes: "",
    saldoInicial: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingForm, setEditingForm] = useState({
    nome: "",
    banco: "",
    observacoes: "",
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
      setForm({ nome: "", banco: "", observacoes: "", saldoInicial: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => cadastrosApi.atualizarConta(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas-config"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "contas"] });
      setEditingId(null);
      setEditingForm({ nome: "", banco: "", observacoes: "" });
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
      observacoes: conta.observacoes ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingForm({ nome: "", banco: "", observacoes: "" });
  }

  function saveEdit() {
    if (!editingId) return;

    updateMutation.mutate({
      id: editingId,
      payload: {
        nome: editingForm.nome,
        banco: editingForm.banco,
        observacoes: editingForm.observacoes,
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
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Observações
              </label>
              <textarea
                value={form.observacoes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, observacoes: e.target.value }))
                }
                rows={2}
                className="input-base resize-none"
                placeholder="Dados complementares da conta"
              />
            </div>
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
              <div className="w-full grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-2 items-center">
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
                <div className="md:col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    Observações
                  </label>
                  <textarea
                    value={editingForm.observacoes}
                    onChange={(e) =>
                      setEditingForm((prev) => ({
                        ...prev,
                        observacoes: e.target.value,
                      }))
                    }
                    rows={2}
                    className="input-base resize-none"
                  />
                </div>
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
                  {c.observacoes && (
                    <p className="text-xs text-slate-500 truncate">
                      {c.observacoes}
                    </p>
                  )}
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
    contaBancariaIds: [],
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const { data } = await api.get("/usuarios");
      return data;
    },
  });

  const { data: contas = [] } = useQuery({
    queryKey: ["contas-config"],
    queryFn: () => cadastrosApi.listarContas().then((r) => r.data),
  });

  function resetForm() {
    setForm({
      nome: "",
      email: "",
      senha: "",
      perfil: "FINANCEIRO",
      contaBancariaIds: [],
    });
    setEditingId(null);
  }

  function handleEdit(usuario) {
    setEditingId(usuario.id);
    setForm({
      nome: usuario.nome,
      email: usuario.email,
      senha: "",
      perfil: usuario.perfil,
      contaBancariaIds: (usuario.contaBancariaIds || []).map((id) =>
        String(id),
      ),
    });
    setShowForm(true);
  }

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data };
      if (payload.contaBancariaIds?.length) {
        payload.contaBancariaIds = payload.contaBancariaIds.map((id) =>
          Number(id),
        );
      } else {
        delete payload.contaBancariaIds;
      }
      const { data: response } = await api.post("/usuarios", payload);
      return response;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      resetForm();
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const payload = { ...data };
      if (payload.contaBancariaIds?.length) {
        payload.contaBancariaIds = payload.contaBancariaIds.map((id) =>
          Number(id),
        );
      } else {
        payload.contaBancariaIds = [];
      }
      if (!payload.senha) {
        delete payload.senha;
      }
      const { data: response } = await api.put(
        `/usuarios/${editingId}`,
        payload,
      );
      return response;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      resetForm();
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/usuarios/${id}`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  });

  function handleSubmit() {
    if (editingId) {
      updateMutation.mutate(form);
      return;
    }
    createMutation.mutate(form);
  }

  const isCaixaSelected = form.perfil === "CAIXA";
  const perfilOpts = [
    { value: "ADMIN", label: "Administrador" },
    { value: "FINANCEIRO", label: "Financeiro" },
    { value: "CAIXA", label: "Caixa" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">{usuarios.length} usuário(s)</p>
        <button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              resetForm();
              return;
            }
            resetForm();
            setShowForm(true);
          }}
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
              label={editingId ? "Senha (opcional)" : "Senha"}
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
                setForm((f) => ({
                  ...f,
                  perfil: e.target.value,
                  contaBancariaIds: [],
                }))
              }
            />
          </div>

          {isCaixaSelected && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Contas bancárias (obrigatórias para caixa)
              </label>
              <select
                multiple
                value={form.contaBancariaIds}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    contaBancariaIds: Array.from(
                      e.target.selectedOptions,
                      (option) => option.value,
                    ),
                  }))
                }
                className="input-base min-h-36"
              >
                {contas.map((conta) => (
                  <option key={conta.id} value={String(conta.id)}>
                    {conta.banco} - {conta.nome}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Segure Ctrl para selecionar mais de uma conta.
              </p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="btn-primary w-full"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Salvando…"
              : editingId
                ? "Salvar Alterações"
                : "Criar Usuário"}
          </button>
          {(createMutation.isError || updateMutation.isError) && (
            <p className="text-xs text-red-400">
              {createMutation.error?.response?.data?.message ||
                updateMutation.error?.response?.data?.message ||
                "Erro ao salvar usuário"}
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
        {usuarios.length === 0 && !isLoading && (
          <div className="p-6 text-center text-slate-500 text-sm">
            Nenhum usuário cadastrado
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
                {u.contasBancarias?.length
                  ? ` · ${u.contasBancarias
                      .map((conta) => `${conta.banco} - ${conta.nome}`)
                      .join(", ")}`
                  : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEdit(u)}
                className="btn-ghost px-2 py-1 text-xs flex items-center gap-1"
              >
                <Pencil size={12} /> Editar
              </button>
              <button
                onClick={() => {
                  const ok = window.confirm(
                    `Deseja excluir o usuário "${u.nome}"? Esta ação não pode ser desfeita.`,
                  );
                  if (!ok) return;
                  deleteMutation.mutate(u.id);
                }}
                className="btn-ghost px-2 py-1 text-xs text-red-300 hover:text-red-200 flex items-center gap-1"
                disabled={deleteMutation.isPending}
              >
                <Trash2 size={12} /> Excluir
              </button>
            </div>
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
                    className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
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

/* ─────────────── Cotações ─────────────── */
const MOEDAS_COTACAO = [
  { moeda: "USD", label: "Dólar (US$ 1 em R$)" },
  { moeda: "EUR", label: "Euro (€ 1 em R$)" },
];

function CotacoesTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState(null);
  const [salvo, setSalvo] = useState(false);

  const { data: cotacoes = [], isLoading } = useQuery({
    queryKey: ["cotacoes"],
    queryFn: () => cotacoesApi.listar().then((r) => r.data),
  });

  const valores =
    form ??
    Object.fromEntries(cotacoes.map((c) => [c.moeda, String(c.valorEmReais)]));

  const saveMutation = useMutation({
    mutationFn: (payload) => cotacoesApi.atualizar(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cotacoes"] });
      qc.invalidateQueries({ queryKey: ["selfmachine", "relatorio"] });
      setForm(null);
      setSalvo(true);
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          Cotações de Moeda
        </h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Valor de cada moeda em reais. Usado para converter os custos de
          sistema (cadastrados em dólar) nos relatórios.
        </p>
      </div>

      <div className="glass rounded-xl p-4 space-y-4">
        {isLoading ? (
          <p className="text-sm text-slate-500 text-center">Carregando…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MOEDAS_COTACAO.map(({ moeda, label }) => {
              const atual = cotacoes.find((c) => c.moeda === moeda);
              return (
                <div key={moeda} className="space-y-1">
                  <Input
                    label={label}
                    type="number"
                    min="0"
                    step="0.0001"
                    value={valores[moeda] ?? ""}
                    onChange={(e) => {
                      setSalvo(false);
                      setForm({ ...valores, [moeda]: e.target.value });
                    }}
                  />
                  {atual?.updatedAt && (
                    <p className="text-xs text-slate-500">
                      Atual: {formatCurrency(atual.valorEmReais)} · atualizado
                      em {formatDate(atual.updatedAt)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {saveMutation.isError && (
          <p className="text-xs text-rose-500">
            {saveMutation.error?.response?.data?.message ||
              "Erro ao salvar cotações."}
          </p>
        )}
        {salvo && <p className="text-xs text-emerald-500">Cotações salvas.</p>}

        <button
          onClick={() => saveMutation.mutate(valores)}
          className="btn-primary w-full"
          disabled={saveMutation.isPending || !form}
        >
          {saveMutation.isPending ? "Salvando…" : "Salvar Cotações"}
        </button>
      </div>
    </div>
  );
}

/* ─────────────── Machine Pay (ADMIN) ─────────────── */
const NOMES_MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function rotuloMes(competencia) {
  const [ano, mes] = competencia.split("-").map(Number);
  return `${NOMES_MESES[mes - 1]} ${ano}`;
}

function MachinePayConfigTab() {
  const qc = useQueryClient();
  const [competencia, setCompetencia] = useState("");
  const [incluirPagas, setIncluirPagas] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [resultado, setResultado] = useState(null);

  const { data: meses = [], isLoading } = useQuery({
    queryKey: ["machinepay", "apagar", "previa"],
    queryFn: () => machinePayApi.previaApagarCobrancas().then((r) => r.data),
  });

  // Soma do que sera apagado com a escolha atual.
  const escolhidos = competencia === "TODAS" ? meses : meses.filter((m) => m.competencia === competencia);
  const alvo = escolhidos.reduce(
    (a, m) => ({
      total: a.total + m.pendentes + m.canceladas + (incluirPagas ? m.pagas : 0),
      pagas: a.pagas + m.pagas,
    }),
    { total: 0, pagas: 0 },
  );

  const apagar = useMutation({
    mutationFn: () =>
      machinePayApi.apagarCobrancas({ competencia, incluirPagas, confirmacao }).then((r) => r.data),
    onSuccess: (r) => {
      setResultado(r);
      setConfirmacao("");
      qc.invalidateQueries({ queryKey: ["machinepay"] });
      qc.invalidateQueries({ queryKey: ["movimentacoes"] });
      qc.invalidateQueries({ queryKey: ["contas"] });
    },
  });

  const podeApagar = competencia && alvo.total > 0 && confirmacao.trim().toUpperCase() === "APAGAR";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Apagar cobranças do Machine Pay</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Remove as cobranças geradas de um mês (ou de todos). Os clientes e as máquinas não são apagados, e as cobranças podem ser geradas de novo em Machine Pay › Gerar cobranças.
        </p>
      </div>

      <div className="glass rounded-xl p-4 space-y-4">
        {isLoading ? (
          <p className="text-sm text-slate-500 text-center">Carregando…</p>
        ) : !meses.length ? (
          <p className="text-sm text-slate-500 text-center">Não há cobranças geradas.</p>
        ) : (
          <>
            <Select
              label="Mês das cobranças"
              value={competencia}
              onChange={(e) => {
                setCompetencia(e.target.value);
                setResultado(null);
              }}
              options={[
                { value: "", label: "Escolha o mês" },
                ...meses.map((m) => ({
                  value: m.competencia,
                  label: `${rotuloMes(m.competencia)} · ${m.total} cobrança(s) · ${formatCurrency(m.valor)}`,
                })),
                { value: "TODAS", label: `Todos os meses · ${meses.reduce((a, m) => a + m.total, 0)} cobrança(s)` },
              ]}
            />

            {competencia && (
              <>
                <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={incluirPagas}
                    onChange={(e) => setIncluirPagas(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Apagar também as <b>pagas</b> ({alvo.pagas})
                    <span className="block text-xs text-slate-500">
                      O lançamento de entrada no financeiro é removido e o saldo da conta é ajustado. Sem marcar, as pagas ficam guardadas.
                    </span>
                  </span>
                </label>

                <div className="flex items-start gap-2 rounded-lg p-3 border border-rose-500/30 bg-rose-500/5 text-xs text-slate-600 dark:text-slate-400">
                  <AlertTriangle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                  <span>
                    Vão ser apagadas <b className="text-rose-500">{alvo.total} cobrança(s)</b>
                    {competencia === "TODAS" ? " de todos os meses" : ` de ${rotuloMes(competencia)}`}. Os Pix SumUp em aberto delas são cancelados. Não dá para desfazer.
                  </span>
                </div>

                <Input
                  label='Digite APAGAR para confirmar'
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  placeholder="APAGAR"
                  autoComplete="off"
                />
              </>
            )}
          </>
        )}

        {apagar.isError && (
          <p className="text-xs text-rose-500">
            {apagar.error?.response?.data?.message || "Erro ao apagar cobranças."}
          </p>
        )}
        {resultado && (
          <p className="text-xs text-emerald-500">
            {resultado.apagadas} cobrança(s) apagada(s)
            {resultado.lancamentosRemovidos ? ` · ${resultado.lancamentosRemovidos} lançamento(s) removido(s) do financeiro` : ""}.
          </p>
        )}

        {meses.length > 0 && (
          <button
            onClick={() => apagar.mutate()}
            disabled={!podeApagar || apagar.isPending}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50"
          >
            <Trash2 size={15} />
            {apagar.isPending ? "Apagando…" : `Apagar ${alvo.total || ""} cobrança(s)`}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────── SumUp ─────────────── */
const erroApi = (error, fallback) => error?.response?.data?.message || fallback;

function SumupMaquininhas({ conta }) {
  const qc = useQueryClient();
  const [aviso, setAviso] = useState("");
  const chave = ["sumup-contas", conta.id, "maquininhas"];

  const { data: maquininhas = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: chave,
    queryFn: () => sumupContasApi.maquininhas(conta.id).then((r) => r.data),
    retry: false,
  });

  const esquecer = useMutation({
    mutationFn: (readerId) => sumupContasApi.esquecerMaquininha(conta.id, readerId),
    onSuccess: () => {
      setAviso("Esquecida na conta. Agora no aparelho: Menu › Conexões › API › Desconectar. Ao conectar de novo, aparece o código de pareamento.");
      qc.invalidateQueries({ queryKey: chave });
    },
  });

  function handleEsquecer(maquininha) {
    const ok = window.confirm(
      `Esquecer "${maquininha.nome || maquininha.id}" na conta ${conta.nome}?\n\nDepois desconecte no aparelho: Menu › Conexões › API › Desconectar.`,
    );
    if (ok) {
      setAviso("");
      esquecer.mutate(maquininha.id);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Maquininhas pareadas na Cloud API
        </p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs text-blue-500 hover:text-blue-400 disabled:opacity-50"
        >
          {isFetching ? "Atualizando…" : "Atualizar"}
        </button>
      </div>

      {isLoading ? (
        <p className="text-xs text-slate-500">Consultando a SumUp…</p>
      ) : isError ? (
        <p className="text-xs text-rose-500">{erroApi(error, "Falha ao consultar a SumUp.")}</p>
      ) : !maquininhas.length ? (
        <p className="text-xs text-slate-500">Nenhuma maquininha pareada nesta conta.</p>
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800">
          {maquininhas.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm text-slate-900 dark:text-white">
                  {m.nome || "Maquininha"}
                  {m.status && <span className="ml-2 text-xs text-slate-500">{m.status}</span>}
                </p>
                <p className="text-xs font-mono text-slate-500 break-all">
                  {m.id}
                  {m.serial ? ` · serial ${m.serial}` : ""}
                  {m.modelo ? ` · ${m.modelo}` : ""}
                </p>
              </div>
              <button
                onClick={() => handleEsquecer(m)}
                disabled={esquecer.isPending}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-rose-500 border border-rose-500/30 hover:bg-rose-500/10 disabled:opacity-50"
              >
                <Trash2 size={13} />
                Esquecer
              </button>
            </div>
          ))}
        </div>
      )}

      {esquecer.isError && (
        <p className="text-xs text-rose-500">{erroApi(esquecer.error, "Erro ao esquecer a maquininha.")}</p>
      )}
      {aviso && <p className="text-xs text-emerald-500">{aviso}</p>}
    </div>
  );
}

function SumupTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome: "", apiKey: "" });
  const [editando, setEditando] = useState(null);
  const [aberta, setAberta] = useState(null);
  const [busca, setBusca] = useState("");

  const { data: contas = [], isLoading, isError, error } = useQuery({
    queryKey: ["sumup-contas"],
    queryFn: () => sumupContasApi.listar().then((r) => r.data),
  });

  // Busca pelo nome dado aqui, pelo nome da empresa na SumUp ou pelo merchant code.
  const termo = busca
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  const contasFiltradas = termo
    ? contas.filter((c) =>
        [c.nome, c.nomeConta, c.merchantCode]
          .filter(Boolean)
          .join(" ")
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .toLowerCase()
          .includes(termo),
      )
    : contas;

  const salvar = useMutation({
    mutationFn: () =>
      editando
        ? sumupContasApi.atualizar(editando, form)
        : sumupContasApi.criar(form),
    onSuccess: () => {
      setForm({ nome: "", apiKey: "" });
      setEditando(null);
      qc.invalidateQueries({ queryKey: ["sumup-contas"] });
    },
  });

  const excluir = useMutation({
    mutationFn: (id) => sumupContasApi.excluir(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sumup-contas"] }),
  });

  function iniciarEdicao(conta) {
    setEditando(conta.id);
    setForm({ nome: conta.nome, apiKey: "" });
  }

  function cancelarEdicao() {
    setEditando(null);
    setForm({ nome: "", apiKey: "" });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Contas SumUp</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          Guarde a API key de cada conta SumUp do grupo (duBob, CompactPay, Machine Pay…) para ver e esquecer as maquininhas pareadas nela. Uma maquininha pareada numa conta reconecta sozinha e não mostra o código de pareamento até ser esquecida lá.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          salvar.mutate();
        }}
        autoComplete="off"
        className="glass rounded-xl p-4 space-y-3"
      >
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {editando ? "Editar conta" : "Nova conta SumUp"}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Nome"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
            placeholder="Ex: duBob"
            name="sumup-conta-nome"
            autoComplete="off"
          />
          <Input
            label={editando ? "Nova API key (vazio mantém a atual)" : "API key"}
            type="password"
            name="sumup-conta-api-key"
            // Sem isso o navegador trata como login e preenche e-mail e senha salvos.
            autoComplete="new-password"
            value={form.apiKey}
            onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
            placeholder="sup_sk_..."
          />
        </div>
        {salvar.isError && (
          <p className="text-xs text-rose-500">{erroApi(salvar.error, "Erro ao salvar a conta.")}</p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={salvar.isPending || !form.nome.trim() || (!editando && !form.apiKey.trim())}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
          >
            <Plus size={15} />
            {salvar.isPending ? "Validando…" : editando ? "Salvar" : "Adicionar conta"}
          </button>
          {editando && (
            <button
              type="button"
              onClick={cancelarEdicao}
              className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {isLoading ? (
        <p className="text-sm text-slate-500 text-center">Carregando…</p>
      ) : isError ? (
        <p className="text-sm text-rose-500 text-center">{erroApi(error, "Erro ao carregar as contas.")}</p>
      ) : !contas.length ? (
        <p className="text-sm text-slate-500 text-center">Nenhuma conta SumUp cadastrada.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar conta pelo nome, empresa ou merchant code…"
              autoComplete="off"
              className="input-base max-w-sm"
            />
            <span className="text-xs text-slate-500">
              {termo ? `${contasFiltradas.length} de ${contas.length}` : contas.length} conta(s)
            </span>
          </div>
          {!contasFiltradas.length && (
            <p className="text-sm text-slate-500 text-center py-4">Nenhuma conta encontrada para "{busca}".</p>
          )}
          {contasFiltradas.map((conta) => (
            <div key={conta.id} className="glass rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{conta.nome}</p>
                  <p className="text-xs text-slate-500">
                    {conta.nomeConta ? `${conta.nomeConta} · ` : ""}
                    {conta.merchantCode || "sem merchant code"} · {conta.apiKeyMascarada}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setAberta(aberta === conta.id ? null : conta.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-500"
                  >
                    {aberta === conta.id ? "Fechar" : "Maquininhas"}
                  </button>
                  <button
                    onClick={() => iniciarEdicao(conta)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700"
                  >
                    <Pencil size={13} />
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Excluir a conta "${conta.nome}" daqui? Nada muda na SumUp.`)) {
                        excluir.mutate(conta.id);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-rose-500 border border-rose-500/30"
                  >
                    <Trash2 size={13} />
                    Excluir
                  </button>
                </div>
              </div>
              {aberta === conta.id && <SumupMaquininhas conta={conta} />}
            </div>
          ))}
        </div>
      )}
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
    key: "cotacoes",
    label: "Cotações",
    icon: DollarSign,
    component: CotacoesTab,
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
  { key: "machinepay", label: "Machine Pay", icon: Wallet, component: MachinePayConfigTab },
  { key: "sumup", label: "SumUp", icon: Smartphone, component: SumupTab },
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
      case "machinepay":
        return isAdmin ? <MachinePayConfigTab /> : null;
      case "sumup":
        return isAdmin ? <SumupTab /> : null;
      case "cotacoes":
        return <CotacoesTab />;
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
