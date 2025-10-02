// Bun registry server — REST API + MongoDB
// Routes:
//  POST   /v1/auth/signup   {email,password}
//  POST   /v1/auth/login    {email,password}
//  GET    /v1/auth/me       (Bearer token)
//  POST   /v1/packages/:name/:version   (auth, form-data: meta, file, sha256)
//  GET    /v1/packages/:name            -> versions list
//  GET    /v1/packages/:name/:version   -> metadata
//  GET    /v1/search?q=term             -> simple name LIKE search
//  GET    /v1/download/:name/:version   -> zip file stream

import { SERVER_PORT } from "./config";
import "./db";
import { router } from "./router";
import registerRoutes from "./routes";

registerRoutes(router);

const server = Bun.serve({
    port: SERVER_PORT,
    fetch: (req) => router.route(req),
});

console.log(`latipm registry on http://localhost:${server.port}`);
