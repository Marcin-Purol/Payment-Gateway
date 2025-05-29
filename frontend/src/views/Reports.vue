<template>
  <div v-if="isAuthenticated && hasReportAccess" class="reports-bg">
    <div style="height: 32px"></div>
    <div class="reports-center">
      <div class="reports-card">
        <div class="reports-logo" style="margin-bottom: 12px">
          <span class="reports-logo-text">Raporty</span>
        </div>
        <form @submit.prevent="downloadReport" class="reports-form">
          <label>
            Data od:
            <input
              type="date"
              v-model="dateFrom"
              required
              class="reports-input"
            />
          </label>
          <label>
            Data do:
            <input
              type="date"
              v-model="dateTo"
              required
              class="reports-input"
            />
          </label>
          <button type="submit" class="reports-btn">Pobierz CSV</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import apiClient from "../api/axios";
export default {
  name: "ReportsPage",
  data() {
    return {
      dateFrom: "",
      dateTo: "",
      roles: [],
    };
  },
  computed: {
    isAuthenticated() {
      return !!localStorage.getItem("token");
    },
    hasReportAccess() {
      return (
        this.roles.includes("Reprezentant") || this.roles.includes("Finansowa")
      );
    },
  },
  async created() {
    const token = localStorage.getItem("token");
    if (!token) {
      this.$router.push("/login");
      return;
    }
    try {
      const res = await apiClient.get("/merchant/roles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      this.roles = res.data.roles || [];
      if (!this.hasReportAccess) {
        this.$router.replace("/dashboard");
      }
    } catch {
      this.$router.replace("/login");
    }
  },
  methods: {
    async downloadReport() {
      const token = localStorage.getItem("token");
      try {
        const response = await apiClient.get("/merchant/transactions/report", {
          params: {
            dateFrom: this.dateFrom,
            dateTo: this.dateTo,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `raport-transakcji-${this.dateFrom}_do_${this.dateTo}.csv`
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
      } catch (err) {
        if (err.response && err.response.status === 401) {
          this.$router.push("/login");
        } else {
          this.$root.$refs.toast.show("Nie udało się pobrać raportu.", "error");
        }
      }
    },
  },
};
</script>

<style scoped>
.reports-bg {
  min-height: 100vh;
  background: #f7f7f7;
  position: relative;
  display: flex;
  flex-direction: column;
  font-family: "ING Me Regular", Arial, sans-serif;
}
.reports-center {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.reports-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.13);
  padding: 2.5rem 2.5rem 2rem 2.5rem;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.reports-logo {
  font-size: 1.3rem;
  font-weight: bold;
  color: #43b384;
  margin-bottom: 10px;
}
.reports-logo-text {
  font-size: 2rem;
  font-weight: bold;
  color: #ff6600;
  letter-spacing: 1px;
  white-space: nowrap;
}
.reports-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  margin-top: 1.5rem;
  width: 100%;
}
.reports-form label {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  font-weight: 500;
  color: #181c2f;
  width: 100%;
}
.reports-input {
  background: #fafbfc;
  color: #222;
  border: 1px solid #ececec;
  border-radius: 8px;
  padding: 0.7rem;
  font-size: 15px;
  min-width: 180px;
  max-width: 220px;
  box-sizing: border-box;
  margin-top: 0.3rem;
  margin-bottom: 0.5rem;
  width: 220px;
  display: block;
}
.reports-btn {
  background: #ff6600;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 0.8rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  margin-top: 0.5rem;
  transition: background 0.2s;
}

.reports-btn:hover{
  background: #e65c00;
}
</style>
