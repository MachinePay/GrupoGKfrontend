import { cn } from "../../lib/utils.js";

export function Badge({ status }) {
  const map = {
    ATRASADO: "bg-red-500/20 text-red-300 border border-red-500/30",
    PREVISTO: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    REALIZADO:
      "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    ENTRADA: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    SAIDA: "bg-red-500/20 text-red-300 border border-red-500/30",
    TRANSFERENCIA: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  };
  const label = {
    ATRASADO: "Atrasado",
    PREVISTO: "Previsto",
    REALIZADO: "Realizado",
    ENTRADA: "Entrada",
    SAIDA: "Saída",
    TRANSFERENCIA: "Transferência",
  };
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full text-xs font-medium",
        map[status] ??
          "bg-slate-500/20 text-slate-300 border border-slate-500/30",
      )}
    >
      {label[status] ?? status}
    </span>
  );
}
