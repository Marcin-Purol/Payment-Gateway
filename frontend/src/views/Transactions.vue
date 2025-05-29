<template>
  <div class="transactions-bg">
    <div style="height: 32px"></div>
    <div class="transactions-center">
      <div class="transactions-card">
        <div class="transactions-logo" style="margin-bottom: 12px">
          <span class="transactions-logo-text">Transakcje</span>
        </div>
        <form @submit.prevent="applyFilters" class="transactions-filter-form">
          <input
            type="text"
            v-model="filterTitle"
            placeholder="Tytuł transakcji"
            class="transactions-input"
          />
          <select v-model="filterStatus" class="transactions-select">
            <option value="">Wszystkie statusy</option>
            <option value="Pending">Oczekująca</option>
            <option value="Success">Opłacona</option>
            <option value="Failed">Nieudana</option>
            <option value="Cancelled">Anulowana</option>
          </select>
          <button type="submit" class="transactions-btn-filter">Filtruj</button>
        </form>
        <div v-if="isLoading" class="transactions-loader">
          <span class="loader"></span>
        </div>
        <table v-else class="transactions-table">
          <thead>
            <tr>
              <th>Tytuł</th>
              <th>Kwota</th>
              <th>Waluta</th>
              <th>Status</th>
              <th>Link płatności</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="transactions.length === 0">
              <td colspan="6" style="text-align: center; color: #aaa;">
                Brak transakcji
              </td>
            </tr>
            <tr
              v-for="transaction in transactions"
              :key="transaction.id"
              class="text-center"
            >
              <td>{{ transaction.title }}</td>
              <td>{{ transaction.amount }}</td>
              <td>{{ transaction.currency }}</td>
              <td>{{ statusPolish(transaction.status) }}</td>
              <td>
                <a
                  v-if="transaction.paymentLinkId"
                  :href="`http://localhost:8080/pay/${transaction.paymentLinkId}`"
                  target="_blank"
                  class="transactions-link"
                >
                  Zobacz link
                </a>
                <span v-else>N/A</span>
              </td>
              <td>
                <button
                  v-if="
                    transaction.status === 'Pending' &&
                    (userRoles.includes('Reprezentant') ||
                      userRoles.includes('Finansowa'))
                  "
                  @click="cancelTransaction(transaction.id)"
                  class="transactions-btn-cancel"
                >
                  Anuluj
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="totalPages > 1" class="transactions-pagination">
          <button :disabled="page === 1" @click="goToPage(page - 1)">
            Poprzednia
          </button>
          <span>Strona {{ page }} z {{ totalPages }}</span>
          <button :disabled="page === totalPages" @click="goToPage(page + 1)">
            Następna
          </button>
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
      page: 1,
      pageSize: 10,
      totalPages: 1,
      total: 0,
      filterStatus: "",
      filterTitle: "",
      isLoading: false,
    };
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
      this.isLoading = true;
      const minLoaderTime = 1000;
      const start = Date.now();
      try {
        const token = localStorage.getItem("token");
        const params = {
          page: this.page,
          pageSize: this.pageSize,
        };
        if (this.filterStatus) params.status = this.filterStatus;
        if (this.filterTitle) params.title = this.filterTitle;

        const response = await apiClient.get(
          "/transaction/merchant/transactions",
          {
            headers: { Authorization: `Bearer ${token}` },
            params,
          }
        );
        this.transactions = response.data.data;
        this.totalPages = response.data.totalPages;
        this.total = response.data.total;
      } catch (err) {
        if (err.response && err.response.status === 401) {
          this.$router.push("/login");
        } else {
          console.error("Failed to fetch transactions:", err);
        }
      } finally {
        const elapsed = Date.now() - start;
        if (elapsed < minLoaderTime) {
          setTimeout(() => {
            this.isLoading = false;
          }, minLoaderTime - elapsed);
        } else {
          this.isLoading = false;
        }
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
    goToPage(page) {
      if (page < 1 || page > this.totalPages) return;
      this.page = page;
      this.fetchTransactions();
    },
    applyFilters() {
      this.page = 1;
      this.fetchTransactions();
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
  },
};
</script>

<style scoped>
@import url("https://db.onlinewebfonts.com/c/69c633b2a4e41e8101c6f4f149655d5e?family=ING+Me+Regular");

.transactions-bg {
  min-height: 100vh;
  background: #f7f7f7;
  position: relative;
  display: flex;
  flex-direction: column;
  font-family: "ING Me Regular", Arial, sans-serif;
}
.transactions-center {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.transactions-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.13);
  padding: 2.5rem 2.5rem 2rem 2.5rem;
  width: 100%;
  max-width: 1100px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.transactions-logo {
  font-size: 1.3rem;
  font-weight: bold;
  color: #ff6600;
  margin-bottom: 10px;
}
.transactions-logo-text {
  font-size: 2rem;
  font-weight: bold;
  color: #ff6600;
  letter-spacing: 1px;
  white-space: nowrap;
}
.transactions-title {
  font-size: 1.6rem;
  font-weight: bold;
  color: #e65c00;
  margin-bottom: 1.5rem;
}
.transactions-filters {
  width: 100%;
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
.transactions-filter-select,
.transactions-filter-input {
  padding: 0.8rem;
  border: 1px solid #ececec;
  border-radius: 4px;
  font-size: 14px;
  width: 48%;
}
.transactions-filter-select {
  -moz-appearance: none;
  -webkit-appearance: none;
  appearance: none;
  background: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23e65c00' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")
    no-repeat right 0.7rem center;
  background-size: 12px;
}
.transactions-table {
  width: 100%;
  border-collapse: collapse;
  background: #fafbfc;
  border-radius: 12px;
  overflow: hidden;
  margin-top: 12px;
}
.transactions-table th,
.transactions-table td {
  border: 1px solid #ececec;
  padding: 0.8rem;
  text-align: center;
}
.transactions-table th {
  background: #ececec;
  color: #888;
  font-weight: 500;
}
.transactions-link {
  color: #e65c00;
  text-decoration: underline;
}
.transactions-btn-cancel {
  color: #fff;
  background: #ff6b6b;
  border: none;
  border-radius: 4px;
  padding: 6px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}
.transactions-btn-cancel:hover {
  background: #e65c00;
}
.transactions-pagination {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
}
.transactions-pagination-btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 4px;
  background: #e65c00;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}
.transactions-pagination-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
.transactions-pagination-info {
  font-size: 14px;
  color: #333;
}
.transactions-filter-form {
  width: 100%;
  display: flex;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}
.transactions-input {
  padding: 0.8rem;
  border: 1px solid #ececec;
  border-radius: 4px;
  font-size: 14px;
  width: 48%;
}
.transactions-select {
  padding: 0.8rem;
  border: 1px solid #ececec;
  border-radius: 4px;
  font-size: 14px;
  width: 48%;
  -moz-appearance: none;
  -webkit-appearance: none;
  appearance: none;
  background: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23e65c00' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")
    no-repeat right 0.7rem center;
  background-size: 12px;
}
.transactions-btn-filter {
  color: #fff;
  background: #e65c00;
  border: none;
  border-radius: 4px;
  padding: 0.8rem 1.2rem;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}
.transactions-btn-filter:hover {
  background: #ff6600;
}
.transactions-loader {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 120px;
}
.loader {
  border: 4px solid #ffe0cc;
  border-top: 4px solid #ff6600;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  animation: spin 0.8s linear infinite;
  display: inline-block;
}
@keyframes spin {
  0% { transform: rotate(0deg);}
  100% { transform: rotate(360deg);}
}
</style>
