import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UsuarioActual, UsuarioAutenticado } from '../auth/usuario-actual.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { SELECT_USUARIO_PUBLICO } from '../common/constantes';
import { ActualizarPerfilDto } from './dto/usuario.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async perfil(@UsuarioActual() u: UsuarioAutenticado) {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id_usuario: u.id_usuario },
      select: SELECT_USUARIO_PUBLICO,
    });
    const membresia = await this.prisma.miembroHogar.findFirst({
      where: { id_usuario: u.id_usuario },
      include: { hogar: true },
    });
    return { usuario, hogar: membresia?.hogar ?? null, rol: membresia?.rol ?? null };
  }

  /** Actualiza disponibilidad, descripción de carga, nombre o tema preferido (sincronización de tema). */
  @Patch('me')
  actualizar(@UsuarioActual() u: UsuarioAutenticado, @Body() dto: ActualizarPerfilDto) {
    return this.prisma.usuario.update({
      where: { id_usuario: u.id_usuario },
      data: dto,
      select: SELECT_USUARIO_PUBLICO,
    });
  }
}
