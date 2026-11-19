// Shared Naira formatter. The ledger itself stays Naira-denominated
// regardless of UI language (this is a Nigeria-focused app) -- only the
// digit grouping becomes locale-aware, via the caller's active i18n
// language (e.g. `formatCurrency(amount, i18n.language)`).
//
// Phase 1 of the i18n rollout: this replaces profile.tsx's local
// `fmtAmount`. ~28 other screens still have their own copy-pasted
// `fmtAmount`/`formatCurrency` hardcoded to 'en-NG' -- migrating those is
// Phase 2 follow-up, not attempted here.
export function formatCurrency(amount: number, locale: string = 'en-NG'): string {
  return `₦${amount.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
