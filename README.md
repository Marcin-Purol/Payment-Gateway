# Payment Gateway

**Uwaga: System działa wyłącznie w trybie Sandbox i nie obsługuje rzeczywistych płatności. Służy wyłącznie do celów demonstracyjnych.**

System do obsługi płatności online, przeznaczony dla sklepów internetowych. Umożliwia generowanie linków płatniczych, zarządzanie transakcjami, użytkownikami i sklepami, a także zapewnia raportowanie oraz monitoring.

Główne funkcje:

- Generowanie linków płatniczych
- Zarządzanie użytkownikami i sklepami
- Przegląd transakcji oraz eksport raportów
- Uprawnienia i autoryzacja JWT
- Monitoring błędów (Sentry, Telegram) i logowanie (VictoriaLogs)
- Integracja z RabbitMQ

---

## Stack

- **Node.js** (Express)
- **TypeScript**
- **MariaDB**
- **Sentry**
- **VictoriaLogs**
- **Winston**
- **Docker**
- **JSON Schema**
- **Jest**
- **RabbitMQ**
- **Vue.js**

---

## Konfiguracja środowiska (`.env`)

```env
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=
JWT_SECRET=
JWT_EXPIRES_IN=
RABBITMQ_URL=
SENTRY_DSN=
PORT=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
MARIADB_APP_PASSWORD=
MARIADB_ROOT_PASSWORD=
```

---

## API

### Autoryzacja i rejestracja

- **POST** `/api/merchant/`  
  Rejestracja nowego merchanta.  
  Body:

  ```json
  { "firstName": "...", "lastName": "...", "email": "...", "password": "..." }
  ```

- **POST** `/api/merchant/login`  
  Logowanie merchanta lub użytkownika.  
  Body:
  ```json
  { "email": "...", "password": "..." }
  ```
  Response:
  ```json
  { "token": "..." }
  ```

---

### Sklepy

- **GET** `/api/merchant/shops`  
  Pobierz sklepy powiązane z merchantem.  
  Wymaga JWT, role: **Reprezentant, Techniczna**

- **POST** `/api/merchant/shops`  
  Utwórz nowy sklep.  
  Wymaga JWT, role: **Reprezentant**
  Body:

  ```json
  { "name": "..." }
  ```

- **PATCH** `/api/merchant/shops/:serviceId/deactivate`  
  Dezaktywuj sklep.  
  Wymaga JWT, role: **Reprezentant**

---

### Użytkownicy

- **GET** `/api/merchant/users`  
  Pobierz użytkowników merchanta.  
  Wymaga JWT, role: **Reprezentant**

- **POST** `/api/merchant/users`  
  Utwórz użytkownika.  
  Wymaga JWT, role: **Reprezentant**  
  Body:

  ```json
  {
    "firstName": "...",
    "lastName": "...",
    "email": "...",
    "password": "...",
    "roles": ["..."]
  }
  ```

- **PATCH** `/api/merchant/users/:id`  
  Aktualizuj użytkownika.  
  Wymaga JWT, role: **Reprezentant**  
  Body:

  ```json
  {
    "firstName?": "...",
    "lastName?": "...",
    "email?": "...",
    "password?": "...",
    "roles?": ["..."]
  }
  ```

- **DELETE** `/api/merchant/users/:id`  
  Usuń użytkownika.  
  Wymaga JWT, role: **Reprezentant**

---

### Role

- **GET** `/api/merchant/roles`  
  Pobierz role zalogowanego użytkownika.  
  Wymaga JWT

- **GET** `/api/merchant/me`  
  Pobierz dane zalogowanego użytkownika.  
  Wymaga JWT

---

### Raporty i dashboard

- **GET** `/api/merchant/transactions/report?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`  
  Pobierz raport transakcji w formacie CSV.  
  Wymaga JWT, role: **Reprezentant, Finansowa**

- **GET** `/api/merchant/dashboard/summary`  
  Pobierz podsumowanie do dashboardu.  
  Wymaga JWT, role: **Reprezentant, Finansowa, Techniczna**

---

### Transakcje

- **GET** `/api/transaction/merchant/transactions`  
  Pobierz listę transakcji merchanta.  
  Wymaga JWT, role: **Reprezentant, Finansowa**

- **POST** `/api/transaction/generate-link`  
  Wygeneruj link płatności.  
  Wymaga JWT, role: **Reprezentant, Finansowa**  
  Body:

  ```json
  {
    "serviceId": "...",
    "amount": 0,
    "currency": "...",
    "title": "...",
    "customer": {
      "firstName": "...",
      "lastName": "...",
      "email": "...",
      "phone": "..."
    }
  }
  ```

- **PATCH** `/api/transaction/:id`  
  Zmień status transakcji (np. anuluj).  
  Wymaga JWT, role: **Reprezentant, Finansowa**  
  Body:
  ```json
  { "status": "..." }
  ```

---

## Monitoring i logowanie

- Błędy są raportowane do Sentry.
- Logi aplikacji zapisywane są w VictoriaLogs.
- Krytyczne błędy są dodatkowo raportowane przez bota Telegram (jeśli skonfigurujesz `TELEGRAM_BOT_TOKEN` i `TELEGRAM_CHAT_ID` w `.env`).  
  Po przekroczeniu określonego progu błędów w krótkim czasie, system automatycznie wysyła alert na wskazany czat.
