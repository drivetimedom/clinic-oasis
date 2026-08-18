import { format as dfFormat } from "date-fns";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pendente",
    paid: "Pago",
    overdue: "Vencido",
    cancelled: "Cancelado",
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-warning/20 text-warning",
    paid: "bg-success/20 text-success",
    overdue: "bg-destructive/20 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  };
  return colors[status] || "bg-muted text-muted-foreground";
}

export function getRecurrenceLabel(type: string | null): string {
  if (!type) return "";
  const labels: Record<string, string> = {
    monthly: "Mensal",
    quarterly: "Trimestral",
    semiannual: "Semestral",
    annual: "Anual",
  };
  return labels[type] || type;
}

/** Safely formats a date value with date-fns; returns fallback for invalid/missing values. */
export function safeFormat(
  value: string | number | Date | null | undefined,
  pattern: string,
  fallback = "—"
): string {
  if (value === null || value === undefined || value === "") return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return fallback;
  return dfFormat(date, pattern);
}
