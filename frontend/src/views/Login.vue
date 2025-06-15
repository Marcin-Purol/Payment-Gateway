<template>
  <div class="pg-login-bg">
    <div class="pg-login-header">
      <span>To jest środowisko testowe (SANDBOX)</span>
    </div>
    <div class="pg-login-center">
      <div class="pg-login-card">
        <div class="pg-login-logo">
          <span class="pg-logo-text">Payment Gateway</span>
        </div>
        <h2 class="pg-login-title">Zaloguj się</h2>
        <form @submit.prevent="login" class="pg-login-form">
          <label for="email" class="pg-login-label">Email *</label>
          <input
            id="email"
            type="email"
            v-model="email"
            class="pg-login-input"
            required
            autocomplete="username"
          />
          <label for="password" class="pg-login-label">Hasło *</label>
          <input
            id="password"
            type="password"
            v-model="password"
            class="pg-login-input"
            required
            autocomplete="current-password"
          />
          <button type="submit" class="pg-login-btn">Zaloguj się</button>
        </form>
        <div class="pg-login-links">
          <span class="pg-login-link" @click="resetPassword"
            >Zresetuj hasło</span
          >
        </div>
        <div class="pg-login-divider"></div>
        <div class="pg-login-register">
          <span>Utwórz konto</span>
          <p class="pg-login-register-desc">
            Możesz utworzyć konto w środowisku testowym (SANDBOX).
          </p>
          <span class="pg-login-link" @click="register"
            >Utwórz konto Akceptanta</span
          >
        </div>
        <p v-if="error" class="pg-login-error">{{ error }}</p>
      </div>
    </div>
    <AppFooter />
  </div>
</template>

<script>
import apiClient from "../api/axios";
import AppFooter from "../components/AppFooter.vue";

export default {
  name: "LoginPage",
  components: { AppFooter },
  data() {
    return {
      email: "",
      password: "",
      error: null,
    };
  },
  methods: {
    async login() {
      try {
        this.error = null;
        await apiClient.post("/merchant/login", {
          email: this.email,
          password: this.password,
        });

        this.$router.push("/dashboard");
      } catch (err) {
        this.error = "Nieprawidłowy login lub hasło";
      }
    },
    resetPassword() {
      this.$root.$refs.toast.show(
        "Funkcja resetowania hasła nie jest jeszcze dostępna.",
        "error"
      );
    },
    register() {
      this.$router.push("/register");
    },
  },
};
</script>

<style scoped>
.pg-login-bg {
  min-height: 100vh;
  background: #f7f7f7;
  position: relative;
  display: flex;
  flex-direction: column;
  font-family: "Inter", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}
.pg-login-header {
  width: 100vw;
  background: #ff6600;
  color: #fff;
  text-align: center;
  padding: 8px 0;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.5px;
}
.pg-login-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pg-login-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.13);
  padding: 2.5rem 2.5rem 2rem 2.5rem;
  width: 350px;
  max-width: 95vw;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.pg-login-logo {
  margin-bottom: 18px;
}
.pg-logo-text {
  font-size: 2rem;
  font-weight: bold;
  color: #ff6600;
  letter-spacing: 1px;
  white-space: nowrap;
}
.pg-login-title {
  font-size: 18px;
  font-weight: 500;
  color: #333;
  margin-bottom: 18px;
  text-align: center;
}
.pg-login-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pg-login-label {
  font-size: 14px;
  color: #444;
  margin-bottom: 2px;
  margin-top: 10px;
}
.pg-login-input {
  padding: 10px 12px;
  border: 1px solid #d8d8d8;
  border-radius: 4px;
  font-size: 15px;
  background: #fafbfc;
  color: #222;
  outline: none;
  transition: border 0.2s;
  font-family: inherit;
}
.pg-login-input:focus {
  border: 1.5px solid #ff6600;
}
.pg-login-btn {
  margin-top: 18px;
  background: #d8d8d8;
  color: #333;
  border: none;
  border-radius: 4px;
  padding: 10px 0;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  font-family: inherit;
}
.pg-login-btn:hover {
  background: #ff6600;
  color: #fff;
}
.pg-login-links {
  width: 100%;
  text-align: right;
  margin-top: 8px;
}
.pg-login-link {
  color: #ff6600;
  font-size: 14px;
  text-decoration: none;
  cursor: pointer;
  transition: text-decoration 0.2s;
  font-family: inherit;
}
.pg-login-link:hover {
  text-decoration: underline;
}
.pg-login-divider {
  width: 100%;
  height: 1px;
  background: #ececec;
  margin: 18px 0 10px 0;
}
.pg-login-register {
  width: 100%;
  text-align: left;
  font-size: 14px;
  color: #444;
}
.pg-login-register-desc {
  font-size: 13px;
  color: #888;
  margin: 6px 0 6px 0;
}
.pg-login-error {
  color: #dc3545;
  margin-top: 10px;
  font-size: 14px;
  text-align: center;
}
.pg-login-footer {
  width: 100vw;
  background: #fff;
  color: #888;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 8px 0 6px 0;
  border-top: 1px solid #ececec;
  position: fixed;
  bottom: 0;
  left: 0;
  font-family: inherit;
}
.pg-login-footer-link {
  color: #ff6600;
  margin: 0 8px;
  text-decoration: none;
}
.pg-login-footer-link:hover {
  text-decoration: underline;
}
.pg-login-lang {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
