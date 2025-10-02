import db from "../db";
import { verifyToken } from "./token";

export interface AuthenticatedUser {
    id: number;
    email: string;
}

export function getAuthUser(req: Request): AuthenticatedUser | null {
    const header = req.headers.get("authorization");
    if (!header) return null;
    const token = header.replace(/^Bearer\s+/i, "");
    const payload = verifyToken(token) as { uid: number } | null;
    if (!payload || typeof payload.uid !== "number") return null;
    const row = db.query("SELECT id,email FROM users WHERE id=?").get(payload.uid) as AuthenticatedUser | undefined;
    return row ?? null;
}
