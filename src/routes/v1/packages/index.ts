import { Router } from "../../../router";
import registerPublishRoute from "./publish";
import registerPackageVersionRoute from "./version";
import registerPackageVersionsRoute from "./versions";

export default function registerPackageRoutes(router: Router) {
    registerPublishRoute(router);
    registerPackageVersionsRoute(router);
    registerPackageVersionRoute(router);
}
