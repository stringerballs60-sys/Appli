export function parsePrice(text: string): number | null {
  const cleaned = text.replace(/\s/g, '').replace('€', '').replace(',', '.');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export function formatPrice(value: number | null | undefined, _withCents = false): string {
  if (value == null) return '';
  const digits = Math.round(value * 100) % 100 !== 0 ? 2 : 0;
  return `${value.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits })} €`;
}
