import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../services/api.js";

/**
 * Hook para buscar dados de analytics com filtros
 */
export function useAnalytics(filtros) {
  return useQuery({
    queryKey: ["analytics", filtros],
    queryFn: async () => {
      const response = await dashboardApi.analytics(filtros);
      return response.data;
    },
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export default useAnalytics;
