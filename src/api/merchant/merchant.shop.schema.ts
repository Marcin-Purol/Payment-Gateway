export const shopSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1 },
  },
  required: ["name"],
  additionalProperties: false,
};
