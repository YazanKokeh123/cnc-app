export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("de-DE").format(new Date(value));
}

export function daysUntil(value: string | null | undefined) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export function isDeadlineWarning(value: string | null | undefined) {
  const days = daysUntil(value);
  return days !== null && days >= 0 && days <= 7;
}
