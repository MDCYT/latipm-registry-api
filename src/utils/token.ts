import { createHmac } from "crypto";
import { JWT_SECRET } from "../config";

export function signToken(payload: unknown) {
    const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const mac = createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
    return `${data}.${mac}`;
}

export function verifyToken(token?: string) {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const data = parts[0];
    const mac = parts[1];
    const mac2 = createHmac("sha256", JWT_SECRET).update(data!).digest("base64url");
    if (mac !== mac2) return null;
    try {
        const base64 = data!.replace(/-/g, "+").replace(/_/g, "/");
        return JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
    } catch {
        return null;
    }
}
