type Decorator = ClassDecorator & MethodDecorator & PropertyDecorator;

function noopDecorator(): Decorator {
  return () => undefined;
}

export function ApiBearerAuth(..._options: unknown[]): ClassDecorator & MethodDecorator {
  return noopDecorator();
}

export function ApiProperty(..._options: unknown[]): PropertyDecorator {
  return noopDecorator();
}

export function ApiPropertyOptional(..._options: unknown[]): PropertyDecorator {
  return noopDecorator();
}

export function ApiTags(..._tags: string[]): ClassDecorator {
  return noopDecorator();
}
