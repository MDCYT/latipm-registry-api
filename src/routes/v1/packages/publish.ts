import { PutObjectCommand } from "@aws-sdk/client-s3";
import { ObjectId, packagesCollection, versionsCollection } from "../../../db";
import { Router } from "../../../router";
import { s3 } from "../../../services/r2";
import { R2_BUCKET, R2_ENDPOINT, R2_PUBLIC_URL } from "../../../config";
import { json } from "../../../utils/json";
import { getAuthUser } from "../../../utils/auth";

export default function registerPublishRoute(router: Router) {
    router.on("POST", "/v1/packages/:name/:version", async (req, params) => {
        const user = await getAuthUser(req);
        if (!user) {
            return json({ error: "no auth" }, { status: 401 });
        }
        const { name, version } = params;
        if (!name || !version) {
            return json({ error: "nombre y versión requeridos" }, { status: 400 });
        }
        const form = await req.formData();
        const parsedMeta = JSON.parse(String(form.get("meta")) || "{}");
        const meta = (typeof parsedMeta === "object" && parsedMeta !== null ? parsedMeta : {}) as Record<
            string,
            unknown
        >;
        const file = form.get("file") as unknown as File;
        const sha256 = String(form.get("sha256"));
        if (!file) {
            return json({ error: "file requerido" }, { status: 400 });
        }
        const buf = Buffer.from(await file.arrayBuffer());
        const real = new Bun.SHA256().update(buf).digest("hex");
        if (real !== sha256) {
            return json({ error: "sha256 inválido" }, { status: 400 });
        }
        let pkg = await packagesCollection.findOne({ name });
        if (!pkg) {
            const ownerId = new ObjectId(user.id);
            const now = new Date();
            const insert = await packagesCollection.insertOne({
                name,
                ownerId,
                createdAt: now,
            });
            pkg = {
                _id: insert.insertedId,
                name,
                ownerId,
                createdAt: now,
            };
        } else if (pkg.ownerId.toString() !== user.id) {
            return json({ error: "no eres owner" }, { status: 403 });
        }
        const exists = await versionsCollection.findOne({ packageId: pkg._id, version });
        if (exists) {
            return json({ error: "versión ya publicada" }, { status: 409 });
        }
        if (!R2_ENDPOINT) {
            return json({ error: "R2_ENDPOINT no configurado" }, { status: 500 });
        }
        const r2Key = `${name}/${version}.zip`;
        await s3.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: r2Key,
            Body: buf,
            ContentType: "application/zip",
        }));
        const tarball = `${R2_PUBLIC_URL.replace(/\/$/, "")}/${r2Key}`;
        await versionsCollection.insertOne({
            packageId: pkg._id,
            version,
            tarballUrl: tarball,
            shasum: sha256,
            manifest: meta,
            createdAt: new Date(),
        });
        return json({ ok: true, name, version, tarball });
    });
}
