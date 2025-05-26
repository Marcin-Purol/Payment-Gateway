import "dotenv/config";
import { getRabbitMqChannel } from "../config/rabbitmq";
import { pool } from "../config/database";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

async function startUserCreationWorker() {
  try {
    const channel = await getRabbitMqChannel();

    await channel.assertExchange(
      "user_creation_exchange",
      "x-delayed-message",
      {
        durable: true,
        arguments: { "x-delayed-type": "direct" },
      }
    );

    const q = await channel.assertQueue("user_creation_queue", {
      durable: true,
    });

    await channel.bindQueue(q.queue, "user_creation_exchange", "user_creation");

    await channel.consume(q.queue, async (msg) => {
      if (!msg) return;
      let connection;
      try {
        const data = JSON.parse(msg.content.toString());
        connection = await pool.getConnection();

        if (data.type === "merchant_registration") {
          const hashedPassword = await bcrypt.hash(data.password, 10);
          const testShopName = "Test Shop";
          const testServiceId = uuidv4();
          const testToken = `token-${Date.now()}`;
          await connection.query(
            "CALL create_merchant_and_user_and_shop(?, ?, ?, ?, ?, ?, ?)",
            [
              data.firstName,
              data.lastName,
              data.email,
              hashedPassword,
              testShopName,
              testServiceId,
              testToken,
            ]
          );
        } else {
          const hashedPassword = await bcrypt.hash(data.password, 10);
          const rolesString = data.roles.join(",");
          await connection.query(
            "CALL create_user_and_roles(?, ?, ?, ?, ?, ?)",
            [
              data.merchantId,
              data.firstName,
              data.lastName,
              data.email,
              hashedPassword,
              rolesString,
            ]
          );
        }
        channel.ack(msg);
      } catch (err) {
        channel.nack(msg, false, false);
      } finally {
        if (connection) connection.release();
      }
    });
  } catch (err) {
    process.exit(1);
  }
}

startUserCreationWorker();
