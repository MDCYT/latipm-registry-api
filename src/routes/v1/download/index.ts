import db from "../../../db";
import { Router } from "../../../router";

export default function registerDownloadRoute(router: Router) {
    router.on("GET", "/v1/download/:name/:version", async (_req, params) => {
        const { name, version } = params;
        if (!name || !version) {
            return new Response("invalid download link", { status: 400 });
        }
        const row = db
            .query(
                `SELECT v.tarball_url
                 FROM versions v
                 JOIN packages p ON p.id = v.package_id
                 WHERE p.name = ? AND v.version = ?`
            )
            .get(name, version) as { tarball_url: string } | undefined;
        if (!row) {
            return new Response("not found", { status: 404 });
        }
        return Response.redirect(row.tarball_url, 302);
    });
}
