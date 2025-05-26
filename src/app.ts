import express from "express";
import { json } from "body-parser";
import cors from "cors";
import { transactionRouter } from "./api/transaction/transaction.controller";
import { merchantRouter } from "./api/merchant/merchant.controller";
import { errorHandler } from "./middlewares/errorHandler";
import { logger } from "./config/logger";

const app = express();

app.use(
  cors({
    origin: "http://localhost:8080",
  })
);
app.use(json());

app.use("/api/transaction", transactionRouter);
app.use("/api/merchant", merchantRouter);

app.use(errorHandler);

export default app;
