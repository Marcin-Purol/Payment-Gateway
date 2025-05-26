<template>
  <footer class="pg-login-footer">
    <span>2025 Payment Gateway</span>
    <span>Strefa czasowa: Europe/Warsaw (UTC+02:00)</span>
    <span class="pg-login-lang">
      <span>PL</span>
    </span>
  </footer>
</template>

<style scoped>
.pg-login-footer {
  width: 100vw;
  background: #fff;
  color: #888;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 8px 0 6px 0;
  border-top: 1px solid #ececec;
  position: fixed;
  bottom: 0;
  left: 0;
  font-family: inherit;
}
.pg-login-footer-link {
  color: #ff6600;
  margin: 0 8px;
  text-decoration: none;
}
.pg-login-footer-link:hover {
  text-decoration: underline;
}
.pg-login-lang {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
