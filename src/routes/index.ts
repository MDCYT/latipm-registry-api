import { Router } from "../router";
import registerV1Routes from "./v1";

export default function registerRoutes(router: Router) {
    registerV1Routes(router);
}
