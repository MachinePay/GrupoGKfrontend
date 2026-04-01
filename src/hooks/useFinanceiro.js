import { useQuery } from "@tanstack/react-query";
import {
  cadastrosApi,
  dashboardApi,
  movimentacoesApi,
} from "../services/api.js";

export function useEmpresas() {
  return useQuery({
    queryKey: ["empresas"],
    queryFn: () => cadastrosApi.listarEmpresas().then((r) => r.data),
  });
}

export function useContas(empresaId) {
  return useQuery({
    queryKey: ["contas", empresaId],
    queryFn: () => cadastrosApi.listarContas(empresaId).then((r) => r.data),
    enabled: true,
  });
}

export function useProjetos(empresaId) {
  return useQuery({
    queryKey: ["projetos", empresaId],
    queryFn: () => cadastrosApi.listarProjetos(empresaId).then((r) => r.data),
    enabled: !!empresaId,
  });
}

export function useConsolidado() {
  return useQuery({
    queryKey: ["dashboard", "consolidado"],
    queryFn: () => dashboardApi.consolidado().then((r) => r.data),
    refetchInterval: 60_000,
  });
}

export function useContasSaldo() {
  return useQuery({
    queryKey: ["dashboard", "contas"],
    queryFn: () => dashboardApi.contas().then((r) => r.data),
    refetchInterval: 60_000,
  });
}

export function useEmpresaDashboard(id) {
  return useQuery({
    queryKey: ["dashboard", "empresa", id],
    queryFn: () => dashboardApi.empresa(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useBancosDashboard() {
  return useQuery({
    queryKey: ["dashboard", "bancos"],
    queryFn: () => dashboardApi.bancos().then((r) => r.data),
    refetchInterval: 60_000,
  });
}

export function useMaisQuiosqueProjetosDashboard() {
  return useQuery({
    queryKey: ["dashboard", "maisquiosque", "projetos"],
    queryFn: () => dashboardApi.maisQuiosqueProjetos().then((r) => r.data),
    refetchInterval: 60_000,
  });
}

export function useMovimentacoes(params) {
  return useQuery({
    queryKey: ["movimentacoes", params],
    queryFn: () => movimentacoesApi.listar(params).then((r) => r.data),
  });
}
