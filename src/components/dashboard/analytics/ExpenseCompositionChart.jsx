import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "../../../lib/utils.js";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
];

export default function ExpenseCompositionChart({ data, isLoading }) {
  if (isLoading || !data || data.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
          Composição de Despesas
        </h3>
        <div className="h-80 flex items-center justify-center text-slate-500">
          {isLoading ? "Carregando..." : "Sem dados"}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
        Composição de Despesas (% do Total)
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => `${entry.categoria}: ${entry.percentual}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="percentual"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              if (name === "percentual") {
                return [`${value}%`, "Percentual"];
              }
              return [formatCurrency(value), "Valor"];
            }}
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #475569",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#94a3b8" }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legenda com valores */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        {data.slice(0, 10).map((item, index) => (
          <div key={item.categoria} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: COLORS[index % COLORS.length],
              }}
            ></div>
            <span className="text-slate-400">
              {item.categoria}: {formatCurrency(item.valor)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
