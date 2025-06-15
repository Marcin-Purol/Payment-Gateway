<template>
  <div class="transactions-bg">
    <div style="height: 32px"></div>
    <div class="transactions-center">
      <div class="transactions-card">
        <div class="transactions-header">
          <div class="transactions-logo">
            <span class="transactions-logo-text">Transakcje</span>
            <span class="transactions-subtitle"
              >Zarządzaj płatnościami i transakcjami</span
            >
          </div>
          <div class="transactions-stats">
            <div class="stat-card success">
              <div class="stat-number">{{ stats.success }}</div>
              <div class="stat-label">Opłacone</div>
            </div>
            <div class="stat-card pending">
              <div class="stat-number">{{ stats.pending }}</div>
              <div class="stat-label">Oczekujące</div>
            </div>
            <div class="stat-card total">
              <div class="stat-number">{{ stats.total }}</div>
              <div class="stat-label">Łącznie</div>
            </div>
          </div>
        </div>

        <div class="filters-section">
          <div class="filters-row">
            <div class="filter-group">
              <label class="filter-label">Status:</label>
              <select
                v-model="filters.status"
                @change="applyFilters"
                class="filter-select"
              >
                <option value="">Wszystkie</option>
                <option value="Pending">Oczekująca</option>
                <option value="Success">Opłacona</option>
                <option value="Failed">Nieudana</option>
                <option value="Cancelled">Anulowana</option>
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label">Waluta:</label>
              <select
                v-model="filters.currency"
                @change="applyFilters"
                class="filter-select"
              >
                <option value="">Wszystkie</option>
                <option value="PLN">PLN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label">Szukaj:</label>
              <input
                v-model="filters.search"
                @input="debouncedSearch"
                placeholder="Tytuł transakcji..."
                class="filter-input"
              />
            </div>
            <button @click="clearFilters" class="filter-clear-btn">
              <span class="clear-icon">✕</span>
              Wyczyść
            </button>
          </div>
        </div>

        <div class="results-info">
          <span>Znaleziono {{ totalTransactions }} transakcji</span>
          <div class="page-size-selector">
            <label>Pokaż:</label>
            <select
              v-model="pageSize"
              @change="changePageSize"
              class="page-size-select"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
            <span>na stronę</span>
          </div>
        </div>

        <div class="table-container">
          <table class="transactions-table">
            <thead>
              <tr>
                <th @click="sortBy('title')" class="sortable">
                  Tytuł
                  <span class="sort-indicator" v-if="sortField === 'title'">
                    {{ sortOrder === "asc" ? "↑" : "↓" }}
                  </span>
                </th>
                <th @click="sortBy('amount')" class="sortable">
                  Kwota
                  <span class="sort-indicator" v-if="sortField === 'amount'">
                    {{ sortOrder === "asc" ? "↑" : "↓" }}
                  </span>
                </th>
                <th>Waluta</th>
                <th @click="sortBy('status')" class="sortable">
                  Status
                  <span class="sort-indicator" v-if="sortField === 'status'">
                    {{ sortOrder === "asc" ? "↑" : "↓" }}
                  </span>
                </th>
                <th>Data utworzenia</th>
                <th>Link płatności</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading" class="loading-row">
                <td colspan="7" class="loading-cell">
                  <div class="loading-spinner"></div>
                  Ładowanie...
                </td>
              </tr>
              <tr
                v-else-if="paginatedTransactions.length === 0"
                class="empty-row"
              >
                <td colspan="7" class="empty-cell">
                  Nie znaleziono transakcji spełniających kryteria
                </td>
              </tr>
              <tr
                v-else
                v-for="transaction in paginatedTransactions"
                :key="transaction.id"
                class="transaction-row"
                :class="{ 'row-cancelled': transaction.status === 'Cancelled' }"
              >
                <td class="title-cell">
                  <div class="title-content">
                    <span class="title-text">{{ transaction.title }}</span>
                    <span class="id-text">#{{ transaction.id }}</span>
                  </div>
                </td>
                <td class="amount-cell">
                  <span class="amount-value">{{
                    formatAmount(transaction.amount)
                  }}</span>
                </td>
                <td>
                  <span class="currency-badge">{{ transaction.currency }}</span>
                </td>
                <td>
                  <span
                    class="status-badge"
                    :class="getStatusClass(transaction.status)"
                  >
                    {{ statusPolish(transaction.status) }}
                  </span>
                </td>
                <td class="date-cell">
                  {{ formatDate(transaction.created_at) }}
                </td>
                <td>
                  <a
                    v-if="transaction.paymentLinkId"
                    :href="`http://localhost:8080/pay/${transaction.paymentLinkId}`"
                    target="_blank"
                    class="payment-link-btn"
                  >
                    <span class="link-icon">🔗</span>
                    Zobacz
                  </a>
                  <span v-else class="no-link">N/A</span>
                </td>
                <td>
                  <div class="action-buttons">
                    <button
                      v-if="
                        transaction.status === 'Pending' &&
                        (userRoles.includes('Reprezentant') ||
                          userRoles.includes('Finansowa'))
                      "
                      @click="cancelTransaction(transaction.id)"
                      class="action-btn cancel-btn"
                      title="Anuluj transakcję"
                    >
                      Anuluj
                    </button>
                    <button
                      @click="showTransactionDetails(transaction)"
                      class="action-btn details-btn"
                      title="Pokaż szczegóły"
                    >
                      Szczegóły
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-section" v-if="totalPages > 1">
          <div class="pagination-info">
            Strona {{ currentPage }} z {{ totalPages }} ({{ startItem }}-{{
              endItem
            }}
            z {{ totalTransactions }})
          </div>
          <div class="pagination-controls">
            <button
              @click="goToPage(1)"
              :disabled="currentPage === 1"
              class="pagination-btn"
              title="Pierwsza strona"
            >
              ⟨⟨
            </button>
            <button
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage === 1"
              class="pagination-btn"
              title="Poprzednia strona"
            >
              ⟨
            </button>

            <div class="page-numbers">
              <span
                v-for="page in visiblePages"
                :key="page"
                @click="goToPage(page)"
                class="page-number"
                :class="{ active: page === currentPage }"
              >
                {{ page }}
              </span>
            </div>

            <button
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="pagination-btn"
              title="Następna strona"
            >
              ⟩
            </button>
            <button
              @click="goToPage(totalPages)"
              :disabled="currentPage === totalPages"
              class="pagination-btn"
              title="Ostatnia strona"
            >
              ⟩⟩
            </button>
          </div>
        </div>

        <div
          v-if="showDetailsModal"
          class="modal-overlay"
          @click="closeDetailsModal"
        >
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h3>Szczegóły transakcji #{{ selectedTransaction?.id }}</h3>
              <button @click="closeDetailsModal" class="modal-close">✕</button>
            </div>
            <div class="modal-body" v-if="selectedTransaction">
              <div class="detail-grid">
                <div class="detail-item">
                  <label>Tytuł:</label>
                  <span>{{ selectedTransaction.title }}</span>
                </div>
                <div class="detail-item">
                  <label>Kwota:</label>
                  <span
                    >{{ formatAmount(selectedTransaction.amount) }}
                    {{ selectedTransaction.currency }}</span
                  >
                </div>
                <div class="detail-item">
                  <label>Status:</label>
                  <span
                    class="status-badge"
                    :class="getStatusClass(selectedTransaction.status)"
                  >
                    {{ statusPolish(selectedTransaction.status) }}
                  </span>
                </div>
                <div class="detail-item">
                  <label>Data utworzenia:</label>
                  <span>{{ formatDate(selectedTransaction.created_at) }}</span>
                </div>
                <div
                  class="detail-item"
                  v-if="selectedTransaction.customer_first_name"
                >
                  <label>Klient:</label>
                  <span
                    >{{ selectedTransaction.customer_first_name }}
                    {{ selectedTransaction.customer_last_name }}</span
                  >
                </div>
                <div
                  class="detail-item"
                  v-if="selectedTransaction.customer_email"
                >
                  <label>Email:</label>
                  <span>{{ selectedTransaction.customer_email }}</span>
                </div>
                <div
                  class="detail-item"
                  v-if="selectedTransaction.customer_phone"
                >
                  <label>Telefon:</label>
                  <span>{{ selectedTransaction.customer_phone }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import apiClient from "../api/axios";

export default {
  name: "TransactionsPage",
  data() {
    return {
      transactions: [],
      userRoles: [],
      loading: false,

      currentPage: 1,
      pageSize: 25,
      totalTransactions: 0,
      totalPages: 1,

      filters: {
        status: "",
        currency: "",
        search: "",
      },

      sortField: "created_at",
      sortOrder: "desc",

      showDetailsModal: false,
      selectedTransaction: null,

      searchTimeout: null,
    };
  },
  computed: {
    paginatedTransactions() {
      return this.transactions;
    },

    startItem() {
      return Math.min(
        (this.currentPage - 1) * this.pageSize + 1,
        this.totalTransactions
      );
    },

    endItem() {
      return Math.min(this.currentPage * this.pageSize, this.totalTransactions);
    },

    visiblePages() {
      const pages = [];
      const start = Math.max(1, this.currentPage - 2);
      const end = Math.min(this.totalPages, this.currentPage + 2);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    },

    stats() {
      const stats = {
        total: this.transactions.length,
        success: 0,
        pending: 0,
        failed: 0,
        cancelled: 0,
      };

      this.transactions.forEach((t) => {
        switch (t.status.toLowerCase()) {
          case "success":
            stats.success++;
            break;
          case "pending":
            stats.pending++;
            break;
          case "failed":
            stats.failed++;
            break;
          case "cancelled":
            stats.cancelled++;
            break;
        }
      });

      return stats;
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
      this.userRoles = res.data.roles || [];
      if (
        !this.userRoles.includes("Reprezentant") &&
        !this.userRoles.includes("Finansowa")
      ) {
        this.$router.replace("/dashboard");
        return;
      }
      await this.fetchTransactions();
    } catch {
      this.$router.replace("/login");
    }
  },
  methods: {
    async fetchTransactions() {
      this.loading = true;
      try {
        const token = localStorage.getItem("token");
        const params = {
          page: this.currentPage,
          limit: this.pageSize,
          sortBy: this.sortField,
          sortOrder: this.sortOrder,
        };

        if (this.filters.status) params.status = this.filters.status;
        if (this.filters.currency) params.currency = this.filters.currency;
        if (this.filters.search) params.search = this.filters.search;

        const response = await apiClient.get(
          "/transaction/merchant/transactions",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            params,
          }
        );

        this.transactions = response.data.transactions.map((transaction) => ({
          ...transaction,
          created_at: transaction.created_at || new Date().toISOString(),
        }));

        if (response.data.pagination) {
          this.currentPage = response.data.pagination.page;
          this.totalTransactions = response.data.pagination.total;
          this.totalPages = response.data.pagination.totalPages;
        }
      } catch (err) {
        if (err.response && err.response.status === 401) {
          this.$router.push("/login");
        } else {
          this.$root.$refs.toast.show(
            "Nie udało się pobrać transakcji",
            "error"
          );
        }
      } finally {
        this.loading = false;
      }
    },

    async cancelTransaction(id) {
      if (!confirm("Czy na pewno chcesz anulować tę transakcję?")) return;
      try {
        const token = localStorage.getItem("token");
        await apiClient.patch(
          `/transaction/${id}`,
          { status: "Cancelled" },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        await this.fetchTransactions();
        this.$root.$refs.toast.show("Transakcja została anulowana.", "success");
      } catch (err) {
        this.$root.$refs.toast.show(
          "Nie udało się anulować transakcji.",
          "error"
        );
      }
    },

    statusPolish(status) {
      const statuses = {
        pending: "Oczekująca",
        success: "Opłacona",
        failed: "Nieudana",
        cancelled: "Anulowana",
      };
      return statuses[String(status).toLowerCase()] || status;
    },

    getStatusClass(status) {
      const statusLower = String(status).toLowerCase();
      return {
        "status-success": statusLower === "success",
        "status-pending": statusLower === "pending",
        "status-failed": statusLower === "failed",
        "status-cancelled": statusLower === "cancelled",
      };
    },

    formatAmount(amount) {
      return parseFloat(amount).toFixed(2);
    },
    formatDate(dateString) {
      if (!dateString) return "N/A";
      return new Date(dateString).toLocaleDateString("pl-PL", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    },

    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.fetchTransactions();
      }
    },

    changePageSize() {
      this.currentPage = 1;
      this.fetchTransactions();
    },

    applyFilters() {
      this.currentPage = 1;
      this.fetchTransactions();
    },

    clearFilters() {
      this.filters = {
        status: "",
        currency: "",
        search: "",
      };
      this.currentPage = 1;
      this.fetchTransactions();
    },

    debouncedSearch() {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = setTimeout(() => {
        this.currentPage = 1;
        this.fetchTransactions();
      }, 300);
    },

    sortBy(field) {
      if (this.sortField === field) {
        this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
      } else {
        this.sortField = field;
        this.sortOrder = "asc";
      }
      this.currentPage = 1;
      this.fetchTransactions();
    },

    showTransactionDetails(transaction) {
      this.selectedTransaction = transaction;
      this.showDetailsModal = true;
    },

    closeDetailsModal() {
      this.showDetailsModal = false;
      this.selectedTransaction = null;
    },
  },
};
</script>

<style scoped>
.transactions-bg {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
  position: relative;
  display: flex;
  flex-direction: column;
  font-family: "Inter", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

.transactions-center {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0 20px;
}

.transactions-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  padding: 2rem;
  width: 100%;
  max-width: 1400px;
  display: flex;
  flex-direction: column;
}

.transactions-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.transactions-logo {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.transactions-logo-text {
  font-size: 2.5rem;
  font-weight: 700;
  color: #ff6600;
  letter-spacing: -0.5px;
}

.transactions-subtitle {
  font-size: 1.1rem;
  color: #6b7280;
  font-weight: 400;
}

.transactions-stats {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  min-width: 120px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.stat-card.success {
  border-color: #10b981;
}
.stat-card.pending {
  border-color: #f59e0b;
}
.stat-card.total {
  border-color: #6366f1;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.stat-card.success .stat-number {
  color: #10b981;
}
.stat-card.pending .stat-number {
  color: #f59e0b;
}
.stat-card.total .stat-number {
  color: #6366f1;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.filters-section {
  background: #f8fafc;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  border: 1px solid #e5e7eb;
}

.filters-row {
  display: flex;
  align-items: flex-end;
  gap: 1.5rem;
  flex-wrap: wrap;
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

.filter-select,
.filter-input {
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.75rem;
  font-size: 0.875rem;
  color: #374151;
  transition: all 0.2s ease;
  min-width: 140px;
}

.filter-input {
  min-width: 200px;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: #ff6600;
  box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.1);
}

.filter-clear-btn {
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-clear-btn:hover {
  background: #dc2626;
  transform: translateY(-1px);
}

.clear-icon {
  font-size: 1rem;
}

.results-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-size-select {
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.5rem;
  font-size: 0.875rem;
}

.table-container {
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  margin-bottom: 1.5rem;
}

.transactions-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
}

.transactions-table th,
.transactions-table td {
  padding: 1rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.transactions-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.transactions-table th.sortable {
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
}

.transactions-table th.sortable:hover {
  background: #f3f4f6;
}

.sort-indicator {
  margin-left: 0.5rem;
  color: #ff6600;
  font-weight: bold;
}

.transaction-row {
  transition: background-color 0.2s ease;
}

.transaction-row:hover {
  background: #f9fafb;
}

.transaction-row.row-cancelled {
  opacity: 0.6;
}

.loading-row,
.empty-row {
  text-align: center;
}

.loading-cell {
  padding: 3rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top: 2px solid #ff6600;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-cell {
  padding: 3rem;
  color: #9ca3af;
  font-style: italic;
}

.title-cell {
  max-width: 200px;
}

.title-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.title-text {
  font-weight: 600;
  color: #111827;
}

.id-text {
  font-size: 0.75rem;
  color: #6b7280;
}

.amount-cell {
  text-align: right;
}

.amount-value {
  font-weight: 600;
  font-family: "Courier New", monospace;
  color: #111827;
}

.currency-badge {
  background: #f3f4f6;
  color: #374151;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.status-success {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.status-failed {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.status-cancelled {
  background: #f3f4f6;
  color: #4b5563;
}

.date-cell {
  font-size: 0.875rem;
  color: #6b7280;
}

.payment-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #3b82f6;
  color: #fff;
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.payment-link-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.link-icon {
  font-size: 0.875rem;
}

.no-link {
  color: #9ca3af;
  font-style: italic;
  font-size: 0.875rem;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  border: none;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn {
  background: #fee2e2;
  color: #dc2626;
}

.cancel-btn:hover {
  background: #fecaca;
  transform: translateY(-1px);
}

.details-btn {
  background: #ede9fe;
  color: #7c3aed;
}

.details-btn:hover {
  background: #ddd6fe;
  transform: translateY(-1px);
}

.pagination-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  flex-wrap: wrap;
  gap: 1rem;
}

.pagination-info {
  color: #6b7280;
  font-size: 0.875rem;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pagination-btn {
  background: #fff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #374151;
}

.pagination-btn:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #ff6600;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.page-number {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #374151;
}

.page-number:hover {
  background: #f3f4f6;
}

.page-number.active {
  background: #ff6600;
  color: #fff;
  font-weight: 600;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.detail-grid {
  display: grid;
  gap: 1rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 8px;
}

.detail-item label {
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.detail-item span {
  color: #111827;
}

@media (max-width: 768px) {
  .transactions-card {
    padding: 1rem;
  }

  .transactions-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .transactions-stats {
    width: 100%;
    justify-content: space-between;
  }

  .stat-card {
    flex: 1;
    min-width: auto;
  }

  .filters-row {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    width: 100%;
  }

  .filter-select,
  .filter-input {
    width: 100%;
    min-width: auto;
  }

  .pagination-section {
    flex-direction: column;
    text-align: center;
  }

  .transactions-table {
    font-size: 0.75rem;
  }

  .transactions-table th,
  .transactions-table td {
    padding: 0.5rem;
  }
}
</style>
