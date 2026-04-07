import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "../../../lib/utils.js";

export default function EvolutionChart({ data, isLoading }) {
  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="animate-spin">⚙️</div>
      </div>
    );
  }

  const chartData = data || [];

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
        Evolução: Receitas vs Despesas
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis
            dataKey="periodo"
            stroke="#94a3b8"
            style={{ fontSize: "12px" }}
          />
          <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
          <Tooltip
            formatter={(value) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #475569",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#94a3b8" }}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          <Line
            type="monotone"
            dataKey="entradas"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ fill: "#22c55e", r: 4 }}
            activeDot={{ r: 6 }}
            name="Receitas"
          />
          <Line
            type="monotone"
            dataKey="saidas"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: "#ef4444", r: 4 }}
            activeDot={{ r: 6 }}
            name="Despesas"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
