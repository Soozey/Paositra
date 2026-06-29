import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  Institution,
  Placement,
  PlacementHistory
} from "../database/entities";
import { TreasuryController } from "./treasury.controller";
import { TreasuryService } from "./treasury.service";
import { PlacementInsightsController } from "./placement-insights";

@Module({
  imports: [
    TypeOrmModule.forFeature([Institution, Placement, PlacementHistory])
  ],
  controllers: [TreasuryController, PlacementInsightsController],
  providers: [TreasuryService]
})
export class TreasuryModule {}
