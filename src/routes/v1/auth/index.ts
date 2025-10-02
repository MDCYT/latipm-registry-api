import { Router } from "../../../router";
import registerLoginRoute from "./login";
import registerMeRoute from "./me";
import registerSignupRoute from "./signup";

export default function registerAuthRoutes(router: Router) {
    registerSignupRoute(router);
    registerLoginRoute(router);
    registerMeRoute(router);
}
