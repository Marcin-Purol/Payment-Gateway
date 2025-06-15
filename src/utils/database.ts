import { pool } from "../config/database";
import { logger } from "../config/logger";
import { DatabaseError } from "./AppError";

export interface DatabaseConnection {
  query: (sql: string, params?: any[]) => Promise<any>;
  beginTransaction: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
  release: () => void;
}

class SafeDatabaseConnection implements DatabaseConnection {
  private connection: any;
  private isInTransaction = false;

  constructor(connection: any) {
    this.connection = connection;
  }

  async query(sql: string, params?: any[]): Promise<any> {
    try {
      const startTime = Date.now();
      const result = await this.connection.query(sql, params);
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        logger.warn("Slow query detected", {
          sql: sql.substring(0, 200),
          duration,
          params: params?.length || 0,
        });
      }

      return result;
    } catch (error) {
      logger.error("Database query failed", {
        sql: sql.substring(0, 200),
        params: params?.length || 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new DatabaseError(
        `Query failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async beginTransaction(): Promise<void> {
    try {
      await this.connection.beginTransaction();
      this.isInTransaction = true;
      logger.debug("Transaction started");
    } catch (error) {
      logger.error("Failed to start transaction", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new DatabaseError("Failed to start transaction");
    }
  }

  async commit(): Promise<void> {
    try {
      if (!this.isInTransaction) {
        throw new DatabaseError("No active transaction to commit");
      }
      await this.connection.commit();
      this.isInTransaction = false;
      logger.debug("Transaction committed");
    } catch (error) {
      logger.error("Failed to commit transaction", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw new DatabaseError("Failed to commit transaction");
    }
  }

  async rollback(): Promise<void> {
    try {
      if (!this.isInTransaction) {
        logger.warn("Attempted to rollback non-existent transaction");
        return;
      }
      await this.connection.rollback();
      this.isInTransaction = false;
      logger.debug("Transaction rolled back");
    } catch (error) {
      logger.error("Failed to rollback transaction", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  release(): void {
    try {
      if (this.isInTransaction) {
        logger.warn(
          "Releasing connection with active transaction - forcing rollback"
        );
        this.connection.rollback().catch(() => {});
      }
      this.connection.release();
      logger.debug("Database connection released");
    } catch (error) {
      logger.error("Failed to release connection", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export const getDatabaseConnection = async (): Promise<DatabaseConnection> => {
  try {
    const connection = await pool.getConnection();
    return new SafeDatabaseConnection(connection);
  } catch (error) {
    logger.error("Failed to get database connection", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    throw new DatabaseError("Failed to establish database connection");
  }
};

export const withDatabaseConnection = async <T>(
  operation: (db: DatabaseConnection) => Promise<T>
): Promise<T> => {
  const connection = await getDatabaseConnection();
  try {
    return await operation(connection);
  } finally {
    connection.release();
  }
};

export const withDatabaseTransaction = async <T>(
  operation: (db: DatabaseConnection) => Promise<T>
): Promise<T> => {
  const connection = await getDatabaseConnection();
  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
