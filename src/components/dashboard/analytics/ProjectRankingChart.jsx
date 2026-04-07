import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "../../../lib/utils.js";

export default function ProjectRankingChart({ data, isLoading }) {
  if (isLoading || !data || data.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
          Ranking de Projetos (MaisQuiosque)
        </h3>
        <div className="h-80 flex items-center justify-center text-slate-500">
          {isLoading ? "Carregando..." : "Sem dados da MaisQuiosque"}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
        Ranking de Projetos (Lucro Líquido)
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
          <XAxis
            dataKey="projeto"
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fontSize: 12, fill: "#94a3b8" }}
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
          <Bar
            dataKey="lucroLiquido"
            fill="#3b82f6"
            name="Lucro Líquido"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
