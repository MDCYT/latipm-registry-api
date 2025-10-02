import { Router } from "../../router";
import registerAuthRoutes from "./auth";
import registerDownloadRoute from "./download";
import registerPackageRoutes from "./packages";
import registerSearchRoute from "./search";

export default function registerV1Routes(router: Router) {
    registerAuthRoutes(router);
    registerPackageRoutes(router);
    registerSearchRoute(router);
    registerDownloadRoute(router);
}
