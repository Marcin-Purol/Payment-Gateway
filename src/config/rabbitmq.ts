import amqp from "amqplib";

let channel: amqp.Channel | null = null;

export async function getRabbitMqChannel(): Promise<amqp.Channel> {
  if (channel) return channel;

  const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq:5672";
  let retries = 10;
  while (retries) {
    try {
      const connection = await amqp.connect(RABBITMQ_URL);
      channel = await connection.createChannel();
      return channel;
    } catch (err) {
      retries--;
      console.log(`[RabbitMQ] Retry connect... (${10 - retries}/10)`);
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
  throw new Error("Failed to connect to RabbitMQ after multiple attempts");
}
