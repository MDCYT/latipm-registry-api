import db from "../../../db";
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
        const existing = db.query("SELECT id FROM users WHERE email=?").get(email);
        if (existing) {
            return json({ error: "email ya registrado" }, { status: 409 });
        }
        const hash = await hashPassword(password);
        db.query("INSERT INTO users(email, password_hash) VALUES (?,?)").run(email, hash);
        const user = db.query("SELECT id FROM users WHERE email=?").get(email) as { id: number };
        const token = signToken({ uid: user.id, email });
        return json({ token });
    });
}
