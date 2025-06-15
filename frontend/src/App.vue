<template>
  <div id="app">
    <Navbar v-if="!isAuthPage && !isPayPage" />
    <router-view v-slot="{ Component }">
      <transition name="fade-slide" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <ToastComponent ref="toast" />
  </div>
</template>

<script>
import Navbar from "./components/Navbar.vue";
import ToastComponent from "./components/Toast.vue";
import { computed, ref, provide } from "vue";
import { useRoute } from "vue-router";

export default {
  name: "App",
  components: {
    Navbar,
    ToastComponent,
  },
  setup() {
    const route = useRoute();
    const toast = ref(null);

    const isAuthPage = computed(() =>
      ["/login", "/register"].includes(route.path)
    );
    const isPayPage = computed(() => route.path.startsWith("/pay/"));

    provide("$toast", toast);

    return {
      isAuthPage,
      isPayPage,
      toast,
    };
  },
};
</script>

<style>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
.fade-slide-enter-to,
.fade-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
