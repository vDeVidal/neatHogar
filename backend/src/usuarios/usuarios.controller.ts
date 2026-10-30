import { Body, ConflictException, Controller, Get, Patch } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsuarioActual, UsuarioAutenticado } from '../auth/usuario-actual.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { HogaresService } from '../hogares/hogares.service';
import { normalizarNombreLogin, SELECT_USUARIO_PUBLICO } from '../common/constantes';
import { ActualizarPerfilDto } from './dto/usuario.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hogares: HogaresService,
  ) {}

  @Get('me')
  async perfil(@UsuarioActual() u: UsuarioAutenticado) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id_usuario: u.id_usuario },
      select: SELECT_USUARIO_PUBLICO,
    });
    const listaHogares = await this.hogares.listarMisHogares(u.id_usuario);
    const preferido =
      listaHogares.find((h) => h.id_hogar === (u.id_hogar ?? usuario.id_hogar_activo)) ??
      listaHogares[0] ??
      null;

    const hogarDetalle = preferido
      ? await this.hogares.obtenerDetalleHogar(preferido.id_hogar, u.id_usuario)
      : null;

    return {
      usuario,
      hogar: hogarDetalle,
      rol: preferido?.mi_rol ?? null,
      hogares: listaHogares,
    };
  }

  /** Actualiza disponibilidad, descripción de carga, nombre, PIN o tema preferido. */
  @Patch('me')
  async actualizar(@UsuarioActual() u: UsuarioAutenticado, @Body() dto: ActualizarPerfilDto) {
    const { pin, nombre, ...resto } = dto;
    const data: Record<string, unknown> = { ...resto };

    if (nombre !== undefined) {
      const limpio = nombre.trim();
      const nombre_login = normalizarNombreLogin(limpio);
      const colision = await this.prisma.usuario.findFirst({
        where: { nombre_login, NOT: { id_usuario: u.id_usuario } },
      });
      if (colision) {
        throw new ConflictException('Ese nombre ya está en uso por otra cuenta.');
      }
      data.nombre = limpio;
      data.nombre_login = nombre_login;
    }

    if (pin !== undefined) {
      data.pin_hash = await bcrypt.hash(pin, 10);
    }

    return this.prisma.usuario.update({
      where: { id_usuario: u.id_usuario },
      data,
      select: SELECT_USUARIO_PUBLICO,
    });
  }
}
