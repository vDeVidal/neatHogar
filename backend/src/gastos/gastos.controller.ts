import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { UsuarioActual, UsuarioAutenticado } from '../auth/usuario-actual.decorator';
import { GastosService } from './gastos.service';
import { CrearGastoDto, FiltroGastosDto } from './dto/gasto.dto';

@Controller('gastos')
export class GastosController {
  constructor(private readonly gastos: GastosService) {}

  @Get()
  listar(@UsuarioActual() u: UsuarioAutenticado, @Query() filtro: FiltroGastosDto) {
    return this.gastos.listar(u.id_usuario, filtro);
  }

  @Post()
  crear(@UsuarioActual() u: UsuarioAutenticado, @Body() dto: CrearGastoDto) {
    return this.gastos.crear(u.id_usuario, dto);
  }

  @Delete(':id')
  eliminar(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return this.gastos.eliminar(u.id_usuario, id);
  }
}
