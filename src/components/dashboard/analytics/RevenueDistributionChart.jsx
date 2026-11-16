import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency } from "../../../lib/utils.js";
import { useIsMobile } from "../../ui/useIsMobile.js";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export default function RevenueDistributionChart({ data, isLoading }) {
  const isMobile = useIsMobile();

  if (isLoading || !data || data.length === 0) {
    return (
      <div className="glass rounded-lg p-3 sm:p-4 min-w-0">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-4">
          Distribuição de Receitas por Empresa
        </h3>
        <div className="h-80 flex items-center justify-center text-slate-500">
          {isLoading ? "Carregando..." : "Sem dados"}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-lg p-3 sm:p-4 min-w-0">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
        Distribuição de Receitas por Empresa
      </h3>
      <ResponsiveContainer width="100%" height={isMobile ? 240 : 350}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={
              isMobile
                ? false
                : (entry) => `${entry.empresa}: ${entry.percentual}%`
            }
            outerRadius={isMobile ? 90 : 100}
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
      <div className="mt-4 space-y-2 text-xs">
        {data.map((item, index) => (
          <div
            key={item.empresa}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{
                  backgroundColor: COLORS[index % COLORS.length],
                }}
              ></div>
              <span className="text-slate-400 truncate">{item.empresa}</span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-slate-700 dark:text-slate-300">
                {formatCurrency(item.valor)}
              </span>
              <span className="text-slate-500 ml-2">({item.percentual}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
