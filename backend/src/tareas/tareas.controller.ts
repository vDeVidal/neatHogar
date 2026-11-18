import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsuarioActual, UsuarioAutenticado } from '../auth/usuario-actual.decorator';
import { TareasService } from './tareas.service';
import {
  ActualizarTareaDto,
  CompletarConEvidenciaDto,
  CrearTareaDto,
  FiltroTareasDto,
  ValidarTareaDto,
} from './dto/tarea.dto';

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

  /**
   * POST /api/tareas/:id/completar-con-evidencia
   * Soporta multipart/form-data (campo 'foto') y/o JSON ({ foto_base64, evidencia_foto_url }).
   */
  @Post(':id/completar-con-evidencia')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('foto'))
  completarConEvidencia(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() foto: { filename?: string; buffer?: Buffer; originalname?: string } | undefined,
    @Body() dto: CompletarConEvidenciaDto,
  ) {
    return this.tareas.completarConEvidencia(u.id_usuario, id, foto, dto, u.id_hogar);
  }

  @Patch(':id/completar')
  completar(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return this.tareas.completar(u.id_usuario, id, u.id_hogar);
  }

  @Patch(':id/validar')
  validar(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto?: ValidarTareaDto,
  ) {
    return this.tareas.validar(u.id_usuario, id, dto, u.id_hogar);
  }

  @Patch(':id/rechazar')
  rechazar(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto?: ValidarTareaDto,
  ) {
    return this.tareas.rechazar(u.id_usuario, id, dto?.comentario_revision, u.id_hogar);
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
