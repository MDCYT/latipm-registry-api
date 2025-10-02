import { PutObjectCommand } from "@aws-sdk/client-s3";
import db from "../../../db";
import { Router } from "../../../router";
import { s3 } from "../../../services/r2";
import { R2_BUCKET, R2_ENDPOINT, R2_PUBLIC_URL } from "../../../config";
import { json } from "../../../utils/json";
import { getAuthUser } from "../../../utils/auth";

export default function registerPublishRoute(router: Router) {
    router.on("POST", "/v1/packages/:name/:version", async (req, params) => {
        const user = getAuthUser(req);
        if (!user) {
            return json({ error: "no auth" }, { status: 401 });
        }
        const { name, version } = params;
        const form = await req.formData();
        const meta = JSON.parse(String(form.get("meta")) || "{}");
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
        const pkg = db.query("SELECT id,owner_id FROM packages WHERE name=?").get(name!) as
            | { id: number; owner_id: number }
            | undefined;
        if (!pkg) {
            db.query("INSERT INTO packages(name, owner_id) VALUES (?,?)").run(name, user.id);
        } else if (pkg.owner_id !== user.id) {
            return json({ error: "no eres owner" }, { status: 403 });
        }
        const pkgRow = db.query("SELECT id FROM packages WHERE name=?").get(name!) as { id: number };
        const exists = db.query("SELECT id FROM versions WHERE package_id=? AND version=?").get(pkgRow.id, version);
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
        db.query(
            "INSERT INTO versions(package_id, version, tarball_url, shasum, manifest_json) VALUES (?,?,?,?,?)"
        ).run(pkgRow.id, version, tarball, sha256, JSON.stringify(meta));
        return json({ ok: true, name, version, tarball });
    });
}
