import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { UsuarioActual, UsuarioAutenticado } from '../auth/usuario-actual.decorator';
import { TareasService } from './tareas.service';
import { ActualizarTareaDto, CrearTareaDto, FiltroTareasDto } from './dto/tarea.dto';

@Controller('tareas')
export class TareasController {
  constructor(private readonly tareas: TareasService) {}

  @Get()
  listar(@UsuarioActual() u: UsuarioAutenticado, @Query() filtro: FiltroTareasDto) {
    return this.tareas.listar(u.id_usuario, filtro, u.id_hogar);
  }

  @Post()
  crear(@UsuarioActual() u: UsuarioAutenticado, @Body() dto: CrearTareaDto) {
    return this.tareas.crear(u.id_usuario, dto, u.id_hogar);
  }

  @Patch(':id')
  actualizar(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarTareaDto,
  ) {
    return this.tareas.actualizar(u.id_usuario, id, dto, u.id_hogar);
  }

  @Patch(':id/completar')
  completar(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return this.tareas.completar(u.id_usuario, id, u.id_hogar);
  }

  @Patch(':id/validar')
  validar(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return this.tareas.validar(u.id_usuario, id, u.id_hogar);
  }

  @Patch(':id/rechazar')
  rechazar(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return this.tareas.rechazar(u.id_usuario, id, u.id_hogar);
  }

  @Patch(':id/reabrir')
  reabrir(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return this.tareas.reabrir(u.id_usuario, id, u.id_hogar);
  }

  @Delete(':id')
  eliminar(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return this.tareas.eliminar(u.id_usuario, id, u.id_hogar);
  }
}
