import { createRouter, createWebHistory } from "vue-router";
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
    meta: { requiresAuth: true },
  },
  {
    path: "/transactions",
    component: Transactions,
    meta: { requiresAuth: true },
  },
  {
    path: "/create-payment-link",
    component: CreatePaymentLink,
    meta: { requiresAuth: true },
  },
  {
    path: "/users",
    component: Users,
    meta: { requiresAuth: true },
  },
  {
    path: "/reports",
    component: Reports,
    meta: { requiresAuth: true },
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

router.beforeEach((to, from, next) => {
  const isAuthenticated = !!localStorage.getItem("token");
  if (to.meta.requiresAuth && !isAuthenticated) {
    next("/login");
  } else {
    next();
  }
});

export default router;
