import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Agency } from "../database/entities";
import { OperationsController } from "./operations.controller";
import { OperationsService } from "./operations.service";
import { CashController } from "./cash";
import { VerificationController } from "./verification";
import { NotificationsController, ValueRequestsController, OpsDashboardController } from "./ops-extra";

@Module({
  imports: [
    TypeOrmModule.forFeature([Agency]),
    MulterModule.register({ limits: { fileSize: 5 * 1024 * 1024 } })
  ],
  controllers: [
    OperationsController, CashController, VerificationController,
    NotificationsController, ValueRequestsController, OpsDashboardController
  ],
  providers: [OperationsService]
})
export class OperationsModule {}
