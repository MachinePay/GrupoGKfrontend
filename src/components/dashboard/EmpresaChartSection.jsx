import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useQueries } from "@tanstack/react-query";
import { useEmpresas } from "../../hooks/useFinanceiro.js";
import { dashboardApi } from "../../services/api.js";
import { formatCurrency } from "../../lib/utils.js";

const EMPRESA_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#84cc16",
  "#f97316",
  "#a855f7",
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="glass card-shadow rounded-xl p-3 text-sm">
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function EmpresaChartSection() {
  const { data: empresas = [], isLoading } = useEmpresas();

  const queries = useQueries({
    queries: empresas.map((empresa) => ({
      queryKey: ["dashboard", "empresa", empresa.id],
      queryFn: () => dashboardApi.empresa(empresa.id).then((r) => r.data),
      enabled: !!empresa?.id,
      staleTime: 60_000,
    })),
  });

  const isLoadingEmpresas = queries.some((q) => q.isLoading);
  const hasAnyData = queries.some((q) => q.data);

  const chartData = empresas.map((empresa, i) => ({
    nome: empresa.nome,
    Entradas: Number(queries[i]?.data?.totalEntradas ?? 0),
    Saidas: Number(queries[i]?.data?.totalSaidas ?? 0),
  }));

  if (isLoading || (isLoadingEmpresas && !hasAnyData)) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
        Carregando dados por empresa...
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
        Nenhuma empresa cadastrada para exibir no gráfico.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={chartData}
        margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="nome"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          interval={0}
          angle={-15}
          textAnchor="end"
          height={56}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          tick={{ fill: "#94a3b8", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={55}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="Entradas" radius={[4, 4, 0, 0]} fill="#3b82f6">
          {chartData.map((_, i) => (
            <Cell key={i} fill={EMPRESA_COLORS[i % EMPRESA_COLORS.length]} />
          ))}
        </Bar>
        <Bar
          dataKey="Saidas"
          radius={[4, 4, 0, 0]}
          fill="#ef4444"
          opacity={0.7}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
