import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { UsuarioActual, UsuarioAutenticado } from '../auth/usuario-actual.decorator';
import { HogaresService } from './hogares.service';
import {
  ActualizarTipoHogarDto,
  CambiarRolDto,
  CrearHogarDto,
  InvitarMiembroDto,
  UnirseHogarDto,
} from './dto/hogar.dto';

@Controller('hogares')
export class HogaresController {
  constructor(private readonly hogares: HogaresService) {}

  /** Lista todas las casas registradas del usuario para el acceso rápido en Inicio y Header. */
  @Get()
  listarMisHogares(@UsuarioActual() u: UsuarioAutenticado) {
    return this.hogares.listarMisHogares(u.id_usuario);
  }

  @Post()
  crear(@UsuarioActual() u: UsuarioAutenticado, @Body() dto: CrearHogarDto) {
    return this.hogares.crear(u.id_usuario, dto);
  }

  @Post('unirse')
  @HttpCode(200)
  unirse(@UsuarioActual() u: UsuarioAutenticado, @Body() dto: UnirseHogarDto) {
    return this.hogares.unirse(u.id_usuario, dto);
  }

  @Post(':id/activar')
  @HttpCode(200)
  activar(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return this.hogares.activar(u.id_usuario, id);
  }

  @Get('actual')
  actual(@UsuarioActual() u: UsuarioAutenticado) {
    return this.hogares.actual(u.id_usuario, u.id_hogar);
  }

  @Patch('actual/tipo')
  actualizarTipo(@UsuarioActual() u: UsuarioAutenticado, @Body() dto: ActualizarTipoHogarDto) {
    return this.hogares.actualizarTipoHogar(u.id_usuario, dto, u.id_hogar);
  }

  @Post('actual/invitaciones')
  @HttpCode(200)
  invitar(@UsuarioActual() u: UsuarioAutenticado, @Body() dto: InvitarMiembroDto) {
    return this.hogares.invitar(u.id_usuario, dto, u.id_hogar);
  }

  @Post('actual/codigo')
  @HttpCode(200)
  regenerarCodigo(@UsuarioActual() u: UsuarioAutenticado) {
    return this.hogares.regenerarCodigo(u.id_usuario, u.id_hogar);
  }

  @Patch('actual/miembros/:id/rol')
  cambiarRol(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarRolDto,
  ) {
    return this.hogares.cambiarRol(u.id_usuario, id, dto, u.id_hogar);
  }

  @Delete('actual/miembros/:id')
  eliminarMiembro(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return this.hogares.eliminarMiembro(u.id_usuario, id, u.id_hogar);
  }

  @Post('actual/salir')
  @HttpCode(200)
  salir(@UsuarioActual() u: UsuarioAutenticado) {
    return this.hogares.salir(u.id_usuario, u.id_hogar);
  }
}
