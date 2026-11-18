import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { UsuarioActual, UsuarioAutenticado } from '../auth/usuario-actual.decorator';
import { CrearSuministroDto } from './dto/suministro.dto';
import { SuministrosService } from './suministros.service';

@Controller()
export class SuministrosController {
  constructor(private readonly suministros: SuministrosService) {}

  /** GET /api/suministros (usa hogar activo de cabecera x-hogar-id) */
  @Get('suministros')
  listarActual(@UsuarioActual() u: UsuarioAutenticado) {
    return this.suministros.listar(u.id_usuario, u.id_hogar);
  }

  /** GET /api/hogares/:idHogar/suministros (ruta explícita de la especificación v2) */
  @Get('hogares/:idHogar/suministros')
  listarPorHogar(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('idHogar', ParseIntPipe) idHogar: number,
  ) {
    return this.suministros.listar(u.id_usuario, idHogar);
  }

  /** POST /api/suministros */
  @Post('suministros')
  crearActual(@UsuarioActual() u: UsuarioAutenticado, @Body() dto: CrearSuministroDto) {
    return this.suministros.crear(u.id_usuario, dto, u.id_hogar);
  }

  /** POST /api/hogares/:idHogar/suministros (ruta explícita de la especificación v2) */
  @Post('hogares/:idHogar/suministros')
  crearPorHogar(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('idHogar', ParseIntPipe) idHogar: number,
    @Body() dto: CrearSuministroDto,
  ) {
    return this.suministros.crear(u.id_usuario, dto, idHogar);
  }

  @Delete('suministros/:id')
  eliminarActual(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.suministros.eliminar(u.id_usuario, id, u.id_hogar);
  }

  @Delete('hogares/:idHogar/suministros/:id')
  eliminarPorHogar(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('idHogar', ParseIntPipe) idHogar: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.suministros.eliminar(u.id_usuario, id, idHogar);
  }
}
