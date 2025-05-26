<template>
  <div v-if="visible" :class="['toast', type]">
    {{ message }}
  </div>
</template>

<script>
export default {
  name: "ToastComponent",
  data() {
    return {
      visible: false,
      message: "",
      type: "success",
      timeoutId: null,
    };
  },
  methods: {
    show(msg, type = "success") {
      this.message = msg;
      this.type = type;
      this.visible = true;
      clearTimeout(this.timeoutId);
      this.timeoutId = setTimeout(() => (this.visible = false), 3000);
    },
  },
};
</script>

<style scoped>
.toast {
  position: fixed;
  top: 32px;
  right: 32px;
  padding: 16px 24px;
  border-radius: 6px;
  color: #fff;
  font-size: 15px;
  z-index: 9999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: opacity 0.3s;
}
.toast.success {
  background: #43b384;
}
.toast.error {
  background: #e74c3c;
}
</style>
