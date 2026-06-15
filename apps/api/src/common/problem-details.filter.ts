import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class ProblemDetailsFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(error: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      this.logger.error(error);
    }

    const exceptionBody =
      error instanceof HttpException ? error.getResponse() : undefined;
    const detail =
      typeof exceptionBody === "object" &&
      exceptionBody !== null &&
      "message" in exceptionBody
        ? exceptionBody.message
        : status === 500
          ? "Une erreur interne empêche le traitement de la demande."
          : "La demande ne peut pas être traitée.";

    response.status(status).type("application/problem+json").json({
      type: "about:blank",
      title: HttpStatus[status] ?? "Erreur",
      status,
      detail,
      instance: request.originalUrl,
      timestamp: new Date().toISOString()
    });
  }
}
