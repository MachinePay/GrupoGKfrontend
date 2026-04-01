import { useQuery } from "@tanstack/react-query";
import {
  BarChart2,
  TrendingUp,
  TrendingDown,
  Building2,
  Landmark,
  Trophy,
} from "lucide-react";
import {
  useEmpresas,
  useBancosDashboard,
  useMaisQuiosqueProjetosDashboard,
} from "../hooks/useFinanceiro.js";
import { dashboardApi } from "../services/api.js";
import { formatCurrency } from "../lib/utils.js";

const EMPRESA_COLORS = {
  AgarraMais: "#3b82f6",
  MachinePay: "#8b5cf6",
  MaisQuiosque: "#f59e0b",
  GiraKids: "#10b981",
  SelfMachine: "#f43f5e",
};

function EmpresaCard({ empresa }) {
  const { data, isLoading } = useQuery({
    queryKey: ["empresa-dashboard", empresa.id],
    queryFn: () => dashboardApi.empresa(empresa.id).then((r) => r.data),
    staleTime: 30_000,
  });

  const color = EMPRESA_COLORS[empresa.nome] ?? "#6366f1";
  const saldo = data ? (data.totalEntradas || 0) - (data.totalSaidas || 0) : 0;

  return (
    <div className="glass card-shadow rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="w-2 h-10 rounded-full"
          style={{ backgroundColor: color }}
        />
        <div>
          <p className="font-semibold text-white text-base">{empresa.nome}</p>
          <p className="text-xs text-slate-500">Análise por empresa</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
              <p className="text-xs text-emerald-400 mb-0.5">Entradas</p>
              <p className="text-base font-bold text-white tabular-nums">
                {formatCurrency(data?.totalEntradas ?? 0)}
              </p>
            </div>
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3">
              <p className="text-xs text-red-400 mb-0.5">Saídas</p>
              <p className="text-base font-bold text-white tabular-nums">
                {formatCurrency(data?.totalSaidas ?? 0)}
              </p>
            </div>
          </div>

          <div
            className={`rounded-xl p-3 border ${saldo >= 0 ? "bg-blue-500/10 border-blue-500/20" : "bg-red-500/10 border-red-500/20"}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">Saldo Líquido</p>
              {saldo >= 0 ? (
                <TrendingUp size={14} className="text-blue-400" />
              ) : (
                <TrendingDown size={14} className="text-red-400" />
              )}
            </div>
            <p
              className={`text-lg font-bold tabular-nums ${saldo >= 0 ? "text-blue-300" : "text-red-400"}`}
            >
              {formatCurrency(saldo)}
            </p>
          </div>

          {data?.contas?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Contas Bancárias
              </p>
              {data.contas.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-400 truncate">
                    {c.banco} – {c.nome}
                  </span>
                  <span
                    className={`font-medium tabular-nums ${c.saldoAtual >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {formatCurrency(c.saldoAtual)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {data?.projetos?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Projetos
              </p>
              {data.projetos.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-400">{p.nome}</span>
                  <span className="text-xs text-slate-500">
                    {p._count?.movimentacoes ?? 0} moviment.
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function RelatoriosPage() {
  const { data: empresas = [], isLoading } = useEmpresas();
  const { data: bancos = [], isLoading: loadingBancos } = useBancosDashboard();
  const { data: projetos = [], isLoading: loadingProjetos } =
    useMaisQuiosqueProjetosDashboard();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">
            Relatórios por Empresa
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Visão detalhada de cada empresa do grupo
          </p>
        </div>
        <BarChart2 size={20} className="text-slate-500" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-72 rounded-2xl bg-white/5 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {empresas.map((emp) => (
            <EmpresaCard key={emp.id} empresa={emp} />
          ))}
        </div>
      )}

      {!isLoading && empresas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Building2 size={32} className="mb-2 opacity-40" />
          <p className="text-sm">Nenhuma empresa cadastrada.</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="glass card-shadow rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Landmark size={18} className="text-blue-300" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                Saldos por Banco
              </h2>
              <p className="text-xs text-slate-500">
                Participação de cada empresa por instituição
              </p>
            </div>
          </div>
          {loadingBancos ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : bancos.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum saldo bancário encontrado.
            </p>
          ) : (
            <div className="space-y-3">
              {bancos.map((banco) => (
                <div
                  key={banco.banco}
                  className="rounded-xl border border-white/5 bg-white/3 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-white">
                      {banco.banco}
                    </p>
                    <p className="text-sm font-semibold text-blue-300">
                      {formatCurrency(banco.saldoTotal)}
                    </p>
                  </div>
                  {banco.participacaoPorEmpresa.map((item) => (
                    <div
                      key={`${banco.banco}-${item.empresa}`}
                      className="space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">{item.empresa}</span>
                        <span className="text-slate-300">
                          {formatCurrency(item.saldo)} · {item.percentual}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-blue-500 to-cyan-400"
                          style={{
                            width: `${Math.min(item.percentual, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="glass card-shadow rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-300" />
            <div>
              <h2 className="text-sm font-semibold text-white">
                MaisQuiosque por Projeto
              </h2>
              <p className="text-xs text-slate-500">
                Ranking de lucratividade e saldo por projeto
              </p>
            </div>
          </div>
          {loadingProjetos ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-white/5 animate-pulse"
                />
              ))}
            </div>
          ) : projetos.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum projeto da MaisQuiosque encontrado.
            </p>
          ) : (
            <div className="space-y-2">
              {projetos.map((projeto, index) => (
                <div
                  key={projeto.id}
                  className="rounded-xl border border-white/5 bg-white/3 p-4"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-medium text-white">
                        #{index + 1} {projeto.nome}
                      </p>
                      <p className="text-xs text-slate-500">
                        Entradas {formatCurrency(projeto.totalEntradas)} ·
                        Saídas {formatCurrency(projeto.totalSaidas)}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-semibold ${projeto.saldoLiquido >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {formatCurrency(projeto.saldoLiquido)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
