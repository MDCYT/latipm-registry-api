import db from "../../../db";
import { Router } from "../../../router";
import { json } from "../../../utils/json";

export default function registerPackageVersionsRoute(router: Router) {
    router.on("GET", "/v1/packages/:name", async (_req, params) => {
        const { name } = params;
        const pkg = db.query("SELECT id FROM packages WHERE name=?").get(name) as { id: number } | undefined;
        if (!pkg) {
            return json({ name, versions: [] });
        }
        const rows = db
            .query("SELECT version, tarball_url as tarball, shasum FROM versions WHERE package_id=? ORDER BY created_at DESC")
            .all(pkg.id) as { version: string; tarball: string; shasum: string }[];
        return json({
            name,
            versions: rows.map((row) => ({
                version: row.version,
                dist: { tarball: row.tarball, shasum: row.shasum },
            })),
        });
    });
}
