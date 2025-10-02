// Bun registry server — REST API + SQLite
// Routes:
//  POST   /v1/auth/signup   {email,password}
//  POST   /v1/auth/login    {email,password}
//  GET    /v1/auth/me       (Bearer token)
//  POST   /v1/packages/:name/:version   (auth, form-data: meta, file, sha256)
//  GET    /v1/packages/:name            -> versions list
//  GET    /v1/packages/:name/:version   -> metadata
//  GET    /v1/search?q=term             -> simple name LIKE search
//  GET    /v1/download/:name/:version   -> zip file stream
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"; 
 
import { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync, existsSync, createReadStream } from "node:fs";
import { join } from "node:path";
import { createHmac } from "crypto";

const db = new Database("registry.db"); 
const JWT_SECRET: string = process.env.JWT_SECRET || "dev-secret";
 
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;
const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;

const s3 = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

// --- schema bootstrap ---
const schema = await Bun.file(join(import.meta.dir, "schema.sql")).text();
db.exec(schema);

// --- helpers ---
function json(data: any, init: ResponseInit = {}) {
    return new Response(JSON.stringify(data), { ...init, headers: { "content-type": "application/json", ...(init.headers || {}) } });
}

async function hashPassword(pw: string) {
    return await Bun.password.hash(pw, { algorithm: "bcrypt", cost: 10 });
}
async function verifyPassword(pw: string, hash: string) {
    return await Bun.password.verify(pw, hash);
}

function sign(payload: any) {
    // super simple token: base64(json).hmac
    const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const mac = createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
    return `${data}.${mac}`;
}
function verify(token?: string) {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const data = parts[0];
    const mac = parts[1];
    const mac2 = createHmac("sha256", JWT_SECRET).update(data!).digest("base64url");
    if (mac !== mac2) return null;
    try {
        const base64 = data!.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
    } catch {
        return null;
    }
}

function auth(req: Request) {
    const h = req.headers.get("authorization");
    if (!h) return null;
    const token = h.replace(/^Bearer\s+/i, "");
    const payload = verify(token);
    if (!payload) return null;
    const row = db.query("SELECT id,email FROM users WHERE id=?").get(payload.uid) as any;
    return row || null;
}

// --- router helper ---
type Handler = (req: Request, params: Record<string, string>) => Promise<Response> | Response;

class Router {
    routes: { method: string, pattern: RegExp, keys: string[], handler: Handler }[] = [];

    on(method: string, path: string, handler: Handler) {
        // Convierte /v1/packages/:name/:version en regexp y extrae keys
        const keys: string[] = [];
        const pattern = new RegExp("^" + path.replace(/:([a-zA-Z0-9_]+)/g, (_, k) => {
            keys.push(k);
            return "([^/]+)";
        }) + "$");
        this.routes.push({ method, pattern, keys, handler });
    }

    async route(req: Request): Promise<Response> {
        const url = new URL(req.url);
        for (const r of this.routes) {
            if (req.method !== r.method) continue;
            const m = url.pathname.match(r.pattern);
            if (m) {
                const params: Record<string, string> = {};
                r.keys.forEach((k, i) => params[k] = m[i + 1]);
                return await r.handler(req, params);
            }
        }
        return json({ error: "not found" }, { status: 404 });
    }
}

const router = new Router();

// --- rutas ---
router.on("POST", "/v1/auth/signup", async (req) => {
    const { email, password } = await req.json() as { email: string, password: string };
    if (!email || !password) return json({ error: "email y password requeridos" }, { status: 400 });
    const existing = db.query("SELECT id FROM users WHERE email=?").get(email);
    if (existing) return json({ error: "email ya registrado" }, { status: 409 });
    const hash = await hashPassword(password);
    db.query("INSERT INTO users(email, password_hash) VALUES (?,?)").run(email, hash);
    const user = db.query("SELECT id FROM users WHERE email=?").get(email) as any;
    const token = sign({ uid: user.id, email });
    return json({ token });
});

router.on("POST", "/v1/auth/login", async (req) => {
    const { email, password } = await req.json() as { email: string, password: string };
    const user = db.query("SELECT id,email,password_hash FROM users WHERE email=?").get(email) as any;
    if (!user) return json({ error: "credenciales" }, { status: 401 });
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return json({ error: "credenciales" }, { status: 401 });
    const token = sign({ uid: user.id, email: user.email });
    return json({ token });
});

router.on("GET", "/v1/auth/me", async (req) => {
    const user = auth(req);
    if (!user) return json({ error: "no auth" }, { status: 401 });
    return json({ id: user.id, email: user.email });
});

router.on("POST", "/v1/packages/:name/:version", async (req, params) => {
    const user = auth(req);
    if (!user) return json({ error: "no auth" }, { status: 401 });
    const { name, version } = params;
    const form = await req.formData();
    const meta = JSON.parse(String(form.get("meta")));
    const file = form.get("file") as unknown as File;
    const sha256 = String(form.get("sha256"));
    if (!file) return json({ error: "file requerido" }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    const real = new Bun.SHA256().update(buf).digest("hex");
    if (real !== sha256) return json({ error: "sha256 inválido" }, { status: 400 });

    // ensure package row
    const pkg = db.query("SELECT id,owner_id FROM packages WHERE name=?").get(name!) as any;
    if (!pkg) {
        db.query("INSERT INTO packages(name, owner_id) VALUES (?,?)").run(name, user.id);
    } else if (pkg.owner_id !== user.id) {
        return json({ error: "no eres owner" }, { status: 403 });
    }
    const pkgRow = db.query("SELECT id FROM packages WHERE name=?").get(name!) as any;

    // ensure version unique
    const exists = db.query("SELECT id FROM versions WHERE package_id=? AND version=?").get(pkgRow.id, version);
    if (exists) return json({ error: "versión ya publicada" }, { status: 409 });

    // store file en Cloudflare R2
    if (!R2_ENDPOINT) return json({ error: "R2_ENDPOINT no configurado" }, { status: 500 });
    const r2Key = `${name}/${version}.zip`;
    await s3.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
        Body: buf,
        ContentType: "application/zip",
    }));
    // Usa la URL pública para el tarball
    const tarball = `${R2_PUBLIC_URL.replace(/\/$/, "")}/${r2Key}`;
    db.query("INSERT INTO versions(package_id, version, tarball_url, shasum, manifest_json) VALUES (?,?,?,?,?)")
        .run(pkgRow.id, version, tarball, sha256, JSON.stringify(meta));

    return json({ ok: true, name, version, tarball });
});

router.on("GET", "/v1/packages/:name", async (req, params) => {
    const { name } = params;
    const pkg = db.query("SELECT id FROM packages WHERE name=?").get(name) as any;
    if (!pkg) return json({ name, versions: [] });
    const vers = db.query("SELECT version, tarball_url as tarball, shasum FROM versions WHERE package_id=? ORDER BY created_at DESC").all(pkg.id) as any[];
    return json({ name, versions: vers.map(v => ({ version: v.version, dist: { tarball: v.tarball, shasum: v.shasum } })) });
});

router.on("GET", "/v1/packages/:name/:version", async (req, params) => {
    const { name, version } = params;
    if (!name || !version) return json({ error: "not found" }, { status: 404 });
    const row = db.query(
        `SELECT v.version, v.tarball_url, v.shasum, v.manifest_json
         FROM versions v JOIN packages p ON p.id=v.package_id
         WHERE p.name=? AND v.version=?`
    ).get(name, version) as any;
    if (!row) return json({ error: "not found" }, { status: 404 });
    return json({ name, version: row.version, dist: { tarball: row.tarball_url, shasum: row.shasum }, manifest: JSON.parse(row.manifest_json) });
});

router.on("GET", "/v1/search", async (req) => {
    const url = new URL(req.url);
    const q = `%${(url.searchParams.get("q") || "").toLowerCase()}%`;
    const rows = db.query("SELECT name FROM packages WHERE lower(name) LIKE ? LIMIT 50").all(q) as any[];
    return json({ results: rows.map(r => ({ name: r.name })) });
});

router.on("GET", "/v1/download/:name/:version", async (req, params) => {
    const { name, version } = params;
    if (!name || !version) return new Response("invalid download link", { status: 400 });
    const row = db.query(
        `SELECT v.tarball_url
         FROM versions v
         JOIN packages p ON p.id = v.package_id
         WHERE p.name = ? AND v.version = ?`
    ).get(name, version) as any;
    if (!row) return new Response("not found", { status: 404 });
    return Response.redirect(row.tarball_url, 302);
});

// --- servidor principal ---
const server = Bun.serve({
    port: process.env.PORT || 8787,
    fetch: (req) => router.route(req)
});

console.log(`latipm registry on http://localhost:${server.port}`);