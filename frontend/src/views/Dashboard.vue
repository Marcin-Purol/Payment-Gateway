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
          Sprzedaż według walut
          <span v-if="days && days.length" style="color: #181c2f; font-size: 1rem; margin-left: 12px;">
            ({{ formatDate(days[days.length - 1]) }})
          </span>
        </div>
        <div class="dashboard-bar-chart" style="display: flex; justify-content: center; align-items: flex-start;">
          <canvas id="barChart"></canvas>
          <div class="currency-totals-list" style="margin-left: 32px;">
            <div v-for="(total, idx) in currencyTotals" :key="currencies[idx]" style="margin-bottom: 8px; font-size: 1.1rem;">
              <span :style="{ color: doughnutColors[idx] }"><b>{{ currencies[idx] }}:</b></span>
              <span style="margin-left: 8px;">{{ total }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <AppFooter />
  </div>
</template>

<script>
import { onMounted, ref } from "vue";
import Chart from "chart.js/auto";
import AppFooter from "../components/AppFooter.vue";
import apiClient from "../api/axios";

export default {
  name: "DashboardPage",
  components: { AppFooter },
  setup() {
    const days = ref([]);
    onMounted(async () => {
      const token = localStorage.getItem("token");
      const { data } = await apiClient.get("/merchant/dashboard/summary", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const now = new Date();
      now.setMinutes(0, 0, 0);

      const hourLabels = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        const h = d.getHours().toString().padStart(2, "0");
        hourLabels.push(`${h}:00`);
      }

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

      const hourlyByStatus = {};
      statuses.forEach((status) => {
        hourlyByStatus[status] = Array(hourLabels.length).fill(0);
      });

      data.fiveMinutes.forEach((row) => {

        const [hour, minute] = row.time.split(":").map(Number);
        const utcDate = new Date();
        utcDate.setUTCHours(hour, minute, 0, 0);
        const localHour = utcDate.getHours().toString().padStart(2, "0");
        const hourLabel = `${localHour}:00`;
        const idx = hourLabels.indexOf(hourLabel);
        if (statuses.includes(row.status) && idx !== -1) {
          hourlyByStatus[row.status][idx] += row.count;
        }
      });

      const ctx = document.getElementById("salesChart").getContext("2d");

      const statusSums = statuses.map(status => ({
        status,
        sum: hourlyByStatus[status].reduce((a, b) => a + b, 0)
      }));

      const sortedStatuses = statusSums.sort((a, b) => a.sum - b.sum).map(s => s.status);

      new Chart(ctx, {
        type: "bar",
        data: {
          labels: hourLabels,
          datasets: sortedStatuses.map((status) => ({
            label: statusLabels[status],
            data: hourlyByStatus[status],
            backgroundColor: statusColors[status],
            borderRadius: 4,
            stack: "transactions"
          })),
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: "#181c2f" } },
            tooltip: {
              enabled: true,
              mode: "index",
              intersect: false,
              callbacks: {
                title: (items) => items[0].label,
                label: (item) => {
                  return `${item.dataset.label}: ${item.parsed.y}`;
                },
              },
              backgroundColor: "#fff",
              titleColor: "#181c2f",
              bodyColor: "#181c2f",
              borderColor: "#ececec",
              borderWidth: 1,
              padding: 12,
              displayColors: true,
            },
          },
          hover: { mode: null },
          interaction: { mode: "index", intersect: false },
          scales: {
            x: {
              stacked: true,
              ticks: { color: "#b3b8d4" },
              grid: { color: "#ececec" },
            },
            y: {
              stacked: true,
              ticks: { color: "#b3b8d4" },
              grid: { color: "#ececec" },
            },
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
      days.value = Array.from(daysSet).sort();

      const currencies = Array.from(currencySet);

      const dailyByCurrency = {};
      currencies.forEach((currency) => {
        dailyByCurrency[currency] = days.value.map((day) => {
          const found = dailySuccess.find(
            (row) => row.date === day && row.currency === currency
          );
          return found ? Number(found.total) : 0;
        });
      });

      const currencyTotals = currencies.map((currency) =>
        dailySuccess
          .filter((row) => row.currency === currency)
          .reduce((sum, row) => sum + Number(row.total), 0)
      );

      const doughnutColors = ["#43b384", "#ff6600", "#007bff", "#b3b8d4"];

      const barCtx = document.getElementById("barChart").getContext("2d");
      new Chart(barCtx, {
        type: "doughnut",
        data: {
          labels: currencies,
          datasets: [
            {
              data: currencyTotals,
              backgroundColor: doughnutColors,
            },
          ],
        },
        options: {
          plugins: {
            legend: { display: true },
          },
        },
      });
    });
    return {
      days,
      formatDate,
    };
  },
};

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}
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
.dashboard-chart {
  width: 100%;
  min-height: 220px;
  height: 320px;
}
.dashboard-bar-chart {
  max-width: 340px;
  max-height: 340px;
  margin: 0 auto;
  width: 100%;
  height: 100%;
}
</style>
