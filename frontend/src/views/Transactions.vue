<template>
  <div class="transactions-bg">
    <div style="height: 32px"></div>
    <div class="transactions-center">
      <div class="transactions-card">
        <div class="transactions-logo" style="margin-bottom: 12px">
          <span class="transactions-logo-text">Transakcje</span>
        </div>
        <table class="transactions-table">
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
      try {
        const token = localStorage.getItem("token");
        const response = await apiClient.get(
          "/transaction/merchant/transactions",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        this.transactions = response.data;
      } catch (err) {
        if (err.response && err.response.status === 401) {
          this.$router.push("/login");
        } else {
          console.error("Failed to fetch transactions:", err);
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
</style>
