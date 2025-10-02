export type Handler = (req: Request, params: Record<string, string>) => Promise<Response> | Response;

export class Router {
    private routes: { method: string; pattern: RegExp; keys: string[]; handler: Handler }[] = [];

    on(method: string, path: string, handler: Handler) {
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
            const match = url.pathname.match(r.pattern);
            if (match) {
                const params: Record<string, string> = {};
                r.keys.forEach((key, index) => {
                    params[key] = match[index + 1];
                });
                return await r.handler(req, params);
            }
        }
        return new Response(JSON.stringify({ error: "not found" }), {
            status: 404,
            headers: { "content-type": "application/json" },
        });
    }
}

export const router = new Router();
