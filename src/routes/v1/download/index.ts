import { packagesCollection, versionsCollection } from "../../../db";
import { Router } from "../../../router";

export default function registerDownloadRoute(router: Router) {
    router.on("GET", "/v1/download/:name/:version", async (_req, params) => {
        const { name, version } = params;
        if (!name || !version) {
            return new Response("invalid download link", { status: 400 });
        }
        const pkg = await packagesCollection.findOne({ name }, { projection: { _id: 1 } });
        if (!pkg) {
            return new Response("not found", { status: 404 });
        }
        const row = await versionsCollection.findOne(
            { packageId: pkg._id, version },
            { projection: { tarballUrl: 1 } }
        );
        if (!row) {
            return new Response("not found", { status: 404 });
        }
        return Response.redirect(row.tarballUrl, 302);
    });
}
