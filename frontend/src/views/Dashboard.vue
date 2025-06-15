<template>
  <div class="dashboard-bg">
    <div style="height: 32px"></div>
    <div class="dashboard-center">
      <div class="dashboard-container">
        <div class="hero-section">
          <div class="hero-content">
            <h1 class="hero-title">Dashboard</h1>
            <p class="hero-subtitle">Przegląd Twoich płatności i statystyk</p>
          </div>
          <div class="hero-metrics">
            <div class="metric-card primary">
              <div class="metric-icon">💰</div>
              <div class="metric-info">
                <div class="metric-value" id="totalRevenue">Ładowanie...</div>
                <div class="metric-label">Łączne przychody</div>
              </div>
            </div>
            <div class="metric-card success">
              <div class="metric-icon">✅</div>
              <div class="metric-info">
                <div class="metric-value" id="successfulTransactions">
                  Ładowanie...
                </div>
                <div class="metric-label">Udane transakcje</div>
              </div>
            </div>
            <div class="metric-card warning">
              <div class="metric-icon">⏳</div>
              <div class="metric-info">
                <div class="metric-value" id="pendingTransactions">
                  Ładowanie...
                </div>
                <div class="metric-label">Oczekujące</div>
              </div>
            </div>
            <div class="metric-card info">
              <div class="metric-icon">📊</div>
              <div class="metric-info">
                <div class="metric-value" id="totalTransactions">
                  Ładowanie...
                </div>
                <div class="metric-label">Wszystkie transakcje</div>
              </div>
            </div>
          </div>
        </div>

        <div class="charts-section">
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">Transakcje według statusu</h3>
              <p class="chart-description">
                Przegląd statusów transakcji z ostatnich 5 godzin
              </p>
            </div>
            <div class="chart-container">
              <canvas id="salesChart"></canvas>
            </div>
          </div>
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">Przychody dzienne</h3>
              <p class="chart-description">Rozkład przychodów według walut</p>
            </div>
            <div class="chart-container">
              <canvas id="barChart"></canvas>
            </div>
          </div>
        </div>

        <div class="info-section">
          <div class="info-card">
            <div class="info-header">
              <h4 class="info-title">Ostatnia aktywność</h4>
            </div>
            <div class="info-content">
              <div class="activity-item">
                <div class="activity-icon">🔄</div>
                <div class="activity-details">
                  <span class="activity-action">Nowa transakcja</span>
                  <span class="activity-time" id="lastActivityTime"
                    >Ładowanie...</span
                  >
                </div>
              </div>
            </div>
          </div>

          <div class="info-card">
            <div class="info-header">
              <h4 class="info-title">Popularne waluty</h4>
            </div>
            <div class="info-content">
              <div class="currency-list" id="currencyStats">
                <div class="currency-item">
                  <span class="currency-code">PLN</span>
                  <span class="currency-percentage">Ładowanie...</span>
                </div>
              </div>
            </div>
          </div>

          <div class="info-card">
            <div class="info-header">
              <h4 class="info-title">Szybkie akcje</h4>
            </div>
            <div class="info-content">
              <div class="action-buttons">
                <router-link
                  to="/create-payment-link"
                  class="action-btn primary"
                >
                  <span class="action-icon">➕</span>
                  Nowy link płatności
                </router-link>
                <router-link to="/transactions" class="action-btn secondary">
                  <span class="action-icon">📋</span>
                  Zobacz transakcje
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <AppFooter />
  </div>
</template>

<script>
import { onMounted } from "vue";
import Chart from "chart.js/auto";
import AppFooter from "../components/AppFooter.vue";
import apiClient from "../api/axios";

export default {
  name: "DashboardPage",
  components: { AppFooter },
  setup() {
    const formatCurrency = (amount, currency = "PLN") => {
      return new Intl.NumberFormat("pl-PL", {
        style: "currency",
        currency: currency,
      }).format(amount);
    };
    const updateMetrics = (data) => {
      const totalRevenue = data.daily
        .filter((row) => row.status === "Success")
        .reduce((sum, row) => sum + Number(row.total), 0);

      const successCount = data.monthly
        .filter((row) => row.status === "Success")
        .reduce((sum, row) => sum + row.count, 0);

      const pendingCount = data.monthly
        .filter((row) => row.status === "Pending")
        .reduce((sum, row) => sum + row.count, 0);
      const totalCount = data.monthly.reduce((sum, row) => sum + row.count, 0);

      document.getElementById("totalRevenue").textContent =
        formatCurrency(totalRevenue);
      document.getElementById("successfulTransactions").textContent =
        successCount.toString();
      document.getElementById("pendingTransactions").textContent =
        pendingCount.toString();
      document.getElementById("totalTransactions").textContent =
        totalCount.toString();
      document.getElementById("lastActivityTime").textContent = "Dzisiaj";

      const currencyStats = {};
      data.daily.forEach((row) => {
        if (!currencyStats[row.currency]) {
          currencyStats[row.currency] = 0;
        }
        currencyStats[row.currency] += Number(row.total);
      });

      const totalAmount = Object.values(currencyStats).reduce(
        (sum, amount) => sum + amount,
        0
      );
      const currencyStatsEl = document.getElementById("currencyStats");
      currencyStatsEl.innerHTML = "";

      Object.entries(currencyStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .forEach(([currency, amount]) => {
          const percentage =
            totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : "0";
          const div = document.createElement("div");
          div.className = "currency-item";
          div.innerHTML = `
            <span class="currency-code">${currency}</span>
            <span class="currency-percentage">${percentage}%</span>
          `;
          currencyStatsEl.appendChild(div);
        });
    };

    onMounted(async () => {
      try {
        const token = localStorage.getItem("token");
        const { data } = await apiClient.get("/merchant/dashboard/summary", {
          headers: { Authorization: `Bearer ${token}` },
        });
        updateMetrics(data);
        const statuses = ["Pending", "Failed", "Cancelled", "Success"];
        const statusColors = {
          Pending: "#f59e0b",
          Failed: "#ef4444",
          Cancelled: "#6b7280",
          Success: "#10b981",
        };
        const statusLabels = {
          Pending: "Oczekująca",
          Failed: "Nieudana",
          Cancelled: "Anulowana",
          Success: "Opłacona",
        };

        const now = new Date();
        const intervalLabels = [];
        const intervalData = {};
        const intervalCount = 10;

        for (let i = intervalCount - 1; i >= 0; i--) {
          const intervalTime = new Date(now.getTime() - i * 30 * 60 * 1000);

          const minutes = intervalTime.getMinutes();
          const roundedMinutes = minutes < 30 ? 0 : 30;
          intervalTime.setMinutes(roundedMinutes, 0, 0);

          const intervalLabel = intervalTime.toLocaleTimeString("pl-PL", {
            hour: "2-digit",
            minute: "2-digit",
          });
          intervalLabels.push(intervalLabel);
        }

        statuses.forEach((status) => {
          intervalData[status] = Array(intervalCount).fill(0);
        });

        if (data.hourly) {
          data.hourly.forEach((row) => {
            if (statuses.includes(row.status)) {
              const intervalIndex = intervalLabels.findIndex(
                (label) => label === row.time_interval
              );
              if (intervalIndex !== -1) {
                intervalData[row.status][intervalIndex] = row.count;
              }
            }
          });
        }
        const ctx = document.getElementById("salesChart").getContext("2d");
        new Chart(ctx, {
          type: "bar",
          data: {
            labels: intervalLabels,
            datasets: statuses.map((status) => ({
              label: statusLabels[status],
              data: intervalData[status],
              backgroundColor: statusColors[status],
              borderColor: statusColors[status],
              borderWidth: 0,
              borderRadius: 0,
              borderSkipped: false,
            })),
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "top",
                labels: {
                  color: "#374151",
                  font: { size: 14, weight: "500" },
                  padding: 20,
                  usePointStyle: true,
                },
              },
              tooltip: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleColor: "#fff",
                bodyColor: "#fff",
                borderColor: "#ff6600",
                borderWidth: 1,
                cornerRadius: 8,
                displayColors: true,
                callbacks: {
                  title: function (context) {
                    return `${context[0].label}`;
                  },
                  label: function (context) {
                    return `${context.dataset.label}: ${context.parsed.y}`;
                  },
                },
              },
            },
            scales: {
              x: {
                stacked: true,
                ticks: {
                  color: "#6b7280",
                  font: { size: 11 },
                  maxRotation: 45,
                  minRotation: 0,
                },
                grid: { display: false },
                border: { color: "#d1d5db" },
              },
              y: {
                stacked: true,
                ticks: {
                  color: "#6b7280",
                  font: { size: 12 },
                  stepSize: 1,
                },
                grid: { color: "#e5e7eb", borderDash: [3, 3] },
                border: { color: "#d1d5db" },
                beginAtZero: true,
              },
            },
            interaction: {
              intersect: false,
              mode: "index",
            },
            elements: {
              bar: {
                borderWidth: 0,
              },
            },
          },
        });

        const currencyRevenue = {};
        const dailySuccess = data.daily.filter(
          (row) => row.status === "Success"
        );

        dailySuccess.forEach((row) => {
          if (!currencyRevenue[row.currency]) {
            currencyRevenue[row.currency] = 0;
          }
          currencyRevenue[row.currency] += Number(row.total);
        });

        const currencies = Object.keys(currencyRevenue);
        const revenues = Object.values(currencyRevenue);
        const pieColors = [
          "#10b981",
          "#ff6600",
          "#3b82f6",
          "#8b5cf6",
          "#f59e0b",
          "#ef4444",
          "#06b6d4",
          "#84cc16",
        ];

        const barCtx = document.getElementById("barChart").getContext("2d");
        new Chart(barCtx, {
          type: "pie",
          data: {
            labels: currencies,
            datasets: [
              {
                data: revenues,
                backgroundColor: pieColors.slice(0, currencies.length),
                borderColor: "#fff",
                borderWidth: 3,
                hoverBorderWidth: 5,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  color: "#374151",
                  font: { size: 14, weight: "500" },
                  padding: 15,
                  usePointStyle: true,
                },
              },
              tooltip: {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                titleColor: "#fff",
                bodyColor: "#fff",
                borderColor: "#ff6600",
                borderWidth: 1,
                cornerRadius: 8,
                callbacks: {
                  label: function (context) {
                    const currency = context.label;
                    const value = context.parsed;
                    const total = context.dataset.data.reduce(
                      (a, b) => a + b,
                      0
                    );
                    const percentage = ((value / total) * 100).toFixed(1);
                    return `${currency}: ${formatCurrency(
                      value,
                      currency
                    )} (${percentage}%)`;
                  },
                },
              },
            },
            animation: {
              animateRotate: true,
              animateScale: false,
            },
            elements: {
              arc: {
                borderJoinStyle: "round",
              },
            },
          },
        });
      } catch (error) {
        document.getElementById("totalRevenue").textContent = "Błąd";
        document.getElementById("successfulTransactions").textContent = "Błąd";
        document.getElementById("pendingTransactions").textContent = "Błąd";
        document.getElementById("totalTransactions").textContent = "Błąd";
        document.getElementById("lastActivityTime").textContent = "Błąd";
      }
    });
  },
};
</script>

<style scoped>
.dashboard-bg {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
  position: relative;
  display: flex;
  flex-direction: column;
  font-family: "Inter", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

.dashboard-center {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 0 20px;
}

.dashboard-container {
  width: 100%;
  max-width: 1400px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.hero-section {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 2.5rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.hero-content {
  text-align: center;
  margin-bottom: 2rem;
}

.hero-title {
  font-size: 3rem;
  font-weight: 800;
  background: linear-gradient(135deg, #ff6600, #ff8533);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.5rem 0;
  letter-spacing: -1px;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: #6b7280;
  font-weight: 400;
  margin: 0;
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.metric-card {
  background: #fff;
  border-radius: 16px;
  padding: 2rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  border: 2px solid transparent;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.metric-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, currentColor, transparent);
  opacity: 0.8;
}

.metric-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
}

.metric-card.primary {
  color: #ff6600;
}
.metric-card.success {
  color: #10b981;
}
.metric-card.warning {
  color: #f59e0b;
}
.metric-card.info {
  color: #3b82f6;
}

.metric-icon {
  font-size: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 12px;
}

.metric-info {
  flex: 1;
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.25rem;
  line-height: 1;
}

.metric-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.charts-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.chart-card {
  background: #fff;
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.chart-header {
  margin-bottom: 1.5rem;
}

.chart-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.chart-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.chart-container {
  position: relative;
  height: 350px;
}

.info-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

.info-card {
  background: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.info-header {
  margin-bottom: 1rem;
}

.info-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.info-content {
  color: #6b7280;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 12px;
}

.activity-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  background: #fff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.activity-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.activity-action {
  font-weight: 600;
  color: #374151;
}

.activity-time {
  font-size: 0.875rem;
  color: #9ca3af;
}

.currency-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.currency-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 8px;
}

.currency-code {
  font-weight: 600;
  color: #374151;
  font-family: "Courier New", monospace;
}

.currency-percentage {
  font-weight: 600;
  color: #10b981;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.action-btn.primary {
  background: linear-gradient(135deg, #ff6600, #ff8533);
  color: #fff;
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 102, 0, 0.3);
}

.action-btn.secondary {
  background: #f3f4f6;
  color: #374151;
  border-color: #e5e7eb;
}

.action-btn.secondary:hover {
  background: #e5e7eb;
  transform: translateY(-1px);
}

.action-icon {
  font-size: 1rem;
}

@media (max-width: 1024px) {
  .charts-section {
    grid-template-columns: 1fr;
  }

  .hero-metrics {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }
}

@media (max-width: 768px) {
  .dashboard-container {
    gap: 1.5rem;
  }

  .hero-section {
    padding: 1.5rem;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1.125rem;
  }

  .hero-metrics {
    grid-template-columns: 1fr;
  }

  .metric-card {
    padding: 1.5rem;
    gap: 1rem;
  }

  .metric-icon {
    width: 48px;
    height: 48px;
    font-size: 1.75rem;
  }

  .metric-value {
    font-size: 1.5rem;
  }

  .chart-card {
    padding: 1.5rem;
  }

  .chart-container {
    height: 280px;
  }

  .info-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 2rem;
  }

  .metric-value {
    font-size: 1.25rem;
  }

  .chart-container {
    height: 240px;
  }
}

.loading-state {
  color: #9ca3af;
  font-style: italic;
}

.error-state {
  color: #ef4444;
  font-weight: 600;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-section,
.chart-card,
.info-card {
  animation: fadeInUp 0.6s ease-out;
}

.chart-card:nth-child(2) {
  animation-delay: 0.1s;
}

.info-card:nth-child(2) {
  animation-delay: 0.2s;
}

.info-card:nth-child(3) {
  animation-delay: 0.3s;
}
</style>
