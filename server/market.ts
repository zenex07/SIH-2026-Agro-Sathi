type CedaRow = {
  date: string;
  modalPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
};

const CEDA_BASE_URL = "https://agmarknet.ceda.ashoka.edu.in";

function numeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function stringValue(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function priceValue(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = numeric(record[key]);
    if (value !== null) return value;
  }
  return null;
}

export function normalizeCedaPrices(payload: unknown): CedaRow[] {
  const source = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as { data?: unknown; result?: unknown; rows?: unknown }).data
      ?? (payload as { result?: unknown }).result
      ?? (payload as { rows?: unknown }).rows
    : payload;
  if (!Array.isArray(source)) return [];

  return source.flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const date = stringValue(record, ["t", "date", "Date", "reported_date", "report_date", "time_period", "period"]);
    if (!date) return [];
    return [{
      date,
      modalPrice: priceValue(record, ["p_modal", "modal_price", "modalPrice", "Modal Price", "modal"]),
      minPrice: priceValue(record, ["p_min", "min_price", "minPrice", "Min Price", "min"]),
      maxPrice: priceValue(record, ["p_max", "max_price", "maxPrice", "Max Price", "max"]),
    }];
  });
}

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function fetchCedaPriceRows(input: {
  commodityId: number;
  stateId?: number;
  districtId?: number;
}) {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 365);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(`${CEDA_BASE_URL}/api/prices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Origin": CEDA_BASE_URL,
        "Referer": `${CEDA_BASE_URL}/`,
        "User-Agent": "Mozilla/5.0 (compatible; AgroSaarthi/1.0; market-data-adapter)",
      },
      body: JSON.stringify({
        state_id: input.stateId ?? 0,
        commodity_id: input.commodityId,
        district_id: input.districtId ?? 0,
        calculation_type: "d",
        start_date: isoDay(start),
        end_date: isoDay(end),
      }),
      signal: controller.signal,
    });
    if (!response.ok) return [];
    const rows = normalizeCedaPrices(await response.json());
    return rows.filter(row => row.modalPrice !== null || row.minPrice !== null || row.maxPrice !== null).sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export function projectMandiTrend(rows: CedaRow[], horizonDays = 7) {
  const usable = rows.filter(row => row.modalPrice !== null).slice(-28);
  if (usable.length < 4) return null;
  const values = usable.map(row => row.modalPrice as number);
  const meanX = (values.length - 1) / 2;
  const meanY = values.reduce((sum, value) => sum + value, 0) / values.length;
  const denominator = values.reduce((sum, _, index) => sum + (index - meanX) ** 2, 0);
  const rawSlope = denominator === 0 ? 0 : values.reduce((sum, value, index) => sum + (index - meanX) * (value - meanY), 0) / denominator;
  const latest = values.at(-1) as number;
  const cappedSlope = Math.max(-latest * 0.03, Math.min(latest * 0.03, rawSlope));
  const projected = Math.max(0, latest + cappedSlope * horizonDays);
  const residualMean = values.reduce((sum, value, index) => sum + Math.abs(value - (meanY + cappedSlope * (index - meanX))), 0) / values.length;
  const range = Math.max(residualMean * 1.25, latest * 0.025);
  const changePercent = latest === 0 ? 0 : ((projected - latest) / latest) * 100;
  return {
    horizonDays,
    latest,
    projected: Math.round(projected),
    lower: Math.max(0, Math.round(projected - range)),
    upper: Math.round(projected + range),
    direction: changePercent > 1 ? "up" as const : changePercent < -1 ? "down" as const : "steady" as const,
    changePercent: Number(changePercent.toFixed(1)),
    confidence: usable.length >= 14 ? "medium" as const : "low" as const,
    observations: usable.length,
    history: usable.slice(-10).map(row => ({ date: row.date, modalPrice: row.modalPrice })),
  };
}

export async function getCedaLatestPrice(input: { commodityId: number; stateId?: number; districtId?: number }) {
  const rows = await fetchCedaPriceRows(input);
  const latest = rows.at(-1);
  if (!latest) return { status: "unavailable" as const, source: "CEDA Agri Market Data", message: "No latest available price was returned for this crop and location." };
  return { status: "available" as const, source: "CEDA Agri Market Data", freshnessLabel: "Latest available upstream price", unit: "₹ / quintal", ...latest };
}

export async function getCedaPriceForecast(input: { commodityId: number; stateId?: number; districtId?: number }) {
  const rows = await fetchCedaPriceRows(input);
  const forecast = projectMandiTrend(rows);
  if (!forecast) return { status: "unavailable" as const, source: "CEDA Agri Market Data", message: "There are not enough latest-available source records to draw a short-term trend projection." };
  return {
    status: "available" as const,
    source: "CEDA Agri Market Data",
    unit: "₹ / quintal",
    method: "28-observation capped linear trend baseline",
    caveat: "This is a short-term source-data trend projection, not a guaranteed mandi price, sale recommendation, or yield forecast.",
    ...forecast,
  };
}
