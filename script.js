let equityChart;

document.addEventListener("DOMContentLoaded", () => {
  initializeDashboard().catch((error) => {
    console.error("Nie udało się zainicjalizować dashboardu:", error);
    renderErrorState();
  });
});

async function initializeDashboard() {
  setupSmoothScroll();
  setupRevealAnimations();

  const dashboardData = await loadDashboardData();

  renderTerminalMeta(dashboardData.meta, dashboardData.performanceStats);
  renderMetricCards("heroMetrics", dashboardData.heroMetrics, buildHeroMetricCard);
  renderMetricCards("dashboardStats", dashboardData.dashboardStats, buildOverviewCard);
  renderMetricCards("chartSummary", dashboardData.chartSummary, buildMiniStatCard);
  renderMetricCards("advancedMetrics", dashboardData.advancedMetrics, buildAdvancedMetricCard);
  renderMonthlySummary(dashboardData.monthlyReturns || []);
  renderMonthlyTable(dashboardData.monthlyReturns || []);
  renderTradesTable(dashboardData.recentTrades || []);
  renderFooterMeta(dashboardData.meta);
  initializeEquityChart(dashboardData.equityCurve || []);
}

async function loadDashboardData() {
  const response = await fetch("data.json", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Błąd ładowania data.json: ${response.status}`);
  }

  return response.json();
}

function renderTerminalMeta(meta = {}, performanceStats = {}) {
  const terminalMeta = document.getElementById("terminalMeta");
  if (!terminalMeta) {
    return;
  }

  const updateText = meta.updatedAt ? `Aktualizacja: ${formatDate(meta.updatedAt)}` : "Aktualizacja danych w toku";
  const tradesText = performanceStats.totalTrades ? `Liczba transakcji: ${performanceStats.totalTrades}` : "Liczba transakcji: n/d";
  const streakText = performanceStats.losingStreak ? `Seria strat: ${performanceStats.losingStreak}` : "Seria strat: n/d";

  terminalMeta.textContent = `${updateText} | ${tradesText} | ${streakText}`;
}

function renderFooterMeta(meta = {}) {
  const footerMeta = document.getElementById("footerMeta");
  if (!footerMeta) {
    return;
  }

  const strategy = meta.strategy || "MICRO CTA";
  const updateDate = meta.updatedAt ? formatDate(meta.updatedAt) : "brak daty";
  footerMeta.textContent = `Systematic Trading Research | ${strategy} | Aktualizacja ${updateDate}`;
}

function renderMetricCards(containerId, items, templateBuilder) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = '<div class="empty-state">Brak danych do wyświetlenia.</div>';
    return;
  }

  container.innerHTML = items.map((item, index) => templateBuilder(item, index)).join("");
}

function buildHeroMetricCard(item, index) {
  return `
    <article class="kpi-card">
      <span class="card-index">${String(index + 1).padStart(2, "0")}</span>
      <span class="kpi-label">${escapeHtml(item.label || "")}</span>
      <strong class="kpi-value ${getToneClass(item.tone)}">${escapeHtml(item.value || "n/d")}</strong>
      <p>${escapeHtml(item.note || "")}</p>
    </article>
  `;
}

function buildOverviewCard(item) {
  return `
    <article class="overview-card">
      <span>${escapeHtml(item.label || "")}</span>
      <strong class="overview-value ${getToneClass(item.tone)}">${escapeHtml(item.value || "n/d")}</strong>
      <p>${escapeHtml(item.note || "")}</p>
    </article>
  `;
}

function buildMiniStatCard(item) {
  return `
    <div class="mini-stat">
      <span>${escapeHtml(item.label || "")}</span>
      <strong class="${getToneClass(item.tone)}">${escapeHtml(item.value || "n/d")}</strong>
    </div>
  `;
}

function buildAdvancedMetricCard(item) {
  return `
    <article class="stat-card">
      <span>${escapeHtml(item.label || "")}</span>
      <strong class="stat-value ${getToneClass(item.tone)}">${escapeHtml(item.value || "n/d")}</strong>
      <p>${escapeHtml(item.note || "")}</p>
    </article>
  `;
}

function renderMonthlySummary(monthlyReturns) {
  const container = document.getElementById("monthlySummary");
  if (!container) {
    return;
  }

  if (!Array.isArray(monthlyReturns) || monthlyReturns.length === 0) {
    container.innerHTML = '<div class="empty-state">Brak miesięcznych stóp zwrotu.</div>';
    return;
  }

  const positiveMonths = monthlyReturns.filter((item) => Number(item.return) > 0);
  const averageReturn = monthlyReturns.reduce((sum, item) => sum + Number(item.return || 0), 0) / monthlyReturns.length;
  const bestMonth = monthlyReturns.reduce((best, item) => Number(item.return) > Number(best.return) ? item : best, monthlyReturns[0]);
  const worstMonth = monthlyReturns.reduce((worst, item) => Number(item.return) < Number(worst.return) ? item : worst, monthlyReturns[0]);

  const summaryItems = [
    {
      label: "Najlepszy miesiąc",
      value: `${formatSignedNumber(bestMonth.return)}%`,
      tone: bestMonth.return >= 0 ? "positive" : "negative",
      note: formatMonth(bestMonth.month)
    },
    {
      label: "Najsłabszy miesiąc",
      value: `${formatSignedNumber(worstMonth.return)}%`,
      tone: worstMonth.return >= 0 ? "positive" : "negative",
      note: formatMonth(worstMonth.month)
    },
    {
      label: "Średni miesiąc",
      value: `${formatSignedNumber(averageReturn)}%`,
      tone: averageReturn >= 0 ? "positive" : "negative",
      note: "Średnia arytmetyczna okresu"
    },
    {
      label: "Miesiące dodatnie",
      value: `${positiveMonths.length}/${monthlyReturns.length}`,
      tone: "neutral",
      note: "Udział miesięcy zakończonych na plusie"
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
    container.innerHTML = '<tr><td colspan="4" class="muted-cell">Brak danych miesięcznych.</td></tr>';
    return;
  }

  let cumulative = 1;

  container.innerHTML = monthlyReturns.map((item) => {
    const monthReturn = Number(item.return || 0);
    cumulative *= 1 + monthReturn / 100;
    const cumulativePct = (cumulative - 1) * 100;
    const toneClass = monthReturn >= 0 ? "tone-positive" : "tone-negative";
    const assessment = monthReturn >= 0 ? "Miesiąc dodatni" : "Miesiąc ujemny";

    return `
      <tr>
        <td>${escapeHtml(formatMonth(item.month))}</td>
        <td class="${toneClass}">${escapeHtml(formatSignedNumber(monthReturn))}%</td>
        <td class="${cumulativePct >= 0 ? "tone-positive" : "tone-negative"}">${escapeHtml(formatSignedNumber(cumulativePct))}%</td>
        <td class="muted-cell">${assessment}</td>
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
    container.innerHTML = '<tr><td colspan="7" class="muted-cell">Brak historii transakcji.</td></tr>';
    return;
  }

  container.innerHTML = trades.map((trade) => {
    const resultNumber = parseSignedMetric(trade.result);
    const resultClass = Number.isFinite(resultNumber) ? (resultNumber >= 0 ? "tone-positive" : "tone-negative") : "";
    const directionClass = String(trade.direction || "").toLowerCase() === "short" ? "pill-short" : "pill-long";
    const normalizedStatus = slugify(trade.status || "");
    const rrText = trade.rr || "n/d";

    return `
      <tr>
        <td>${escapeHtml(formatDate(trade.date))}</td>
        <td>${escapeHtml(trade.instrument || "n/d")}</td>
        <td><span class="pill ${directionClass}">${escapeHtml(trade.direction || "n/d")}</span></td>
        <td class="${resultClass}">${escapeHtml(trade.result || "n/d")}</td>
        <td class="muted-cell">${escapeHtml(rrText)}</td>
        <td><span class="pill pill-status-${normalizedStatus}">${escapeHtml(trade.status || "n/d")}</span></td>
        <td class="notes-cell">${escapeHtml(trade.notes || "")}</td>
      </tr>
    `;
  }).join("");
}

function initializeEquityChart(equityCurve) {
  const chartElement = document.getElementById("equityChart");
  if (!chartElement || typeof Chart === "undefined") {
    return;
  }

  if (!Array.isArray(equityCurve) || equityCurve.length === 0) {
    return;
  }

  const labels = equityCurve.map((entry) => formatChartLabel(entry.date));
  const data = equityCurve.map((entry) => Number(entry.equity || 0));

  if (equityChart) {
    equityChart.destroy();
  }

  equityChart = new Chart(chartElement, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Equity Curve",
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
              return `Kapitał: ${formatCurrency(context.parsed.y)}`;
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

function renderErrorState() {
  renderMetricCards("heroMetrics", [{ label: "Błąd danych", value: "n/d", tone: "negative", note: "Nie udało się wczytać data.json." }], buildHeroMetricCard);
  renderMetricCards("dashboardStats", [{ label: "Status", value: "Brak danych", tone: "negative", note: "Sprawdź plik data.json." }], buildOverviewCard);
  renderMetricCards("chartSummary", [{ label: "Status", value: "Offline", tone: "negative" }], buildMiniStatCard);
  renderMetricCards("advancedMetrics", [{ label: "Dane", value: "n/d", tone: "negative", note: "Brak połączenia z warstwą danych." }], buildAdvancedMetricCard);
  renderMonthlySummary([]);
  renderMonthlyTable([]);
  renderTradesTable([]);

  const terminalMeta = document.getElementById("terminalMeta");
  if (terminalMeta) {
    terminalMeta.textContent = "Nie udało się załadować pliku data.json. Upewnij się, że plik istnieje i ma poprawny format.";
  }
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

function formatDate(value) {
  if (!value) {
    return "n/d";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("pl-PL").format(parsed);
}

function formatMonth(value) {
  if (!value) {
    return "n/d";
  }

  const parsed = new Date(`${value}-01`);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("pl-PL", {
    month: "short",
    year: "numeric"
  }).format(parsed);
}

function formatChartLabel(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("pl-PL", {
    month: "short",
    year: "2-digit"
  }).format(parsed);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pl-PL", {
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

function formatSignedNumber(value) {
  const number = Number(value || 0);
  const sign = number > 0 ? "+" : "";
  return `${sign}${number.toFixed(1).replace(".", ",")}`;
}

function parseSignedMetric(value) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return Number.NaN;
  }

  const normalized = value.replace(",", ".").replace(/[^0-9.+-]/g, "");
  return Number(normalized);
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
