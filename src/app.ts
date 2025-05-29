import express from "express";
import { json } from "body-parser";
import cors from "cors";
import { transactionRouter } from "./api/transaction/transaction.controller";
import { merchantRouter } from "./api/merchant/merchant.controller";
import { errorHandler } from "./middlewares/errorHandler";
import rateLimit from "express-rate-limit";

const app = express();

app.use(
  cors({
    origin: "http://localhost:8080",
  })
);
app.use(json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

app.use("/api/", apiLimiter);
app.use("/api/transaction", transactionRouter);
app.use("/api/merchant", merchantRouter);

app.use(errorHandler);

export default app;
