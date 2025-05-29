import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../config/database";
import { validateSchema } from "../../middlewares/validateSchema";
import { merchantSchema } from "./merchant.schema";
import { merchantLoginSchema } from "./merchant.login.schema";
import { shopSchema } from "./merchant.shop.schema";
import { userSchema, userUpdateSchema } from "./merchant.user.schema";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../../config/jwt";
import { authenticate, authorizeRoles } from "../../middlewares/authenticate";
import { v4 as uuidv4 } from "uuid";
import { Parser as CsvParser } from "json2csv";
import { sendToUserCreationQueue } from "../../workers/userCreationProducer";
import { logger } from "../../config/logger";
import { Sentry } from "../../config/sentry";
import express from "express";

export const merchantRouter = express.Router();

merchantRouter.post("/", validateSchema(merchantSchema), async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  const connection = await pool.getConnection();
  try {
    const [existing] = await connection.query(
      "SELECT id FROM merchants WHERE email = ?",
      [email]
    );
    if (existing) {
      return res
        .status(400)
        .json({ error: "Merchant with this email already exists" });
    }
  } catch (error) {
    logger.error("Error checking merchant existence", { error, email });
    Sentry.captureException(error);
    return res.status(500).json({ error: "Internal Server Error" });
  } finally {
    connection.release();
  }

  try {
    await sendToUserCreationQueue({
      firstName,
      lastName,
      email,
      password,
      type: "merchant_registration",
    });

    res.status(202).json({
      message:
        "Rejestracja przyjęta. Konto zostanie utworzone w ciągu 1 minuty.",
    });
  } catch (error) {
    logger.error("Error sending to user creation queue", { error, email });
    Sentry.captureException(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

merchantRouter.post(
  "/login",
  validateSchema(merchantLoginSchema),
  async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const connection = await pool.getConnection();
    try {
      const [merchant] = await connection.query(
        "SELECT * FROM merchants WHERE email = ?",
        [email]
      );

      if (merchant) {
        const isPasswordValid = await bcrypt.compare(
          password,
          merchant.password
        );
        if (!isPasswordValid) {
          return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = jwt.sign(
          { id: merchant.id, email: merchant.email, type: "merchant", merchantId: merchant.id },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );

        return res.status(200).json({ token });
      }

      const [user] = await connection.query(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );

      if (user) {
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({ error: "Invalid email or password" });
        }

        const [rolesRows] = await connection.query(
          `SELECT r.name FROM user_roles ur
           JOIN roles r ON ur.role_id = r.id
           WHERE ur.user_id = ?`,
          [user.id]
        );
        const roles = Array.isArray(rolesRows)
          ? rolesRows.map((row) => row.name)
          : [];

        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            type: user.type,
            roles,
            merchantId: user.merchant_id,
          },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );

        return res.status(200).json({ token });
      }

      return res.status(401).json({ error: "Invalid email or password" });
    } catch (error) {
      logger.error("Error logging in", {
        error: error instanceof Error ? error.stack : JSON.stringify(error),
        email,
      });
      Sentry.captureException(error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      connection.release();
    }
  }
);

merchantRouter.get(
  "/shops",
  authenticate,
  authorizeRoles(["Reprezentant", "Techniczna", "Finansowa"]),
  async (req, res) => {
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

      const shops = await connection.query(
        "SELECT name, service_id AS serviceId, active FROM shops WHERE merchant_id = ?",
        [merchantId]
      );
      res.status(200).json(shops);
    } catch (error) {
      logger.error("Error fetching shops", { error, userId: user.id });
      Sentry.captureException(error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      connection.release();
    }
  }
);

merchantRouter.post(
  "/shops",
  authenticate,
  validateSchema(shopSchema),
  async (req, res) => {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Shop name is required" });
    }

    const user = (req as any).user;
    const serviceId = uuidv4();
    const token = `token-${Date.now()}`;

    const connection = await pool.getConnection();
    try {
      await connection.query("CALL create_shop(?, ?, ?, ?)", [
        user.id,
        serviceId,
        token,
        name,
      ]);

      res.status(201).json({
        message: "Pomyślnie utworzono sklep",
        shop: {
          name,
          serviceId,
        },
      });
    } catch (error) {
      logger.error("Error creating shop", {
        error,
        userId: user.id,
        shopName: name,
      });
      Sentry.captureException(error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      connection.release();
    }
  }
);

merchantRouter.patch(
  "/shops/:serviceId/deactivate",
  authenticate,
  authorizeRoles(["Reprezentant"]),
  async (req, res) => {
    const { serviceId } = req.params;
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

      const [shop] = await connection.query(
        "SELECT * FROM shops WHERE service_id = ? AND merchant_id = ?",
        [serviceId, merchantId]
      );
      if (!shop) {
        return res.status(404).json({ error: "Shop not found" });
      }

      await connection.query(
        "UPDATE shops SET active = 0 WHERE service_id = ?",
        [serviceId]
      );
      res.status(200).json({ message: "Shop deactivated successfully" });
    } catch (error) {
      logger.error("Error deactivating shop", { error, serviceId, userId: user.id });
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      connection.release();
    }
  }
);

merchantRouter.post(
  "/users",
  authenticate,
  authorizeRoles(["Reprezentant"]),
  validateSchema(userSchema),
  async (req, res) => {
    const { firstName, lastName, email, password, roles } = req.body;

    if (!firstName || !lastName || !email || !password || !roles) {
      return res.status(400).json({ error: "All fields are required" });
    }

    try {
      await sendToUserCreationQueue({
        merchantId: (req as any).user.id,
        firstName,
        lastName,
        email,
        password,
        roles,
      });

      res.status(202).json({ message: "User creation scheduled" });
    } catch (error) {
      logger.error("Error sending to user creation queue", { error, email });
      Sentry.captureException(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

merchantRouter.get(
  "/users",
  authenticate,
  authorizeRoles(["Reprezentant"]),
  async (req, res) => {
    const user = (req as any).user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5;
    const role = req.query.role as string | undefined;

    const offset = (page - 1) * limit;

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

      let whereRole = "";
      const params: any[] = [merchantId];
      if (role) {
        whereRole = `
        AND u.id IN (
          SELECT ur.user_id
          FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          WHERE r.name = ?
        )
      `;
        params.push(role);
      }

      const users = await connection.query(
        `SELECT u.id, u.first_name AS firstName, u.last_name AS lastName, u.email, GROUP_CONCAT(r.name) AS roles
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.id
         WHERE u.merchant_id = ?
         ${whereRole}
         GROUP BY u.id
         ORDER BY u.id DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      const [countRow] = await connection.query(
        `SELECT COUNT(DISTINCT u.id) as total
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.id
         WHERE u.merchant_id = ?
         ${whereRole}`,
        params
      );
      const total = countRow ? Number(countRow.total) : 0;
      const totalPages = Math.ceil(total / limit);

      res.status(200).json({
        users,
        total,
        page,
        totalPages,
      });
    } catch (error) {
      logger.error("Error fetching users", { error, userId: user.id });
      Sentry.captureException(error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      connection.release();
    }
  }
);

merchantRouter.patch(
  "/users/:id",
  authenticate,
  authorizeRoles(["Reprezentant"]),
  validateSchema(userUpdateSchema),
  async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, email, password, roles } = req.body;

    if (!firstName && !lastName && !email && !password && !roles) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const user = (req as any).user;

    const connection = await pool.getConnection();
    try {
      if (parseInt(id) === user.id && roles) {
        return res
          .status(403)
          .json({ error: "You cannot change your own roles" });
      }

      const [existingUser] = await connection.query(
        "SELECT * FROM users WHERE id = ? AND merchant_id = ?",
        [id, user.id]
      );

      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const hashedPassword = password
        ? await bcrypt.hash(password, 10)
        : existingUser.password;

      const rolesString = roles ? roles.join(",") : null;
      await connection.query("CALL update_user_and_roles(?, ?, ?, ?, ?, ?)", [
        id,
        firstName || existingUser.first_name,
        lastName || existingUser.last_name,
        email || existingUser.email,
        hashedPassword,
        rolesString,
      ]);

      res.status(200).json({ message: "User updated successfully" });
    } catch (error) {
      logger.error("Error updating user", {
        error,
        userId: user.id,
        updateUserId: id,
      });
      Sentry.captureException(error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      connection.release();
    }
  }
);

merchantRouter.delete(
  "/users/:id",
  authenticate,
  authorizeRoles(["Reprezentant"]),
  async (req, res) => {
    const { id } = req.params;
    const user = (req as any).user;

    const connection = await pool.getConnection();
    try {
      const [existingUser] = await connection.query(
        "SELECT * FROM users WHERE id = ? AND merchant_id = ?",
        [id, user.id]
      );

      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      await connection.query("CALL delete_user_and_roles(?)", [id]);

      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      logger.error("Error deleting user", {
        error,
        userId: user.id,
        deleteUserId: id,
      });
      Sentry.captureException(error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      connection.release();
    }
  }
);

merchantRouter.get("/roles", authenticate, async (req, res) => {
  const user = (req as any).user;

  const connection = await pool.getConnection();
  try {
    const roles = await connection.query(
      `SELECT r.name FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = ?`,
      [user.id]
    );

    res.status(200).json({ roles: roles.map((role: any) => role.name) });
  } catch (error) {
    logger.error("Error fetching roles", { error, userId: user.id });
    Sentry.captureException(error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    connection.release();
  }
});

merchantRouter.get("/me", authenticate, async (req, res) => {
  const user = (req as any).user;
  const connection = await pool.getConnection();
  try {
    const [userRecord] = await connection.query(
      "SELECT first_name AS firstName, last_name AS lastName, email FROM users WHERE id = ?",
      [user.id]
    );
    if (!userRecord) {
      return res.status(404).json({ error: "User not found" });
    }
    const rolesRows = await connection.query(
      `SELECT r.name FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = ?`,
      [user.id]
    );
    const roles = Array.isArray(rolesRows)
      ? rolesRows.map((row) => row.name)
      : [];

    res.status(200).json({ ...userRecord, roles });
  } catch (error) {
    logger.error("Error fetching user profile", { error, userId: user.id });
    Sentry.captureException(error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    connection.release();
  }
});

merchantRouter.get(
  "/transactions/report",
  authenticate,
  authorizeRoles(["Reprezentant", "Finansowa"]),
  async (req, res) => {
    const user = (req as any).user;
    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res
        .status(400)
        .json({ error: "dateFrom and dateTo are required" });
    }

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

      const transactions = await connection.query(
        `SELECT t.id, t.title, t.amount, t.currency, t.status, t.created_at, s.name AS shopName
         FROM transactions t
         JOIN shops s ON t.service_id = s.service_id
         WHERE s.merchant_id = ?
           AND t.created_at BETWEEN ? AND ?
         ORDER BY t.created_at DESC`,
        [merchantId, dateFrom, dateTo]
      );

      const fields = [
        { label: "ID", value: "id" },
        { label: "Tytuł", value: "title" },
        { label: "Kwota", value: "amount" },
        { label: "Waluta", value: "currency" },
        { label: "Status", value: "status" },
        { label: "Data utworzenia", value: "created_at" },
        { label: "Sklep", value: "shopName" },
      ];
      const parser = new CsvParser({ fields, delimiter: ";" });
      const csv = parser.parse(transactions);

      res.header("Content-Type", "text/csv");
      res.attachment(`raport-transakcji-${dateFrom}_do_${dateTo}.csv`);
      res.send(csv);
    } catch (error) {
      logger.error("Error generating CSV report", { error, userId: user.id });
      Sentry.captureException(error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      connection.release();
    }
  }
);

merchantRouter.get(
  "/dashboard/summary",
  authenticate,
  authorizeRoles(["Reprezentant", "Finansowa", "Techniczna"]),
  async (req, res) => {
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

      let monthly = await connection.query(
        `SELECT MONTH(t.created_at) as month, t.status, COUNT(*) as count
         FROM transactions t
         JOIN shops s ON t.service_id = s.service_id
         WHERE s.merchant_id = ?
           AND YEAR(t.created_at) = YEAR(CURDATE())
         GROUP BY MONTH(t.created_at), t.status`,
        [merchantId]
      );

      let daily = await connection.query(
        `SELECT DATE(t.created_at) as date, t.currency, t.status, COUNT(*) as total
         FROM transactions t
         JOIN shops s ON t.service_id = s.service_id
         WHERE s.merchant_id = ?
           AND t.created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
         GROUP BY DATE(t.created_at), t.currency, t.status
         ORDER BY date ASC`,
        [merchantId]
      );

      let fiveMinutes = await connection.query(
        `SELECT 
            DATE_FORMAT(t.created_at, '%H:%i') as time,
            t.status,
            COUNT(*) as count
         FROM transactions t
         JOIN shops s ON t.service_id = s.service_id
         WHERE s.merchant_id = ?
           AND t.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         GROUP BY 
            FLOOR(MINUTE(t.created_at)/5), HOUR(t.created_at), t.status
         ORDER BY HOUR(t.created_at), FLOOR(MINUTE(t.created_at)/5) ASC`,
        [merchantId]
      );

      fiveMinutes = fiveMinutes.map((row: any) => {
        const [hour, minute] = row.time.split(":").map(Number);
        const roundedMinute = Math.floor(minute / 5) * 5;
        return {
          time: `${hour.toString().padStart(2, "0")}:${roundedMinute
            .toString()
            .padStart(2, "0")}`,
          status: row.status,
          count: Number(row.count),
        };
      });

      monthly = monthly.map((row: any) => ({
        ...row,
        month: Number(row.month),
        count: Number(row.count),
      }));
      daily = daily.map((row: any) => ({
        ...row,
        total: Number(row.total),
      }));

      res.json({ monthly, daily, fiveMinutes });
    } catch (error) {
      logger.error("Error in /dashboard/summary", { error, userId: user.id });
      Sentry.captureException(error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      connection.release();
    }
  }
);
