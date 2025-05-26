export const transactionSchema = {
  type: "object",
  properties: {
    serviceId: { type: "string" },
    amount: { type: "number", minimum: 0.01 },
    currency: { type: "string", minLength: 3, maxLength: 3 },
    title: { type: "string", maxLength: 255 },
    customer: {
      type: "object",
      properties: {
        firstName: { type: "string", maxLength: 255 },
        lastName: { type: "string", maxLength: 255 },
        email: { type: "string", format: "email" },
        phone: { type: "string", maxLength: 20 },
      },
      required: ["firstName", "lastName", "email", "phone"],
    },
  },
  required: ["serviceId", "amount", "currency", "title", "customer"],
  additionalProperties: false,
};
