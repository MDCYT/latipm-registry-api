import db from "../../../db";
import { Router } from "../../../router";
import { json } from "../../../utils/json";

export default function registerSearchRoute(router: Router) {
    router.on("GET", "/v1/search", async (req) => {
        const url = new URL(req.url);
        const q = `%${(url.searchParams.get("q") || "").toLowerCase()}%`;
        const rows = db.query("SELECT name FROM packages WHERE lower(name) LIKE ? LIMIT 50").all(q) as { name: string }[];
        return json({ results: rows.map((row) => ({ name: row.name })) });
    });
}
