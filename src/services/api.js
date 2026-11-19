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

// ─── Fornecedores ────────────────────────────────────────────────────────────
export const cotacoesApi = {
  listar: () => api.get("/cotacoes"),
  atualizar: (payload) => api.put("/cotacoes", payload),
};

export const fornecedoresApi = {
  listar: (params) => api.get("/fornecedores", { params }),
  criar: (payload) => api.post("/fornecedores", payload),
  atualizar: (id, payload) => api.put(`/fornecedores/${id}`, payload),
  toggle: (id) => api.patch(`/fornecedores/${id}/toggle`),
  remover: (id) => api.delete(`/fornecedores/${id}`),
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

// ─── SelfMachine SaaS ───────────────────────────────────────────────────────
export const selfMachineApi = {
  listar: () => api.get("/selfmachine/saas"),
  buscar: (id) => api.get(`/selfmachine/saas/${id}`),
  criar: (payload) => api.post("/selfmachine/saas", payload),
  atualizar: (id, payload) => api.put(`/selfmachine/saas/${id}`, payload),
  remover: (id) => api.delete(`/selfmachine/saas/${id}`),
  gerarPedido: (id) => api.post(`/selfmachine/saas/${id}/gerar-pedido`),
  relatorio: () => api.get("/selfmachine/saas/relatorio"),
};

// ─── Machine Pay e CompactPay ───────────────────────────────────────────────
// Mesmas rotas para os dois produtos, mudando so o prefixo. SumUp e WhatsApp
// sao compartilhados (a configuracao e a mesma pelos dois prefixos).
function criarProdutoApi(prefixo) {
  return {
    config: () => api.get(`${prefixo}/config`),
    salvarConfig: (payload) => api.put(`${prefixo}/config`, payload),
    statusPainel: () => api.get(`${prefixo}/painel/status`),
    sincronizarPainel: () => api.post(`${prefixo}/painel/sincronizar`),
    listarClientes: () => api.get(`${prefixo}/clientes`),
    criarCliente: (payload) => api.post(`${prefixo}/clientes`, payload),
    atualizarCliente: (id, payload) =>
      api.put(`${prefixo}/clientes/${id}`, payload),
    ajustarMaquinas: (id, payload) =>
      api.post(`${prefixo}/clientes/${id}/maquinas`, payload),
    removerCliente: (id) => api.delete(`${prefixo}/clientes/${id}`),
    historicoCliente: (id) => api.get(`${prefixo}/clientes/${id}/historico`),
    importarClientes: (clientes) =>
      api.post(`${prefixo}/clientes/importar`, { clientes }),
    competencia: (competencia) =>
      api.get(`${prefixo}/cobrancas`, { params: { competencia } }),
    evolucao: (meses = 6) =>
      api.get(`${prefixo}/cobrancas/evolucao`, { params: { meses } }),
    gerarCobrancas: (competencia) =>
      api.post(`${prefixo}/cobrancas/gerar`, { competencia }),
    atualizarCobranca: (id, payload) =>
      api.put(`${prefixo}/cobrancas/${id}`, payload),
    pagarCobranca: (id, payload) =>
      api.post(`${prefixo}/cobrancas/${id}/pagar`, payload),
    estornarCobranca: (id) => api.post(`${prefixo}/cobrancas/${id}/estornar`),
    cancelarCobranca: (id) => api.post(`${prefixo}/cobrancas/${id}/cancelar`),
    removerCobranca: (id) => api.delete(`${prefixo}/cobrancas/${id}`),
    previaApagarCobrancas: () => api.get(`${prefixo}/cobrancas/apagar/previa`),
    apagarCobrancas: (payload) => api.post(`${prefixo}/cobrancas/apagar`, payload),
    gerarPix: (id, novo = false) =>
      api.post(`${prefixo}/cobrancas/${id}/pix`, { novo }),
    verificarPix: (id) => api.post(`${prefixo}/cobrancas/${id}/pix/verificar`),
    sumupConfig: () => api.get(`${prefixo}/sumup/config`),
    salvarSumupConfig: (payload) => api.put(`${prefixo}/sumup/config`, payload),
    testarSumup: () => api.post(`${prefixo}/sumup/testar`),
    conferirPixPagos: () => api.post(`${prefixo}/sumup/conferir`),
    whatsappConfig: () => api.get(`${prefixo}/whatsapp/config`),
    salvarWhatsappConfig: (payload) =>
      api.put(`${prefixo}/whatsapp/config`, payload),
    whatsappConexao: () => api.get(`${prefixo}/whatsapp/conexao`),
    conectarWhatsapp: () => api.post(`${prefixo}/whatsapp/conectar`),
    filaWhatsapp: () => api.get(`${prefixo}/whatsapp/fila`),
    enviarWhatsapp: (ids, reenviar = false) =>
      api.post(`${prefixo}/whatsapp/enviar`, { ids, reenviar }),
    cancelarWhatsapp: () => api.post(`${prefixo}/whatsapp/cancelar`),
    testarIntegracao: () => api.post(`${prefixo}/config/testar-integracao`),
  };
}

export const machinePayApi = criarProdutoApi("/machinepay");
export const compactPayApi = criarProdutoApi("/compactpay");

// Contas SumUp do grupo e as maquininhas pareadas na Cloud API de cada uma.
export const sumupContasApi = {
  listar: () => api.get("/sumup-contas"),
  criar: (payload) => api.post("/sumup-contas", payload),
  atualizar: (id, payload) => api.put(`/sumup-contas/${id}`, payload),
  excluir: (id) => api.delete(`/sumup-contas/${id}`),
  maquininhas: (id) => api.get(`/sumup-contas/${id}/maquininhas`),
  esquecerMaquininha: (id, readerId) =>
    api.delete(`/sumup-contas/${id}/maquininhas/${encodeURIComponent(readerId)}`),
};

export default api;
