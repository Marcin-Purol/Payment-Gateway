<template>
  <div class="create-payment-link-bg">
    <div style="height: 32px"></div>
    <div class="create-payment-link-center">
      <div class="create-payment-link-card">
        <div class="create-payment-link-logo" style="margin-bottom: 12px">
          <span class="create-payment-link-logo-text"
            >Generuj link płatności</span
          >
        </div>
        <form @submit.prevent="createTransaction">
          <div class="create-payment-link-form-group">
            <label for="shop" class="create-payment-link-label">Sklep:</label>
            <select
              v-model="selectedShop"
              @change="updateServiceId"
              class="create-payment-link-input"
            >
              <option v-for="shop in shops" :key="shop.serviceId" :value="shop">
                {{ shop.name }}
              </option>
            </select>
          </div>

          <div class="create-payment-link-form-group">
            <label for="amount" class="create-payment-link-label">Kwota:</label>
            <input
              type="number"
              step="0.01"
              v-model="amount"
              class="create-payment-link-input"
              required
            />
          </div>

          <div class="create-payment-link-form-group">
            <label for="currency" class="create-payment-link-label"
              >Waluta:</label
            >
            <select v-model="currency" class="create-payment-link-input">
              <option value="PLN">PLN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>

          <div class="create-payment-link-form-group">
            <label for="title" class="create-payment-link-label">Tytuł:</label>
            <input
              type="text"
              v-model="title"
              class="create-payment-link-input"
              required
            />
          </div>

          <div class="create-payment-link-form-group">
            <label for="customerFirstName" class="create-payment-link-label"
              >Imię klienta:</label
            >
            <input
              type="text"
              v-model="customer.firstName"
              class="create-payment-link-input"
              required
            />
          </div>
          <div class="create-payment-link-form-group">
            <label for="customerLastName" class="create-payment-link-label"
              >Nazwisko klienta:</label
            >
            <input
              type="text"
              v-model="customer.lastName"
              class="create-payment-link-input"
              required
            />
          </div>
          <div class="create-payment-link-form-group">
            <label for="customerEmail" class="create-payment-link-label"
              >Email klienta:</label
            >
            <input
              type="email"
              v-model="customer.email"
              class="create-payment-link-input"
              required
            />
          </div>
          <div class="create-payment-link-form-group">
            <label for="customerPhone" class="create-payment-link-label"
              >Telefon klienta:</label
            >
            <input
              type="text"
              v-model="customer.phone"
              class="create-payment-link-input"
              required
            />
          </div>

          <div class="create-payment-link-form-actions">
            <button type="submit" class="create-payment-link-btn">
              Generuj link
            </button>
          </div>
        </form>

        <p v-if="success" class="create-payment-link-success">
          {{ success }}
        </p>
        <p v-if="error" class="create-payment-link-error">{{ error }}</p>

        <div v-if="paymentLink" class="create-payment-link-result">
          <p>Twój link płatności:</p>
          <a
            :href="paymentLink"
            target="_blank"
            class="create-payment-link-link"
          >
            {{ paymentLink }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import apiClient from "../api/axios";

export default {
  name: "CreatePaymentLink",
  data() {
    return {
      shops: [],
      selectedShop: null,
      serviceId: "",
      amount: 100,
      currency: "PLN",
      title: "Test Payment",
      customer: {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "123456789",
      },
      error: null,
      success: null,
      paymentLink: null,
    };
  },
  async created() {
    const token = localStorage.getItem("token");
    if (!token) {
      this.$router.push("/login");
      return;
    }
    try {
      const response = await apiClient.get("/merchant/shops", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      this.shops = response.data;
      if (this.shops.length > 0) {
        this.selectedShop = this.shops[0];
        this.serviceId = this.selectedShop.serviceId;
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        this.$router.push("/login");
      } else {
        console.error("Failed to fetch shops:", err);
      }
    }
  },
  methods: {
    updateServiceId() {
      this.serviceId = this.selectedShop.serviceId;
    },
    async createTransaction() {
      try {
        this.error = null;
        this.success = null;
        this.paymentLink = null;

        const token = localStorage.getItem("token");
        const response = await apiClient.post(
          "/transaction/generate-link",
          {
            serviceId: this.serviceId,
            amount: this.amount,
            currency: this.currency,
            title: this.title,
            customer: this.customer,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        this.success = `Link płatności został wygenerowany!`;
        this.paymentLink = response.data.paymentLink;
      } catch (err) {
        if (err.response && err.response.status === 401) {
          this.$router.push("/login");
        } else {
          this.error =
            err.response?.data?.error ||
            "Nie udało się wygenerować linku płatności.";
        }
      }
    },
  },
};
</script>

<style scoped>
@import url("https://db.onlinewebfonts.com/c/69c633b2a4e41e8101c6f4f149655d5e?family=ING+Me+Regular");

.create-payment-link-bg {
  min-height: 100vh;
  background: #f7f7f7;
  position: relative;
  display: flex;
  flex-direction: column;
  font-family: "ING Me Regular", Arial, sans-serif;
}
.create-payment-link-center {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.create-payment-link-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.13);
  padding: 2.5rem 2.5rem 2rem 2.5rem;
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.create-payment-link-logo {
  font-size: 1.3rem;
  font-weight: bold;
  color: #ff6600;
  margin-bottom: 10px;
}
.create-payment-link-logo-text {
  font-size: 2rem;
  font-weight: bold;
  color: #ff6600;
  letter-spacing: 1px;
  white-space: nowrap;
}
.create-payment-link-title {
  font-size: 1.6rem;
  font-weight: bold;
  color: #ff6600;
  margin-bottom: 1.5rem;
}
.create-payment-link-form-group {
  width: 100%;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.create-payment-link-label {
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #222;
}
.create-payment-link-input {
  background: #fafbfc;
  color: #222;
  border: 1px solid #ececec;
  border-radius: 8px;
  padding: 0.7rem;
  font-size: 15px;
  width: 100%;
  min-width: 300px;
  max-width: 400px;
  box-sizing: border-box;
}
.create-payment-link-form-actions {
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}
.create-payment-link-btn {
  background: #ff6600;
  color: #fff;
  font-weight: bold;
  border: none;
  border-radius: 4px;
  padding: 10px 28px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}
.create-payment-link-btn:hover {
  background: #ff6600;
}
.create-payment-link-success {
  color: #ff6600;
  margin-top: 1.2rem;
  text-align: center;
  width: 100%;
}
.create-payment-link-error {
  color: #ff6b6b;
  margin-top: 1.2rem;
  text-align: center;
  width: 100%;
}
.create-payment-link-result {
  margin-top: 2rem;
  width: 100%;
  text-align: center;
}
.create-payment-link-link {
  color: #ff6600;
  text-decoration: underline;
  word-break: break-all;
}
</style>
