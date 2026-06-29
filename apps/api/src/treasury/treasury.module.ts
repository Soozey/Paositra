import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Institution, Placement, PlacementHistory } from "../database/entities";
import { TreasuryController } from "./treasury.controller";
import { TreasuryService } from "./treasury.service";
import { PlacementInsightsController } from "./placement-insights";
import { PlacementLifecycleController } from "./placement-lifecycle";
import { BillingController } from "./billing";
import { CurrentAccountsController } from "./current-accounts";
import { BudgetController } from "./budget";
import { TreasuryDashboardController } from "./dashboard";

@Module({
  imports: [TypeOrmModule.forFeature([Institution, Placement, PlacementHistory])],
  controllers: [
    TreasuryController, PlacementInsightsController, PlacementLifecycleController,
    BillingController, CurrentAccountsController, BudgetController, TreasuryDashboardController
  ],
  providers: [TreasuryService]
})
export class TreasuryModule {}
