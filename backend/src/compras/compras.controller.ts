import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { UsuarioActual, UsuarioAutenticado } from '../auth/usuario-actual.decorator';
import { ComprasService } from './compras.service';
import { ActualizarItemDto, CrearCategoriaDto, CrearItemDto, FiltroCategoriasDto, FiltroItemsDto } from './dto/compra.dto';

@Controller('categorias')
export class CategoriasController {
  constructor(private readonly compras: ComprasService) {}

  @Get()
  listar(@Query() filtro: FiltroCategoriasDto) {
    return this.compras.listarCategorias(filtro);
  }

  @Post()
  crear(@Body() dto: CrearCategoriaDto) {
    return this.compras.crearCategoria(dto);
  }
}

@Controller('compras')
export class ComprasController {
  constructor(private readonly compras: ComprasService) {}

  @Get()
  listar(@UsuarioActual() u: UsuarioAutenticado, @Query() filtro: FiltroItemsDto) {
    return this.compras.listar(u.id_usuario, filtro);
  }

  @Post()
  crear(@UsuarioActual() u: UsuarioAutenticado, @Body() dto: CrearItemDto) {
    return this.compras.crear(u.id_usuario, dto);
  }

  @Delete('comprados')
  limpiarComprados(@UsuarioActual() u: UsuarioAutenticado) {
    return this.compras.limpiarComprados(u.id_usuario);
  }

  @Patch(':id')
  actualizar(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarItemDto,
  ) {
    return this.compras.actualizar(u.id_usuario, id, dto);
  }

  @Patch(':id/alternar')
  alternar(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return this.compras.alternar(u.id_usuario, id);
  }

  @Delete(':id')
  eliminar(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return this.compras.eliminar(u.id_usuario, id);
  }
}
