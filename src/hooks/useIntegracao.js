import { useQuery } from "@tanstack/react-query";
import { integracaoApi } from "../services/api.js";

export function useEmpresasIntegradas() {
  return useQuery({
    queryKey: ["integracao", "empresas-integradas"],
    queryFn: () => integracaoApi.listarEmpresasIntegradas().then((r) => r.data),
    refetchInterval: 60_000,
  });
}

/**
 * Hook para listar itens pendentes de aprovação da integração AgarraMais
 * @param {number} empresaId ID da empresa
 * @returns {object} Query result com dados de pendências
 */
export function usePendenciasIntegracao(empresaId) {
  return useQuery({
    queryKey: ["pendencias-integracao", empresaId],
    queryFn: () =>
      integracaoApi.listarPendencias(empresaId).then((r) => r.data),
    enabled: !!empresaId,
    refetchInterval: 30_000, // Recarrega a cada 30 segundos
  });
}

/**
 * Hook para obter estatísticas de pendências em um período
 * @param {number} empresaId ID da empresa
 * @param {Date} dataInicio Data inicial do período
 * @param {Date} dataFim Data final do período
 * @returns {object} Query result com estatísticas
 */
export function useEstatisticasPendencias(empresaId, dataInicio, dataFim) {
  return useQuery({
    queryKey: ["estatisticas-pendencias", empresaId, dataInicio, dataFim],
    queryFn: () =>
      integracaoApi
        .obterEstatisticas({
          empresaId,
          dataInicio: dataInicio?.toISOString().split("T")[0],
          dataFim: dataFim?.toISOString().split("T")[0],
        })
        .then((r) => r.data),
    enabled: !!empresaId && !!dataInicio && !!dataFim,
  });
}
