import db from "../../../db";
import { Router } from "../../../router";
import { json } from "../../../utils/json";

export default function registerPackageVersionRoute(router: Router) {
    router.on("GET", "/v1/packages/:name/:version", async (_req, params) => {
        const { name, version } = params;
        if (!name || !version) {
            return json({ error: "not found" }, { status: 404 });
        }
        const row = db
            .query(
                `SELECT v.version, v.tarball_url, v.shasum, v.manifest_json
                 FROM versions v JOIN packages p ON p.id=v.package_id
                 WHERE p.name=? AND v.version=?`
            )
            .get(name, version) as
            | { version: string; tarball_url: string; shasum: string; manifest_json: string }
            | undefined;
        if (!row) {
            return json({ error: "not found" }, { status: 404 });
        }
        return json({
            name,
            version: row.version,
            dist: { tarball: row.tarball_url, shasum: row.shasum },
            manifest: JSON.parse(row.manifest_json),
        });
    });
}
