document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll('.nav a[href^="#"], .brand[href^="#"]');

  navLinks.forEach((link) => {
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

  const revealItems = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
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
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  const chartElement = document.getElementById("equityChart");

  if (chartElement && typeof Chart !== "undefined") {
    const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
    const data = [100, 105, 112, 109, 118, 129, 140, 136, 151];

    new Chart(chartElement, {
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
            padding: 14
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
});
