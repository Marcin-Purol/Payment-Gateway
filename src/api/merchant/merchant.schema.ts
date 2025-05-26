export const merchantSchema = {
  type: "object",
  properties: {
    firstName: { type: "string", maxLength: 255 },
    lastName: { type: "string", maxLength: 255 },
    email: { type: "string", format: "email", maxLength: 255 },
    password: { type: "string", minLength: 6 },
  },
  required: ["firstName", "lastName", "email", "password"],
  additionalProperties: false,
};
