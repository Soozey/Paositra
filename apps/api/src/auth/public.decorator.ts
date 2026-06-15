import { SetMetadata } from "@nestjs/common";
import { PUBLIC_ROUTE } from "./auth.guard";

export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
