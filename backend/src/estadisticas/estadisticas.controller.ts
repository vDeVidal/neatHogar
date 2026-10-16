import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { UsuarioActual, UsuarioAutenticado } from '../auth/usuario-actual.decorator';
import { EstadisticasService } from './estadisticas.service';

@Controller('estadisticas')
export class EstadisticasController {
  constructor(private readonly estadisticas: EstadisticasService) {}

  @Get('participacion')
  participacion(@UsuarioActual() u: UsuarioAutenticado) {
    return this.estadisticas.participacion(u.id_usuario);
  }

  @Get('progreso')
  progreso(
    @UsuarioActual() u: UsuarioAutenticado,
    @Query('dias', new DefaultValuePipe(7), ParseIntPipe) dias: number,
    @Query('tz', new DefaultValuePipe(0), ParseIntPipe) tz: number,
  ) {
    return this.estadisticas.progreso(u.id_usuario, Math.min(Math.max(dias, 1), 31), tz);
  }
}
