import { cn } from "../../lib/utils.js";

export function Badge({ status, label, variant }) {
  const statusMap = {
    ATRASADO: "bg-red-500/20 text-red-300 border border-red-500/30",
    PENDENTE_INTEGRACAO: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
    PREVISTO: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    REALIZADO:
      "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    ENTRADA: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    SAIDA: "bg-red-500/20 text-red-300 border border-red-500/30",
    TRANSFERENCIA: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  };

  const statusLabel = {
    ATRASADO: "Atrasado",
    PENDENTE_INTEGRACAO: "Pendente Integracao",
    PREVISTO: "Previsto",
    REALIZADO: "Realizado",
    ENTRADA: "Entrada",
    SAIDA: "Saída",
    TRANSFERENCIA: "Transferência",
  };

  const variantMap = {
    agarramais: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    relatorio: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
    entrada: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    default: "bg-slate-500/20 text-slate-300 border border-slate-500/30",
  };

  // Determina qual estilo usar
  let styleClass = variantMap[variant];
  let displayLabel = label;

  if (!variant && status) {
    styleClass = statusMap[status] ?? variantMap.default;
    displayLabel = statusLabel[status] ?? status;
  }

  return (
    <span
      className={cn("px-2 py-0.5 rounded-full text-xs font-medium", styleClass)}
    >
      {displayLabel}
    </span>
  );
}

export default Badge;
