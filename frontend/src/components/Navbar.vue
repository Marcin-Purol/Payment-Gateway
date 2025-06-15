<template>
  <nav class="pg-navbar">
    <div class="pg-navbar-sandbox">
      <div class="sandbox-content">
        <span class="sandbox-text">To jest środowisko testowe (SANDBOX)</span>
      </div>
    </div>

    <div class="pg-navbar-main">
      <div class="pg-navbar-logo">
        <router-link to="/dashboard" class="logo-link">
          <span class="logo-icon">💳</span>
          <span class="logo-text">Payment Gateway</span>
        </router-link>
      </div>

      <div class="pg-navbar-nav">
        <router-link
          to="/dashboard"
          class="nav-link"
          active-class="nav-link--active"
        >
          <span class="nav-icon">🏠</span>
          <span class="nav-text">Dashboard</span>
        </router-link>

        <router-link
          v-if="hasRole(['Reprezentant', 'Techniczna'])"
          to="/shops"
          class="nav-link"
          active-class="nav-link--active"
        >
          <span class="nav-icon">🏪</span>
          <span class="nav-text">Sklepy</span>
        </router-link>

        <router-link
          v-if="hasRole(['Reprezentant', 'Finansowa'])"
          to="/transactions"
          class="nav-link"
          active-class="nav-link--active"
        >
          <span class="nav-icon">💰</span>
          <span class="nav-text">Transakcje</span>
        </router-link>
        <router-link
          v-if="hasRole(['Reprezentant', 'Finansowa'])"
          to="/create-payment-link"
          class="nav-link"
          active-class="nav-link--active"
        >
          <span class="nav-icon">🔗</span>
          <span class="nav-text">Płatności</span>
        </router-link>

        <router-link
          v-if="hasRole(['Reprezentant'])"
          to="/users"
          class="nav-link"
          active-class="nav-link--active"
        >
          <span class="nav-icon">👥</span>
          <span class="nav-text">Użytkownicy</span>
        </router-link>

        <router-link
          v-if="hasRole(['Reprezentant', 'Finansowa'])"
          to="/reports"
          class="nav-link"
          active-class="nav-link--active"
        >
          <span class="nav-icon">📊</span>
          <span class="nav-text">Raporty</span>
        </router-link>
      </div>
      <div class="pg-navbar-actions">
        <div class="user-info">
          <div class="user-avatar">
            {{ userInitials }}
          </div>
          <div class="user-details">
            <div class="user-name">{{ displayName }}</div>
            <div v-if="roles.length" class="user-roles">
              {{ roles.join(", ") }}
            </div>
          </div>
        </div>

        <div class="action-buttons">
          <button class="btn-logout" @click="logout" title="Wyloguj">
            <span class="logout-icon">🚪</span>
            <span class="logout-text">Wyloguj</span>
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script>
import { authService } from "../api/auth";

export default {
  name: "NavbarComponent",
  data() {
    return {
      roles: [],
      userEmail: "",
      userType: "",
    };
  },
  computed: {
    displayName() {
      if (this.userEmail) {
        return this.userEmail.split("@")[0];
      }
      return "Użytkownik";
    },
    userInitials() {
      if (this.userEmail) {
        const emailPrefix = this.userEmail.split("@")[0];
        if (emailPrefix.length >= 2) {
          return emailPrefix.substring(0, 2).toUpperCase();
        }
        return emailPrefix.charAt(0).toUpperCase();
      }
      return "U";
    },
  },
  async created() {
    await this.loadUserData();
  },
  methods: {
    async loadUserData() {
      try {
        const userData = await authService.checkAuth();
        if (userData && userData.user) {
          this.roles = userData.user.roles || [];
          this.userEmail = userData.user.email || "";
          this.userType = userData.user.type || "";
        }
      } catch (err) {
        this.userEmail = "";
        this.roles = [];
        this.userType = "";
      }
    },
    hasRole(requiredRoles) {
      if (!this.roles || this.roles.length === 0) return false;
      return requiredRoles.some((role) => this.roles.includes(role));
    },
    async logout() {
      try {
        await authService.logout();
      } catch (error) {
        this.$router.push("/login");
      }
    },
  },
};
</script>

<style scoped>
.pg-navbar {
  width: 100%;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  font-family: "Inter", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.pg-navbar-sandbox {
  background: linear-gradient(135deg, #ff6600, #ff8533);
  color: #ffffff;
  padding: 8px 0;
  text-align: center;
  font-weight: 500;
  font-size: 14px;
  border-bottom: 1px solid #e65c00;
}

.sandbox-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.sandbox-icon {
  font-size: 16px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.pg-navbar-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #ffffff;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 64px;
}

.pg-navbar-logo {
  flex-shrink: 0;
}

.logo-link {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #1a1a1a;
  font-weight: 700;
  font-size: 18px;
  transition: transform 0.2s ease;
}

.logo-link:hover {
  transform: translateY(-1px);
}

.logo-icon {
  font-size: 24px;
  filter: drop-shadow(0 2px 4px rgba(255, 102, 0, 0.3));
}

.logo-text {
  background: linear-gradient(135deg, #ff6600, #ff8533);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.pg-navbar-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  justify-content: center;
  margin: 0 24px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 8px;
  text-decoration: none;
  color: #64748b;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
  position: relative;
  white-space: nowrap;
}

.nav-link:hover {
  background: #f8fafc;
  color: #ff6600;
  transform: translateY(-1px);
}

.nav-link--active,
.nav-link.router-link-active {
  background: #fff5f0;
  color: #ff6600;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(255, 102, 0, 0.1);
}

.nav-icon {
  font-size: 16px;
  display: flex;
  align-items: center;
}

.nav-text {
  font-size: 14px;
}

.pg-navbar-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.user-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #ff6600, #ff8533);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(255, 102, 0, 0.2);
}

.user-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-weight: 600;
  font-size: 14px;
  color: #1a1a1a;
  line-height: 1.2;
}

.user-roles {
  font-size: 12px;
  color: #64748b;
  line-height: 1.2;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-logout {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
}

.btn-logout:hover {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.logout-icon {
  font-size: 16px;
}

.logout-text {
  font-size: 14px;
}

@media (max-width: 1024px) {
  .pg-navbar-main {
    padding: 12px 16px;
  }

  .pg-navbar-nav {
    margin: 0 16px;
  }

  .nav-text {
    display: none;
  }

  .nav-link {
    padding: 10px;
  }

  .user-details {
    display: none;
  }
}

@media (max-width: 768px) {
  .pg-navbar-nav {
    gap: 2px;
    margin: 0 8px;
  }

  .nav-link {
    padding: 8px;
  }

  .nav-icon {
    font-size: 18px;
  }

  .user-info {
    padding: 6px 8px;
  }

  .logout-text {
    display: none;
  }
}

@media (max-width: 480px) {
  .pg-navbar-main {
    padding: 8px 12px;
  }

  .logo-text {
    display: none;
  }

  .pg-navbar-nav {
    gap: 0;
    margin: 0 4px;
  }

  .nav-link {
    padding: 6px;
  }
}
</style>
