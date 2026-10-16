import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { UsuarioActual, UsuarioAutenticado } from '../auth/usuario-actual.decorator';
import { HogaresService } from './hogares.service';
import { CambiarRolDto, CrearHogarDto, InvitarMiembroDto, UnirseHogarDto } from './dto/hogar.dto';

@Controller('hogares')
export class HogaresController {
  constructor(private readonly hogares: HogaresService) {}

  @Post()
  crear(@UsuarioActual() u: UsuarioAutenticado, @Body() dto: CrearHogarDto) {
    return this.hogares.crear(u.id_usuario, dto);
  }

  @Post('unirse')
  @HttpCode(200)
  unirse(@UsuarioActual() u: UsuarioAutenticado, @Body() dto: UnirseHogarDto) {
    return this.hogares.unirse(u.id_usuario, dto);
  }

  @Get('actual')
  actual(@UsuarioActual() u: UsuarioAutenticado) {
    return this.hogares.actual(u.id_usuario);
  }

  @Post('actual/invitaciones')
  @HttpCode(200)
  invitar(@UsuarioActual() u: UsuarioAutenticado, @Body() dto: InvitarMiembroDto) {
    return this.hogares.invitar(u.id_usuario, dto);
  }

  @Post('actual/codigo')
  @HttpCode(200)
  regenerarCodigo(@UsuarioActual() u: UsuarioAutenticado) {
    return this.hogares.regenerarCodigo(u.id_usuario);
  }

  @Patch('actual/miembros/:id/rol')
  cambiarRol(
    @UsuarioActual() u: UsuarioAutenticado,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarRolDto,
  ) {
    return this.hogares.cambiarRol(u.id_usuario, id, dto);
  }

  @Delete('actual/miembros/:id')
  eliminarMiembro(@UsuarioActual() u: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return this.hogares.eliminarMiembro(u.id_usuario, id);
  }

  @Post('actual/salir')
  @HttpCode(200)
  salir(@UsuarioActual() u: UsuarioAutenticado) {
    return this.hogares.salir(u.id_usuario);
  }
}
