import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Agency } from "../database/entities";
import { OperationsController } from "./operations.controller";
import { OperationsService } from "./operations.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Agency]),
    MulterModule.register({ limits: { fileSize: 5 * 1024 * 1024 } })
  ],
  controllers: [OperationsController],
  providers: [OperationsService]
})
export class OperationsModule {}
