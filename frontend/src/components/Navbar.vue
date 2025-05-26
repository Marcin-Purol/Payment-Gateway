<template>
  <nav class="pg-navbar">
    <div class="pg-navbar-sandbox">To jest środowisko testowe (SANDBOX)</div>
    <div class="pg-navbar-main">
      <div class="pg-navbar-logo-center">
        <span class="pg-navbar-logo-text">Payment Gateway</span>
      </div>
      <div class="pg-navbar-actions">
        <span class="pg-navbar-user">
          {{ userFullName }}
          <template v-if="roles.length">
            &nbsp;(<span class="pg-navbar-roles">{{ roles.join(", ") }}</span
            >)
          </template>
        </span>
        <button class="pg-navbar-logout" @click="logout">Wyloguj</button>
      </div>
    </div>
    <div class="pg-navbar-tabs">
      <router-link
        to="/dashboard"
        class="pg-navbar-tab"
        active-class="pg-navbar-tab--active"
        >Start</router-link
      >
      <router-link
        v-if="hasRole(['Reprezentant', 'Techniczna'])"
        to="/shops"
        class="pg-navbar-tab"
        active-class="pg-navbar-tab--active"
        >Sklepy</router-link
      >
      <router-link
        v-if="hasRole(['Reprezentant', 'Finansowa'])"
        to="/transactions"
        class="pg-navbar-tab"
        active-class="pg-navbar-tab--active"
        >Transakcje</router-link
      >
      <router-link
        v-if="hasRole(['Reprezentant', 'Finansowa'])"
        to="/create-payment-link"
        class="pg-navbar-tab"
        active-class="pg-navbar-tab--active"
        >Linki płatności</router-link
      >
      <router-link
        v-if="hasRole(['Reprezentant'])"
        to="/users"
        class="pg-navbar-tab"
        active-class="pg-navbar-tab--active"
        >Użytkownicy</router-link
      >
      <router-link
        v-if="hasRole(['Reprezentant', 'Finansowa'])"
        to="/reports"
        class="pg-navbar-tab"
        active-class="pg-navbar-tab--active"
        >Raporty</router-link
      >
    </div>
  </nav>
</template>

<script>
import apiClient from "../api/axios";

export default {
  name: "NavbarComponent",
  data() {
    return {
      roles: [],
      userFullName: "",
    };
  },
  async created() {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await apiClient.get("/merchant/roles", {
        headers: { Authorization: `Bearer ${token}` },
      });
      this.roles = response.data.roles || [];
      const userRes = await apiClient.get("/merchant/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      this.userFullName = `${userRes.data.firstName} ${userRes.data.lastName}`;
    } catch (err) {
      this.userFullName = "";
    }
  },
  methods: {
    hasRole(requiredRoles) {
      if (!this.roles || this.roles.length === 0) return false;
      return requiredRoles.some((role) => this.roles.includes(role));
    },
    logout() {
      localStorage.removeItem("token");
      this.$router.push("/login");
    },
  },
};
</script>

<style scoped>
.pg-navbar {
  width: 100vw;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  font-family: "ING Me Regular", Arial, sans-serif;
  position: relative;
  z-index: 100;
}
.pg-navbar-sandbox {
  width: 100vw;
  background: #ff6600;
  color: #fff;
  text-align: center;
  padding: 8px 0;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.5px;
}
.pg-navbar-main {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px 32px 10px 32px;
  background: #fff;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
  position: relative;
  min-height: 56px;
}
.pg-navbar-logo-center {
  position: absolute;
  left: 0;
  right: 0;
  margin: auto;
  text-align: center;
  pointer-events: none;
}
.pg-navbar-logo-text {
  font-size: 1.3rem;
  font-weight: bold;
  color: #ff6600;
  letter-spacing: 1px;
}
.pg-navbar-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 18px;
  position: absolute;
  right: 32px;
  top: 50%;
  transform: translateY(-50%);
}
.pg-navbar-user {
  color: #222;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.pg-navbar-logout {
  background: #ff6600;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 7px 18px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.pg-navbar-logout:hover {
  background: #e65c00;
}
.pg-navbar-tabs {
  display: flex;
  align-items: center;
  gap: 0;
  background: #fff;
  border-bottom: 1.5px solid #ececec;
  padding-left: 32px;
  padding-right: 32px;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
  justify-content: center;
}
.pg-navbar-tab {
  color: #888;
  font-size: 15px;
  padding: 12px 18px 10px 18px;
  text-decoration: none;
  border-bottom: 2.5px solid transparent;
  transition: color 0.2s, border-bottom 0.2s;
  margin-right: 2px;
}
.pg-navbar-tab--active,
.pg-navbar-tab.router-link-active {
  color: #ff6600;
  border-bottom: 2.5px solid #ff6600;
  font-weight: 500;
  background: #fff;
}
</style>
