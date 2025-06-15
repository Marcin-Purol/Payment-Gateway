<template>
  <div class="paywall-bg" :class="getBgClass()">
    <div class="paywall-container">
      <div class="header-section">
        <div class="brand-logo">
          <span class="logo-icon">💳</span>
          <span class="brand-name">Payment Gateway</span>
        </div>
        <div class="security-badges">
          <span class="security-badge">🔒 Bezpieczne</span>
        </div>
      </div>

      <div class="payment-card">
        <div v-if="!transaction" class="loading-state">
          <div class="loading-spinner-container">
            <div class="loading-spinner"></div>
            <div class="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
          <h2>Ładowanie szczegółów płatności...</h2>
          <p>Proszę czekać, pobieramy informacje o transakcji</p>
        </div>
        <div
          v-else-if="transaction.status.toLowerCase() === 'pending'"
          class="payment-pending state-transition"
        >
          <div class="status-header">
            <div class="status-icon pending-icon pulse-animation">⏳</div>
            <h1 class="payment-title">Dokończ płatność</h1>
            <p class="payment-subtitle">
              Wybierz status płatności aby kontynuować
            </p>
          </div>

          <div class="transaction-details">
            <div class="amount-section">
              <div class="amount-label">Kwota do zapłaty</div>
              <div class="amount-value">
                {{ formatCurrency(transaction.amount) }}
                {{ transaction.currency }}
              </div>
            </div>

            <div class="details-grid">
              <div class="detail-item">
                <span class="detail-label">Tytuł płatności:</span>
                <span class="detail-value">{{ transaction.title }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">ID transakcji:</span>
                <span class="detail-value">
                  <span class="transaction-id" @click="copyTransactionId"
                    >#{{ transaction.id }}</span
                  >
                  <button
                    class="copy-btn"
                    @click="copyTransactionId"
                    title="Kopiuj ID"
                  >
                    <span class="copy-icon">📋</span>
                  </button>
                </span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Status:</span>
                <span class="detail-value">
                  <span class="status-badge pending">{{
                    statusPolish(transaction.status)
                  }}</span>
                </span>
              </div>
            </div>
          </div>

          <div class="payment-actions">
            <button
              @click="openConfirmationModal('success')"
              class="payment-btn success-btn"
            >
              <span class="btn-icon">✅</span>
              Oznacz jako opłacone
            </button>
            <button
              @click="openConfirmationModal('failed')"
              class="payment-btn failed-btn"
            >
              <span class="btn-icon">❌</span>
              Oznacz jako nieudane
            </button>
          </div>
          <div class="help-section">
            <p class="help-text">
              <span class="help-icon">💡</span>
              Wybierz odpowiedni status płatności
            </p>
            <button
              class="share-link-btn"
              @click="sharePaymentLink"
              title="Udostępnij link płatności"
            >
              <span class="share-icon">🔗</span>
              Udostępnij link
            </button>
          </div>
        </div>
        <div v-else class="payment-completed state-transition">
          <div class="status-header">
            <div
              class="status-icon"
              :class="{
                'success-icon': transaction.status.toLowerCase() === 'success',
                'failed-icon': transaction.status.toLowerCase() === 'failed',
                'cancelled-icon':
                  transaction.status.toLowerCase() === 'cancelled',
              }"
            >
              <span v-if="transaction.status.toLowerCase() === 'success'"
                >✅</span
              >
              <span v-else-if="transaction.status.toLowerCase() === 'failed'"
                >❌</span
              >
              <span v-else>🚫</span>
            </div>
            <h1 class="payment-title">
              <span v-if="transaction.status.toLowerCase() === 'success'"
                >Płatność zakończona</span
              >
              <span v-else-if="transaction.status.toLowerCase() === 'failed'"
                >Płatność nieudana</span
              >
              <span v-else>Płatność anulowana</span>
            </h1>
            <p class="payment-subtitle">
              <span v-if="transaction.status.toLowerCase() === 'success'">
                Dziękujemy! Twoja płatność została pomyślnie przetworzona.
              </span>
              <span v-else-if="transaction.status.toLowerCase() === 'failed'">
                Niestety, płatność nie mogła zostać przetworzona.
              </span>
              <span v-else> Płatność została anulowana. </span>
            </p>
          </div>

          <div class="transaction-summary">
            <div class="summary-item">
              <span class="summary-label">Kwota:</span>
              <span class="summary-value">
                {{ formatCurrency(transaction.amount) }}
                {{ transaction.currency }}
              </span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Tytuł:</span>
              <span class="summary-value">{{ transaction.title }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">ID transakcji:</span>
              <span class="summary-value">
                <span class="transaction-id" @click="copyTransactionId"
                  >#{{ transaction.id }}</span
                >
                <button
                  class="copy-btn"
                  @click="copyTransactionId"
                  title="Kopiuj ID"
                >
                  <span class="copy-icon">📋</span>
                </button>
              </span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Status:</span>
              <span class="summary-value">
                <span
                  class="status-badge"
                  :class="{
                    success: transaction.status.toLowerCase() === 'success',
                    failed: transaction.status.toLowerCase() === 'failed',
                    cancelled: transaction.status.toLowerCase() === 'cancelled',
                  }"
                >
                  {{ statusPolish(transaction.status) }}
                </span>
              </span>
            </div>
          </div>

          <div
            v-if="transaction.status.toLowerCase() === 'success'"
            class="next-steps"
          >
            <h3>Co dalej?</h3>
            <ul class="steps-list">
              <li>✅ Płatność została zaksięgowana</li>
              <li>📱 Możesz zamknąć tę stronę</li>
            </ul>
          </div>

          <div
            v-else-if="transaction.status.toLowerCase() === 'failed'"
            class="retry-section"
          >
            <h3>Spróbuj ponownie</h3>
            <p>Jeśli problem się powtarza, skontaktuj się z obsługą klienta.</p>
            <button class="retry-btn" @click="retryPayment">
              <span class="btn-icon">🔄</span>
              Spróbuj ponownie
            </button>
          </div>
        </div>
      </div>

      <div class="security-footer">
        <div class="security-info">
          <span class="security-item">🛡️ Bezpieczne płatności</span>
          <span class="security-item">📞 Wsparcie 24/7</span>
        </div>
        <p class="footer-text">
          Twoje dane są chronione zgodnie z najwyższymi standardami
          bezpieczeństwa
        </p>
      </div>
    </div>

    <div v-if="isModalOpen" class="modal-overlay" @click="closeModal">
      <div class="confirmation-modal" @click.stop>
        <div class="modal-header">
          <div class="modal-icon">
            <span v-if="selectedStatus === 'success'">✅</span>
            <span v-else>❌</span>
          </div>
          <h2>Potwierdź zmianę statusu</h2>
        </div>

        <div class="modal-content">
          <p>
            Czy na pewno chcesz oznaczyć tę płatność jako
            <strong v-if="selectedStatus === 'success'" class="success-text"
              >opłaconą</strong
            >
            <strong v-else class="failed-text">nieudaną</strong>?
          </p>

          <div class="transaction-preview">
            <div class="preview-item">
              <span>Kwota:</span>
              <span
                >{{ formatCurrency(transaction.amount) }}
                {{ transaction.currency }}</span
              >
            </div>
            <div class="preview-item">
              <span>Tytuł:</span>
              <span>{{ transaction.title }}</span>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button
            @click="closeModal"
            class="modal-btn cancel-btn"
            :disabled="isLoading"
          >
            <span class="btn-icon">✕</span>
            Anuluj
          </button>
          <button
            @click="confirmStatusChange"
            class="modal-btn confirm-btn"
            :disabled="isLoading"
          >
            <div v-if="isLoading" class="btn-spinner"></div>
            <span v-else class="btn-icon">✓</span>
            <span v-if="isLoading">Zapisywanie...</span>
            <span v-else>Potwierdź</span>
          </button>
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
      isLoading: false,
    };
  },
  async created() {
    const paymentLinkId = this.$route.params.paymentLinkId;
    try {
      const response = await apiClient.get(`/transaction/pay/${paymentLinkId}`);
      this.transaction = response.data;

      if (
        this.transaction.status.toLowerCase() === "success" ||
        this.transaction.status.toLowerCase() === "failed" ||
        this.transaction.status.toLowerCase() === "cancelled"
      ) {
        this.isStatusConfirmed = true;
      }
    } catch (err) {
      this.$router.push("/404");
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
      this.isLoading = true;
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

        this.showNotification(
          "Status płatności został zaktualizowany",
          "success"
        );
      } catch (err) {
        this.showNotification(
          "Nie udało się zaktualizować statusu płatności",
          "error"
        );
      } finally {
        this.isLoading = false;
        this.closeModal();
      }
    },
    statusPolish(status) {
      return statusMap[status] || status;
    },
    formatCurrency(amount) {
      return new Intl.NumberFormat("pl-PL", {
        style: "currency",
        currency: "PLN",
      }).format(amount);
    },
    retryPayment() {
      this.transaction.status = "Pending";
      this.isStatusConfirmed = false;
      this.showNotification(
        "Możesz ponownie spróbować dokonać płatności",
        "info"
      );
    },
    showNotification(message, type) {
      if (this.$root.$refs.toast) {
        this.$root.$refs.toast.show(message, type);
      }
    },
    copyTransactionId() {
      const textToCopy = `${this.transaction.id}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(textToCopy)
          .then(() => {
            this.showNotification(
              "ID transakcji zostało skopiowane do schowka",
              "success"
            );
          })
          .catch(() => {
            this.fallbackCopyTextToClipboard(textToCopy);
          });
      } else {
        this.fallbackCopyTextToClipboard(textToCopy);
      }
    },
    fallbackCopyTextToClipboard(text) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand("copy");
        this.showNotification(
          "ID transakcji zostało skopiowane do schowka",
          "success"
        );
      } catch (err) {
        this.showNotification("Nie udało się skopiować ID transakcji", "error");
      }

      document.body.removeChild(textArea);
    },
    sharePaymentLink() {
      const currentUrl = window.location.href;
      if (navigator.share) {
        navigator
          .share({
            title: "Link do płatności",
            text: `Płatność: ${this.transaction.title}`,
            url: currentUrl,
          })
          .catch(() => {
            this.copyPaymentLink(currentUrl);
          });
      } else {
        this.copyPaymentLink(currentUrl);
      }
    },
    copyPaymentLink(url) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(url)
          .then(() => {
            this.showNotification(
              "Link płatności zostanie skopiowany do schowka",
              "success"
            );
          })
          .catch(() => {
            this.fallbackCopyTextToClipboard(url);
          });
      } else {
        this.fallbackCopyTextToClipboard(url);
      }
    },
    getBgClass() {
      if (!this.transaction) return "bg-loading";

      const status = this.transaction.status.toLowerCase();
      switch (status) {
        case "success":
          return "bg-success";
        case "failed":
          return "bg-failed";
        case "cancelled":
          return "bg-cancelled";
        default:
          return "bg-pending";
      }
    },
  },
};
</script>

<style scoped>
.paywall-bg {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  font-family: "Inter", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  transition: background 0.5s ease;
}

.paywall-bg.bg-loading {
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
}

.paywall-bg.bg-pending {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
}

.paywall-bg.bg-success {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
}

.paywall-bg.bg-failed {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
}

.paywall-bg.bg-cancelled {
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
}

.paywall-container {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 1rem 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  font-size: 2rem;
}

.brand-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
}

.security-badges {
  display: flex;
  gap: 0.75rem;
}

.security-badge {
  background: #d1fae5;
  color: #065f46;
  padding: 0.375rem 0.75rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
}

.payment-card {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.loading-state {
  padding: 4rem 2rem;
  text-align: center;
}

.loading-spinner-container {
  position: relative;
  display: inline-block;
  margin-bottom: 2rem;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #ff6600;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-dots {
  position: absolute;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 4px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  background: #ff6600;
  border-radius: 50%;
  animation: bounce 1.4s ease-in-out infinite both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}
.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-state h2 {
  font-size: 1.5rem;
  color: #111827;
  margin-bottom: 0.5rem;
}

.loading-state p {
  color: #6b7280;
  font-size: 1rem;
}

.status-header {
  text-align: center;
  padding: 3rem 2rem 2rem 2rem;
  background: linear-gradient(135deg, #f8fafc 0%, #e5e7eb 100%);
}

.status-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem auto;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.pending-icon {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
}

.success-icon {
  background: linear-gradient(135deg, #10b981, #059669);
}

.failed-icon {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.cancelled-icon {
  background: linear-gradient(135deg, #6b7280, #4b5563);
}

.payment-title {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.75rem 0;
}

.payment-subtitle {
  font-size: 1.125rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.5;
}

.transaction-details {
  padding: 2rem;
}

.amount-section {
  text-align: center;
  margin-bottom: 2rem;
  padding: 2rem;
  background: linear-gradient(135deg, #fff5f0, #fff);
  border-radius: 16px;
  border: 2px solid #ff6600;
}

.amount-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.amount-value {
  font-size: 2.5rem;
  font-weight: 700;
  color: #ff6600;
}

.details-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 12px;
  border-left: 4px solid #ff6600;
}

.detail-label {
  font-weight: 600;
  color: #374151;
}

.detail-value {
  color: #111827;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.transaction-id {
  cursor: pointer;
  transition: color 0.2s ease;
}

.transaction-id:hover {
  color: #ff6600;
}

.copy-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  opacity: 0.7;
}

.copy-btn:hover {
  background: #f3f4f6;
  opacity: 1;
  transform: scale(1.1);
}

.copy-icon {
  font-size: 0.875rem;
}

.status-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.success {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.failed {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.cancelled {
  background: #f3f4f6;
  color: #374151;
}

.payment-actions {
  padding: 0 2rem 2rem 2rem;
  display: flex;
  gap: 1rem;
  flex-direction: column;
}

.payment-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.payment-btn::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transition: left 0.5s;
}

.payment-btn:hover::before {
  left: 100%;
}

.payment-btn:focus {
  outline: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 0 0 3px rgba(255, 102, 0, 0.3);
}

.success-btn {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
}

.success-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
}

.failed-btn {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
}

.failed-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
}

.btn-icon {
  font-size: 1.125rem;
}

.help-section {
  padding: 1rem 2rem 2rem 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.help-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
}

.help-icon {
  font-size: 1rem;
}

.share-link-btn {
  background: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  align-self: center;
}

.share-link-btn:hover {
  background: #e5e7eb;
  transform: translateY(-1px);
}

.share-icon {
  font-size: 1rem;
}

.transaction-summary {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 12px;
}

.summary-label {
  font-weight: 600;
  color: #374151;
}

.summary-value {
  color: #111827;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.next-steps {
  padding: 0 2rem 2rem 2rem;
  text-align: center;
}

.next-steps h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 1rem 0;
}

.steps-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.steps-list li {
  background: #d1fae5;
  color: #065f46;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 500;
}

.retry-section {
  padding: 0 2rem 2rem 2rem;
  text-align: center;
}

.retry-section h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.retry-section p {
  color: #6b7280;
  margin: 0 0 1.5rem 0;
}

.retry-btn {
  background: linear-gradient(135deg, #ff6600, #ff8533);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin: 0 auto;
  box-shadow: 0 4px 12px rgba(255, 102, 0, 0.3);
}

.retry-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 102, 0, 0.4);
}

.security-footer {
  text-align: center;
  padding: 1.5rem;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.security-info {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.security-item {
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
}

.footer-text {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
  padding: 1rem;
}

.confirmation-modal {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  width: 100%;
  animation: slideInUp 0.3s ease;
}

.modal-header {
  text-align: center;
  padding: 2rem 2rem 1rem 2rem;
}

.modal-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 1rem auto;
  background: #f3f4f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.modal-content {
  padding: 0 2rem 1rem 2rem;
}

.modal-content p {
  text-align: center;
  color: #374151;
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
}

.success-text {
  color: #059669;
}

.failed-text {
  color: #dc2626;
}

.transaction-preview {
  background: #f9fafb;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.preview-item span:first-child {
  color: #6b7280;
  font-weight: 500;
}

.preview-item span:last-child {
  color: #111827;
  font-weight: 600;
}

.modal-actions {
  padding: 1rem 2rem 2rem 2rem;
  display: flex;
  gap: 1rem;
}

.modal-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn {
  background: #f3f4f6;
  color: #374151;
}

.cancel-btn:hover {
  background: #e5e7eb;
  transform: translateY(-1px);
}

.confirm-btn {
  background: linear-gradient(135deg, #ff6600, #ff8533);
  color: #fff;
  box-shadow: 0 4px 12px rgba(255, 102, 0, 0.3);
}

.confirm-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(255, 102, 0, 0.4);
}

.confirm-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.cancel-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.state-transition {
  animation: bounceIn 0.6s ease-out;
}

.pulse-animation {
  animation: pulse 2s ease-in-out infinite;
}

@media (max-width: 768px) {
  .paywall-bg {
    padding: 1rem;
  }

  .header-section {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
    padding: 1.5rem;
  }

  .security-badges {
    justify-content: center;
  }

  .payment-title {
    font-size: 1.5rem;
  }

  .amount-value {
    font-size: 2rem;
  }

  .payment-actions {
    gap: 0.75rem;
  }

  .security-info {
    flex-direction: column;
    gap: 0.75rem;
  }

  .modal-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .paywall-container {
    max-width: 100%;
  }

  .status-header {
    padding: 2rem 1rem 1.5rem 1rem;
  }

  .transaction-details,
  .transaction-summary {
    padding: 1.5rem;
  }

  .payment-actions {
    padding: 0 1.5rem 1.5rem 1.5rem;
  }

  .status-icon {
    width: 60px;
    height: 60px;
    font-size: 2rem;
  }
  .detail-item {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }

  .detail-value,
  .summary-value {
    flex-direction: column;
    gap: 0.25rem;
    align-items: center;
  }

  .copy-btn {
    align-self: center;
  }
}
</style>
