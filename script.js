const state = {
  chart: null,
  data: null,
  translations: null,
  lang: localStorage.getItem("micro-cta-lang") || document.documentElement.lang || "pl",
};

const els = {
  heroMetrics: document.getElementById("heroMetrics"),
  dashboardStats: document.getElementById("dashboardStats"),
  chartSummary: document.getElementById("chartSummary"),
  advancedMetrics: document.getElementById("advancedMetrics"),
  monthlySummary: document.getElementById("monthlySummary"),
  monthlyReturnsTable: document.getElementById("monthlyReturnsTable"),
  recentTradesTable: document.getElementById("recentTradesTable"),
  terminalMeta: document.getElementById("terminalMeta"),
  footerMeta: document.getElementById("footerMeta"),
  chartCanvas: document.getElementById("equityChart"),
  chartEmptyState: document.getElementById("chartEmptyState"),
  langButtons: Array.from(document.querySelectorAll(".lang-button")),
};

if (els.chartEmptyState) {
  els.chartEmptyState.removeAttribute("data-i18n");
  els.chartEmptyState.textContent = "";
  els.chartEmptyState.remove();
}

const metricGroups = {
  heroMetrics: { container: els.heroMetrics, type: "hero" },
  dashboardStats: { container: els.dashboardStats, type: "dashboard" },
  chartSummary: { container: els.chartSummary, type: "chart" },
  advancedMetrics: { container: els.advancedMetrics, type: "advanced" },
};

async function init() {
  bindLanguageSwitcher();
  setupRevealObserver();

  try {
    const [translations, data] = await Promise.all([
      fetchJson("translations.json"),
      fetchJson("data.json"),
    ]);

    state.translations = translations;
    state.data = data;

    applyLanguage(state.lang);
    render();
  } catch (error) {
    console.error("Failed to initialize dashboard", error);
    state.data = buildEmptyData();
    state.translations = { pl: {}, en: {} };
    applyLanguage(state.lang);
    render();
  }
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }
  return response.json();
}

function buildEmptyData() {
  return {
    meta: {
      generatedAt: null,
      baseCurrency: "PLN",
      warnings: [],
    },
    performanceStats: {},
    heroMetrics: [],
    dashboardStats: [],
    chartSummary: [],
    advancedMetrics: [],
    equityCurve: [],
    monthlyReturns: [],
    recentTrades: [],
  };
}

function bindLanguageSwitcher() {
  els.langButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyLanguage(button.dataset.lang || "pl");
      render();
    });
  });
}

function applyLanguage(lang) {
  state.lang = state.translations && state.translations[lang] ? lang : "pl";
  document.documentElement.lang = state.lang;
  localStorage.setItem("micro-cta-lang", state.lang);

  els.langButtons.forEach((button) => {
    const active = button.dataset.lang === state.lang;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  applyTranslations();
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const value = t(node.dataset.i18n);
    node.textContent = value;

    if (node.tagName === "P") {
      node.hidden = value === "";
    }
  });

  document.querySelectorAll("[data-i18n-content]").forEach((node) => {
    node.setAttribute("content", t(node.dataset.i18nContent));
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
  });
}

function render() {
  renderMetricGroup("heroMetrics", state.data.heroMetrics);
  renderMetricGroup("dashboardStats", state.data.dashboardStats);
  renderMetricGroup("chartSummary", state.data.chartSummary);
  renderMetricGroup("advancedMetrics", state.data.advancedMetrics);
  renderTerminalMeta();
  renderFooterMeta();
  renderMonthlySummary();
  renderMonthlyReturnsTable();
  renderTradesTable();
  renderChart();
}

function renderMetricGroup(groupKey, items) {
  const config = metricGroups[groupKey];
  const metrics = Array.isArray(items) ? items : [];

  if (!config.container) {
    return;
  }

  if (!metrics.length) {
    config.container.innerHTML = "";
    return;
  }

  if (config.type === "hero") {
    config.container.innerHTML = metrics.map(renderHeroMetric).join("");
    return;
  }

  if (config.type === "dashboard") {
    config.container.innerHTML = metrics.map(renderOverviewMetric).join("");
    return;
  }

  if (config.type === "chart") {
    config.container.innerHTML = metrics.map(renderChartMetric).join("");
    return;
  }

  config.container.innerHTML = metrics.map(renderAdvancedMetric).join("");
}

function renderHeroMetric(metric, index) {
  return `
    <article class="kpi-card">
      <span class="card-index">0${index + 1}</span>
      <span class="kpi-label">${escapeHtml(metricLabel("hero", metric.id))}</span>
      <strong class="kpi-value tone-${metric.tone}">${escapeHtml(formatMetricValue(metric))}</strong>
      <p>${escapeHtml(metricNote("hero", metric.id))}</p>
    </article>
  `;
}

function renderOverviewMetric(metric) {
  return `
    <article class="overview-card">
      <span>${escapeHtml(metricLabel("dashboard", metric.id))}</span>
      <strong class="overview-value tone-${metric.tone}">${escapeHtml(formatMetricValue(metric))}</strong>
      <p>${escapeHtml(metricNote("dashboard", metric.id))}</p>
    </article>
  `;
}

function renderChartMetric(metric) {
  return `
    <div class="mini-stat">
      <span>${escapeHtml(metricLabel("chart", metric.id))}</span>
      <strong class="tone-${metric.tone}">${escapeHtml(formatMetricValue(metric))}</strong>
    </div>
  `;
}

function renderAdvancedMetric(metric) {
  return `
    <article class="stat-card">
      <span>${escapeHtml(metricLabel("advanced", metric.id))}</span>
      <strong class="stat-value tone-${metric.tone}">${escapeHtml(formatMetricValue(metric))}</strong>
      <p>${escapeHtml(metricNote("advanced", metric.id))}</p>
    </article>
  `;
}

function renderTerminalMeta() {
  const stats = state.data.performanceStats || {};
  const updated = formatMetricValue({ rawValue: stats.lastUpdate, format: "date" });
  const trades = formatMetricValue({ rawValue: stats.totalTrades, format: "integer" });
  const losingStreak = formatMetricValue({ rawValue: stats.losingStreak, format: "integer" });

  els.terminalMeta.textContent = [
    `${t("terminal.updated")}: ${updated}`,
    `${t("terminal.trades")}: ${trades}`,
    `${t("terminal.losingStreak")}: ${losingStreak}`,
  ].join("  |  ");
}

function renderFooterMeta() {
  const generatedAt = formatMetricValue({
    rawValue: state.data.meta?.generatedAt,
    format: "date",
  });
  els.footerMeta.textContent = `${t("footer.tagline")}  |  ${t("footer.updated")}: ${generatedAt}`;
}

function renderMonthlySummary() {
  const rows = Array.isArray(state.data.monthlyReturns) ? state.data.monthlyReturns : [];
  if (!rows.length) {
    els.monthlySummary.innerHTML = `
      <div class="empty-state">${escapeHtml(t("empty.monthlyReturns"))}</div>
    `;
    return;
  }

  const returns = rows.map((row) => Number(row.return)).filter((value) => Number.isFinite(value));
  const best = rows.reduce((carry, row) => (!carry || row.return > carry.return ? row : carry), null);
  const worst = rows.reduce((carry, row) => (!carry || row.return < carry.return ? row : carry), null);
  const average = returns.length ? returns.reduce((sum, value) => sum + value, 0) / returns.length : null;
  const positiveMonths = returns.filter((value) => value > 0).length;

  const cards = [
    {
      key: "bestMonth",
      value: best ? `${best.month}  |  ${formatValue(best.return, "percentSigned")}` : t("ui.na"),
      note: "",
    },
    {
      key: "worstMonth",
      value: worst ? `${worst.month}  |  ${formatValue(worst.return, "percentSigned")}` : t("ui.na"),
      note: "",
    },
    {
      key: "averageMonth",
      value: formatValue(average, "percentSigned"),
      note: t("monthlySummary.averageMonthNote"),
    },
    {
      key: "positiveMonths",
      value: formatValue(positiveMonths, "integer"),
      note: t("monthlySummary.positiveMonthsNote"),
    },
  ];

  els.monthlySummary.innerHTML = cards
    .map(
      (card) => `
        <article class="monthly-card">
          <span>${escapeHtml(t(`monthlySummary.${card.key}`))}</span>
          <strong class="monthly-value">${escapeHtml(card.value)}</strong>
          <p>${escapeHtml(card.note)}</p>
        </article>
      `
    )
    .join("");
}

function renderMonthlyReturnsTable() {
  const rows = Array.isArray(state.data.monthlyReturns) ? state.data.monthlyReturns : [];
  if (!rows.length) {
    els.monthlyReturnsTable.innerHTML = renderEmptyRow(4, t("empty.monthlyReturns"));
    return;
  }

  els.monthlyReturnsTable.innerHTML = rows
    .map((row) => {
      const positive = Number(row.return) >= 0;
      return `
        <tr>
          <td>${escapeHtml(row.month || t("ui.na"))}</td>
          <td class="${positive ? "positive" : "negative"}">${escapeHtml(formatValue(row.return, "percentSigned"))}</td>
          <td>${escapeHtml(formatValue(row.cumulative, "percentSigned"))}</td>
          <td class="muted-cell">${escapeHtml(t(`tables.monthly.${positive ? "positive" : "negative"}`))}</td>
        </tr>
      `;
    })
    .join("");
}

function renderTradesTable() {
  const trades = Array.isArray(state.data.recentTrades) ? state.data.recentTrades : [];
  if (!trades.length) {
    els.recentTradesTable.innerHTML = renderEmptyRow(7, t("empty.trades"));
    return;
  }

  const visibleTrades = trades
    .slice()
    .sort((left, right) => {
      const leftDate = Date.parse(left?.date || "") || 0;
      const rightDate = Date.parse(right?.date || "") || 0;
      return rightDate - leftDate;
    })
    .slice(0, 10);

  els.recentTradesTable.innerHTML = visibleTrades
    .map(
      (trade) => `
        <tr>
          <td>${escapeHtml(formatValue(trade.date, "date"))}</td>
          <td>${escapeHtml(trade.instrument || t("ui.na"))}</td>
          <td>${renderDirectionPill(trade.direction)}</td>
          <td class="${Number(trade.result) >= 0 ? "positive" : "negative"}">${escapeHtml(formatValue(trade.result, "currency"))}</td>
          <td class="muted-cell">${escapeHtml(formatValue(trade.rr, "ratio"))}</td>
          <td>${renderStatusPill(trade.status)}</td>
          <td class="notes-cell">${escapeHtml(trade.notes || "")}</td>
        </tr>
      `
    )
    .join("");
}

function renderDirectionPill(direction) {
  const key = ["long", "short"].includes(direction) ? direction : "unknown";
  return `<span class="pill pill-${key}">${escapeHtml(t(`directions.${key}`))}</span>`;
}

function renderStatusPill(status) {
  const key = ["active", "closed", "cancelled"].includes(status) ? status : "unknown";
  return `<span class="pill pill-status-${key}">${escapeHtml(t(`statuses.${key}`))}</span>`;
}

function setChartEmptyStateVisible(isVisible) {
  if (!els.chartEmptyState) {
    els.chartCanvas.hidden = isVisible;
    return;
  }

  els.chartCanvas.hidden = isVisible;
  els.chartEmptyState.hidden = !isVisible;
  els.chartEmptyState.setAttribute("aria-hidden", String(!isVisible));
  els.chartEmptyState.style.display = isVisible ? "grid" : "none";
  els.chartEmptyState.style.opacity = isVisible ? "1" : "0";
  els.chartEmptyState.style.visibility = isVisible ? "visible" : "hidden";
  els.chartEmptyState.style.pointerEvents = isVisible ? "auto" : "none";
  els.chartEmptyState.textContent = isVisible ? t("empty.chart") : "";
}

function renderChart() {
  const curve = Array.isArray(state.data.equityCurve) ? state.data.equityCurve : [];
  const hasCurve = curve.length > 0;

  setChartEmptyStateVisible(!hasCurve);

  if (!hasCurve) {
    if (state.chart) {
      state.chart.destroy();
      state.chart = null;
    }
    return;
  }

  const labels = curve.map((point) => formatValue(point.date, "date"));
  const values = curve.map((point) => Number(point.value));

  const chartConfig = {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: t("chart.datasetLabel"),
          data: values,
          borderColor: "#d4b174",
          backgroundColor: "rgba(212, 177, 116, 0.16)",
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
          tension: 0.28,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title(items) {
              return items[0]?.label || "";
            },
            label(context) {
              const point = curve[context.dataIndex];
              const parts = [`${t("chart.tooltipEquity")}: ${formatValue(point.value, "currency")}`];
              if (point.balance != null) {
                parts.push(`Balance: ${formatValue(point.balance, "currency")}`);
              }
              if (point.drawdown != null) {
                parts.push(`DD: ${formatValue(point.drawdown, "percentPlain")}`);
              }
              if (point.status) {
                parts.push(`Status: ${point.status}`);
              }
              return parts;
            },
            afterLabel(context) {
              const point = curve[context.dataIndex];
              return point.notes ? [`Notes: ${point.notes}`] : [];
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(255, 255, 255, 0.05)",
          },
          ticks: {
            color: "rgba(226, 232, 240, 0.72)",
            maxRotation: 0,
            autoSkipPadding: 20,
          },
        },
        y: {
          grid: {
            color: "rgba(255, 255, 255, 0.05)",
          },
          ticks: {
            color: "rgba(226, 232, 240, 0.72)",
            callback(value) {
              return formatValue(value, "currency");
            },
          },
        },
      },
    },
  };

  if (state.chart) {
    state.chart.data = chartConfig.data;
    state.chart.options = chartConfig.options;
    state.chart.update();
    return;
  }

  state.chart = new Chart(els.chartCanvas, chartConfig);
}

function renderEmptyRow(colspan, message) {
  return `<tr><td colspan="${colspan}" class="muted-cell">${escapeHtml(message)}</td></tr>`;
}

function formatMetricValue(metric) {
  return formatValue(metric?.rawValue, metric?.format);
}

function formatValue(value, format) {
  if (value === null || value === undefined || value === "") {
    return t("ui.na");
  }

  switch (format) {
    case "currency":
      return new Intl.NumberFormat(locale(), {
        style: "currency",
        currency: state.data?.meta?.baseCurrency || "PLN",
        maximumFractionDigits: 2,
      }).format(Number(value));
    case "percentSigned":
      return new Intl.NumberFormat(locale(), {
        style: "percent",
        signDisplay: "always",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(value));
    case "percentPlain":
      return new Intl.NumberFormat(locale(), {
        style: "percent",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(value));
    case "integer":
      return new Intl.NumberFormat(locale(), {
        maximumFractionDigits: 0,
      }).format(Number(value));
    case "ratio":
    case "decimal":
      return new Intl.NumberFormat(locale(), {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(value));
    case "date":
      return formatDate(value);
    default:
      return String(value);
  }
}

function formatDate(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const parsedLocal = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat(locale(), {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(parsedLocal);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value || t("ui.na");
  }
  return new Intl.DateTimeFormat(locale(), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

function metricLabel(section, id) {
  return t(`metrics.${section}.${id}.label`);
}

function metricNote(section, id) {
  return t(`metrics.${section}.${id}.note`);
}

function t(path) {
  const dict = state.translations?.[state.lang] || {};
  const fallback = state.translations?.pl || {};
  return getPath(dict, path) ?? getPath(fallback, path) ?? path;
}

function getPath(source, path) {
  return path.split(".").reduce((carry, key) => (carry && key in carry ? carry[key] : undefined), source);
}

function locale() {
  return state.lang === "pl" ? "pl-PL" : "en-US";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setupRevealObserver() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
}

init();
