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
import { useEmpresas, useEmpresaDashboard } from "../../hooks/useFinanceiro.js";
import { formatCurrency } from "../../lib/utils.js";

const EMPRESA_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];

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

  const ids = empresas.slice(0, 5).map((e) => e.id);
  const q0 = useEmpresaDashboard(ids[0]);
  const q1 = useEmpresaDashboard(ids[1]);
  const q2 = useEmpresaDashboard(ids[2]);
  const q3 = useEmpresaDashboard(ids[3]);
  const q4 = useEmpresaDashboard(ids[4]);

  const queries = [q0, q1, q2, q3, q4];
  const allReady = queries.some((q) => q.data);

  const chartData = empresas.slice(0, 5).map((empresa, i) => ({
    nome: empresa.nome,
    Entradas: Number(queries[i]?.data?.totalEntradas ?? 0),
    Saidas: Number(queries[i]?.data?.totalSaidas ?? 0),
  }));

  if (isLoading || !allReady) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
        Carregando dados por empresa...
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
            <Cell key={i} fill={EMPRESA_COLORS[i]} />
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
