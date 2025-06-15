import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../config/database";
import { validateSchema } from "../../middlewares/validateSchema";
import { merchantSchema } from "./merchant.schema";
import { merchantLoginSchema } from "./merchant.login.schema";
import { shopSchema } from "./merchant.shop.schema";
import { userSchema, userUpdateSchema } from "./merchant.user.schema";
import {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
  COOKIE_OPTIONS,
  ACCESS_TOKEN_COOKIE_OPTIONS,
  CLEAR_COOKIE_OPTIONS,
} from "../../config/jwt";
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
        const accessToken = jwt.sign(
          {
            id: merchant.id,
            email: merchant.email,
            type: "merchant",
            roles: ["Reprezentant", "Techniczna", "Finansowa"],
          },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );

        const refreshToken = jwt.sign(
          {
            id: merchant.id,
            email: merchant.email,
            type: "merchant",
            roles: ["Reprezentant", "Techniczna", "Finansowa"],
          },
          JWT_REFRESH_SECRET,
          { expiresIn: JWT_REFRESH_EXPIRES_IN }
        );

        res.cookie("accessToken", accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
        res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

        return res.status(200).json({
          message: "Login successful",
          user: {
            id: merchant.id,
            email: merchant.email,
            type: "merchant",
            roles: ["Reprezentant", "Techniczna", "Finansowa"],
          },
        });
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
        const accessToken = jwt.sign(
          {
            id: user.id,
            email: user.email,
            type: user.type,
            roles,
          },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );

        const refreshToken = jwt.sign(
          {
            id: user.id,
            email: user.email,
            type: user.type,
            roles,
          },
          JWT_REFRESH_SECRET,
          { expiresIn: JWT_REFRESH_EXPIRES_IN }
        );

        res.cookie("accessToken", accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
        res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

        return res.status(200).json({
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            type: user.type,
            roles,
          },
        });
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
  "/shops/:serviceId/toggle-status",
  authenticate,
  authorizeRoles(["Reprezentant"]),
  async (req, res) => {
    const serviceId = req.params.serviceId.trim();
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
        "SELECT active FROM shops WHERE service_id = ? AND merchant_id = ?",
        [serviceId, merchantId]
      );

      if (!shop) {
        return res.status(404).json({ error: "Shop not found" });
      }

      const newStatus = !shop.active;
      await connection.query(
        "UPDATE shops SET active = ? WHERE service_id = ? AND merchant_id = ?",
        [newStatus, serviceId, merchantId]
      );

      const statusText = newStatus ? "aktywowany" : "dezaktywowany";
      res.status(200).json({
        message: `Sklep został pomyślnie ${statusText}`,
        active: newStatus,
      });
    } catch (error) {
      logger.error("Error toggling shop status", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : null,
        serviceId,
        userId: user.id,
      });
      Sentry.captureException(error);
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
    const { dateFrom, dateTo, status } = req.query;

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

      let whereClause =
        "WHERE s.merchant_id = ? AND t.created_at BETWEEN ? AND ?";
      const queryParams = [merchantId, dateFrom, dateTo];

      if (status) {
        whereClause += " AND t.status = ?";
        queryParams.push(status);
      }

      const transactions = await connection.query(
        `SELECT t.id, t.title, t.amount, t.currency, t.status, 
         CONVERT_TZ(t.created_at, '+00:00', '+02:00') as created_at, 
         s.name AS shopName
         FROM transactions t
         JOIN shops s ON t.service_id = s.service_id
         ${whereClause}
         ORDER BY t.created_at DESC`,
        queryParams
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
        `SELECT DATE(t.created_at) as date, t.currency, t.status, SUM(t.amount) as total
         FROM transactions t
         JOIN shops s ON t.service_id = s.service_id
         WHERE s.merchant_id = ?
           AND t.created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
         GROUP BY DATE(t.created_at), t.currency, t.status
         ORDER BY date ASC`,
        [merchantId]
      );
      let hourly = await connection.query(
        `SELECT 
           CONCAT(
             LPAD(HOUR(CONVERT_TZ(t.created_at, '+00:00', '+02:00')), 2, '0'), 
             ':', 
             CASE 
               WHEN MINUTE(CONVERT_TZ(t.created_at, '+00:00', '+02:00')) < 30 THEN '00'
               ELSE '30'
             END
           ) as time_interval,
           t.status, 
           COUNT(*) as count
         FROM transactions t
         JOIN shops s ON t.service_id = s.service_id
         WHERE s.merchant_id = ?
           AND t.created_at >= DATE_SUB(CONVERT_TZ(NOW(), '+00:00', '+02:00'), INTERVAL 5 HOUR)
         GROUP BY 
           HOUR(CONVERT_TZ(t.created_at, '+00:00', '+02:00')), 
           CASE WHEN MINUTE(CONVERT_TZ(t.created_at, '+00:00', '+02:00')) < 30 THEN 0 ELSE 30 END,
           t.status
         ORDER BY HOUR(CONVERT_TZ(t.created_at, '+00:00', '+02:00')), CASE WHEN MINUTE(CONVERT_TZ(t.created_at, '+00:00', '+02:00')) < 30 THEN 0 ELSE 30 END ASC`,
        [merchantId]
      );
      monthly = monthly.map((row: any) => ({
        ...row,
        month: Number(row.month),
        count: Number(row.count),
      }));
      daily = daily.map((row: any) => ({
        ...row,
        total: Number(row.total),
      }));
      hourly = hourly.map((row: any) => ({
        ...row,
        count: Number(row.count),
      }));

      res.json({ monthly, daily, hourly });
    } catch (error) {
      logger.error("Error in /dashboard/summary", { error, userId: user.id });
      Sentry.captureException(error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      connection.release();
    }
  }
);

merchantRouter.post("/logout", (req, res) => {
  res.clearCookie("accessToken", CLEAR_COOKIE_OPTIONS);
  res.clearCookie("refreshToken", CLEAR_COOKIE_OPTIONS);
  res.status(200).json({ message: "Logged out successfully" });
});

merchantRouter.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token not provided" });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;

    const newAccessToken = jwt.sign(
      {
        id: decoded.id,
        email: decoded.email,
        type: decoded.type,
        roles: decoded.roles,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.cookie("accessToken", newAccessToken, ACCESS_TOKEN_COOKIE_OPTIONS);

    res.status(200).json({
      message: "Token refreshed successfully",
      user: {
        id: decoded.id,
        email: decoded.email,
        type: decoded.type,
        roles: decoded.roles,
      },
    });
  } catch (error) {
    logger.warn("Invalid refresh token attempt", {
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.clearCookie("accessToken", CLEAR_COOKIE_OPTIONS);
    res.clearCookie("refreshToken", CLEAR_COOKIE_OPTIONS);

    return res.status(401).json({ error: "Invalid refresh token" });
  }
});

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
  "/shops/:serviceId/toggle-status",
  authenticate,
  authorizeRoles(["Reprezentant"]),
  async (req, res) => {
    const serviceId = req.params.serviceId.trim();
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
        "SELECT active FROM shops WHERE service_id = ? AND merchant_id = ?",
        [serviceId, merchantId]
      );

      if (!shop) {
        return res.status(404).json({ error: "Shop not found" });
      }

      const newStatus = !shop.active;
      await connection.query(
        "UPDATE shops SET active = ? WHERE service_id = ? AND merchant_id = ?",
        [newStatus, serviceId, merchantId]
      );

      const statusText = newStatus ? "aktywowany" : "dezaktywowany";
      res.status(200).json({
        message: `Sklep został pomyślnie ${statusText}`,
        active: newStatus,
      });
    } catch (error) {
      logger.error("Error toggling shop status", {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : null,
        serviceId,
        userId: user.id,
      });
      Sentry.captureException(error);
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
    const { dateFrom, dateTo, status } = req.query;

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

      let whereClause =
        "WHERE s.merchant_id = ? AND t.created_at BETWEEN ? AND ?";
      const queryParams = [merchantId, dateFrom, dateTo];

      if (status) {
        whereClause += " AND t.status = ?";
        queryParams.push(status);
      }

      const transactions = await connection.query(
        `SELECT t.id, t.title, t.amount, t.currency, t.status, 
         CONVERT_TZ(t.created_at, '+00:00', '+02:00') as created_at, 
         s.name AS shopName
         FROM transactions t
         JOIN shops s ON t.service_id = s.service_id
         ${whereClause}
         ORDER BY t.created_at DESC`,
        queryParams
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
        `SELECT DATE(t.created_at) as date, t.currency, t.status, SUM(t.amount) as total
         FROM transactions t
         JOIN shops s ON t.service_id = s.service_id
         WHERE s.merchant_id = ?
           AND t.created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
         GROUP BY DATE(t.created_at), t.currency, t.status
         ORDER BY date ASC`,
        [merchantId]
      );
      let hourly = await connection.query(
        `SELECT 
           CONCAT(
             LPAD(HOUR(CONVERT_TZ(t.created_at, '+00:00', '+02:00')), 2, '0'), 
             ':', 
             CASE 
               WHEN MINUTE(CONVERT_TZ(t.created_at, '+00:00', '+02:00')) < 30 THEN '00'
               ELSE '30'
             END
           ) as time_interval,
           t.status, 
           COUNT(*) as count
         FROM transactions t
         JOIN shops s ON t.service_id = s.service_id
         WHERE s.merchant_id = ?
           AND t.created_at >= DATE_SUB(CONVERT_TZ(NOW(), '+00:00', '+02:00'), INTERVAL 5 HOUR)
         GROUP BY 
           HOUR(CONVERT_TZ(t.created_at, '+00:00', '+02:00')), 
           CASE WHEN MINUTE(CONVERT_TZ(t.created_at, '+00:00', '+02:00')) < 30 THEN 0 ELSE 30 END,
           t.status
         ORDER BY HOUR(CONVERT_TZ(t.created_at, '+00:00', '+02:00')), CASE WHEN MINUTE(CONVERT_TZ(t.created_at, '+00:00', '+02:00')) < 30 THEN 0 ELSE 30 END ASC`,
        [merchantId]
      );
      monthly = monthly.map((row: any) => ({
        ...row,
        month: Number(row.month),
        count: Number(row.count),
      }));
      daily = daily.map((row: any) => ({
        ...row,
        total: Number(row.total),
      }));
      hourly = hourly.map((row: any) => ({
        ...row,
        count: Number(row.count),
      }));

      res.json({ monthly, daily, hourly });
    } catch (error) {
      logger.error("Error in /dashboard/summary", { error, userId: user.id });
      Sentry.captureException(error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      connection.release();
    }
  }
);

merchantRouter.get("/profile", authenticate, async (req, res) => {
  let connection;
  try {
    const user = (req as any).user;
    connection = await pool.getConnection();

    let roles: string[] = [];

    if (user.type === "merchant") {
      roles = ["Reprezentant", "Techniczna", "Finansowa"];
    } else {
      const rolesResult = await connection.query(
        `SELECT r.name FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = ?`,
        [user.id]
      );
      roles = Array.isArray(rolesResult)
        ? rolesResult.map((role: any) => role.name)
        : [];
    }

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        type: user.type,
        roles: roles,
      },
    });
  } catch (error) {
    logger.error("Error getting user profile", {
      error,
      userId: (req as any).user?.id,
    });
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    if (connection) connection.release();
  }
});

merchantRouter.put(
  "/users/:userId/roles",
  authenticate,
  authorizeRoles(["Reprezentant"]),
  async (req, res) => {
    const { userId } = req.params;
    const { roles } = req.body;

    if (!roles || !Array.isArray(roles)) {
      return res.status(400).json({ error: "Roles array is required" });
    }

    const connection = await pool.getConnection();
    try {
      await connection.query("DELETE FROM user_roles WHERE user_id = ?", [
        userId,
      ]);

      for (const roleName of roles) {
        const [roleRows] = await connection.query(
          "SELECT id FROM roles WHERE name = ?",
          [roleName]
        );

        if (roleRows && roleRows.id) {
          await connection.query(
            "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
            [userId, roleRows.id]
          );
        }
      }

      res.status(200).json({
        message: "User roles updated successfully",
        userId: userId,
        roles: roles,
      });
    } catch (error) {
      logger.error("Error updating user roles", { error, userId, roles });
      Sentry.captureException(error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      connection.release();
    }
  }
);

merchantRouter.get(
  "/transactions",
  authenticate,
  authorizeRoles(["Reprezentant", "Finansowa"]),
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
      dateFrom,
      dateTo,
    } = req.query;
    const connection = await pool.getConnection();
    try {
      let merchantId;
      if (user.type === "merchant") {
        merchantId = user.id;
      } else {
        const [userRecord] = await connection.query(
          "SELECT merchant_id FROM users WHERE id = ?",
          [user.id]
        );
        if (!userRecord) {
          return res.status(404).json({ error: "User not found" });
        }
        merchantId = userRecord.merchant_id;
      }

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
        whereClause +=
          " AND (t.title LIKE ? OR t.customer_email LIKE ? OR t.customer_first_name LIKE ? OR t.customer_last_name LIKE ?)";
        const searchPattern = `%${search}%`;
        queryParams.push(
          searchPattern,
          searchPattern,
          searchPattern,
          searchPattern
        );
      }

      if (dateFrom) {
        whereClause += " AND DATE(t.created_at) >= ?";
        queryParams.push(dateFrom);
      }

      if (dateTo) {
        whereClause += " AND DATE(t.created_at) <= ?";
        queryParams.push(dateTo);
      }
      const countQuery = `
        SELECT COUNT(*) as total
        FROM transactions t
        JOIN shops s ON t.service_id = s.service_id
        ${whereClause}
      `;
      const [countResult] = await connection.query(countQuery, queryParams);
      const total = Number(countResult.total);

      const pageNum = Math.max(1, parseInt(String(page)));
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit))));
      const offset = (pageNum - 1) * limitNum;

      const allowedSortFields = [
        "created_at",
        "updated_at",
        "amount",
        "status",
        "id",
      ];
      const sortByStr = allowedSortFields.includes(String(sortBy))
        ? String(sortBy)
        : "created_at";
      const sortOrderStr = ["ASC", "DESC"].includes(
        String(sortOrder).toUpperCase()
      )
        ? String(sortOrder).toUpperCase()
        : "DESC";
      const transactionQuery = `
        SELECT 
          t.id,
          t.service_id,
          t.amount,
          t.currency,
          t.title,
          t.customer_first_name,
          t.customer_last_name,
          t.customer_email,
          t.customer_phone,
          t.status,
          t.payment_link_id,
          t.created_at,
          t.updated_at,
          s.name as shop_name
        FROM transactions t
        JOIN shops s ON t.service_id = s.service_id
        ${whereClause}
        ORDER BY ${sortByStr} ${sortOrderStr}
        LIMIT ? OFFSET ?
      `;

      const transactionQueryParams = [...queryParams, limitNum, offset];
      const transactions = await connection.query(
        transactionQuery,
        transactionQueryParams
      );

      res.status(200).json({
        transactions: transactions || [],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      logger.error("Error fetching transactions", {
        error: error instanceof Error ? error.stack : JSON.stringify(error),
        userId: user.id,
      });
      Sentry.captureException(error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      connection.release();
    }
  }
);

merchantRouter.get(
  "/reports/history",
  authenticate,
  authorizeRoles(["Reprezentant", "Finansowa"]),
  async (req, res) => {
    try {
      res.status(200).json({
        reports: [],
      });
    } catch (error) {
      logger.error("Error fetching reports history", {
        error: error instanceof Error ? error.stack : JSON.stringify(error),
        userId: (req as any).user?.id,
      });
      Sentry.captureException(error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);
