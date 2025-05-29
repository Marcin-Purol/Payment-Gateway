import { Router } from "express";
import { validateSchema } from "../../middlewares/validateSchema";
import { transactionSchema } from "./transaction.schema";
import { createTransaction } from "./transaction.service";
import { authenticate } from "../../middlewares/authenticate";
import { pool } from "../../config/database";
import { logger } from "../../config/logger";
import { v4 as uuidv4 } from "uuid";
import { authorizeRoles } from "../../middlewares/authenticate";

export const transactionRouter = Router();

transactionRouter.post(
  "/",
  authenticate,
  validateSchema(transactionSchema),
  async (req, res) => {
    const { serviceId, amount, currency, title, customer } = req.body;

    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [shop] = await connection.query(
        "SELECT * FROM shops WHERE service_id = ?",
        [serviceId]
      );

      if (!shop) {
        await connection.rollback();
        return res.status(404).json({ error: "Shop not found" });
      }

      if (!shop.active) {
        await connection.rollback();
        return res.status(400).json({ error: "Shop is deactivated" });
      }

      const user = (req as any).user;
      if (shop.merchant_id !== user.id) {
        await connection.rollback();
        return res
          .status(403)
          .json({ error: "Unauthorized to access this shop" });
      }

      const transaction = await createTransaction({
        serviceId,
        amount,
        currency,
        title,
        customer,
      });

      await connection.commit();
      res.status(201).json(transaction);
    } catch (error) {
      await connection.rollback();
      logger.error("Error creating transaction:", error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      connection.release();
    }
  }
);

transactionRouter.post(
  "/generate-link",
  authenticate,
  validateSchema(transactionSchema),
  async (req, res) => {
    const { serviceId, amount, currency, title, customer } = req.body;

    const connection = await pool.getConnection();
    try {
      const [shop] = await connection.query(
        "SELECT * FROM shops WHERE service_id = ?",
        [serviceId]
      );
      if (!shop) {
        return res.status(404).json({ error: "Shop not found" });
      }
      if (!shop.active) {
        return res.status(400).json({ error: "Shop is deactivated" });
      }

      const user = (req as any).user;
      const [userRecord] = await connection.query(
        "SELECT merchant_id FROM users WHERE id = ?",
        [user.id]
      );
      if (!userRecord) {
        return res.status(404).json({ error: "User not found" });
      }
      const userMerchantId = userRecord.merchant_id;

      if (shop.merchant_id !== userMerchantId) {
        return res
          .status(403)
          .json({ error: "Unauthorized to access this shop" });
      }

      const paymentLinkId = uuidv4();

      const result = await connection.query(
        `INSERT INTO transactions (
          service_id, amount, currency, title,
          customer_first_name, customer_last_name,
          customer_email, customer_phone, status, payment_link_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          serviceId,
          amount,
          currency,
          title,
          customer.firstName,
          customer.lastName,
          customer.email,
          customer.phone,
          "Pending",
          paymentLinkId,
        ]
      );

      const transactionId = Number(result.insertId);

      res.status(201).json({
        message: "Payment link generated successfully",
        paymentLink: `http://localhost:8080/pay/${paymentLinkId}`,
        transactionId,
      });
    } catch (error) {
      logger.error("Error generating payment link:", error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      connection.release();
    }
  }
);

transactionRouter.get("/pay/:paymentLinkId", async (req, res) => {
  const { paymentLinkId } = req.params;

  const connection = await pool.getConnection();
  try {
    const [transaction] = await connection.query(
      "SELECT * FROM transactions WHERE payment_link_id = ?",
      [paymentLinkId]
    );

    if (!transaction) {
      return res.status(404).json({ error: "Payment link not found" });
    }

    res.status(200).json(transaction);
  } catch (error) {
    logger.error("Error fetching payment link:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    connection.release();
  }
});

transactionRouter.get(
  "/merchant/transactions",
  authenticate,
  authorizeRoles(["Reprezentant", "Finansowa"]),
  async (req, res) => {
    const merchantId = (req as any).user.merchantId;
    const { page = 1, pageSize = 10, status, title } = req.query;

    const pageNum = Number(page) || 1;
    const pageSizeNum = Number(pageSize) || 10;
    const offset = (pageNum - 1) * pageSizeNum;
    const filters: string[] = [];
    const params: any[] = [merchantId];

    if (status) {
      filters.push("t.status = ?");
      params.push(status);
    }
    if (title) {
      filters.push("t.title LIKE ?");
      params.push(`%${title}%`);
    }

    const filterSql = filters.length ? " AND " + filters.join(" AND ") : "";

    const connection = await pool.getConnection();
    try {
      const countQuery = `
        SELECT COUNT(*) as total FROM transactions t
        JOIN shops s ON t.service_id = s.service_id
        WHERE s.merchant_id = ?${filterSql}
      `;
      const [countRows] = await connection.query(countQuery, params);

      let total = 0;
      if (Array.isArray(countRows)) {
        total = Number(countRows[0]?.total) || 0;
      } else if (countRows && typeof countRows.total !== "undefined") {
        total = Number(countRows.total) || 0;
      }

      const selectQuery = `
        SELECT
          t.id,
          t.title,
          t.amount,
          t.currency,
          t.status,
          t.payment_link_id AS payment_link_id,
          t.customer_first_name,
          t.customer_last_name,
          t.customer_email,
          t.customer_phone,
          t.created_at,
          t.updated_at
        FROM transactions t
        JOIN shops s ON t.service_id = s.service_id
        WHERE s.merchant_id = ?${filterSql}
        ORDER BY t.created_at DESC
        LIMIT ? OFFSET ?
      `;
      const selectParams = [...params, pageSizeNum, offset];

      const transactions: any[] = Array.isArray(await connection.query(selectQuery, selectParams))
        ? await connection.query(selectQuery, selectParams)
        : [];

      res.status(200).json({
        data: transactions,
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      });
    } catch (error) {
      logger.error("Error fetching transactions:", error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      connection.release();
    }
  }
);

transactionRouter.patch(
  "/:id",
  authenticate,
  authorizeRoles(["Reprezentant", "Finansowa"]),
  async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (
      !["Pending", "processing", "success", "failed", "Cancelled"].includes(
        status
      )
    ) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    const user = (req as any).user;
    const connection = await pool.getConnection();
    try {
      const [userRecord] = await connection.query(
        "SELECT merchant_id FROM users WHERE id = ?",
        [user.id]
      );
      if (!userRecord) {
        return res.status(404).json({ error: "User not found" });
      }
      const merchantId = userRecord.merchant_id;

      const [transaction] = await connection.query(
        `SELECT t.*, s.merchant_id FROM transactions t
         JOIN shops s ON t.service_id = s.service_id
         WHERE t.id = ? AND s.merchant_id = ?`,
        [id, merchantId]
      );

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      await connection.query(
        "UPDATE transactions SET status = ? WHERE id = ?",
        [status, id]
      );

      res
        .status(200)
        .json({ message: "Transaction status updated successfully" });
    } catch (error) {
      logger.error("Error updating transaction status:", error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      connection.release();
    }
  }
);

transactionRouter.patch("/pay/:paymentLinkId", async (req, res) => {
  const { paymentLinkId } = req.params;
  const { status } = req.body;

  if (!["Pending", "success", "failed", "Cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  const connection = await pool.getConnection();
  try {
    const [transaction] = await connection.query(
      "SELECT * FROM transactions WHERE payment_link_id = ?",
      [paymentLinkId]
    );

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    await connection.query(
      "UPDATE transactions SET status = ? WHERE payment_link_id = ?",
      [status, paymentLinkId]
    );

    res
      .status(200)
      .json({ message: "Transaction status updated successfully" });
  } catch (error) {
    logger.error("Error updating transaction status by payment link:", error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    connection.release();
  }
});
