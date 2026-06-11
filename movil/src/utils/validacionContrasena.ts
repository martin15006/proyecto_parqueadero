/**
 * Valida que una contraseña cumpla los 5 requisitos de seguridad.
 * Devuelve null si es válida, o un mensaje de error si no.
 */
export function validarContrasenaSegura(contrasena: string): string | null {
  if (!contrasena) return 'La contraseña es obligatoria';

  if (contrasena.length < 8) return 'La contraseña debe tener al menos 8 caracteres';

  if (!/[A-Z]/.test(contrasena))
    return 'La contraseña debe tener al menos una letra mayúscula';

  if (!/[a-z]/.test(contrasena))
    return 'La contraseña debe tener al menos una letra minúscula';

  if (!/[0-9]/.test(contrasena))
    return 'La contraseña debe tener al menos un número';

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?¿¡~`]/.test(contrasena))
    return 'La contraseña debe tener al menos un carácter especial (!@#$...)';

  return null;
}