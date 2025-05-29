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
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="shop in shopList"
              :key="shop.serviceId"
              :class="{ 'shop-inactive': shop.active == 0 }"
            >
              <td>{{ shop.name }}</td>
              <td>{{ shop.serviceId }}</td>
              <td>
                <button
                  v-if="hasRole(['Reprezentant']) && shop.active == 1"
                  @click="deactivateShop(shop.serviceId)"
                  class="shops-btn-deactivate"
                >
                  Dezaktywuj
                </button>
                <span v-else style="color: #aaa;">Nieaktywne</span>
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
          console.error("Failed to fetch shops:", err);
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
          console.error("Failed to add shop:", err);
          this.$root.$refs.toast.show(
            err.response?.data?.error || "Failed to add shop",
            "error"
          );
        }
      }
    },
    async deactivateShop(serviceId) {
      if (!confirm("Czy na pewno chcesz dezaktywować ten sklep?")) return;

      try {
        const token = localStorage.getItem("token");
        await apiClient.patch(`/merchant/shops/${serviceId}/deactivate`, {}, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        await this.fetchShops();
        this.$root.$refs.toast.show(
          "Sklep został dezaktywowany",
          "success"
        );
      } catch (err) {
        if (err.response && err.response.status === 401) {
          this.$router.push("/login");
        } else if (err.response && err.response.status === 404) {
          this.$root.$refs.toast.show(
            "Sklep nie został znaleziony lub nie masz uprawnień do jego dezaktywacji",
            "error"
          );
        } else {
          console.error("Failed to deactivate shop:", err);
          this.$root.$refs.toast.show(
            err.response?.data?.error || "Nie udało się dezaktywować sklepu",
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
@import url("https://db.onlinewebfonts.com/c/69c633b2a4e41e8101c6f4f149655d5e?family=ING+Me+Regular");

.shops-bg {
  min-height: 100vh;
  background: #f7f7f7;
  position: relative;
  display: flex;
  flex-direction: column;
  font-family: "ING Me Regular", Arial, sans-serif;
}
.shops-center {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.shops-card {
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
.shops-logo {
  font-size: 1.3rem;
  font-weight: bold;
  color: #ff6600;
  margin-bottom: 10px;
}
.shops-logo-text {
  font-size: 2rem;
  font-weight: bold;
  color: #ff6600;
  letter-spacing: 1px;
  white-space: nowrap;
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
}
.shops-table th {
  background: #ececec;
  color: #888;
  font-weight: 500;
}
.shops-btn-delete {
  color: #fff;
  background: #ff0000;
  border: none;
  border-radius: 4px;
  padding: 6px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
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
  background: #ff6600;
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
.shops-btn-deactivate {
  color: #fff;
  background: #ff6600;
  border: none;
  border-radius: 4px;
  padding: 6px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}
.shops-btn-deactivate:hover {
  background: #e65c00;
}
.shop-inactive {
  background: #f3f3f3 !important;
  color: #bbb !important;
  opacity: 0.7;
}
</style>
