import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsStringOrArrayOfStrings(validationOptions?: ValidationOptions) {
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      name: 'isStringOrArrayOfStrings',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          // Permitir undefined/null (ya que @IsOptional lo maneja)
          if (value === undefined || value === null) return true;
          
          // ✅ Caso 1: Es un string (Falla Puntual)
          if (typeof value === 'string') return true;
          
          // ✅ Caso 2: Es un array de strings (Falla Masiva / Ventana)
          if (Array.isArray(value)) {
            return value.every((item) => typeof item === 'string');
          }
          
          return false;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} debe ser un string o un array de strings`;
        },
      },
    });
  };
}