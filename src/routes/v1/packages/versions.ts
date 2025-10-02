import { packagesCollection, versionsCollection } from "../../../db";
import { Router } from "../../../router";
import { json } from "../../../utils/json";

export default function registerPackageVersionsRoute(router: Router) {
    router.on("GET", "/v1/packages/:name", async (_req, params) => {
        const { name } = params;
        if (!name) {
            return json({ name, versions: [] });
        }
        const pkg = await packagesCollection.findOne({ name }, { projection: { _id: 1 } });
        if (!pkg) {
            return json({ name, versions: [] });
        }
        const rows = await versionsCollection
            .find({ packageId: pkg._id }, { projection: { version: 1, tarballUrl: 1, shasum: 1 } })
            .sort({ createdAt: -1 })
            .toArray();
        return json({
            name,
            versions: rows.map((row) => ({
                version: row.version,
                dist: { tarball: row.tarballUrl, shasum: row.shasum },
            })),
        });
    });
}
