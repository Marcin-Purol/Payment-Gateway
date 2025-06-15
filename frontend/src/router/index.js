import { createRouter, createWebHistory } from "vue-router";
import { authService } from "../api/auth";
import Login from "../views/Login.vue";
import Register from "../views/Register.vue";
import Dashboard from "../views/Dashboard.vue";
import Shops from "../views/Shops.vue";
import Transactions from "../views/Transactions.vue";
import CreatePaymentLink from "../views/CreatePaymentLink.vue";
import Paywall from "../views/Paywall.vue";
import Users from "../views/Users.vue";
import Reports from "../views/Reports.vue";

const routes = [
  { path: "/login", component: Login },
  { path: "/register", component: Register },
  {
    path: "/dashboard",
    component: Dashboard,
    meta: { requiresAuth: true },
  },
  {
    path: "/shops",
    component: Shops,
    meta: { requiresAuth: true, requiredRoles: ["Reprezentant", "Techniczna"] },
  },
  {
    path: "/transactions",
    component: Transactions,
    meta: { requiresAuth: true, requiredRoles: ["Reprezentant", "Finansowa"] },
  },
  {
    path: "/create-payment-link",
    component: CreatePaymentLink,
    meta: { requiresAuth: true, requiredRoles: ["Reprezentant", "Finansowa"] },
  },
  {
    path: "/users",
    component: Users,
    meta: { requiresAuth: true, requiredRoles: ["Reprezentant"] },
  },
  {
    path: "/reports",
    component: Reports,
    meta: { requiresAuth: true, requiredRoles: ["Reprezentant", "Finansowa"] },
  },
  {
    path: "/pay/:paymentLinkId",
    component: Paywall,
  },
  { path: "/", redirect: "/dashboard" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    try {
      const userData = await authService.checkAuth();

      if (userData && userData.user) {
        if (to.meta.requiredRoles) {
          const userRoles = userData.user.roles || [];

          const hasRequiredRole = to.meta.requiredRoles.some((role) =>
            userRoles.includes(role)
          );

          if (!hasRequiredRole) {
            next("/dashboard");
            return;
          }
        }

        next();
      } else {
        if (to.path !== "/login") {
          next("/login");
        } else {
          next();
        }
      }
    } catch (error) {
      console.error("Router Guard - Error:", error);
      if (to.path !== "/login") {
        next("/login");
      } else {
        next();
      }
    }
  } else {
    if (to.path === "/login") {
      try {
        const userData = await authService.checkAuth();
        if (userData && userData.user) {
          next("/dashboard");
        } else {
          next();
        }
      } catch (error) {
        next();
      }
    } else {
      next();
    }
  }
});

export default router;
