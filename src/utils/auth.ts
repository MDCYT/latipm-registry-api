import { ObjectId, usersCollection } from "../db";
import { verifyToken } from "./token";

export interface AuthenticatedUser {
    id: string;
    email: string;
}

export async function getAuthUser(req: Request): Promise<AuthenticatedUser | null> {
    const header = req.headers.get("authorization");
    if (!header) return null;
    const token = header.replace(/^Bearer\s+/i, "");
    const payload = verifyToken(token) as { uid: string } | null;
    if (!payload || typeof payload.uid !== "string") return null;
    try {
        const user = await usersCollection.findOne({ _id: new ObjectId(payload.uid) }, { projection: { email: 1 } });
        return user ? { id: user._id.toString(), email: user.email } : null;
    } catch {
        return null;
    }
}
