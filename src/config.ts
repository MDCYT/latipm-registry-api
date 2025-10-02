export const JWT_SECRET: string = process.env.JWT_SECRET || "dev-secret";

export const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
export const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
export const R2_BUCKET = process.env.R2_BUCKET!;
export const R2_ENDPOINT = process.env.R2_ENDPOINT!;
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export const SERVER_PORT = Number(process.env.PORT || 8787);

export const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
export const MONGO_DB_NAME = process.env.MONGO_DB_NAME || "latipm_registry";
