export const merchantLoginSchema = {
  type: "object",
  properties: {
    email: { type: "string", format: "email", maxLength: 255 },
    password: { type: "string", minLength: 6 },
  },
  required: ["email", "password"],
  additionalProperties: false,
};
