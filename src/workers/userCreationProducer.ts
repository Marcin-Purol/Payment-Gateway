import { getRabbitMqChannel } from "../config/rabbitmq";

export async function sendToUserCreationQueue(userData: any) {
  const channel = await getRabbitMqChannel();

  await channel.assertExchange("user_creation_exchange", "x-delayed-message", {
    durable: true,
    arguments: { "x-delayed-type": "direct" },
  });

  channel.publish(
    "user_creation_exchange",
    "user_creation",
    Buffer.from(JSON.stringify(userData)),
    { headers: { "x-delay": 60000 } }
  );
}
