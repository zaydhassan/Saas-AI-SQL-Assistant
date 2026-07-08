// Local mock data for new feature pages that have no backend yet.
// Purely presentational — no fetches. Real pages keep their real wiring.

export const mockTrend = [
  { d: "Jan", revenue: 42000, orders: 320 },
  { d: "Feb", revenue: 48500, orders: 380 },
  { d: "Mar", revenue: 51200, orders: 410 },
  { d: "Apr", revenue: 47900, orders: 365 },
  { d: "May", revenue: 58800, orders: 440 },
  { d: "Jun", revenue: 64300, orders: 502 },
  { d: "Jul", revenue: 71500, orders: 560 },
];

export const mockForecast = [
  { d: "Jun", actual: 64300 },
  { d: "Jul", actual: 71500 },
  { d: "Aug", actual: null, forecast: 74800 },
  { d: "Sep", actual: null, forecast: 79200 },
  { d: "Oct", actual: null, forecast: 83500 },
  { d: "Nov", actual: null, forecast: 88900 },
];

export const mockAnomalies = [
  { metric: "Order volume", date: "Jul 04", severity: "high", delta: "+38%", detail: "Spike on Friday afternoon vs 4-week avg." },
  { metric: "Refund rate", date: "Jun 28", severity: "medium", delta: "+22%", detail: "Above expected range for the week." },
  { metric: "Avg order value", date: "Jun 15", severity: "low", delta: "-12%", detail: "Dip correlated with promo campaign." },
];

export const mockRootCause = [
  { factor: "Friday traffic", contribution: 64 },
  { factor: "Mobile checkout", contribution: 22 },
  { factor: "Promo code usage", contribution: 14 },
];

export const mockReports = [
  { name: "Monthly revenue", schedule: "1st of month", last: "Jul 01", status: "Active" },
  { name: "Top products", schedule: "Weekly (Mon)", last: "Jul 06", status: "Active" },
  { name: "Churn watchlist", schedule: "Manual", last: "Jun 30", status: "Draft" },
];

export const mockAlerts = [
  { name: "Revenue drop > 15%", metric: "Revenue", channel: "Email", active: true },
  { name: "Anomaly on order volume", metric: "Orders", channel: "In-app", active: true },
  { name: "Refund rate spike", metric: "Refunds", channel: "Email", active: false },
];

export const mockHistory = [
  { q: "Top 5 products by revenue", sql: "SELECT product, SUM(price) FROM orders GROUP BY product ORDER BY 2 DESC LIMIT 5", when: "2h ago", rows: 5 },
  { q: "Monthly sales trend", sql: "SELECT DATE_TRUNC('month', created_at), SUM(price) FROM orders GROUP BY 1", when: "5h ago", rows: 7 },
  { q: "Customers with no order in 30d", sql: "SELECT customer_id FROM customers WHERE last_order < NOW() - INTERVAL '30 days'", when: "1d ago", rows: 142 },
];

export const mockResultsRows = [
  { month: "2025-01", revenue: 42000, orders: 320 },
  { month: "2025-02", revenue: 48500, orders: 380 },
  { month: "2025-03", revenue: 51200, orders: 410 },
  { month: "2025-04", revenue: 47900, orders: 365 },
  { month: "2025-05", revenue: 58800, orders: 440 },
  { month: "2025-06", revenue: 64300, orders: 502 },
  { month: "2025-07", revenue: 71500, orders: 560 },
];

export const mockRecommendations = [
  "Revenue is trending up 11% MoM — consider forecasting inventory for Q3.",
  "Order volume spikes every Friday — staff support accordingly.",
  "Refund rate rose 22% on Jun 28 — investigate the affected product batch.",
  "Avg order value dipped 12% during the promo — review discount strategy.",
];