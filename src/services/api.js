import axios from "axios";

function ensureApiBaseUrl(value, fallback) {
  const rawUrl = String(value || fallback || "").trim();
  const normalizedUrl = rawUrl.replace(/\/+$/, "");

  if (!normalizedUrl) {
    return fallback;
  }

  return normalizedUrl.endsWith("/api")
    ? normalizedUrl
    : `${normalizedUrl}/api`;
}

const BASE_URL = ensureApiBaseUrl(
  import.meta.env.VITE_API_URL,
  "http://localhost:3001/api",
);
const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

function applyAuthInterceptors(client) {
  // Injeta token JWT em todas as requisições autenticadas
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem("gk_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // Redireciona para login em caso de 401
  client.interceptors.response.use(
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
}

applyAuthInterceptors(api);

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
  analytics: (params) => api.get("/relatorios/analytics", { params }),
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
  listarEmpresasIntegradas: () => api.get("/integracao/empresas-integradas"),

  syncIntegracao: (integracao, params) => {
    if (integracao === "agarramais") {
      return api.get("/integracao/agarramais/sync", {
        params: typeof params === "object" ? params : { empresaId: params },
      });
    }

    if (integracao === "maisquiosque") {
      return api.get("/integracao/maisquiosque/sync", {
        params: typeof params === "object" ? params : { empresaId: params },
      });
    }

    return Promise.reject(
      new Error(`Integração ${integracao} ainda não possui sincronização.`),
    );
  },

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

// ─── Logistica MaisQuiosque ─────────────────────────────────────────────────
export const logisticsApi = {
  listarFechamentos: (params) =>
    api.get("/integracao/maisquiosque/fechamentos", { params }),
  salvarFechamento: (payload) =>
    api.post("/integracao/maisquiosque/fechamentos", payload),
};

export default api;
