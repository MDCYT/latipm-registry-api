import { packagesCollection, versionsCollection } from "../../../db";
import { Router } from "../../../router";
import { json } from "../../../utils/json";

export default function registerPackageVersionRoute(router: Router) {
    router.on("GET", "/v1/packages/:name/:version", async (_req, params) => {
        const { name, version } = params;
        if (!name || !version) {
            return json({ error: "not found" }, { status: 404 });
        }
        const pkg = await packagesCollection.findOne({ name }, { projection: { _id: 1 } });
        if (!pkg) {
            return json({ error: "not found" }, { status: 404 });
        }
        const row = await versionsCollection.findOne(
            { packageId: pkg._id, version },
            { projection: { version: 1, tarballUrl: 1, shasum: 1, manifest: 1 } }
        );
        if (!row) {
            return json({ error: "not found" }, { status: 404 });
        }
        return json({
            name,
            version: row.version,
            dist: { tarball: row.tarballUrl, shasum: row.shasum },
            manifest: row.manifest,
        });
    });
}
