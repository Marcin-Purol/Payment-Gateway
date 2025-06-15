import { createPool } from "mariadb";
import { logger } from "./logger";

export const pool = createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || "20"),
  acquireTimeout: 60000,
  charset: "utf8mb4",
  idleTimeout: 1800000,
  multipleStatements: false,
});

export const createConnection = async () => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    return connection;
  } catch (error) {
    logger.error("Database connection failed:", error);
    throw error;
  }
};
