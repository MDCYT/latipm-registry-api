import { Database } from "bun:sqlite";
import { join } from "node:path";

const db = new Database("registry.db");
const schema = await Bun.file(join(import.meta.dir, "schema.sql")).text();
db.exec(schema);

export default db;
