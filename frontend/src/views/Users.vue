<template>
  <div class="users-bg">
    <div class="users-center">
      <div class="users-container">
        <div class="users-header">
          <div class="users-title-section">
            <h1 class="users-title">
              <span class="users-icon">👥</span>
              Zarządzanie użytkownikami
            </h1>
            <p class="users-subtitle">
              Dodawaj, edytuj i zarządzaj kontami użytkowników systemu
            </p>
          </div>
          <button class="users-btn-add" @click="showAddModal = true">
            <span class="btn-icon">+</span>
            Dodaj użytkownika
          </button>
        </div>

        <div v-if="successMessage" class="success-alert">
          <span class="alert-icon">✓</span>
          {{ successMessage }}
        </div>

        <div class="stats-section">
          <div class="stat-card">
            <div class="stat-icon">👥</div>
            <div class="stat-info">
              <div class="stat-number">{{ total }}</div>
              <div class="stat-label">Łącznie użytkowników</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🔧</div>
            <div class="stat-info">
              <div class="stat-number">{{ getRoleCount("Techniczna") }}</div>
              <div class="stat-label">Techniczna</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">💰</div>
            <div class="stat-info">
              <div class="stat-number">{{ getRoleCount("Finansowa") }}</div>
              <div class="stat-label">Finansowa</div>
            </div>
          </div>
        </div>

        <div class="filters-section">
          <div class="search-group">
            <div class="search-input-wrapper">
              <span class="search-icon">🔍</span>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Szukaj użytkownika..."
                class="search-input"
              />
            </div>
          </div>
          <div class="filter-group">
            <label class="filter-label">Filtruj po roli:</label>
            <select
              v-model="selectedRole"
              @change="handleRoleFilterChange"
              class="filter-select"
            >
              <option value="">Wszystkie role</option>
              <option v-for="role in availableRoles" :key="role" :value="role">
                {{ role }}
              </option>
            </select>
          </div>
        </div>

        <div class="table-container">
          <div v-if="filteredUserList.length === 0" class="empty-state">
            <div class="empty-icon">👤</div>
            <h3>Brak użytkowników</h3>
            <p>
              Nie znaleziono użytkowników spełniających kryteria wyszukiwania.
            </p>
          </div>
          <table v-else class="users-table">
            <thead>
              <tr>
                <th>Użytkownik</th>
                <th>Email</th>
                <th>Role</th>
                <th>Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="user in filteredUserList"
                :key="user.id"
                class="user-row"
              >
                <td class="user-info-cell">
                  <div class="user-info">
                    <div class="user-avatar">
                      {{ getInitials(user.firstName, user.lastName) }}
                    </div>
                    <div class="user-details">
                      <div class="user-name">
                        {{ user.firstName }} {{ user.lastName }}
                      </div>
                    </div>
                  </div>
                </td>
                <td class="email-cell">{{ user.email }}</td>
                <td class="roles-cell">
                  <div class="roles-badges">
                    <span
                      v-for="role in user.roles"
                      :key="role"
                      class="role-badge"
                      :class="getRoleClass(role)"
                    >
                      {{ role }}
                    </span>
                  </div>
                </td>
                <td class="actions-cell">
                  <div class="action-buttons">
                    <button
                      @click="openEditModal(user)"
                      class="btn-edit"
                      title="Edytuj użytkownika"
                    >
                      <span class="btn-icon">✏️</span>
                    </button>
                    <button
                      @click="openDeleteModal(user)"
                      class="btn-delete"
                      title="Usuń użytkownika"
                    >
                      <span class="btn-icon">🗑️</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="totalPages > 1" class="pagination-section">
          <div class="pagination-info">
            Strona {{ currentPage }} z {{ totalPages }} ({{ total }}
            użytkowników)
          </div>
          <div class="pagination-controls">
            <button
              :disabled="currentPage === 1"
              @click="goToPage(currentPage - 1)"
              class="pagination-btn"
            >
              ‹ Poprzednia
            </button>
            <div class="page-numbers">
              <button
                v-for="page in getPageNumbers()"
                :key="page"
                @click="goToPage(page)"
                class="page-number"
                :class="{ active: page === currentPage }"
              >
                {{ page }}
              </button>
            </div>
            <button
              :disabled="currentPage === totalPages"
              @click="goToPage(currentPage + 1)"
              class="pagination-btn"
            >
              Następna ›
            </button>
          </div>
        </div>

        <div v-if="showAddModal" class="modal-overlay" @click="closeAddModal">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h3 class="modal-title">
                <span class="modal-icon">👤</span>
                Dodaj nowego użytkownika
              </h3>
              <button @click="closeAddModal" class="modal-close">×</button>
            </div>
            <form @submit.prevent="addUser" class="modal-form">
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Imię</label>
                  <input
                    type="text"
                    v-model="newUser.firstName"
                    class="form-input"
                    required
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Nazwisko</label>
                  <input
                    type="text"
                    v-model="newUser.lastName"
                    class="form-input"
                    required
                  />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Adres email</label>
                <input
                  type="email"
                  v-model="newUser.email"
                  class="form-input"
                  required
                />
              </div>
              <div class="form-group">
                <label class="form-label">Role</label>
                <div class="checkbox-group">
                  <label
                    v-for="role in availableRoles"
                    :key="role"
                    class="checkbox-label"
                  >
                    <input
                      type="checkbox"
                      :value="role"
                      v-model="newUser.roles"
                      class="checkbox-input"
                    />
                    <span class="checkbox-custom"></span>
                    {{ role }}
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Hasło</label>
                <input
                  type="password"
                  v-model="newUser.password"
                  class="form-input"
                  required
                />
              </div>
              <div class="modal-actions">
                <button type="button" @click="closeAddModal" class="btn-cancel">
                  Anuluj
                </button>
                <button type="submit" class="btn-submit">
                  <span class="btn-icon">+</span>
                  Dodaj użytkownika
                </button>
              </div>
            </form>
          </div>
        </div>

        <div v-if="showEditModal" class="modal-overlay" @click="closeEditModal">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h3 class="modal-title">
                <span class="modal-icon">✏️</span>
                Edytuj użytkownika
              </h3>
              <button @click="closeEditModal" class="modal-close">×</button>
            </div>
            <form @submit.prevent="updateUser" class="modal-form">
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Imię</label>
                  <input
                    type="text"
                    v-model="editUserData.firstName"
                    class="form-input"
                    required
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Nazwisko</label>
                  <input
                    type="text"
                    v-model="editUserData.lastName"
                    class="form-input"
                    required
                  />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Adres email</label>
                <input
                  type="email"
                  v-model="editUserData.email"
                  class="form-input"
                  required
                />
              </div>
              <div class="form-group">
                <label class="form-label">Role</label>
                <div class="checkbox-group">
                  <label
                    v-for="role in availableRoles"
                    :key="role"
                    class="checkbox-label"
                  >
                    <input
                      type="checkbox"
                      :value="role"
                      v-model="editUserData.roles"
                      class="checkbox-input"
                    />
                    <span class="checkbox-custom"></span>
                    {{ role }}
                  </label>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Nowe hasło (opcjonalnie)</label>
                <input
                  type="password"
                  v-model="editUserData.password"
                  class="form-input"
                  placeholder="Pozostaw puste, aby nie zmieniać"
                />
              </div>
              <div class="modal-actions">
                <button
                  type="button"
                  @click="closeEditModal"
                  class="btn-cancel"
                >
                  Anuluj
                </button>
                <button type="submit" class="btn-submit">
                  <span class="btn-icon">💾</span>
                  Zapisz zmiany
                </button>
              </div>
            </form>
          </div>
        </div>

        <div
          v-if="showDeleteModal"
          class="modal-overlay"
          @click="closeDeleteModal"
        >
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h3 class="modal-title">
                <span class="modal-icon">⚠️</span>
                Usuń użytkownika
              </h3>
              <button @click="closeDeleteModal" class="modal-close">×</button>
            </div>
            <div class="modal-form">
              <div class="delete-confirmation">
                <div class="warning-icon">🗑️</div>
                <h4>Czy na pewno chcesz usunąć tego użytkownika?</h4>
                <p>
                  Ta akcja jest nieodwracalna. Użytkownik zostanie trwale
                  usunięty z systemu.
                </p>
                <div class="user-preview">
                  <div class="user-avatar">
                    {{
                      getInitials(
                        userToDelete?.firstName || "",
                        userToDelete?.lastName || ""
                      )
                    }}
                  </div>
                  <div class="user-details">
                    <div class="user-name">
                      {{ userToDelete?.firstName }} {{ userToDelete?.lastName }}
                    </div>
                    <div class="user-email">{{ userToDelete?.email }}</div>
                  </div>
                </div>
              </div>
              <div class="modal-actions">
                <button
                  type="button"
                  @click="closeDeleteModal"
                  class="btn-cancel"
                >
                  Anuluj
                </button>
                <button @click="confirmDeleteUser" class="btn-delete-confirm">
                  <span class="btn-icon">🗑️</span>
                  Usuń użytkownika
                </button>
              </div>
            </div>
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
      showDeleteModal: false,
      userToDelete: null,
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
      pageSize: 10,
      totalPages: 1,
      total: 0,
      selectedRole: "",
      searchQuery: "",
      successMessage: "",
      currentUserId: null,
      userRoles: [],
    };
  },
  async created() {
    try {
      const res = await apiClient.get("/merchant/roles");
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
        const response = await apiClient.get("/merchant/me");
        this.currentUserEmail = response.data.email;
      } catch (err) {
        this.currentUserEmail = "";
      }
    },
    async fetchUsers() {
      try {
        const params = {
          page: this.currentPage,
          limit: this.pageSize,
        };
        if (this.selectedRole) params.role = this.selectedRole;
        const response = await apiClient.get("/merchant/users", {
          params,
        });
        this.userList = response.data.users.filter(
          (user) => user.id !== this.currentUserId
        );
        this.totalPages = response.data.totalPages;
        this.total = response.data.total;
      } catch (err) {
        this.toast.error("Błąd podczas pobierania użytkowników");
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
        await apiClient.post("/merchant/users", this.newUser);
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
        const { id, password, ...userData } = this.editUserData;
        if (password && password.length > 0) {
          userData.password = password;
        }
        await apiClient.patch(`/merchant/users/${id}`, userData);
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
        await apiClient.delete(`/merchant/users/${id}`);
        await this.fetchUsers();
      } catch (err) {
        this.$root.$refs.toast.show(
          "Nie udało się usunąć użytkownika.",
          "error"
        );
      }
    },
    openDeleteModal(user) {
      this.userToDelete = user;
      this.showDeleteModal = true;
    },
    closeDeleteModal() {
      this.showDeleteModal = false;
      this.userToDelete = null;
    },
    async confirmDeleteUser() {
      if (!this.userToDelete) return;
      try {
        await apiClient.delete(`/merchant/users/${this.userToDelete.id}`);
        this.closeDeleteModal();
        this.successMessage = "Użytkownik został pomyślnie usunięty!";
        setTimeout(() => {
          this.successMessage = "";
        }, 3000);
        await this.fetchUsers();
      } catch (err) {
        this.$root.$refs.toast.show(
          "Nie udało się usunąć użytkownika.",
          "error"
        );
      }
    },
    getInitials(firstName, lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    },
    getRoleClass(role) {
      return {
        "role-technical": role === "Techniczna",
        "role-financial": role === "Finansowa",
      };
    },
    getRoleCount(role) {
      return this.userList.filter(
        (user) => user.roles && user.roles.includes && user.roles.includes(role)
      ).length;
    },
    getPageNumbers() {
      const pages = [];
      const start = Math.max(1, this.currentPage - 2);
      const end = Math.min(this.totalPages, this.currentPage + 2);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    },
  },
  computed: {
    filteredUserList() {
      let filtered = this.userList.filter(
        (user) => user.email !== this.currentUserEmail
      );

      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(
          (user) =>
            user.firstName.toLowerCase().includes(query) ||
            user.lastName.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query)
        );
      }

      if (this.selectedRole) {
        filtered = filtered.filter(
          (user) =>
            user.roles &&
            user.roles.includes &&
            user.roles.includes(this.selectedRole)
        );
      }

      return filtered;
    },
  },
};
</script>

<style scoped>
.users-bg {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eef5 100%);
  position: relative;
  display: flex;
  flex-direction: column;
  font-family: "Inter", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

.users-center {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 1rem;
}

.users-container {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  padding: 2.5rem;
  width: 100%;
  max-width: 1400px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.users-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.users-title-section {
  flex: 1;
}

.users-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.users-icon {
  font-size: 2rem;
}

.users-subtitle {
  font-size: 1.125rem;
  color: #6b7280;
  margin: 0;
  font-weight: 400;
}

.users-btn-add {
  background: linear-gradient(135deg, #ff6600, #ff8533);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 1rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 12px rgba(255, 102, 0, 0.3);
}

.users-btn-add:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(255, 102, 0, 0.4);
}

.btn-icon {
  font-size: 1.125rem;
}

.success-alert {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  animation: slideInDown 0.5s ease;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.alert-icon {
  font-size: 1.25rem;
  font-weight: bold;
}

.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: 2px solid transparent;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.stat-card:nth-child(1) {
  border-color: #3b82f6;
}

.stat-card:nth-child(2) {
  border-color: #10b981;
}

.stat-card:nth-child(3) {
  border-color: #f59e0b;
}

.stat-icon {
  font-size: 2rem;
  background: rgba(0, 0, 0, 0.05);
  padding: 0.75rem;
  border-radius: 12px;
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.filters-section {
  background: #f8fafc;
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  gap: 2rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.search-group,
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 1rem;
  color: #9ca3af;
  font-size: 1rem;
  z-index: 1;
}

.search-input {
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  font-size: 1rem;
  color: #111827;
  transition: all 0.2s ease;
  min-width: 300px;
}

.search-input:focus {
  outline: none;
  border-color: #ff6600;
  box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.1);
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.filter-select {
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  color: #111827;
  transition: all 0.2s ease;
  min-width: 180px;
}

.filter-select:focus {
  outline: none;
  border-color: #ff6600;
  box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.1);
}

.table-container {
  overflow-x: auto;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
}

.users-table th {
  background: #f8fafc;
  color: #374151;
  font-weight: 600;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 1.25rem 1.5rem;
  text-align: left;
  border-bottom: 2px solid #e5e7eb;
}

.user-row {
  transition: all 0.2s ease;
  border-bottom: 1px solid #f3f4f6;
}

.user-row:hover {
  background: #f9fafb;
}

.users-table td {
  padding: 1.25rem 1.5rem;
  vertical-align: middle;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #ff6600, #ff8533);
  color: #fff;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.user-name {
  font-weight: 600;
  color: #111827;
  font-size: 1rem;
}

.email-cell {
  color: #6b7280;
  font-family: "Courier New", monospace;
  font-size: 0.875rem;
}

.roles-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.role-badge {
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.role-badge.role-technical {
  background: #dbeafe;
  color: #1e40af;
}

.role-badge.role-financial {
  background: #fef3c7;
  color: #92400e;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.btn-edit,
.btn-delete {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
}

.btn-edit {
  background: #dbeafe;
  color: #1e40af;
}

.btn-edit:hover {
  background: #bfdbfe;
  transform: translateY(-1px);
}

.btn-delete {
  background: #fee2e2;
  color: #dc2626;
}

.btn-delete:hover {
  background: #fecaca;
  transform: translateY(-1px);
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #6b7280;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 1.5rem;
  color: #374151;
  margin-bottom: 0.5rem;
}

.empty-state p {
  font-size: 1rem;
  color: #6b7280;
}

.pagination-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  padding: 1rem 0;
}

.pagination-info {
  color: #6b7280;
  font-size: 0.875rem;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pagination-btn {
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
  border-color: #ff6600;
  color: #ff6600;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 0.25rem;
}

.page-number {
  width: 40px;
  height: 40px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 500;
}

.page-number:hover {
  border-color: #ff6600;
  color: #ff6600;
}

.page-number.active {
  background: #ff6600;
  border-color: #ff6600;
  color: #fff;
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
  box-sizing: border-box;
}

.modal-content {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  max-width: 600px;
  width: 100%;
  max-height: calc(100vh - 4rem);
  overflow-y: auto;
  animation: slideInUp 0.3s ease;
  margin: auto;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem 2rem 1rem 2rem;
  border-bottom: 1px solid #f3f4f6;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.modal-icon {
  font-size: 1.5rem;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #9ca3af;
  cursor: pointer;
  transition: color 0.2s ease;
  padding: 0.25rem;
  border-radius: 4px;
}

.modal-close:hover {
  color: #374151;
  background: #f3f4f6;
}

.modal-form {
  padding: 1rem 2rem 2rem 2rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.form-input {
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  color: #111827;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #ff6600;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.1);
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;
}

.checkbox-input {
  display: none;
}

.checkbox-custom {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  transition: all 0.2s ease;
  position: relative;
}

.checkbox-input:checked + .checkbox-custom {
  background: #ff6600;
  border-color: #ff6600;
}

.checkbox-input:checked + .checkbox-custom::after {
  content: "✓";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-size: 12px;
  font-weight: bold;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: #e5e7eb;
  transform: translateY(-1px);
}

.btn-submit {
  background: linear-gradient(135deg, #ff6600, #ff8533);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 12px rgba(255, 102, 0, 0.3);
}

.btn-submit:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(255, 102, 0, 0.4);
}

.delete-confirmation {
  text-align: center;
  padding: 1rem 0;
}

.warning-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.delete-confirmation h4 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #dc2626;
  margin: 0 0 0.5rem 0;
}

.delete-confirmation p {
  font-size: 1rem;
  color: #6b7280;
  margin: 0 0 1.5rem 0;
}

.user-preview {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #f9fafb;
  border-radius: 12px;
  padding: 1rem;
  margin: 1rem 0;
}

.user-preview .user-avatar {
  width: 48px;
  height: 48px;
  font-size: 1rem;
}

.user-preview .user-details {
  text-align: left;
}

.user-preview .user-name {
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.25rem;
}

.user-preview .user-email {
  font-size: 0.875rem;
  color: #6b7280;
}

.btn-delete-confirm {
  background: linear-gradient(135deg, #dc2626, #ef4444);
  color: #fff;
  border: none;
  border-radius: 12px;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.btn-delete-confirm:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(220, 38, 38, 0.4);
}

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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

@media (max-width: 768px) {
  .users-container {
    padding: 1.5rem;
    gap: 1.5rem;
  }

  .users-header {
    flex-direction: column;
    align-items: stretch;
  }

  .users-title {
    font-size: 2rem;
  }

  .stats-section {
    grid-template-columns: 1fr;
  }

  .filters-section {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    min-width: auto;
    width: 100%;
  }

  .filter-select {
    min-width: auto;
    width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .pagination-section {
    flex-direction: column;
    text-align: center;
  }

  .users-table {
    font-size: 0.875rem;
  }

  .users-table th,
  .users-table td {
    padding: 1rem;
  }

  .user-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  .modal-content {
    width: calc(100vw - 2rem);
    max-height: calc(100vh - 4rem);
    margin: 2rem auto;
  }

  .modal-header,
  .modal-form {
    padding: 1.5rem;
  }

  .modal-overlay {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .users-container {
    padding: 1rem;
  }

  .users-title {
    font-size: 1.75rem;
  }

  .action-buttons {
    flex-direction: column;
  }

  .modal-content {
    width: calc(100vw - 1rem);
    max-height: calc(100vh - 2rem);
    margin: 1rem auto;
  }

  .modal-header,
  .modal-form {
    padding: 1rem;
  }

  .modal-overlay {
    padding: 0.5rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .user-preview {
    flex-direction: column;
    text-align: center;
    gap: 0.75rem;
  }

  .user-preview .user-details {
    text-align: center;
  }
}
</style>
