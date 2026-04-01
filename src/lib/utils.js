const FORMATTERS = {
  BRL: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }),
};

export function formatCurrency(value) {
  return FORMATTERS.BRL.format(Number(value ?? 0));
}

export function formatDate(value) {
  if (!value) return "–";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
