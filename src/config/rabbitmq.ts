import amqp from "amqplib";

let channel: amqp.Channel | null = null;

export async function getRabbitMqChannel(): Promise<amqp.Channel> {
  if (channel) return channel;

  const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq:5672";
  let retries = 20;
  console.log(`[RabbitMQ] Attempting to connect to ${RABBITMQ_URL}`);

  while (retries) {
    try {
      console.log(`[RabbitMQ] Retry connect... (${21 - retries}/20)`);
      const connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();
      console.log("[RabbitMQ] Successfully connected!");
      return channel;
    } catch (error) {
      retries--;
      console.log(
        `[RabbitMQ] Connection failed: ${error}. Retries left: ${retries}`
      );
      if (retries > 0) {
        await new Promise((res) => setTimeout(res, 5000));
      }
    }
  }
  throw new Error("Failed to connect to RabbitMQ after multiple attempts");
}
