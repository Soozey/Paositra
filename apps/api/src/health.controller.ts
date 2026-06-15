import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Public } from "./auth/public.decorator";

@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Public()
  @Get("health")
  async health() {
    try {
      await this.dataSource.query("SELECT 1");
      return {
        status: "healthy",
        database: "reachable",
        timestamp: new Date().toISOString()
      };
    } catch {
      throw new ServiceUnavailableException(
        "Le service de base de données est indisponible."
      );
    }
  }
}
