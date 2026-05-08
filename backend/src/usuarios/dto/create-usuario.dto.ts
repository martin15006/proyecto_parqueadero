export class CreateUsuarioDto {
  documento: string;
  fotoPersona: string;
  nombreCompleto: string;
  numTelf: string;
  contactoEmerg: string;
  correo: string;
  contra: string;
  idTipoUsr: number;
  idFormacion?: string;
  QR?: string;
}
