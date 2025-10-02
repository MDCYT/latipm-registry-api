import { Router } from "../../../router";
import { json } from "../../../utils/json";
import { getAuthUser } from "../../../utils/auth";

export default function registerMeRoute(router: Router) {
    router.on("GET", "/v1/auth/me", async (req) => {
        const user = await getAuthUser(req);
        if (!user) {
            return json({ error: "no auth" }, { status: 401 });
        }
        return json({ id: user.id, email: user.email });
    });
}
