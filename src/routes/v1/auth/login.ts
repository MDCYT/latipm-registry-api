import db from "../../../db";
import { Router } from "../../../router";
import { json } from "../../../utils/json";
import { verifyPassword } from "../../../utils/password";
import { signToken } from "../../../utils/token";

export default function registerLoginRoute(router: Router) {
    router.on("POST", "/v1/auth/login", async (req) => {
        const { email, password } = await req.json() as { email: string; password: string };
        const user = db.query("SELECT id,email,password_hash FROM users WHERE email=?").get(email) as
            | { id: number; email: string; password_hash: string }
            | undefined;
        if (!user) {
            return json({ error: "credenciales" }, { status: 401 });
        }
        const ok = await verifyPassword(password, user.password_hash);
        if (!ok) {
            return json({ error: "credenciales" }, { status: 401 });
        }
        const token = signToken({ uid: user.id, email: user.email });
        return json({ token });
    });
}
