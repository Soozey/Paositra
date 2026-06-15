import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Agency } from "../database/entities";
import { OperationsController } from "./operations.controller";
import { OperationsService } from "./operations.service";

@Module({
  imports: [TypeOrmModule.forFeature([Agency])],
  controllers: [OperationsController],
  providers: [OperationsService]
})
export class OperationsModule {}
