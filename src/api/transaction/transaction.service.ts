import { pool } from "../../config/database";

export const createTransaction = async (data: {
  serviceId: string;
  amount: number;
  currency: string;
  title: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}) => {
  const connection = await pool.getConnection();
  try {
    const result = await connection.query(
      `INSERT INTO transactions (
        service_id, amount, currency, title,
        customer_first_name, customer_last_name,
        customer_email, customer_phone, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.serviceId,
        data.amount,
        data.currency,
        data.title,
        data.customer.firstName,
        data.customer.lastName,
        data.customer.email,
        data.customer.phone,
        "Pending",
      ]
    );

    return {
      id: Number(result.insertId),
      ...data,
      status: "Pending",
    };
  } finally {
    connection.release();
  }
};
