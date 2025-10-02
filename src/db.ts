import { MongoClient, ObjectId, type Collection } from "mongodb";
import { MONGO_DB_NAME, MONGO_URI } from "./config";

interface UserSchema {
    email: string;
    passwordHash: string;
    createdAt: Date;
}

interface PackageSchema {
    name: string;
    ownerId: ObjectId;
    createdAt: Date;
}

interface VersionSchema {
    packageId: ObjectId;
    version: string;
    tarballUrl: string;
    shasum: string;
    manifest: Record<string, unknown>;
    createdAt: Date;
}

export type UserDocument = UserSchema & { _id: ObjectId };
export type PackageDocument = PackageSchema & { _id: ObjectId };
export type VersionDocument = VersionSchema & { _id: ObjectId };

const client = new MongoClient(MONGO_URI);
await client.connect();

const db = client.db(MONGO_DB_NAME);

export const usersCollection: Collection<UserSchema> = db.collection("users");
export const packagesCollection: Collection<PackageSchema> = db.collection("packages");
export const versionsCollection: Collection<VersionSchema> = db.collection("versions");

await Promise.all([
    usersCollection.createIndex({ email: 1 }, { unique: true }),
    packagesCollection.createIndex({ name: 1 }, { unique: true }),
    versionsCollection.createIndex({ packageId: 1, version: 1 }, { unique: true }),
    versionsCollection.createIndex({ packageId: 1, createdAt: -1 }),
]);

export { ObjectId };
