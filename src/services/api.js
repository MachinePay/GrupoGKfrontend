import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Injeta token JWT em todas as requisições autenticadas
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("gk_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redireciona para login em caso de 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("gk_token");
      localStorage.removeItem("gk_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (payload) => api.post("/auth/login", payload),
  me: () => api.get("/auth/me"),
  changePassword: (payload) => api.patch("/auth/me/senha", payload),
  updateTheme: (payload) => api.patch("/auth/me/tema", payload),
  listUsers: () => api.get("/auth/users"),
  createUser: (payload) => api.post("/auth/users", payload),
  toggleUser: (id) => api.patch(`/auth/users/${id}/status`),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardApi = {
  consolidado: () => api.get("/dashboards/consolidado"),
  empresa: (id) => api.get(`/dashboards/empresa/${id}`),
  contas: () => api.get("/dashboards/contas"),
  bancos: () => api.get("/dashboards/bancos"),
  maisQuiosqueProjetos: () => api.get("/dashboards/maisquiosque/projetos"),
};

// ─── Movimentações ───────────────────────────────────────────────────────────
export const movimentacoesApi = {
  criar: (payload) => api.post("/movimentacoes", payload),
  listar: (params) => api.get("/movimentacoes", { params }),
  remover: (id) => api.delete(`/movimentacoes/${id}`),
};

// ─── Agenda ──────────────────────────────────────────────────────────────────
export const agendaApi = {
  listar: (params) => api.get("/agenda", { params }),
  listarBaixas: (params) => api.get("/agenda/baixas", { params }),
  criar: (payload) => api.post("/agenda", payload),
  atualizar: (id, payload) => api.put(`/agenda/${id}`, payload),
  remover: (id) => api.delete(`/agenda/${id}`),
  baixar: (id, payload) => api.post(`/agenda/${id}/baixar`, payload),
};

// ─── Cadastros ───────────────────────────────────────────────────────────────
export const cadastrosApi = {
  listarEmpresas: () => api.get("/cadastros/empresas"),
  criarEmpresa: (payload) => api.post("/cadastros/empresas", payload),
  atualizarEmpresa: (id, payload) =>
    api.patch(`/cadastros/empresas/${id}`, payload),
  removerEmpresa: (id) => api.delete(`/cadastros/empresas/${id}`),
  listarContas: () => api.get("/cadastros/contas-bancarias"),
  criarConta: (payload) => api.post("/cadastros/contas-bancarias", payload),
  atualizarConta: (id, payload) =>
    api.patch(`/cadastros/contas-bancarias/${id}`, payload),
  removerConta: (id) => api.delete(`/cadastros/contas-bancarias/${id}`),
  listarProjetos: (empresaId) =>
    api.get("/cadastros/projetos", { params: empresaId ? { empresaId } : {} }),
  criarProjeto: (payload) => api.post("/cadastros/projetos", payload),
};

// ─── Integração AgarraMais ───────────────────────────────────────────────────
export const integracaoApi = {
  syncAgarraMais: (params) =>
    api.get("/integracao/agarramais/sync", {
      params: typeof params === "object" ? params : { empresaId: params },
    }),

  // Lista itens pendentes de aprovação
  listarPendencias: (empresaId) =>
    api.get("/integracao/pendencias", { params: { empresaId } }),

  // Aprova uma pendência e cria movimentação real
  aprovarPendencia: (agendaId, payload) =>
    api.post(`/integracao/aprovar/${agendaId}`, payload),

  // Rejeita uma pendência
  rejeitarPendencia: (agendaId, motivo) =>
    api.post(`/integracao/rejeitar/${agendaId}`, { motivo }),

  // Obtém estatísticas de pendências
  obterEstatisticas: (params) =>
    api.get("/integracao/estatisticas", { params }),
};

export default api;
