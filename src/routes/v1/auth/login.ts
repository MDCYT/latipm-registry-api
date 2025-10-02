import { usersCollection } from "../../../db";
import { Router } from "../../../router";
import { json } from "../../../utils/json";
import { verifyPassword } from "../../../utils/password";
import { signToken } from "../../../utils/token";

export default function registerLoginRoute(router: Router) {
    router.on("POST", "/v1/auth/login", async (req) => {
        const { email, password } = await req.json() as { email: string; password: string };
        const user = await usersCollection.findOne({ email });
        if (!user) {
            return json({ error: "credenciales" }, { status: 401 });
        }
        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) {
            return json({ error: "credenciales" }, { status: 401 });
        }
        const token = signToken({ uid: user._id.toString(), email: user.email });
        return json({ token });
    });
}
