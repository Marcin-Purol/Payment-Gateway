<template>
  <div class="dashboard-bg">
    <div style="height: 32px"></div>
    <div class="dashboard-center" style="align-items: flex-start">
      <div class="dashboard-card" style="width: 100%; max-width: 1100px">
        <div class="dashboard-logo" style="margin-bottom: 12px">
          <span class="dashboard-logo-text">Statystyki</span>
        </div>
        <div class="dashboard-chart" style="margin-bottom: 32px">
          <canvas id="salesChart"></canvas>
        </div>
        <div class="dashboard-subtitle" style="margin-bottom: 12px">
          Sprzedaż dzienna (waluty)
        </div>
        <div class="dashboard-bar-chart">
          <canvas id="barChart"></canvas>
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
    onMounted(async () => {
      const token = localStorage.getItem("token");
      const { data } = await apiClient.get("/merchant/dashboard/summary", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const months = [
        "Styczeń",
        "Luty",
        "Marzec",
        "Kwiecień",
        "Maj",
        "Czerwiec",
        "Lipiec",
        "Sierpień",
        "Wrzesień",
        "Październik",
        "Listopad",
        "Grudzień",
      ];
      const statuses = ["Pending", "Failed", "Cancelled", "Success"];
      const statusColors = {
        Pending: "#ffcc00",
        Failed: "#ff6b6b",
        Cancelled: "#b3b8d4",
        Success: "#43b384",
      };
      const statusLabels = {
        Pending: "Oczekująca",
        Failed: "Nieudana",
        Cancelled: "Anulowana",
        Success: "Opłacona",
      };

      const monthlyByStatus = {};
      statuses.forEach((status) => {
        monthlyByStatus[status] = Array(12).fill(0);
      });
      data.monthly.forEach((row) => {
        if (statuses.includes(row.status)) {
          monthlyByStatus[row.status][row.month - 1] = row.count;
        }
      });

      const ctx = document.getElementById("salesChart").getContext("2d");
      new Chart(ctx, {
        type: "line",
        data: {
          labels: months,
          datasets: statuses.map((status) => ({
            label: statusLabels[status],
            data: monthlyByStatus[status],
            borderColor: statusColors[status],
            backgroundColor: "rgba(0,0,0,0)",
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: statusColors[status],
          })),
        },
        options: {
          plugins: {
            legend: { labels: { color: "#181c2f" } },
          },
          scales: {
            x: { ticks: { color: "#b3b8d4" }, grid: { color: "#ececec" } },
            y: { ticks: { color: "#b3b8d4" }, grid: { color: "#ececec" } },
          },
        },
      });

      const daysSet = new Set();
      const currencySet = new Set();
      const dailySuccess = data.daily.filter((row) => row.status === "Success");
      dailySuccess.forEach((row) => {
        daysSet.add(row.date);
        currencySet.add(row.currency);
      });
      const days = Array.from(daysSet).sort();
      const formattedDays = days.map((d) => {
        const date = new Date(d);
        return date.toLocaleDateString("pl-PL", {
          day: "2-digit",
          month: "2-digit",
        });
      });
      const currencies = Array.from(currencySet);

      const dailyByCurrency = {};
      currencies.forEach((currency) => {
        dailyByCurrency[currency] = days.map((day) => {
          const found = dailySuccess.find(
            (row) => row.date === day && row.currency === currency
          );
          return found ? Number(found.total) : 0;
        });
      });

      const barColors = ["#43b384", "#ff6600", "#007bff", "#b3b8d4"];
      const datasets = currencies.map((currency, idx) => ({
        label: currency,
        data: dailyByCurrency[currency],
        backgroundColor: barColors[idx % barColors.length],
        borderRadius: 6,
      }));

      const barCtx = document.getElementById("barChart").getContext("2d");
      new Chart(barCtx, {
        type: "bar",
        data: {
          labels: formattedDays,
          datasets,
        },
        options: {
          plugins: {
            legend: { display: true },
          },
          scales: {
            x: {
              stacked: false,
              ticks: { color: "#b3b8d4" },
              grid: { color: "#ececec" },
            },
            y: {
              stacked: false,
              ticks: { color: "#b3b8d4" },
              grid: { color: "#ececec" },
            },
          },
        },
      });
    });
  },
};
</script>

<style scoped>
@import url("https://db.onlinewebfonts.com/c/69c633b2a4e41e8101c6f4f149655d5e?family=ING+Me+Regular");

.dashboard-bg {
  min-height: 100vh;
  background: #f7f7f7;
  position: relative;
  display: flex;
  flex-direction: column;
  font-family: "ING Me Regular", Arial, sans-serif;
}
.dashboard-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
}
.dashboard-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.13);
  padding: 2.5rem 2.5rem 2rem 2.5rem;
  width: 100%;
  max-width: 1100px;
  display: flex;
  flex-direction: column;
}
.dashboard-logo {
  font-size: 1.3rem;
  font-weight: bold;
  color: #ff6600;
  margin-bottom: 10px;
}
.dashboard-logo-text {
  font-size: 2rem;
  font-weight: bold;
  color: #ff6600;
  letter-spacing: 1px;
  white-space: nowrap;
}
.dashboard-title {
  font-size: 1.6rem;
  font-weight: bold;
  color: #43b384;
  margin-bottom: 1.5rem;
}
.dashboard-subtitle {
  font-size: 1.2rem;
  font-weight: 500;
  color: #ff6600;
  margin-bottom: 1rem;
}
.dashboard-chart,
.dashboard-bar-chart {
  width: 100%;
  min-height: 220px;
}
</style>
