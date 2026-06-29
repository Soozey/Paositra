// Moteur de calcul des intérêts de placement — Lot 1 Trésorerie.
// Convention par défaut : intérêts simples, base 360 jours (banques commerciales malgaches),
// paramétrable 365. Arrondi à l'ariary entier pour MGA (pas de centimes à Madagascar).

export type InterestBasis = "360" | "365";

export interface InterestComputation {
  principal: number;
  annualRatePercent: number;
  durationDays: number;
  basis: InterestBasis;
  interest: number;
  total: number;
  startDate: string;
  maturityDate: string;
}

function roundForCurrency(amount: number, currency: string): number {
  // MGA : ariary entier (0 décimale). Devises secondaires : 2 décimales.
  return currency.toUpperCase() === "MGA"
    ? Math.round(amount)
    : Math.round(amount * 100) / 100;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + "T00:00:00Z").getTime();
  const b = new Date(toIso + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

export function computeSimpleInterest(input: {
  principal: number;
  annualRatePercent: number;
  durationDays: number;
  basis?: InterestBasis;
  startDate: string;
  currency?: string;
}): InterestComputation {
  const basis: InterestBasis = input.basis ?? "360";
  const currency = input.currency ?? "MGA";
  const base = basis === "365" ? 365 : 360;
  const rawInterest =
    input.principal * (input.annualRatePercent / 100) * (input.durationDays / base);
  const interest = roundForCurrency(rawInterest, currency);
  const principal = roundForCurrency(input.principal, currency);
  return {
    principal,
    annualRatePercent: input.annualRatePercent,
    durationDays: input.durationDays,
    basis,
    interest,
    total: roundForCurrency(principal + interest, currency),
    startDate: input.startDate,
    maturityDate: addDays(input.startDate, input.durationDays)
  };
}

// Notification d'échéance : vrai si l'échéance est dans 0..thresholdDays jours.
export function isMaturingSoon(
  maturityDate: string,
  today: string,
  thresholdDays = 15
): boolean {
  const remaining = daysBetween(today, maturityDate);
  return remaining >= 0 && remaining <= thresholdDays;
}
