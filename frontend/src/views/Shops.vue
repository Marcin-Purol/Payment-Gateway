<template>
  <div class="shops-bg">
    <div style="height: 32px"></div>
    <div class="shops-center">
      <div class="shops-card">
        <div class="shops-logo" style="margin-bottom: 12px">
          <span class="shops-logo-text">Sklepy</span>
        </div>
        <table class="shops-table">
          <thead>
            <tr>
              <th>Nazwa sklepu</th>
              <th>Identyfikator sklepu</th>
              <th>Status</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="shop in shopList" :key="shop.serviceId">
              <td>{{ shop.name }}</td>
              <td>{{ shop.serviceId }}</td>
              <td>
                <span
                  :class="shop.active ? 'status-active' : 'status-inactive'"
                  class="status-badge"
                >
                  {{ shop.active ? "Aktywny" : "Nieaktywny" }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button
                    v-if="hasRole(['Reprezentant'])"
                    @click="toggleShopStatus(shop.serviceId, shop.active)"
                    :class="
                      shop.active
                        ? 'shops-btn-deactivate'
                        : 'shops-btn-activate'
                    "
                  >
                    {{ shop.active ? "Dezaktywuj" : "Aktywuj" }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <form
          v-if="hasRole(['Reprezentant'])"
          @submit.prevent="addShop"
          class="shops-form"
        >
          <input
            type="text"
            v-model="newShopName"
            placeholder="Nazwa nowego sklepu"
            class="shops-input"
            required
          />
          <button type="submit" class="shops-btn-add">Dodaj sklep</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import apiClient from "../api/axios";

export default {
  name: "ShopsPage",
  data() {
    return {
      shopList: [],
      newShopName: "",
      userRoles: [],
    };
  },
  async created() {
    await this.fetchUserRoles();
    await this.fetchShops();
  },
  methods: {
    async fetchUserRoles() {
      try {
        const token = localStorage.getItem("token");
        const response = await apiClient.get("/merchant/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        this.userRoles = response.data.roles || [];
      } catch (err) {
        this.userRoles = [];
      }
    },
    async fetchShops() {
      try {
        const token = localStorage.getItem("token");
        const response = await apiClient.get("/merchant/shops", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        this.shopList = response.data;
      } catch (err) {
        if (err.response && err.response.status === 401) {
          this.$router.push("/login");
        } else {
          this.$root.$refs.toast.show(
            err.response?.data?.error || "Nie udało się pobrać listy sklepów",
            "error"
          );
        }
      }
    },
    async addShop() {
      try {
        const token = localStorage.getItem("token");
        const response = await apiClient.post(
          "/merchant/shops",
          { name: this.newShopName },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        this.newShopName = "";
        await this.fetchShops();
        this.$root.$refs.toast.show(response.data.message, "success");
      } catch (err) {
        if (err.response && err.response.status === 401) {
          this.$router.push("/login");
        } else {
          this.$root.$refs.toast.show(
            err.response?.data?.error || "Failed to add shop",
            "error"
          );
        }
      }
    },
    async toggleShopStatus(serviceId, currentStatus) {
      const action = currentStatus ? "dezaktywować" : "aktywować";
      if (!confirm(`Czy na pewno chcesz ${action} ten sklep?`)) return;

      try {
        const token = localStorage.getItem("token");
        const response = await apiClient.patch(
          `/merchant/shops/${serviceId}/toggle-status`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        await this.fetchShops();
        this.$root.$refs.toast.show(response.data.message, "success");
      } catch (err) {
        if (err.response && err.response.status === 401) {
          this.$router.push("/login");
        } else if (err.response && err.response.status === 404) {
          this.$root.$refs.toast.show(
            "Sklep nie został znaleziony lub nie masz uprawnień",
            "error"
          );
        } else {
          this.$root.$refs.toast.show(
            err.response?.data?.error || "Nie udało się zmienić statusu sklepu",
            "error"
          );
        }
      }
    },
    hasRole(roles) {
      return roles.some((role) => this.userRoles.includes(role));
    },
  },
};
</script>

<style scoped>
.shops-bg {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
  position: relative;
  display: flex;
  flex-direction: column;
  font-family: "Inter", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

.shops-center {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0 20px;
}

.shops-card {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  padding: 2.5rem;
  width: 100%;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.shops-logo {
  margin-bottom: 2rem;
  text-align: center;
  width: 100%;
}

.shops-logo-text {
  font-size: 2.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #ff6600, #ff8533);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -1px;
}
.shops-title {
  font-size: 1.6rem;
  font-weight: bold;
  color: #43b384;
  margin-bottom: 1.5rem;
}
.shops-table {
  width: 100%;
  border-collapse: collapse;
  background: #fafbfc;
  border-radius: 12px;
  overflow: hidden;
  margin-top: 12px;
  margin-bottom: 24px;
}
.shops-table th,
.shops-table td {
  border: 1px solid #ececec;
  padding: 0.8rem;
  text-align: center;
  vertical-align: middle;
}
.shops-table th {
  background: #ececec;
  color: #888;
  font-weight: 500;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-active {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status-inactive {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

.shops-btn-activate {
  color: #fff;
  background: #28a745;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
  font-weight: 500;
}

.shops-btn-activate:hover {
  background: #218838;
}

.shops-btn-deactivate {
  color: #fff;
  background: #ffc107;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
  font-weight: 500;
}

.shops-btn-deactivate:hover {
  background: #e0a800;
}

.shops-btn-delete {
  color: #fff;
  background: #dc3545;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
  font-weight: 500;
}

.shops-btn-delete:hover {
  background: #c82333;
}
.shops-form {
  display: flex;
  align-items: center;
  margin-top: 16px;
}
.shops-input {
  background: #fafbfc;
  color: #222;
  border: 1px solid #ececec;
  border-radius: 8px;
  padding: 0.7rem;
  margin-right: 0.5rem;
  font-size: 15px;
}
.shops-btn-add {
  background: #e65c00;
  color: #fff;
  font-weight: bold;
  border: none;
  border-radius: 4px;
  padding: 7px 18px;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s;
}
.shops-btn-add:hover {
  background: #e65c00;
}
</style>
