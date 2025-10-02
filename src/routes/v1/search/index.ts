import { packagesCollection } from "../../../db";
import { Router } from "../../../router";
import { json } from "../../../utils/json";

export default function registerSearchRoute(router: Router) {
    router.on("GET", "/v1/search", async (req) => {
        const url = new URL(req.url);
        const query = (url.searchParams.get("q") || "").trim();
        if (!query) {
            return json({ results: [] });
        }
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        const rows = await packagesCollection
            .find({ name: { $regex: regex } }, { projection: { name: 1 } })
            .limit(50)
            .toArray();
        return json({ results: rows.map((row) => ({ name: row.name })) });
    });
}
