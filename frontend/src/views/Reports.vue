<template>
  <div v-if="isAuthenticated && hasReportAccess" class="reports-bg">
    <div class="reports-center">
      <div class="reports-container">
        <div class="reports-header">
          <div class="reports-title-section">
            <h1 class="reports-title">
              <span class="reports-icon">📊</span>
              Raporty i analizy
            </h1>
            <p class="reports-subtitle">
              Generuj szczegółowe raporty transakcji i analizuj dane biznesowe
            </p>
          </div>
        </div>

        <div class="report-generation-section">
          <div class="section-header">
            <h2 class="section-title">
              <span class="section-icon">📋</span>
              Generowanie raportów
            </h2>
            <p class="section-subtitle">Wybierz typ raportu i zakres dat</p>
          </div>

          <div class="report-options">
            <div class="report-type-section">
              <h3 class="subsection-title">Typ raportu</h3>
              <div class="report-type-single">
                <div class="report-type-card active">
                  <div class="report-type-icon">💳</div>
                  <div class="report-type-info">
                    <h4>Raport transakcji</h4>
                    <p>
                      Szczegółowe dane wszystkich transakcji w wybranym okresie
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="date-range-section">
              <h3 class="subsection-title">Zakres dat</h3>
              <div class="date-options">
                <div class="quick-dates">
                  <button
                    v-for="preset in datePresets"
                    :key="preset.id"
                    class="quick-date-btn"
                    :class="{ active: selectedPreset === preset.id }"
                    @click="selectDatePreset(preset)"
                  >
                    {{ preset.label }}
                  </button>
                </div>
                <div class="custom-dates">
                  <div class="date-inputs">
                    <div class="date-group">
                      <label class="date-label">Data od:</label>
                      <input
                        type="date"
                        v-model="dateFrom"
                        class="date-input"
                        :max="dateTo || today"
                      />
                    </div>
                    <div class="date-group">
                      <label class="date-label">Data do:</label>
                      <input
                        type="date"
                        v-model="dateTo"
                        class="date-input"
                        :min="dateFrom"
                        :max="today"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="filters-section">
              <h3 class="subsection-title">Dodatkowe filtry</h3>
              <div class="filter-grid">
                <div class="filter-group">
                  <label class="filter-label">Status transakcji:</label>
                  <select v-model="selectedStatus" class="filter-select">
                    <option value="">Wszystkie</option>
                    <option value="Success">Udane</option>
                    <option value="Failed">Nieudane</option>
                    <option value="Pending">Oczekujące</option>
                  </select>
                </div>
                <div class="filter-group">
                  <label class="filter-label">Format pliku:</label>
                  <select
                    v-model="selectedFormat"
                    class="filter-select"
                    disabled
                  >
                    <option value="csv">CSV</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="generate-section">
              <button
                @click="generateReport"
                class="generate-btn"
                :disabled="!dateFrom || !dateTo || isGenerating"
                :class="{ generating: isGenerating }"
              >
                <span v-if="!isGenerating" class="btn-icon">📊</span>
                <div v-else class="loading-spinner"></div>
                {{ isGenerating ? "Generowanie..." : "Generuj raport" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import apiClient from "../api/axios";
import { authService } from "../api/auth";

export default {
  name: "ReportsPage",
  data() {
    return {
      dateFrom: "",
      dateTo: "",
      roles: [],
      selectedReportType: "transactions",
      selectedFormat: "csv",
      selectedStatus: "",
      selectedPreset: "",
      isGenerating: false,
      recentReports: [],
      datePresets: [
        { id: "today", label: "Dzisiaj", days: 0 },
        { id: "yesterday", label: "Wczoraj", days: 1 },
        { id: "last7", label: "Ostatnie 7 dni", days: 7 },
        { id: "last30", label: "Ostatnie 30 dni", days: 30 },
        { id: "last90", label: "Ostatnie 90 dni", days: 90 },
        { id: "thisMonth", label: "Ten miesiąc", days: "thisMonth" },
        { id: "lastMonth", label: "Poprzedni miesiąc", days: "lastMonth" },
      ],
    };
  },
  computed: {
    isAuthenticated() {
      return this.roles.length > 0;
    },
    hasReportAccess() {
      return (
        this.roles.includes("Reprezentant") || this.roles.includes("Finansowa")
      );
    },
    today() {
      return new Date().toISOString().split("T")[0];
    },
  },
  async created() {
    try {
      const userData = await authService.checkAuth();
      if (!userData || !userData.user) {
        this.$router.push("/login");
        return;
      }

      this.roles = userData.user.roles || [];

      if (!this.hasReportAccess) {
        this.$router.replace("/dashboard");
        return;
      }
      this.selectDatePreset(this.datePresets.find((p) => p.id === "last30"));

      await this.loadRecentReports();
    } catch (error) {
      this.$router.replace("/login");
    }
  },
  methods: {
    async loadRecentReports() {
      try {
        const response = await apiClient.get("/merchant/reports/history");
        this.recentReports = response.data.reports || [];
      } catch (err) {
        this.recentReports = [
          {
            id: 1,
            type: "transactions",
            dateFrom: "2024-01-01",
            dateTo: "2024-01-31",
            size: "2.3 MB",
            createdAt: "2024-02-01T10:30:00Z",
            format: "csv",
          },
          {
            id: 2,
            type: "revenue",
            dateFrom: "2024-01-01",
            dateTo: "2024-01-31",
            size: "1.1 MB",
            createdAt: "2024-02-01T09:15:00Z",
            format: "xlsx",
          },
        ];
      }
    },

    selectDatePreset(preset) {
      this.selectedPreset = preset.id;
      const today = new Date();

      if (preset.days === "thisMonth") {
        this.dateFrom = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        this.dateTo = today.toISOString().split("T")[0];
      } else if (preset.days === "lastMonth") {
        const lastMonth = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1
        );
        const lastDayOfLastMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          0
        );
        this.dateFrom = lastMonth.toISOString().split("T")[0];
        this.dateTo = lastDayOfLastMonth.toISOString().split("T")[0];
      } else if (preset.days === 0) {
        this.dateFrom = today.toISOString().split("T")[0];
        this.dateTo = today.toISOString().split("T")[0];
      } else if (preset.days === 1) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        this.dateFrom = yesterday.toISOString().split("T")[0];
        this.dateTo = yesterday.toISOString().split("T")[0];
      } else {
        const fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - preset.days);
        this.dateFrom = fromDate.toISOString().split("T")[0];
        this.dateTo = today.toISOString().split("T")[0];
      }
    },
    async generateReport() {
      if (!this.dateFrom || !this.dateTo) {
        this.$root.$refs.toast.show("Wybierz zakres dat.", "error");
        return;
      }

      this.isGenerating = true;

      try {
        const response = await apiClient.get("/merchant/transactions/report", {
          params: {
            dateFrom: this.dateFrom,
            dateTo: this.dateTo,
            type: this.selectedReportType,
            format: this.selectedFormat,
            status: this.selectedStatus,
          },
          responseType: "blob",
        });

        const contentType = response.headers["content-type"];
        const blob = new Blob([response.data], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const fileExtension = this.selectedFormat;
        const reportTypeName = "raport-transakcji";
        link.setAttribute(
          "download",
          `${reportTypeName}-${this.dateFrom}_do_${this.dateTo}.${fileExtension}`
        );

        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        this.$root.$refs.toast.show(
          "Raport został pobrany pomyślnie.",
          "success"
        );
        this.loadRecentReports();
      } catch (err) {
        if (err.response && err.response.status === 401) {
          this.$router.push("/login");
        } else {
          this.$root.$refs.toast.show(
            "Nie udało się wygenerować raportu.",
            "error"
          );
        }
      } finally {
        this.isGenerating = false;
      }
    },
    async downloadReport() {
      this.$root.$refs.toast.show(
        "Funkcja pobierania z historii będzie dostępna wkrótce.",
        "info"
      );
    },
    formatCurrency(amount) {
      return new Intl.NumberFormat("pl-PL", {
        style: "currency",
        currency: "PLN",
      }).format(amount);
    },

    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString("pl-PL");
    },
    formatDateTime(dateString) {
      return new Date(dateString).toLocaleString("pl-PL");
    },
    getStatusClass(status) {
      return {
        "status-success": status === "Success" || status === "success",
        "status-failed": status === "Failed" || status === "failed",
        "status-pending": status === "Pending" || status === "pending",
      };
    },
  },
  watch: {
    dateFrom() {
      this.selectedPreset = "";
    },
    dateTo() {
      this.selectedPreset = "";
    },
    selectedStatus() {},
  },
};
</script>

<style scoped>
.reports-bg {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
  position: relative;
  display: flex;
  flex-direction: column;
  font-family: "Inter", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

.reports-center {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 1rem;
}

.reports-container {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  padding: 2.5rem;
  width: 100%;
  max-width: 1400px;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.reports-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.reports-title-section {
  flex: 1;
}

.reports-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.reports-icon {
  font-size: 2rem;
}

.reports-subtitle {
  font-size: 1.125rem;
  color: #6b7280;
  margin: 0;
  font-weight: 400;
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-icon {
  font-size: 1.25rem;
}

.section-subtitle {
  font-size: 1rem;
  color: #6b7280;
  margin: 0;
}

.report-generation-section {
  background: #f8fafc;
  border-radius: 16px;
  padding: 2rem;
}

.report-options {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.subsection-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 1rem 0;
}

.report-type-single {
  display: flex;
  justify-content: center;
}

.report-type-card {
  background: #fff;
  border: 2px solid #ff6600;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 1rem;
  max-width: 400px;
  background: linear-gradient(135deg, #fff5f0, #fff);
  box-shadow: 0 4px 12px rgba(255, 102, 0, 0.15);
}

.report-type-card.active .report-type-icon {
  background: linear-gradient(135deg, #ff6600, #ff8533);
  color: #fff;
}

.report-type-icon {
  font-size: 2rem;
  background: #f3f4f6;
  padding: 0.75rem;
  border-radius: 12px;
}

.report-type-info h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.25rem 0;
}

.report-type-info p {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.date-options {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.quick-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.quick-date-btn {
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.quick-date-btn:hover {
  border-color: #ff6600;
  color: #ff6600;
}

.quick-date-btn.active {
  background: #ff6600;
  border-color: #ff6600;
  color: #fff;
}

.date-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.date-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.date-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.date-input {
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  color: #111827;
  transition: all 0.2s ease;
}

.date-input:focus {
  outline: none;
  border-color: #ff6600;
  box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.1);
}

.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.filter-select {
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  color: #111827;
  transition: all 0.2s ease;
}

.filter-select:focus {
  outline: none;
  border-color: #ff6600;
  box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.1);
}

.generate-section {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

.generate-btn {
  background: linear-gradient(135deg, #ff6600, #ff8533);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 12px rgba(255, 102, 0, 0.3);
  min-width: 200px;
  justify-content: center;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 102, 0, 0.4);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.generate-btn.generating {
  opacity: 0.8;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.btn-icon {
  font-size: 1.125rem;
}

.reports-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.report-item {
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;
}

.report-item:hover {
  border-color: #ff6600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.report-info {
  flex: 1;
}

.report-type {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.report-icon {
  font-size: 1.25rem;
}

.report-name {
  font-weight: 600;
  color: #111827;
}

.report-details {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.report-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.report-created {
  font-size: 0.875rem;
  color: #6b7280;
}

.download-btn {
  background: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.download-btn:hover {
  background: #e5e7eb;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .reports-container {
    padding: 1.5rem;
    gap: 2rem;
  }
  .reports-title {
    font-size: 2rem;
  }

  .date-inputs {
    grid-template-columns: 1fr;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .quick-dates {
    grid-template-columns: 1fr 1fr;
    display: grid;
  }

  .report-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  .report-actions {
    width: 100%;
    justify-content: space-between;
  }
}

@media (max-width: 480px) {
  .reports-container {
    padding: 1rem;
  }

  .reports-title {
    font-size: 1.75rem;
  }

  .quick-date-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.8125rem;
  }

  .generate-btn {
    padding: 0.875rem 1.5rem;
    font-size: 0.875rem;
  }
}
</style>
