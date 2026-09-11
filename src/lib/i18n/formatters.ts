import { Locale } from "./config";

export function formatCurrency(
  amount: number,
  currency: string = "TRY",
  locale: Locale = "tr"
): string {
  try {
    return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function formatDate(
  date: Date | string | number,
  locale: Locale = "tr",
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  }
): string {
  const d = typeof date === "object" ? date : new Date(date);
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", options).format(d);
}

export function formatShortDate(date: Date | string | number, locale: Locale = "tr"): string {
  const d = typeof date === "object" ? date : new Date(date);
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    year: "numeric",
    month: "short",
  }).format(d);
}

export function formatRelativeTime(
  targetDate: Date | string | number,
  locale: Locale = "tr"
): string {
  const target =
    typeof targetDate === "object" ? targetDate.getTime() : new Date(targetDate).getTime();
  const now = Date.now();
  const diffSeconds = Math.round((target - now) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
    numeric: "auto",
  });

  const absDiff = Math.abs(diffSeconds);

  if (absDiff < 60) {
    return rtf.format(diffSeconds, "second");
  }
  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, "minute");
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, "day");
}
