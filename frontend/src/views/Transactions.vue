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
              style="cursor: pointer;"
              @click="openTransactionModal(transaction)"
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
                  @click.stop
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
                  @click.stop="cancelTransaction(transaction.id)"
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

  <div v-if="showTransactionModal" class="transaction-modal-overlay" @click.self="closeTransactionModal">
    <div class="transaction-modal">
      <h2>Szczegóły transakcji</h2>
      <table class="transaction-details-table" v-if="selectedTransaction">
        <tbody>
          <tr>
            <th>ID transakcji</th>
            <td>{{ selectedTransaction.id }}</td>
          </tr>
          <tr>
            <th>Tytuł</th>
            <td>{{ selectedTransaction.title }}</td>
          </tr>
          <tr>
            <th>Kwota</th>
            <td>{{ selectedTransaction.amount }}</td>
          </tr>
          <tr>
            <th>Waluta</th>
            <td>{{ selectedTransaction.currency }}</td>
          </tr>
          <tr>
            <th>Status</th>
            <td>{{ statusPolish(selectedTransaction.status) }}</td>
          </tr>
          <tr>
            <th>Imię klienta</th>
            <td>{{ selectedTransaction.customer_first_name }}</td>
          </tr>
          <tr>
            <th>Nazwisko klienta</th>
            <td>{{ selectedTransaction.customer_last_name }}</td>
          </tr>
          <tr>
            <th>Email klienta</th>
            <td>{{ selectedTransaction.customer_email }}</td>
          </tr>
          <tr>
            <th>Telefon klienta</th>
            <td>{{ selectedTransaction.customer_phone }}</td>
          </tr>
          <tr>
            <th>Link płatności</th>
            <td>
              <a
                v-if="selectedTransaction.payment_link_id"
                :href="`http://localhost:8080/pay/${selectedTransaction.payment_link_id}`"
                target="_blank"
                class="transactions-link"
              >
                {{ selectedTransaction.payment_link_id }}
              </a>
              <span v-else>N/A</span>
            </td>
          </tr>
          <tr>
            <th>Data utworzenia</th>
            <td>{{ selectedTransaction.created_at }}</td>
          </tr>
          <tr>
            <th>Data aktualizacji</th>
            <td>{{ selectedTransaction.updated_at }}</td>
          </tr>
        </tbody>
      </table>
      <button class="transaction-modal-close" @click="closeTransactionModal">Zamknij</button>
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
      showTransactionModal: false,
      selectedTransaction: null,
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
    openTransactionModal(transaction) {
      this.selectedTransaction = transaction;
      this.showTransactionModal = true;
    },
    closeTransactionModal() {
      this.showTransactionModal = false;
      this.selectedTransaction = null;
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
  background: #ff6600; 
  border: none;
  border-radius: 4px;
  padding: 0.8rem 1.2rem;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}
.transactions-btn-filter:hover {
  background: #e65c00;
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
.transaction-modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.25);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.transaction-modal {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 32px rgba(0,0,0,0.18);
  padding: 2.5rem 2.5rem 2rem 2.5rem;
  min-width: 340px;
  max-width: 420px;
  width: 100%;
  font-size: 1.1rem;
  position: relative;
}
.transaction-modal h2 {
  color: #ff6600;
  margin-bottom: 1.2rem;
  font-size: 1.4rem;
  font-weight: bold;
}
.transaction-modal-row {
  margin-bottom: 0.7rem;
  word-break: break-all;
}
.transaction-modal-close {
  margin-top: 1.5rem;
  background: #ff6600;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 10px 28px;
  font-size: 15px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
}
.transaction-modal-close:hover {
  background: #e65c00;
}
.transaction-details-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1.5rem;
}
.transaction-details-table th,
.transaction-details-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #ececec;
  text-align: left;
  font-size: 1rem;
}
.transaction-details-table th {
  background: #fafbfc;
  color: #ff6600;
  width: 160px;
  font-weight: 600;
}
.transaction-details-table tr:last-child th,
.transaction-details-table tr:last-child td {
  border-bottom: none;
}
</style>
