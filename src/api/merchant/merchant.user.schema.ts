export const userSchema = {
  type: "object",
  properties: {
    firstName: { type: "string", minLength: 1 },
    lastName: { type: "string", minLength: 1 },
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 6 },
    roles: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
    },
  },
  required: ["firstName", "lastName", "email", "password", "roles"],
  additionalProperties: false,
};

export const userUpdateSchema = {
  type: "object",
  properties: {
    firstName: { type: "string", minLength: 1 },
    lastName: { type: "string", minLength: 1 },
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 6 },
    roles: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
    },
  },
  additionalProperties: false,
};
