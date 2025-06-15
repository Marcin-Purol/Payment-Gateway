<template>
  <div class="create-payment-link-bg">
    <div style="height: 32px"></div>
    <div class="create-payment-link-center">
      <div class="create-payment-link-container">
        <div class="hero-section">
          <div class="hero-content">
            <h1 class="hero-title">Generuj link płatności</h1>
            <p class="hero-subtitle">
              Stwórz bezpieczny link do płatności dla swoich klientów
            </p>
          </div>
        </div>

        <div class="form-card">
          <form @submit.prevent="createTransaction">
            <div class="form-section">
              <h3 class="section-title">Wybierz sklep</h3>
              <div class="form-group">
                <label for="shop" class="form-label">Sklep:</label>
                <select
                  v-model="selectedShop"
                  @change="updateServiceId"
                  class="form-input"
                  :disabled="activeShops.length === 0"
                >
                  <option v-if="activeShops.length === 0" value="">
                    Brak aktywnych sklepów
                  </option>
                  <option
                    v-for="shop in activeShops"
                    :key="shop.serviceId"
                    :value="shop"
                  >
                    {{ shop.name }}
                  </option>
                </select>
                <p v-if="activeShops.length === 0" class="warning-message">
                  ⚠️ Wszystkie sklepy są dezaktywowane. Skontaktuj się z
                  administratorem, aby aktywować sklep.
                </p>
              </div>
            </div>

            <div class="form-section">
              <h3 class="section-title">Szczegóły płatności</h3>
              <div class="form-row">
                <div class="form-group">
                  <label for="amount" class="form-label">Kwota:</label>
                  <input
                    type="number"
                    step="0.01"
                    v-model="amount"
                    class="form-input"
                    :disabled="activeShops.length === 0"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div class="form-group">
                  <label for="currency" class="form-label">Waluta:</label>
                  <select
                    v-model="currency"
                    class="form-input"
                    :disabled="activeShops.length === 0"
                  >
                    <option value="PLN">PLN</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label for="title" class="form-label">Tytuł płatności:</label>
                <input
                  type="text"
                  v-model="title"
                  class="form-input"
                  :disabled="activeShops.length === 0"
                  placeholder="Opis transakcji"
                  required
                />
              </div>
            </div>

            <div class="form-section">
              <h3 class="section-title">Dane klienta</h3>
              <div class="form-row">
                <div class="form-group">
                  <label for="customerFirstName" class="form-label"
                    >Imię:</label
                  >
                  <input
                    type="text"
                    v-model="customer.firstName"
                    class="form-input"
                    :disabled="activeShops.length === 0"
                    placeholder="Jan"
                    required
                  />
                </div>
                <div class="form-group">
                  <label for="customerLastName" class="form-label"
                    >Nazwisko:</label
                  >
                  <input
                    type="text"
                    v-model="customer.lastName"
                    class="form-input"
                    :disabled="activeShops.length === 0"
                    placeholder="Kowalski"
                    required
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="customerEmail" class="form-label">Email:</label>
                  <input
                    type="email"
                    v-model="customer.email"
                    class="form-input"
                    :disabled="activeShops.length === 0"
                    placeholder="jan.kowalski@email.com"
                    required
                  />
                </div>
                <div class="form-group">
                  <label for="customerPhone" class="form-label">Telefon:</label>
                  <input
                    type="text"
                    v-model="customer.phone"
                    class="form-input"
                    :disabled="activeShops.length === 0"
                    placeholder="+48 123 456 789"
                    required
                  />
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button
                type="submit"
                class="submit-btn"
                :disabled="activeShops.length === 0 || isLoading"
                :class="{
                  disabled: activeShops.length === 0,
                  loading: isLoading,
                }"
              >
                <span v-if="isLoading" class="loading-spinner"></span>
                {{ isLoading ? "Generowanie..." : "Generuj link płatności" }}
              </button>
            </div>
          </form>

          <div v-if="success" class="success-message">
            <div class="message-icon">✅</div>
            <div class="message-content">
              <h4>Sukces!</h4>
              <p>{{ success }}</p>
            </div>
          </div>

          <div v-if="error" class="error-message">
            <div class="message-icon">❌</div>
            <div class="message-content">
              <h4>Błąd</h4>
              <p>{{ error }}</p>
            </div>
          </div>

          <div v-if="paymentLink" class="result-card">
            <div class="result-header">
              <h3>🎉 Link płatności został wygenerowany!</h3>
              <p>Wyślij ten link do klienta lub użyj go w swojej aplikacji</p>
            </div>
            <div class="link-container">
              <input
                type="text"
                :value="paymentLink"
                readonly
                class="link-input"
                ref="linkInput"
              />
              <button
                @click="copyLink"
                class="copy-btn"
                :class="{ copied: linkCopied }"
              >
                {{ linkCopied ? "✓" : "📋" }}
              </button>
            </div>
            <div class="link-actions">
              <a :href="paymentLink" target="_blank" class="test-link-btn">
                🔗 Otwórz link
              </a>
              <button @click="createAnother" class="another-btn">
                ➕ Stwórz kolejny
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
  name: "CreatePaymentLink",
  data() {
    return {
      shops: [],
      selectedShop: null,
      serviceId: "",
      amount: "",
      currency: "PLN",
      title: "",
      customer: {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
      },
      error: null,
      success: null,
      paymentLink: null,
      isLoading: false,
      linkCopied: false,
    };
  },
  computed: {
    activeShops() {
      return this.shops.filter((shop) => {
        return (
          shop.active == 1 || shop.active === true || shop.active === "true"
        );
      });
    },
  },
  async created() {
    try {
      const userData = await authService.checkAuth();
      if (!userData || !userData.user) {
        this.$router.push("/login");
        return;
      }

      const response = await apiClient.get("/merchant/shops");
      this.shops = response.data;
      if (this.activeShops.length > 0) {
        this.selectedShop = this.activeShops[0];
        this.serviceId = this.selectedShop.serviceId;
      } else {
        this.error =
          "Brak aktywnych sklepów. Skontaktuj się z administratorem.";
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        this.$router.push("/login");
      } else {
        this.error = "Nie udało się pobrać listy sklepów.";
      }
    }
  },
  methods: {
    updateServiceId() {
      this.serviceId = this.selectedShop.serviceId;
    },
    async createTransaction() {
      try {
        this.isLoading = true;
        this.error = null;
        this.success = null;
        this.paymentLink = null;

        if (this.activeShops.length === 0) {
          this.error =
            "Brak aktywnych sklepów. Nie można wygenerować linku płatności.";
          return;
        }
        if (!this.selectedShop || !this.selectedShop.active) {
          this.error = "Wybrany sklep nie jest aktywny. Wybierz inny sklep.";
          return;
        }

        const response = await apiClient.post("/transaction/generate-link", {
          serviceId: this.serviceId,
          amount: parseFloat(this.amount),
          currency: this.currency,
          title: this.title,
          customer: this.customer,
        });

        this.success = `Link płatności został pomyślnie wygenerowany!`;
        this.paymentLink = response.data.paymentLink;
      } catch (err) {
        if (err.response && err.response.status === 401) {
          this.$router.push("/login");
        } else {
          this.error =
            err.response?.data?.error ||
            "Nie udało się wygenerować linku płatności.";
        }
      } finally {
        this.isLoading = false;
      }
    },
    copyLink() {
      if (this.$refs.linkInput) {
        this.$refs.linkInput.select();
        document.execCommand("copy");
        this.linkCopied = true;
        setTimeout(() => {
          this.linkCopied = false;
        }, 2000);
      }
    },
    createAnother() {
      this.paymentLink = null;
      this.success = null;
      this.error = null;
      this.amount = "";
      this.title = "";
      this.customer = {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
      };
    },
  },
};
</script>

<style scoped>
.create-payment-link-bg {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
  position: relative;
  display: flex;
  flex-direction: column;
  font-family: "Inter", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

.create-payment-link-center {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 0 20px;
}

.create-payment-link-container {
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.hero-section {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 2.5rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  text-align: center;
}

.hero-title {
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #ff6600, #ff8533);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 0.5rem 0;
  letter-spacing: -1px;
}

.hero-subtitle {
  font-size: 1.125rem;
  color: #6b7280;
  font-weight: 400;
  margin: 0;
}

.form-card {
  background: #fff;
  border-radius: 20px;
  padding: 2.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.form-section {
  margin-bottom: 2rem;
}

.form-section:last-of-type {
  margin-bottom: 0;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #f3f4f6;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  margin-bottom: 1.5rem;
}

.form-label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #374151;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.form-input {
  background: #f9fafb;
  color: #111827;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
  font-size: 1rem;
  transition: all 0.2s ease;
  font-family: inherit;
}

.form-input:focus {
  outline: none;
  border-color: #ff6600;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.1);
}

.form-input:disabled {
  background: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
  border-color: #d1d5db;
}

.form-input::placeholder {
  color: #9ca3af;
}

.warning-message {
  background: #fef3cd;
  color: #92400e;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  border: 1px solid #f59e0b;
}

.form-actions {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

.submit-btn {
  background: linear-gradient(135deg, #ff6600, #ff8533);
  color: #fff;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  padding: 1rem 2rem;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(255, 102, 0, 0.3);
}

.submit-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.success-message,
.error-message {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 12px;
  margin-top: 1.5rem;
}

.success-message {
  background: #ecfdf5;
  border: 1px solid #10b981;
  color: #047857;
}

.error-message {
  background: #fef2f2;
  border: 1px solid #ef4444;
  color: #dc2626;
}

.message-icon {
  font-size: 1.5rem;
}

.message-content h4 {
  margin: 0 0 0.25rem 0;
  font-weight: 600;
}

.message-content p {
  margin: 0;
  font-size: 0.875rem;
}

.result-card {
  background: linear-gradient(135deg, #ecfdf5, #f0fdf4);
  border: 2px solid #10b981;
  border-radius: 16px;
  padding: 2rem;
  margin-top: 2rem;
}

.result-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.result-header h3 {
  color: #047857;
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
}

.result-header p {
  color: #065f46;
  margin: 0;
  font-size: 0.875rem;
}

.link-container {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.link-input {
  flex: 1;
  background: #fff;
  border: 2px solid #10b981;
  border-radius: 8px;
  padding: 1rem;
  font-size: 0.875rem;
  color: #047857;
  font-family: monospace;
}

.copy-btn {
  background: #10b981;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 60px;
}

.copy-btn:hover {
  background: #059669;
}

.copy-btn.copied {
  background: #047857;
}

.link-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.test-link-btn,
.another-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
  font-size: 0.875rem;
}

.test-link-btn {
  background: #10b981;
  color: #fff;
}

.test-link-btn:hover {
  background: #059669;
  transform: translateY(-1px);
}

.another-btn {
  background: #f3f4f6;
  color: #374151;
}

.another-btn:hover {
  background: #e5e7eb;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .create-payment-link-container {
    max-width: 100%;
  }

  .hero-title {
    font-size: 2rem;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .link-container {
    flex-direction: column;
  }

  .link-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .hero-section,
  .form-card {
    padding: 1.5rem;
  }

  .hero-title {
    font-size: 1.75rem;
  }
}
</style>
