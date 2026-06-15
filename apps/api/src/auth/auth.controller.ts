import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import type { AuthenticatedRequest } from "../common/request-context";
import { requestMetadata } from "../common/request-context";
import { AuthService } from "./auth.service";
import { ChangePasswordDto, LoginDto } from "./auth.dto";
import { Public } from "./public.decorator";

@ApiTags("Authentification")
@Controller("api/v1/auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.auth.login(dto, requestMetadata(request));
  }

  @ApiBearerAuth()
  @Post("change-password")
  changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.auth.changePassword(
      dto,
      request.user,
      requestMetadata(request)
    );
  }

  @ApiBearerAuth()
  @Post("logout")
  async logout(@Req() request: AuthenticatedRequest) {
    await this.auth.logout(request.user, requestMetadata(request));
    return { message: "Vous êtes déconnecté." };
  }

  @ApiBearerAuth()
  @Get("me")
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.me(request.user);
  }
}
