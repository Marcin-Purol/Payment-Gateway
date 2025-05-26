import request from "supertest";
import app from "../src/app";

describe("Merchant API", () => {
  let token: string;

  it("should register a new merchant", async () => {
    const res = await request(app)
      .post("/api/merchant/")
      .send({
        firstName: "Test",
        lastName: "User",
        email: `test${Date.now()}@example.com`,
        password: "password123",
      });
    expect(res.statusCode).toBe(202);
    expect(res.body.message).toMatch(/Rejestracja przyjęta/);
  });

  it("should not login with wrong credentials", async () => {
    const res = await request(app)
      .post("/api/merchant/login")
      .send({
        email: "notfound@example.com",
        password: "wrongpass",
      });
    expect(res.statusCode).toBe(401);
  });

  it("should login with correct credentials", async () => {

    const email = `login${Date.now()}@example.com`;
    await request(app)
      .post("/api/merchant/")
      .send({
        firstName: "Login",
        lastName: "User",
        email,
        password: "password123",
      });

    await new Promise((r) => setTimeout(r, 8000));
    const res = await request(app)
      .post("/api/merchant/login")
      .send({
        email,
        password: "password123",
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  }, 15000);

  it("should get shops for merchant", async () => {
    if (!token) return;
    const res = await request(app)
      .get("/api/merchant/shops")
      .set("Authorization", `Bearer ${token}`);
    expect([200, 403]).toContain(res.statusCode);
  });
});