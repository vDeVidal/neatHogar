import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RolMiembro } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HogaresService } from '../hogares/hogares.service';
import { CrearGastoDto, FiltroGastosDto } from './dto/gasto.dto';

/**
 * Registro simple de gastos del hogar (Pantalla 7 - "Gastos Generales").
 * Fuera de alcance: pagos, transferencias, división de deudas o finanzas avanzadas.
 */
@Injectable()
export class GastosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hogares: HogaresService,
  ) {}

  async listar(id_usuario: number, filtro: FiltroGastosDto) {
    const { id_hogar } = await this.hogares.obtenerMembresia(id_usuario);
    const ahora = new Date();
    const [anio, mes] = filtro.mes
      ? filtro.mes.split('-').map(Number)
      : [ahora.getFullYear(), ahora.getMonth() + 1];
    const desde = new Date(anio, mes - 1, 1);
    const hasta = new Date(anio, mes, 1);

    const items = await this.prisma.gasto.findMany({
      where: { id_hogar, fecha: { gte: desde, lt: hasta } },
      include: { registrador: { select: { id_usuario: true, nombre: true } } },
      orderBy: { fecha: 'desc' },
    });
    const total = items.reduce((acc, g) => acc + g.monto, 0);
    const miembros = await this.prisma.miembroHogar.count({ where: { id_hogar } });

    return {
      mes: `${anio}-${String(mes).padStart(2, '0')}`,
      total,
      promedio_por_miembro: miembros ? Math.round(total / miembros) : 0,
      items,
    };
  }

  async crear(id_usuario: number, dto: CrearGastoDto) {
    const { id_hogar } = await this.hogares.obtenerMembresia(id_usuario);
    return this.prisma.gasto.create({
      data: {
        id_hogar,
        id_registrador: id_usuario,
        concepto: dto.concepto.trim(),
        monto: dto.monto,
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
      },
      include: { registrador: { select: { id_usuario: true, nombre: true } } },
    });
  }

  async eliminar(id_usuario: number, id_gasto: number) {
    const m = await this.hogares.obtenerMembresia(id_usuario);
    const gasto = await this.prisma.gasto.findUnique({ where: { id_gasto } });
    if (!gasto || gasto.id_hogar !== m.id_hogar) throw new NotFoundException('Gasto no encontrado');
    if (gasto.id_registrador !== id_usuario && m.rol !== RolMiembro.ADMINISTRADOR) {
      throw new ForbiddenException('Solo quien registró el gasto o un Administrador puede eliminarlo');
    }
    await this.prisma.gasto.delete({ where: { id_gasto } });
    return { ok: true };
  }
}
