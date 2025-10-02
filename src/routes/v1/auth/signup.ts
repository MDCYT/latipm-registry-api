import { usersCollection } from "../../../db";
import { Router } from "../../../router";
import { json } from "../../../utils/json";
import { hashPassword } from "../../../utils/password";
import { signToken } from "../../../utils/token";

export default function registerSignupRoute(router: Router) {
    router.on("POST", "/v1/auth/signup", async (req) => {
        const { email, password } = await req.json() as { email: string; password: string };
        if (!email || !password) {
            return json({ error: "email y password requeridos" }, { status: 400 });
        }
        const existing = await usersCollection.findOne({ email });
        if (existing) {
            return json({ error: "email ya registrado" }, { status: 409 });
        }
        const hash = await hashPassword(password);
        const now = new Date();
        const result = await usersCollection.insertOne({ email, passwordHash: hash, createdAt: now });
        const token = signToken({ uid: result.insertedId.toString(), email });
        return json({ token });
    });
}
