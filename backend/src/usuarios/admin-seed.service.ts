import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { Usuario } from './entities/usuario.entity';
import { TipoUsuarioEnum } from '../common/enums/tipo-usuario.enum';
import { CatalogosSeedService } from './catalogos-seed.service';

@Injectable()
export class AdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly catalogosSeed: CatalogosSeedService,
  ) {}

  async onModuleInit() {
    // CRÍTICO: garantizar que los catálogos (tipo_usuario, etc.) existan
    // antes de intentar crear el admin, que depende de la FK id_tipo_usr.
    await this.catalogosSeed.ensureSeeded();

    const correoAdmin = 'admin@sistema.com';
    const documentoAdmin = '123456789';
    const contraAdmin = 'Admin123*';
    const saltRounds = 10;

    const existente = await this.usuarioRepository.findOne({
      where: [{ correo: correoAdmin }, { documento: documentoAdmin }],
      withDeleted: true,
    });

    if (existente) {
      // Si el documento coincide pero el correo cambió, actualizamos al correo por defecto del sistema
      if (existente.correo !== correoAdmin) {
        this.logger.warn(`Sincronizando correo de ADMIN (${existente.documento}) a ${correoAdmin}.`);
        existente.correo = correoAdmin;
      }

      const wasDeleted = Boolean(existente.deletedAt);
      if (existente.deletedAt) {
        await this.usuarioRepository.restore({ documento: existente.documento });
      }

      const usuario = wasDeleted
        ? await this.usuarioRepository.findOne({ where: { correo: correoAdmin }, withDeleted: true })
        : existente;

      if (!usuario) {
        this.logger.warn('Usuario ADMIN de inicialización no se pudo recargar tras restauración (omitido).');
        return;
      }

      const requiereCambioRol = usuario.idTipoUsr !== TipoUsuarioEnum.ADMIN;
      const passwordMatch = await bcrypt.compare(contraAdmin, usuario.contra);
      const requiereCambioContra = !passwordMatch;
      const requiereDefaults =
        !usuario.fotoPersona ||
        !usuario.numTelf ||
        !usuario.contactoEmerg ||
        !usuario.qr;

      if (!requiereCambioRol && !requiereCambioContra && !requiereDefaults && !wasDeleted) {
        this.logger.log('Usuario ADMIN de inicialización ya existe y credenciales están correctas (omitido).');
        return;
      }

      if (requiereCambioRol) {
        usuario.idTipoUsr = TipoUsuarioEnum.ADMIN;
      }

      if (requiereCambioContra) {
        usuario.contra = await bcrypt.hash(contraAdmin, saltRounds);
      }

      if (!usuario.fotoPersona) {
        usuario.fotoPersona = '';
      }

      if (!usuario.numTelf) {
        usuario.numTelf = '3000000000';
      }

      if (!usuario.contactoEmerg) {
        usuario.contactoEmerg = '3000000000';
      }

      if (!usuario.qr) {
        usuario.qr = randomUUID();
      }

      usuario.idFormacion = null;
      usuario.pushToken = null;
      usuario.correoVerificado = true; // El admin del seed siempre está verificado

      const actualizado = await this.usuarioRepository.save(usuario);
      this.logger.log(
        `Usuario ADMIN de inicialización actualizado (correo=${actualizado.correo}, contra=${requiereCambioContra ? 'Admin123*' : 'ok'}).`,
      );
      return;
    }

    const hash = await bcrypt.hash(contraAdmin, saltRounds);

    const admin = this.usuarioRepository.create({
      documento: documentoAdmin,
      nombreCompleto: 'Administrador Principal',
      correo: correoAdmin,
      contra: hash,
      idTipoUsr: TipoUsuarioEnum.ADMIN,
      fotoPersona: '',
      numTelf: '3000000000',
      contactoEmerg: '3000000000',
      idFormacion: null,
      qr: randomUUID(),
      pushToken: null,
      correoVerificado: true, // El admin del seed siempre está verificado
    });

    await this.usuarioRepository.save(admin);
    this.logger.log(`Usuario ADMIN de inicialización creado: ${correoAdmin} / Admin123*`);
  }
}
