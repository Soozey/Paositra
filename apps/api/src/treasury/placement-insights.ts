import { Body, Controller, Get, Post } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min
} from "class-validator";
import { ApiBearerAuth, ApiTags } from "../common/api-docs.decorators";
import { RequirePermission } from "../platform/rbac";
import { Placement } from "../database/entities";
import {
  computeSimpleInterest,
  daysBetween,
  isMaturingSoon,
  type InterestBasis
} from "./placement-math";

export class SimulatePlacementDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  principalAmount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  annualInterestRate!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36500)
  durationDays!: number;

  @IsOptional()
  @IsIn(["360", "365"])
  basis?: InterestBasis;

  @IsString()
  startDate!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;
}

@ApiTags("Trésorerie")
@ApiBearerAuth()
@Controller("api/v1/treasury")
export class PlacementInsightsController {
  constructor(
    @InjectRepository(Placement)
    private readonly placements: Repository<Placement>
  ) {}

  // Simulation d'intérêts AVANT validation (base 360j par défaut, paramétrable).
  @Post("placements/simulate")
  @RequirePermission("treasury:placements:read")
  simulate(@Body() dto: SimulatePlacementDto) {
    return computeSimpleInterest({
      principal: dto.principalAmount,
      annualRatePercent: dto.annualInterestRate,
      durationDays: dto.durationDays,
      basis: dto.basis,
      startDate: dto.startDate,
      currency: dto.currency
    });
  }

  // Échéancier : placements ouverts enrichis (intérêts, échéance, jours restants, badge <15j).
  @Get("placements/insights")
  @RequirePermission("treasury:placements:read")
  async insights() {
    const today = new Date().toISOString().slice(0, 10);
    const open = await this.placements.find({ where: { status: "open" } });
    const items = open.map((p) => {
      const computation = computeSimpleInterest({
        principal: Number(p.principalAmount),
        annualRatePercent: Number(p.annualInterestRate),
        durationDays: p.durationDays,
        basis: "360",
        startDate: String(p.startDate),
        currency: p.currency
      });
      const daysRemaining = daysBetween(today, computation.maturityDate);
      return {
        id: p.id,
        institutionId: p.institutionId,
        currency: p.currency,
        principalAmount: computation.principal,
        annualInterestRate: computation.annualRatePercent,
        durationDays: p.durationDays,
        startDate: computation.startDate,
        maturityDate: computation.maturityDate,
        projectedInterest: computation.interest,
        projectedTotal: computation.total,
        daysRemaining,
        maturingSoon: isMaturingSoon(computation.maturityDate, today, 15)
      };
    });
    const maturingSoon = items.filter((i) => i.maturingSoon).length;
    return { generatedAt: new Date().toISOString(), maturingSoonCount: maturingSoon, items };
  }
}
