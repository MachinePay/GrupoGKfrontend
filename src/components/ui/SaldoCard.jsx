import { cn } from "../../lib/utils.js";

export function SaldoCard({
  title,
  value,
  icon: Icon,
  trend,
  color = "blue",
  loading,
}) {
  const colorMap = {
    blue: "from-blue-600/20 to-blue-800/10 border-blue-500/20",
    green: "from-emerald-600/20 to-emerald-800/10 border-emerald-500/20",
    red: "from-red-600/20 to-red-800/10 border-red-500/20",
    purple: "from-violet-600/20 to-violet-800/10 border-violet-500/20",
  };

  const iconColor = {
    blue: "text-blue-400 bg-blue-500/15",
    green: "text-emerald-400 bg-emerald-500/15",
    red: "text-red-400 bg-red-500/15",
    purple: "text-violet-400 bg-violet-500/15",
  };

  return (
    <div
      className={cn(
        "glass card-shadow rounded-2xl p-5 bg-linear-to-br",
        colorMap[color],
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">
          {title}
        </p>
        {Icon && (
          <span className={cn("p-2 rounded-xl", iconColor[color])}>
            <Icon size={18} />
          </span>
        )}
      </div>
      {loading ? (
        <div className="h-8 w-32 bg-white/10 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      )}
      {trend && <p className="mt-1 text-xs text-slate-500">{trend}</p>}
    </div>
  );
}

export function MiniCard({ label, value, loading }) {
  return (
    <div className="glass rounded-xl p-4 glass-hover transition-all">
      <p className="text-xs text-slate-400 mb-1 truncate">{label}</p>
      {loading ? (
        <div className="h-5 w-24 bg-white/10 rounded animate-pulse" />
      ) : (
        <p className="text-base font-semibold text-white tabular-nums truncate">
          {value}
        </p>
      )}
    </div>
  );
}
