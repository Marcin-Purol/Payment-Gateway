<template>
  <div id="app">
    <Navbar v-if="!isAuthPage && !isPayPage" />
    <transition name="fade-slide" mode="out-in">
      <router-view />
    </transition>
    <ToastComponent ref="toast" />
  </div>
</template>

<script>
import Navbar from "./components/Navbar.vue";
import ToastComponent from "./components/Toast.vue";
import { computed } from "vue";
import { useRoute } from "vue-router";

export default {
  name: "App",
  components: {
    Navbar,
    ToastComponent,
  },
  setup() {
    const route = useRoute();
    const isAuthPage = computed(() =>
      ["/login", "/register"].includes(route.path)
    );
    const isPayPage = computed(() => route.path.startsWith("/pay/"));
    return { isAuthPage, isPayPage };
  },
  provide() {
    return {
      $toast: this.$refs.toast,
    };
  },
  mounted() {
    this.$root.$refs = this.$refs;
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
