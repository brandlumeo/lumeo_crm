export const CURRENCIES: { code: string; name: string; symbol: string }[] = [
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
  { code: "QAR", name: "Qatari Riyal", symbol: "ر.ق" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك" },
  { code: "OMR", name: "Omani Rial", symbol: "ر.ع." },
  { code: "BHD", name: "Bahraini Dinar", symbol: ".د.ب" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code);

export const currencyLabel = (code: string) => {
  const c = CURRENCIES.find((x) => x.code === code);
  return c ? `${c.code} – ${c.name}` : code;
};
