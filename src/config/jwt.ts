if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error("JWT_REFRESH_SECRET environment variable is required");
}

export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
export const JWT_EXPIRES_IN = "15m";
export const JWT_REFRESH_EXPIRES_IN = "7d";

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const ACCESS_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 15 * 60 * 1000,
};

export const CLEAR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
};
