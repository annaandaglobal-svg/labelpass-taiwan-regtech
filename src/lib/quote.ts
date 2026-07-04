// Client-safe quote (견적서) model + share encoding. No server-only imports so it can
// be used from both the builder and the customer-facing view.

export type QuoteLineItem = {
  id: string;
  label: string;
  amount: number;
};

export type Quote = {
  id: string;
  createdAt: string;
  expertName: string;
  expertRole: string;
  clientName: string;
  productName: string;
  currency: string;
  items: QuoteLineItem[];
  leadTimeDays: number | null;
  validUntil: string;
  escrow: boolean;
  note: string;
};

export function quoteTotal(quote: Quote): number {
  return quote.items.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0);
}

export function formatMoney(amount: number, currency: string): string {
  const rounded = Math.round(amount);
  return `${currency} ${rounded.toLocaleString("en-US")}`;
}

function toBase64(input: string): string {
  if (typeof btoa !== "undefined") {
    const bytes = new TextEncoder().encode(input);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }
  return Buffer.from(input, "utf8").toString("base64");
}

function fromBase64(input: string): string {
  if (typeof atob !== "undefined") {
    const binary = atob(input);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(input, "base64").toString("utf8");
}

export function encodeQuote(quote: Quote): string {
  return encodeURIComponent(toBase64(JSON.stringify(quote)));
}

export function decodeQuote(encoded: string): Quote | null {
  try {
    const parsed = JSON.parse(fromBase64(decodeURIComponent(encoded)));
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.items)) return null;
    return parsed as Quote;
  } catch {
    return null;
  }
}
