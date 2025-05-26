<template>
  <div class="users-bg">
    <div style="height: 32px"></div>
    <div class="users-center">
      <div class="users-card">
        <div v-if="successMessage" class="users-success-message">
          {{ successMessage }}
        </div>

        <div class="users-logo" style="margin-bottom: 12px">
          <span class="users-logo-text">Lista użytkowników</span>
        </div>
        <div
          style="
            margin-bottom: 16px;
            display: flex;
            gap: 16px;
            align-items: center;
          "
        >
          <label>Filtruj po roli:</label>
          <select
            v-model="selectedRole"
            @change="handleRoleFilterChange"
            class="users-input"
            style="width: 180px"
          >
            <option value="">Wszystkie</option>
            <option v-for="role in availableRoles" :key="role" :value="role">
              {{ role }}
            </option>
          </select>
        </div>
        <button
          class="users-btn-add"
          @click="showAddModal = true"
          style="margin-bottom: 18px"
        >
          Dodaj użytkownika
        </button>
        <table class="users-table">
          <thead>
            <tr>
              <th>Imię</th>
              <th>Nazwisko</th>
              <th>Email</th>
              <th>Role</th>
              <th>Akcje</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUserList" :key="user.id">
              <td>{{ user.firstName }}</td>
              <td>{{ user.lastName }}</td>
              <td>{{ user.email }}</td>
              <td>{{ user.roles }}</td>
              <td>
                <button @click="openEditModal(user)" class="users-btn-edit">
                  Edytuj
                </button>
                <button @click="deleteUser(user.id)" class="users-btn-delete">
                  Usuń
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div
          v-if="totalPages > 1"
          style="
            margin-top: 16px;
            display: flex;
            gap: 8px;
            justify-content: center;
          "
        >
          <button
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
          >
            Poprzednia
          </button>
          <span>Strona {{ currentPage }} z {{ totalPages }}</span>
          <button
            :disabled="currentPage === totalPages"
            @click="goToPage(currentPage + 1)"
          >
            Następna
          </button>
        </div>
        <div v-else style="margin-top: 16px; text-align: center">
          <span>Strona 1 z 1</span>
        </div>

        <div v-if="showAddModal" class="users-modal-overlay">
          <div class="users-modal">
            <h3>Dodaj użytkownika</h3>
            <form @submit.prevent="addUser">
              <input
                type="text"
                v-model="newUser.firstName"
                placeholder="Imię"
                class="users-input"
                required
              />
              <input
                type="text"
                v-model="newUser.lastName"
                placeholder="Nazwisko"
                class="users-input"
                required
              />
              <input
                type="email"
                v-model="newUser.email"
                placeholder="Email"
                class="users-input"
                required
              />
              <select v-model="newUser.roles" multiple class="users-input">
                <option
                  v-for="role in availableRoles"
                  :key="role"
                  :value="role"
                >
                  {{ role }}
                </option>
              </select>
              <input
                type="password"
                v-model="newUser.password"
                placeholder="Hasło"
                class="users-input"
                required
              />
              <div style="display: flex; gap: 10px; margin-top: 10px">
                <button type="submit" class="users-btn-add">Dodaj</button>
                <button
                  type="button"
                  class="users-btn-cancel"
                  @click="closeAddModal"
                >
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>

        <div v-if="showEditModal" class="users-modal-overlay">
          <div class="users-modal">
            <h3>Edytuj użytkownika</h3>
            <form @submit.prevent="updateUser">
              <input
                type="text"
                v-model="editUserData.firstName"
                placeholder="Imię"
                class="users-input"
                required
              />
              <input
                type="text"
                v-model="editUserData.lastName"
                placeholder="Nazwisko"
                class="users-input"
                required
              />
              <input
                type="email"
                v-model="editUserData.email"
                placeholder="Email"
                class="users-input"
                required
              />
              <select v-model="editUserData.roles" multiple class="users-input">
                <option
                  v-for="role in availableRoles"
                  :key="role"
                  :value="role"
                >
                  {{ role }}
                </option>
              </select>
              <input
                type="password"
                v-model="editUserData.password"
                placeholder="Nowe hasło (opcjonalnie)"
                class="users-input"
              />
              <div style="display: flex; gap: 10px; margin-top: 10px">
                <button type="submit" class="users-btn-edit">Zapisz</button>
                <button
                  type="button"
                  class="users-btn-cancel"
                  @click="closeEditModal"
                >
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import apiClient from "../api/axios";

export default {
  name: "UsersPage",
  data() {
    return {
      userList: [],
      currentUserEmail: "",
      availableRoles: ["Finansowa", "Techniczna"],
      showAddModal: false,
      showEditModal: false,
      newUser: {
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        roles: [],
      },
      editUserData: {
        id: null,
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        roles: [],
      },
      currentPage: 1,
      pageSize: 5,
      totalPages: 1,
      total: 0,
      selectedRole: "",
      successMessage: "",
      currentUserId: null,
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
      if (!this.userRoles.includes("Reprezentant")) {
        this.$router.replace("/dashboard");
      }
      await this.fetchCurrentUser();
      await this.fetchUsers();
    } catch {
      this.$router.replace("/login");
    }
  },
  methods: {
    async fetchCurrentUser() {
      try {
        const token = localStorage.getItem("token");
        const response = await apiClient.get("/merchant/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        this.currentUserEmail = response.data.email;
      } catch (err) {
        this.currentUserEmail = "";
      }
    },
    async fetchUsers() {
      try {
        const token = localStorage.getItem("token");
        const params = {
          page: this.currentPage,
          limit: this.pageSize,
        };
        if (this.selectedRole) params.role = this.selectedRole;
        const response = await apiClient.get("/merchant/users", {
          headers: { Authorization: `Bearer ${token}` },
          params,
        });
        this.userList = response.data.users.filter(
          (user) => user.id !== this.currentUserId
        );
        this.totalPages = response.data.totalPages;
        this.total = response.data.total;
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    },
    handleRoleFilterChange() {
      this.currentPage = 1;
      this.fetchUsers();
    },
    goToPage(page) {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        this.fetchUsers();
      }
    },
    async addUser() {
      try {
        const token = localStorage.getItem("token");
        await apiClient.post("/merchant/users", this.newUser, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        this.newUser = {
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          roles: [],
        };
        this.showAddModal = false;

        this.successMessage = "Użytkownik został pomyślnie dodany!";

        setTimeout(() => {
          this.successMessage = "";
        }, 3000);

        await this.fetchUsers();
      } catch (err) {
        this.$root.$refs.toast.show(
          err.response?.data?.error || "Nie udało się dodać użytkownika.",
          "error"
        );
      }
    },
    openEditModal(user) {
      this.editUserData = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: "",
        roles: user.roles ? user.roles.split(",") : [],
      };
      this.showEditModal = true;
    },
    closeEditModal() {
      this.showEditModal = false;
      this.editUserData = {
        id: null,
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        roles: [],
      };
    },
    closeAddModal() {
      this.showAddModal = false;
      this.newUser = {
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        roles: [],
      };
    },
    async updateUser() {
      try {
        const token = localStorage.getItem("token");
        const { id, password, ...userData } = this.editUserData;
        if (password && password.length > 0) {
          userData.password = password;
        }
        await apiClient.patch(`/merchant/users/${id}`, userData, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        this.closeEditModal();
        await this.fetchUsers();
      } catch (err) {
        this.$root.$refs.toast.show(
          err.response?.data?.error ||
            "Nie udało się zaktualizować użytkownika.",
          "error"
        );
      }
    },
    async deleteUser(id) {
      if (!confirm("Czy na pewno chcesz usunąć tego użytkownika?")) return;
      try {
        const token = localStorage.getItem("token");
        await apiClient.delete(`/merchant/users/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        await this.fetchUsers();
      } catch (err) {
        this.$root.$refs.toast.show(
          "Nie udało się usunąć użytkownika.",
          "error"
        );
      }
    },
  },
  computed: {
    filteredUserList() {
      return this.userList.filter(
        (user) => user.email !== this.currentUserEmail
      );
    },
  },
};
</script>

<style scoped>
@import url("https://db.onlinewebfonts.com/c/69c633b2a4e41e8101c6f4f149655d5e?family=ING+Me+Regular");

.users-bg {
  min-height: 100vh;
  background: #f7f7f7;
  position: relative;
  display: flex;
  flex-direction: column;
  font-family: "ING Me Regular", Arial, sans-serif;
}
.users-center {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
.users-card {
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
.users-logo {
  font-size: 1.3rem;
  font-weight: bold;
  color: #ff6600;
  margin-bottom: 10px;
}
.users-logo-text {
  font-size: 2rem;
  font-weight: bold;
  color: #ff6600;
  letter-spacing: 1px;
  white-space: nowrap;
}
.users-title {
  font-size: 1.6rem;
  font-weight: bold;
  color: #43b384;
  margin-bottom: 1.5rem;
}
.users-table {
  width: 100%;
  border-collapse: collapse;
  background: #fafbfc;
  border-radius: 12px;
  overflow: hidden;
  margin-top: 12px;
  margin-bottom: 24px;
}
.users-table th,
.users-table td {
  border: 1px solid #ececec;
  padding: 0.8rem;
  text-align: center;
}
.users-table th {
  background: #ececec;
  color: #888;
  font-weight: 500;
}
.users-btn-edit,
.users-btn-delete {
  color: #fff;
  background: #ff6600;
  border: none;
  border-radius: 4px;
  padding: 6px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
  margin-right: 8px;
}
.users-btn-delete {
  background: #ff0000;
}
.users-btn-edit:hover {
  background: #e65c00;
}
.users-btn-add {
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
.users-btn-cancel {
  background: #ececec;
  color: #222;
  border: none;
  border-radius: 4px;
  padding: 7px 18px;
  font-size: 15px;
  cursor: pointer;
  transition: background 0.2s;
}
.users-btn-cancel:hover {
  background: #bbb;
}
.users-form {
  display: none;
}
.users-input {
  background: #fafbfc;
  color: #222;
  border: 1px solid #ececec;
  border-radius: 8px;
  padding: 0.7rem;
  font-size: 15px;
  min-width: 180px;
  max-width: 220px;
  box-sizing: border-box;
  margin-bottom: 0.5rem;
  width: 220px;
  display: block;
}
.users-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(30, 30, 30, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.users-modal {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.18);
  padding: 2rem 2.5rem 2rem 2.5rem;
  min-width: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.users-modal form {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.users-success-message {
  background-color: #43b384;
  color: white;
  padding: 10px 15px;
  border-radius: 4px;
  margin-bottom: 15px;
  text-align: center;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
