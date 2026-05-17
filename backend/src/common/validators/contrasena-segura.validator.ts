import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'contrasenaSegura', async: false })
export class ContrasenaSeguraConstraint
  implements ValidatorConstraintInterface
{
  validate(contrasena: string): boolean {
    if (!contrasena || typeof contrasena !== 'string') return false;

    const tieneMinimo = contrasena.length >= 8;
    const tieneMayuscula = /[A-Z]/.test(contrasena);
    const tieneMinuscula = /[a-z]/.test(contrasena);
    const tieneNumero = /[0-9]/.test(contrasena);
    const tieneEspecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?¿¡~`]/.test(
      contrasena,
    );

    return (
      tieneMinimo &&
      tieneMayuscula &&
      tieneMinuscula &&
      tieneNumero &&
      tieneEspecial
    );
  }

  defaultMessage(args: ValidationArguments): string {
    return 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial';
  }
}

export function ContrasenaSegura(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'contrasenaSegura',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: ContrasenaSeguraConstraint,
    });
  };
}