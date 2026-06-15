import { BadRequestException } from "@nestjs/common";

export function validatePasswordPolicy(password: string, minLength: number) {
  const strong =
    password.length >= minLength &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
  if (!strong) {
    throw new BadRequestException(
      `Le mot de passe doit contenir au moins ${minLength} caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.`
    );
  }
}
