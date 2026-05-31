let appState = {
  language: "pl",
  translations: null,
  data: null
};

let equityChart = null;

const LOCAL_STORAGE_LANGUAGE_KEY = "wearealltraders-language";
const METRIC_GROUP_DEFAULTS = {
  heroMetrics: [
    { id: "cagr", format: "percentSigned" },
    { id: "maxDd", format: "percentSigned" },
    { id: "rr", format: "ratio" },
    { id: "ytd", format: "percentSigned" }
  ],
  dashboardStats: [
    { id: "modelEquity", format: "currency" },
    { id: "exposure", format: "percentPlain" },
    { id: "tradeCount", format: "integer" },
    { id: "lastUpdate", format: "date" }
  ],
  chartSummary: [
    { id: "netReturn", format: "percentSigned" },
    { id: "equity", format: "currency" },
    { id: "currentDrawdown", format: "percentSigned" },
    { id: "winRate", format: "percentPlain" }
  ],
  advancedMetrics: [
    { id: "profitFactor", format: "decimal" },
    { id: "sharpeRatio", format: "decimal" },
    { id: "sortinoRatio", format: "decimal" },
    { id: "exposure", format: "percentPlain" },
    { id: "winRate", format: "percentPlain" },
    { id: "marRatio", format: "decimal" }
  ]
};

document.addEventListener("DOMContentLoaded", () => {
  initializeDashboard().catch((error) => {
    console.error("Dashboard initialization failed:", error);
    renderFatalState();
  });
});

async function initializeDashboard() {
  setupSmoothScroll();
  setupRevealAnimations();

  const [translations, dashboardData] = await Promise.all([
    loadJson("translations.json"),
    loadJson("data.json")
  ]);

  appState.translations = translations;
  appState.data = normalizeDashboardData(dashboardData);
  appState.language = getStoredLanguage(translations);

  setupLanguageSwitcher();
  applyStaticTranslations();
  renderDashboard();
}

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Unable to load ${path}: ${response.status}`);
  }

  return response.json();
}

function getStoredLanguage(translations) {
  const stored = localStorage.getItem(LOCAL_STORAGE_LANGUAGE_KEY);
  if (stored && translations[stored]) {
    return stored;
  }
  return "pl";
}

function setupLanguageSwitcher() {
  const buttons = document.querySelectorAll(".lang-button");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextLanguage = button.dataset.lang;

      if (!nextLanguage || !appState.translations[nextLanguage] || nextLanguage === appState.language) {
        return;
      }

      appState.language = nextLanguage;
      localStorage.setItem(LOCAL_STORAGE_LANGUAGE_KEY, nextLanguage);

      applyStaticTranslations();
      renderDashboard();
    });
  });

  updateLanguageSwitcherState();
}

function updateLanguageSwitcherState() {
  const buttons = document.querySelectorAll(".lang-button");

  buttons.forEach((button) => {
    const isActive = button.dataset.lang === appState.language;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function applyStaticTranslations() {
  document.documentElement.lang = appState.language;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    element.textContent = t(key);
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    const key = element.dataset.i18nAriaLabel;
    element.setAttribute("aria-label", t(key));
  });

  document.querySelectorAll("[data-i18n-content]").forEach((element) => {
    const key = element.dataset.i18nContent;
    element.setAttribute("content", t(key));
  });

  updateLanguageSwitcherState();
}

function renderDashboard() {
  const data = normalizeDashboardData(appState.data || buildEmptyData());

  renderTerminalMeta(data.meta, data.performanceStats);
  renderMetricCards("heroMetrics", data.heroMetrics, buildHeroMetricCard, "metrics.hero");
  renderMetricCards("dashboardStats", data.dashboardStats, buildOverviewCard, "metrics.dashboard");
  renderMetricCards("chartSummary", data.chartSummary, buildMiniStatCard, "metrics.chart");
  renderMetricCards("advancedMetrics", data.advancedMetrics, buildAdvancedMetricCard, "metrics.advanced");
  renderMonthlySummary(data.monthlyReturns || []);
  renderMonthlyTable(data.monthlyReturns || []);
  renderTradesTable(data.recentTrades || []);
  renderFooterMeta(data.meta);
  initializeEquityChart(data.equityCurve || []);
}

function renderTerminalMeta(meta = {}, performanceStats = {}) {
  const terminalMeta = document.getElementById("terminalMeta");
  if (!terminalMeta) {
    return;
  }

  if (!meta.hasData) {
    terminalMeta.textContent = t("terminal.noData");
    return;
  }

  const updateText = `${t("terminal.updated")}: ${formatDate(meta.updatedAt || meta.generatedAt)}`;
  const tradesText = `${t("terminal.trades")}: ${formatInteger(performanceStats.totalTrades)}`;
  const streakText = `${t("terminal.losingStreak")}: ${formatInteger(performanceStats.losingStreak)}`;

  terminalMeta.textContent = `${updateText} | ${tradesText} | ${streakText}`;
}

function renderFooterMeta(meta = {}) {
  const footerMeta = document.getElementById("footerMeta");
  if (!footerMeta) {
    return;
  }

  const strategy = meta.strategy || "MICRO CTA";
  const updateDate = formatDate(meta.updatedAt || meta.generatedAt);
  footerMeta.textContent = `${t("footer.tagline")} | ${strategy} | ${t("footer.updated")} ${updateDate}`;
}

function renderMetricCards(containerId, items, templateBuilder, sectionKey) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  container.innerHTML = items.map((item, index) => templateBuilder(item, index, sectionKey)).join("");
}

function buildHeroMetricCard(item, index, sectionKey) {
  return `
    <article class="kpi-card">
      <span class="card-index">${String(index + 1).padStart(2, "0")}</span>
      <span class="kpi-label">${escapeHtml(metricLabel(sectionKey, item.id))}</span>
      <strong class="kpi-value ${getToneClass(item.tone)}">${escapeHtml(formatMetricValue(item))}</strong>
      <p>${escapeHtml(metricNote(sectionKey, item.id))}</p>
    </article>
  `;
}

function buildOverviewCard(item, index, sectionKey) {
  return `
    <article class="overview-card">
      <span>${escapeHtml(metricLabel(sectionKey, item.id))}</span>
      <strong class="overview-value ${getToneClass(item.tone)}">${escapeHtml(formatMetricValue(item))}</strong>
      <p>${escapeHtml(metricNote(sectionKey, item.id))}</p>
    </article>
  `;
}

function buildMiniStatCard(item, index, sectionKey) {
  return `
    <div class="mini-stat">
      <span>${escapeHtml(metricLabel(sectionKey, item.id))}</span>
      <strong class="${getToneClass(item.tone)}">${escapeHtml(formatMetricValue(item))}</strong>
    </div>
  `;
}

function buildAdvancedMetricCard(item, index, sectionKey) {
  return `
    <article class="stat-card">
      <span>${escapeHtml(metricLabel(sectionKey, item.id))}</span>
      <strong class="stat-value ${getToneClass(item.tone)}">${escapeHtml(formatMetricValue(item))}</strong>
      <p>${escapeHtml(metricNote(sectionKey, item.id))}</p>
    </article>
  `;
}

function renderMonthlySummary(monthlyReturns) {
  const container = document.getElementById("monthlySummary");
  if (!container) {
    return;
  }

  if (!Array.isArray(monthlyReturns) || monthlyReturns.length === 0) {
    const placeholderCards = [
      {
        label: t("monthlySummary.bestMonth"),
        value: t("ui.na"),
        tone: "neutral",
        note: t("ui.na")
      },
      {
        label: t("monthlySummary.worstMonth"),
        value: t("ui.na"),
        tone: "neutral",
        note: t("ui.na")
      },
      {
        label: t("monthlySummary.averageMonth"),
        value: t("ui.na"),
        tone: "neutral",
        note: t("monthlySummary.averageMonthNote")
      },
      {
        label: t("monthlySummary.positiveMonths"),
        value: t("ui.na"),
        tone: "neutral",
        note: t("monthlySummary.positiveMonthsNote")
      }
    ];

    container.innerHTML = placeholderCards.map((item) => `
      <article class="monthly-card">
        <span>${escapeHtml(item.label)}</span>
        <strong class="monthly-value ${getToneClass(item.tone)}">${escapeHtml(item.value)}</strong>
        <p>${escapeHtml(item.note)}</p>
      </article>
    `).join("");
    return;
  }

  const positiveMonths = monthlyReturns.filter((item) => Number(item.returnPct) > 0);
  const averageReturn = monthlyReturns.reduce((sum, item) => sum + Number(item.returnPct || 0), 0) / monthlyReturns.length;
  const bestMonth = monthlyReturns.reduce((best, item) => Number(item.returnPct) > Number(best.returnPct) ? item : best, monthlyReturns[0]);
  const worstMonth = monthlyReturns.reduce((worst, item) => Number(item.returnPct) < Number(worst.returnPct) ? item : worst, monthlyReturns[0]);

  const summaryItems = [
    {
      label: t("monthlySummary.bestMonth"),
      value: formatPercentSigned(bestMonth.returnPct),
      tone: bestMonth.returnPct >= 0 ? "positive" : "negative",
      note: formatMonth(bestMonth.month)
    },
    {
      label: t("monthlySummary.worstMonth"),
      value: formatPercentSigned(worstMonth.returnPct),
      tone: worstMonth.returnPct >= 0 ? "positive" : "negative",
      note: formatMonth(worstMonth.month)
    },
    {
      label: t("monthlySummary.averageMonth"),
      value: formatPercentSigned(averageReturn),
      tone: averageReturn >= 0 ? "positive" : "negative",
      note: t("monthlySummary.averageMonthNote")
    },
    {
      label: t("monthlySummary.positiveMonths"),
      value: `${positiveMonths.length}/${monthlyReturns.length}`,
      tone: "neutral",
      note: t("monthlySummary.positiveMonthsNote")
    }
  ];

  container.innerHTML = summaryItems.map((item) => `
    <article class="monthly-card">
      <span>${escapeHtml(item.label)}</span>
      <strong class="monthly-value ${getToneClass(item.tone)}">${escapeHtml(item.value)}</strong>
      <p>${escapeHtml(item.note)}</p>
    </article>
  `).join("");
}

function renderMonthlyTable(monthlyReturns) {
  const container = document.getElementById("monthlyReturnsTable");
  if (!container) {
    return;
  }

  if (!Array.isArray(monthlyReturns) || monthlyReturns.length === 0) {
    container.innerHTML = `<tr><td colspan="4" class="muted-cell">${escapeHtml(t("empty.monthlyReturns"))}</td></tr>`;
    return;
  }

  let cumulative = 1;

  container.innerHTML = monthlyReturns.map((item) => {
    const monthReturn = Number(item.returnPct || 0);
    cumulative *= 1 + monthReturn / 100;
    const cumulativePct = (cumulative - 1) * 100;
    const assessment = monthReturn >= 0 ? t("tables.monthly.positive") : t("tables.monthly.negative");

    return `
      <tr>
        <td>${escapeHtml(formatMonth(item.month))}</td>
        <td class="${monthReturn >= 0 ? "tone-positive" : "tone-negative"}">${escapeHtml(formatPercentSigned(monthReturn))}</td>
        <td class="${cumulativePct >= 0 ? "tone-positive" : "tone-negative"}">${escapeHtml(formatPercentSigned(cumulativePct))}</td>
        <td class="muted-cell">${escapeHtml(assessment)}</td>
      </tr>
    `;
  }).join("");
}

function renderTradesTable(trades) {
  const container = document.getElementById("recentTradesTable");
  if (!container) {
    return;
  }

  if (!Array.isArray(trades) || trades.length === 0) {
    container.innerHTML = `<tr><td colspan="7" class="muted-cell">${escapeHtml(t("empty.trades"))}</td></tr>`;
    return;
  }

  container.innerHTML = trades.map((trade) => {
    const resultClass = Number.isFinite(Number(trade.resultValue)) ? (Number(trade.resultValue) >= 0 ? "tone-positive" : "tone-negative") : "";
    const directionClass = trade.direction === "short" ? "pill-short" : trade.direction === "long" ? "pill-long" : "";
    const directionLabel = trade.direction ? t(`directions.${trade.direction}`) : t("ui.na");
    const statusLabel = trade.status ? t(`statuses.${trade.status}`) : t("ui.na");

    return `
      <tr>
        <td>${escapeHtml(formatDate(trade.date))}</td>
        <td>${escapeHtml(trade.instrument || t("ui.na"))}</td>
        <td><span class="pill ${directionClass}">${escapeHtml(directionLabel)}</span></td>
        <td class="${resultClass}">${escapeHtml(formatTradeResult(trade))}</td>
        <td class="muted-cell">${escapeHtml(formatTradeRr(trade))}</td>
        <td><span class="pill pill-status-${escapeHtmlClass(trade.status || "unknown")}">${escapeHtml(statusLabel)}</span></td>
        <td class="notes-cell">${escapeHtml(localizedValue(trade.notes) || t("ui.na"))}</td>
      </tr>
    `;
  }).join("");
}

function initializeEquityChart(equityCurve) {
  const chartElement = document.getElementById("equityChart");
  const chartEmptyState = document.getElementById("chartEmptyState");
  const safeCurve = Array.isArray(equityCurve)
    ? equityCurve.filter((entry) => entry && entry.date && Number.isFinite(Number(entry.value ?? entry.equity)))
    : [];

  if (!chartElement || typeof Chart === "undefined") {
    return;
  }

  if (safeCurve.length === 0) {
    if (equityChart) {
      equityChart.destroy();
      equityChart = null;
    }
    if (chartEmptyState) {
      chartEmptyState.hidden = false;
      chartEmptyState.textContent = t("empty.chart");
    }
    return;
  }

  if (chartEmptyState) {
    chartEmptyState.hidden = true;
  }

  const labels = safeCurve.map((entry) => formatChartLabel(entry.date));
  const data = safeCurve.map((entry) => Number(entry.value ?? entry.equity));

  if (equityChart) {
    equityChart.destroy();
  }

  equityChart = new Chart(chartElement, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: t("chart.datasetLabel"),
          data,
          borderColor: "#C8A96B",
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;

            if (!chartArea) {
              return "rgba(200, 169, 107, 0.12)";
            }

            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, "rgba(200, 169, 107, 0.28)");
            gradient.addColorStop(1, "rgba(200, 169, 107, 0)");
            return gradient;
          },
          fill: true,
          tension: 0.36,
          borderWidth: 2.8,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "#F8FAFC",
          pointHoverBorderColor: "#C8A96B",
          pointHoverBorderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1200,
        easing: "easeOutQuart"
      },
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: "rgba(11, 18, 32, 0.96)",
          borderColor: "rgba(200, 169, 107, 0.22)",
          borderWidth: 1,
          titleColor: "#F8FAFC",
          bodyColor: "#94A3B8",
          displayColors: false,
          padding: 14,
          callbacks: {
            label(context) {
              return `${t("chart.tooltipEquity")}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: "rgba(255, 255, 255, 0.045)",
            drawBorder: false
          },
          ticks: {
            color: "#94A3B8",
            font: {
              family: "Inter",
              size: 12
            }
          },
          border: {
            display: false
          }
        },
        y: {
          grid: {
            color: "rgba(255, 255, 255, 0.045)",
            drawBorder: false
          },
          ticks: {
            color: "#94A3B8",
            font: {
              family: "Inter",
              size: 12
            },
            callback(value) {
              return formatCompactCurrency(value);
            }
          },
          border: {
            display: false
          }
        }
      }
    }
  });
}

function metricLabel(sectionKey, metricId) {
  return t(`${sectionKey}.${metricId}.label`);
}

function metricNote(sectionKey, metricId) {
  return t(`${sectionKey}.${metricId}.note`);
}

function formatMetricValue(metric) {
  if (!metric || metric.rawValue === null || metric.rawValue === undefined || metric.rawValue === "") {
    return t("ui.na");
  }

  switch (metric.format) {
    case "percentSigned":
      return formatPercentSigned(metric.rawValue);
    case "percentPlain":
      return formatPercentPlain(metric.rawValue);
    case "currency":
      return formatCurrency(metric.rawValue);
    case "integer":
      return formatInteger(metric.rawValue);
    case "decimal":
      return formatDecimal(metric.rawValue);
    case "ratio":
      return formatRatio(metric.rawValue);
    case "date":
      return formatDate(metric.rawValue);
    default:
      return String(metric.rawValue);
  }
}

function formatTradeResult(trade) {
  if (trade.resultText) {
    return localizedValue(trade.resultText);
  }

  if (trade.resultValue === null || trade.resultValue === undefined || trade.resultValue === "") {
    return t("ui.na");
  }

  return formatSignedDecimal(trade.resultValue);
}

function formatTradeRr(trade) {
  if (trade.rrText) {
    return localizedValue(trade.rrText);
  }

  if (trade.rrValue === null || trade.rrValue === undefined || trade.rrValue === "") {
    return t("ui.na");
  }

  return formatRatio(trade.rrValue);
}

function localizedValue(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value[appState.language] || value.pl || value.en || "";
  }
  return value ?? "";
}

function t(path) {
  const bundle = appState.translations?.[appState.language];
  if (!bundle) {
    return path;
  }

  const value = path.split(".").reduce((current, key) => {
    if (current && Object.prototype.hasOwnProperty.call(current, key)) {
      return current[key];
    }
    return undefined;
  }, bundle);

  return typeof value === "string" ? value : path;
}

function getToneClass(tone) {
  switch (tone) {
    case "positive":
      return "tone-positive";
    case "negative":
      return "tone-negative";
    default:
      return "tone-neutral";
  }
}

function setupSmoothScroll() {
  const links = document.querySelectorAll('.nav a[href^="#"], .brand[href^="#"], .button[href^="#"]');

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");
      const target = targetId ? document.querySelector(targetId) : null;

      if (!target) {
        return;
      }

      event.preventDefault();

      const headerOffset = document.querySelector(".topbar")?.offsetHeight || 0;
      const targetTop = target.getBoundingClientRect().top + window.scrollY - headerOffset - 12;

      window.scrollTo({
        top: targetTop,
        behavior: "smooth"
      });
    });
  });
}

function setupRevealAnimations() {
  const revealItems = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -40px 0px"
    }
  );

  revealItems.forEach((item) => observer.observe(item));
}

function renderFatalState() {
  const terminalMeta = document.getElementById("terminalMeta");
  if (terminalMeta) {
    terminalMeta.textContent = "Unable to load dashboard files.";
  }
}

function buildEmptyData() {
  return normalizeDashboardData({});
}

function normalizeDashboardData(rawData) {
  const data = rawData && typeof rawData === "object" ? rawData : {};
  const meta = data.meta && typeof data.meta === "object" ? data.meta : {};

  return {
    meta: {
      hasData: Boolean(meta.hasData),
      hasHistoryData: Boolean(meta.hasHistoryData),
      hasTradesData: Boolean(meta.hasTradesData),
      strategy: meta.strategy || "MICRO CTA",
      generatedAt: meta.generatedAt || null,
      updatedAt: meta.updatedAt || null,
      warnings: Array.isArray(meta.warnings) ? meta.warnings : []
    },
    performanceStats: normalizePerformanceStats(data.performanceStats),
    heroMetrics: ensureMetricGroup(data.heroMetrics, METRIC_GROUP_DEFAULTS.heroMetrics),
    dashboardStats: ensureMetricGroup(data.dashboardStats, METRIC_GROUP_DEFAULTS.dashboardStats),
    chartSummary: ensureMetricGroup(data.chartSummary, METRIC_GROUP_DEFAULTS.chartSummary),
    advancedMetrics: ensureMetricGroup(data.advancedMetrics, METRIC_GROUP_DEFAULTS.advancedMetrics),
    equityCurve: normalizeEquityCurve(data.equityCurve),
    monthlyReturns: normalizeMonthlyReturns(data.monthlyReturns),
    recentTrades: normalizeTrades(data.recentTrades)
  };
}

function normalizePerformanceStats(stats) {
  const source = stats && typeof stats === "object" ? stats : {};
  return {
    totalTrades: normalizeNumberOrNull(source.totalTrades),
    winningTrades: normalizeNumberOrNull(source.winningTrades),
    losingTrades: normalizeNumberOrNull(source.losingTrades),
    averageWinR: normalizeNumberOrNull(source.averageWinR),
    averageLossR: normalizeNumberOrNull(source.averageLossR),
    losingStreak: normalizeNumberOrNull(source.losingStreak)
  };
}

function ensureMetricGroup(items, defaults) {
  const source = Array.isArray(items) ? items : [];
  const byId = new Map(source.filter((item) => item && item.id).map((item) => [item.id, item]));

  return defaults.map((spec) => {
    const existing = byId.get(spec.id);
    if (!existing) {
      return {
        id: spec.id,
        rawValue: null,
        format: spec.format,
        tone: "neutral"
      };
    }

    return {
      id: existing.id || spec.id,
      rawValue: existing.rawValue ?? null,
      format: existing.format || spec.format,
      tone: existing.tone || "neutral"
    };
  });
}

function normalizeEquityCurve(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => item && item.date)
    .map((item) => ({
      date: item.date,
      value: normalizeNumberOrNull(item.value ?? item.equity),
      equity: normalizeNumberOrNull(item.equity ?? item.value),
      balance: normalizeNumberOrNull(item.balance),
      drawdownPct: normalizeNumberOrNull(item.drawdownPct),
      profitLoss: normalizeNumberOrNull(item.profitLoss)
    }))
    .filter((item) => item.value !== null);
}

function normalizeMonthlyReturns(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => item && item.month)
    .map((item) => ({
      month: item.month,
      returnPct: normalizeNumberOrNull(item.returnPct)
    }))
    .filter((item) => item.returnPct !== null);
}

function normalizeTrades(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => item && item.date)
    .map((item) => ({
      date: item.date,
      instrument: cleanDisplayText(item.instrument),
      direction: normalizeTradeDirection(item.direction),
      resultValue: normalizeNumberOrNull(item.resultValue),
      resultText: cleanDisplayText(item.resultText),
      rrValue: normalizeNumberOrNull(item.rrValue),
      rrText: cleanDisplayText(item.rrText),
      status: normalizeTradeStatus(item.status),
      notes: cleanDisplayText(item.notes)
    }));
}

function normalizeNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cleanDisplayText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTradeDirection(direction) {
  return direction === "long" || direction === "short" ? direction : "unknown";
}

function normalizeTradeStatus(status) {
  if (status === "active" || status === "closed" || status === "cancelled") {
    return status;
  }
  return "unknown";
}

function formatDate(value) {
  if (!value) {
    return t("ui.na");
  }

  const parsed = parseDateValue(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(currentLocale()).format(parsed);
}

function formatMonth(value) {
  if (!value) {
    return t("ui.na");
  }

  const parsed = parseDateValue(`${value}-01`);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(currentLocale(), {
    month: "short",
    year: "numeric"
  }).format(parsed);
}

function formatChartLabel(value) {
  if (!value) {
    return "";
  }

  const parsed = parseDateValue(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(currentLocale(), {
    month: "short",
    year: "2-digit"
  }).format(parsed);
}

function formatCurrency(value) {
  return new Intl.NumberFormat(currentLocale(), {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatCompactCurrency(value) {
  const number = Number(value || 0);

  if (Math.abs(number) >= 1000) {
    return `${Math.round(number / 1000)}k`;
  }

  return String(Math.round(number));
}

function formatPercentSigned(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return t("ui.na");
  }
  const sign = number > 0 ? "+" : "";
  return `${sign}${formatNumber(number, 1)}%`;
}

function formatPercentPlain(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return t("ui.na");
  }
  return `${formatNumber(number, 1)}%`;
}

function formatRatio(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return t("ui.na");
  }
  return `1:${formatNumber(number, 1)}`;
}

function formatDecimal(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return t("ui.na");
  }
  return formatNumber(number, 2);
}

function formatSignedDecimal(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return t("ui.na");
  }
  const sign = number > 0 ? "+" : "";
  return `${sign}${formatNumber(number, 2)}`;
}

function formatInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return t("ui.na");
  }
  return new Intl.NumberFormat(currentLocale(), {
    maximumFractionDigits: 0
  }).format(number);
}

function formatNumber(value, digits) {
  return new Intl.NumberFormat(currentLocale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

function parseDateValue(value) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }

  return new Date(value);
}

function currentLocale() {
  return appState.language === "pl" ? "pl-PL" : "en-GB";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeHtmlClass(value) {
  return String(value ?? "unknown").replace(/[^a-z0-9_-]/gi, "");
}
