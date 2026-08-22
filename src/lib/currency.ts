export type CurrencyOption = {
  code: string
  symbol: string
  name: string
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "INR", symbol: "₹", name: "Indian Rupee (INR - ₹)" },
  { code: "USD", symbol: "$", name: "US Dollar (USD - $)" },
  { code: "EUR", symbol: "€", name: "Euro (EUR - €)" },
  { code: "GBP", symbol: "£", name: "British Pound (GBP - £)" },
  { code: "AED", symbol: "AED", name: "UAE Dirham (AED)" },
  { code: "SAR", symbol: "SAR", name: "Saudi Riyal (SAR)" },
  { code: "QAR", symbol: "QAR", name: "Qatari Riyal (QAR)" },
  { code: "OMR", symbol: "OMR", name: "Omani Rial (OMR)" },
  { code: "KWD", symbol: "KWD", name: "Kuwaiti Dinar (KWD)" },
  { code: "BHD", symbol: "BHD", name: "Bahraini Dinar (BHD)" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar (SGD - S$)" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar (AUD - A$)" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar (CAD - C$)" },
  { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar (NZD - NZ$)" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit (MYR - RM)" },
  { code: "THB", symbol: "฿", name: "Thai Baht (THB - ฿)" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah (IDR - Rp)" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso (PHP - ₱)" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka (BDT - ৳)" },
  { code: "NPR", symbol: "Rs.", name: "Nepalese Rupee (NPR - Rs.)" },
  { code: "LKR", symbol: "Rs.", name: "Sri Lankan Rupee (LKR - Rs.)" },
  { code: "PKR", symbol: "Rs.", name: "Pakistani Rupee (PKR - Rs.)" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen (JPY - ¥)" },
  { code: "ZAR", symbol: "R", name: "South African Rand (ZAR - R)" },
]
