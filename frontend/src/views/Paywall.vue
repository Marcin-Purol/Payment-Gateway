<template>
  <div class="paywall">
    <h1 v-if="!isStatusConfirmed">Dokończ płatność</h1>
    <h1 v-else>Status płatności</h1>

    <div v-if="transaction">
      <p><strong>Tytuł:</strong> {{ transaction.title }}</p>
      <p>
        <strong>Kwota:</strong> {{ transaction.amount }}
        {{ transaction.currency }}
      </p>
      <p><strong>Status:</strong> {{ statusPolish(transaction.status) }}</p>

      <div v-if="transaction.status.toLowerCase() === 'pending'">
        <button @click="openConfirmationModal('success')">Opłacone</button>
        <button @click="openConfirmationModal('failed')">Nieudane</button>
      </div>
    </div>

    <p v-else>Ładowanie...</p>

    <div v-if="isModalOpen" class="modal-overlay">
      <div class="modal">
        <h2>Potwierdź zmianę statusu</h2>
        <p>
          Czy na pewno chcesz oznaczyć tę płatność jako
          <span v-if="selectedStatus === 'success'">opłaconą</span>
          <span v-else-if="selectedStatus === 'failed'">nieudaną</span>
          ?
        </p>
        <div class="modal-actions">
          <button @click="confirmStatusChange" class="confirm-button">
            Tak
          </button>
          <button @click="closeModal" class="cancel-button">Nie</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import apiClient from "../api/axios";

const statusMap = {
  Pending: "Oczekująca",
  Success: "Opłacona",
  Failed: "Nieudana",
  Cancelled: "Anulowana",
};

export default {
  name: "PaymentPaywall",
  data() {
    return {
      transaction: null,
      isModalOpen: false,
      selectedStatus: null,
      isStatusConfirmed: false,
    };
  },
  async created() {
    const paymentLinkId = this.$route.params.paymentLinkId;
    try {
      const response = await apiClient.get(`/transaction/pay/${paymentLinkId}`);
      this.transaction = response.data;

      if (
        this.transaction.status.toLowerCase() === "success" ||
        this.transaction.status.toLowerCase() === "failed"
      ) {
        this.isStatusConfirmed = true;
      }
    } catch (err) {
      console.error("Failed to fetch transaction:", err);
    }
  },
  methods: {
    openConfirmationModal(status) {
      this.selectedStatus = status;
      this.isModalOpen = true;
    },
    closeModal() {
      this.isModalOpen = false;
      this.selectedStatus = null;
    },
    async confirmStatusChange() {
      try {
        await apiClient.patch(
          `/transaction/pay/${
            this.transaction.payment_link_id || this.transaction.paymentLinkId
          }`,
          {
            status: this.selectedStatus,
          }
        );
        this.transaction.status =
          this.selectedStatus.charAt(0).toUpperCase() +
          this.selectedStatus.slice(1);
        this.isStatusConfirmed = true;
      } catch (err) {
        console.error("Failed to update payment status:", err);
        this.$root.$refs.toast.show(
          "Nie udało się zaktualizować statusu płatności.",
          "error"
        );
      } finally {
        this.closeModal();
      }
    },
    statusPolish(status) {
      return statusMap[status] || status;
    },
  },
};
</script>

<style scoped>
.paywall {
  max-width: 420px;
  margin: 48px auto 0 auto;
  padding: 2.5rem 2rem 2rem 2rem;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.13);
  text-align: center;
  font-family: "ING Me Regular", Arial, sans-serif;
}

.paywall h1 {
  color: #ff6600;
  font-size: 2rem;
  margin-bottom: 1.5rem;
  font-weight: bold;
}

.paywall p {
  color: #222;
  font-size: 1.1rem;
  margin-bottom: 0.7rem;
}

.paywall strong {
  color: #ff6600;
}

.paywall button {
  margin: 0.5rem 0.5rem 0 0.5rem;
  padding: 0.8rem 1.5rem;
  font-size: 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.paywall button:first-of-type {
  background-color: #43b384;
  color: #fff;
}

.paywall button:last-of-type {
  background-color: #ff6600;
  color: #fff;
}

.paywall .modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.paywall .modal {
  background: #fff;
  border-radius: 8px;
  padding: 2rem 2.5rem;
  min-width: 320px;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.13);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.paywall .modal h2 {
  color: #ff6600;
  margin-bottom: 1rem;
}

.paywall .modal p {
  color: #222;
  margin-bottom: 1.5rem;
}

.paywall .modal-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.paywall .confirm-button {
  background-color: #43b384;
  color: #fff;
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.paywall .cancel-button {
  background-color: #ff0000;
  color: #fff;
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
