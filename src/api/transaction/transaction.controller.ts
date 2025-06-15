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

const normalizeUUID = (uuid: string): string => {
  const cleanUuid = uuid.replace(/-/g, "").toLowerCase();

  if (cleanUuid.length === 32) {
    return `${cleanUuid.slice(0, 8)}-${cleanUuid.slice(
      8,
      12
    )}-${cleanUuid.slice(12, 16)}-${cleanUuid.slice(16, 20)}-${cleanUuid.slice(
      20
    )}`;
  }

  return uuid;
};

transactionRouter.post(
  "/",
  authenticate,
  authorizeRoles(["Reprezentant", "Finansowa"]),
  validateSchema(transactionSchema),
  async (req, res) => {
    const { serviceId, amount, currency, title, customer } = req.body;

    const normalizedServiceId = normalizeUUID(serviceId);

    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      const [shop] = await connection.query(
        "SELECT * FROM shops WHERE service_id = ?",
        [normalizedServiceId]
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
        serviceId: normalizedServiceId,
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
  authorizeRoles(["Reprezentant", "Finansowa"]),
  validateSchema(transactionSchema),
  async (req, res) => {
    const { serviceId, amount, currency, title, customer } = req.body;

    const normalizedServiceId = normalizeUUID(serviceId);

    logger.info("Generate payment link request", {
      originalServiceId: serviceId,
      normalizedServiceId,
      amount,
      currency,
      title,
      customer: customer
        ? `${customer.firstName} ${customer.lastName}`
        : "undefined",
      userId: (req as any).user?.id,
    });
    const connection = await pool.getConnection();
    try {
      const [shop] = await connection.query(
        "SELECT * FROM shops WHERE service_id = ?",
        [normalizedServiceId]
      );

      logger.info("Shop query result", {
        originalServiceId: serviceId,
        normalizedServiceId,
        shopFound: !!shop,
        shopData: shop
          ? {
              id: shop.id,
              name: shop.name,
              active: shop.active,
              merchant_id: shop.merchant_id,
            }
          : null,
      });

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
          normalizedServiceId,
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
  async (req, res) => {
    const user = (req as any).user;
    const {
      page = 1,
      limit = 25,
      status,
      currency,
      search,
      sortBy = "created_at",
      sortOrder = "desc",
    } = req.query;

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

      let whereClause = "WHERE s.merchant_id = ?";
      const queryParams = [merchantId];

      if (status) {
        whereClause += " AND t.status = ?";
        queryParams.push(status);
      }

      if (currency) {
        whereClause += " AND t.currency = ?";
        queryParams.push(currency);
      }

      if (search) {
        whereClause += " AND (t.title LIKE ? OR t.id LIKE ?)";
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern);
      }

      const allowedSortFields = [
        "id",
        "title",
        "amount",
        "currency",
        "status",
        "created_at",
      ];
      const validSortBy = allowedSortFields.includes(sortBy as string)
        ? sortBy
        : "created_at";
      const validSortOrder = sortOrder === "asc" ? "ASC" : "DESC";
      const [countResult] = await connection.query(
        `SELECT COUNT(*) as total 
         FROM transactions t
         JOIN shops s ON t.service_id = s.service_id
         ${whereClause}`,
        queryParams
      );
      const total = Number(countResult.total);
      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const offset = (pageNum - 1) * limitNum;
      const totalPages = Math.ceil(total / limitNum);
      const transactions = await connection.query(
        `SELECT 
          t.id, t.title, t.amount, t.currency, t.status, 
          t.payment_link_id AS paymentLinkId,
          CONVERT_TZ(t.created_at, '+00:00', '+02:00') as created_at,
          t.customer_first_name,
          t.customer_last_name,
          t.customer_email,
          t.customer_phone
         FROM transactions t
         JOIN shops s ON t.service_id = s.service_id
         ${whereClause}
         ORDER BY t.${validSortBy} ${validSortOrder}
         LIMIT ? OFFSET ?`,
        [...queryParams, limitNum, offset]
      );

      res.status(200).json({
        transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
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
