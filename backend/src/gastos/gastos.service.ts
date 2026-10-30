import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoValidacion, RolMiembro, TipoHogar } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HogaresService } from '../hogares/hogares.service';
import { CrearGastoDto, FiltroGastosDto } from './dto/gasto.dto';

/**
 * Registro simple de gastos del hogar (Pantalla 7 - "Gastos Generales").
 * En hogar JEFE_DE_HOGAR, los gastos ingresados por integrantes requieren validación del Jefe de Hogar.
 */
@Injectable()
export class GastosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hogares: HogaresService,
  ) {}

  async listar(id_usuario: number, filtro: FiltroGastosDto, id_hogar_preferido?: number) {
    const { id_hogar } = await this.hogares.obtenerMembresia(id_usuario, id_hogar_preferido);
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
    const total = items
      .filter((g) => g.estado_validacion === EstadoValidacion.APROBADO)
      .reduce((acc, g) => acc + g.monto, 0);
    const miembros = await this.prisma.miembroHogar.count({ where: { id_hogar } });

    return {
      mes: `${anio}-${String(mes).padStart(2, '0')}`,
      total,
      promedio_por_miembro: miembros ? Math.round(total / miembros) : 0,
      items,
    };
  }

  async crear(id_usuario: number, dto: CrearGastoDto, id_hogar_preferido?: number) {
    const membresia = await this.hogares.obtenerMembresia(id_usuario, id_hogar_preferido);
    const requiereValidacion =
      membresia.hogar.tipo_hogar === TipoHogar.JEFE_DE_HOGAR &&
      membresia.rol !== RolMiembro.ADMINISTRADOR &&
      !membresia.puede_validar_tareas;

    return this.prisma.gasto.create({
      data: {
        id_hogar: membresia.id_hogar,
        id_registrador: id_usuario,
        concepto: dto.concepto.trim(),
        monto: dto.monto,
        estado_validacion: requiereValidacion
          ? EstadoValidacion.PENDIENTE_APROBACION
          : EstadoValidacion.APROBADO,
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
      },
      include: { registrador: { select: { id_usuario: true, nombre: true } } },
    });
  }

  async validar(id_usuario: number, id_gasto: number, id_hogar_preferido?: number) {
    const m = await this.hogares.obtenerMembresia(id_usuario, id_hogar_preferido);
    if (m.rol !== RolMiembro.ADMINISTRADOR && !m.puede_validar_tareas) {
      throw new ForbiddenException('Solo el Jefe de Hogar puede validar gastos');
    }
    const gasto = await this.prisma.gasto.findUnique({ where: { id_gasto } });
    if (!gasto || gasto.id_hogar !== m.id_hogar) throw new NotFoundException('Gasto no encontrado');

    return this.prisma.gasto.update({
      where: { id_gasto },
      data: { estado_validacion: EstadoValidacion.APROBADO },
      include: { registrador: { select: { id_usuario: true, nombre: true } } },
    });
  }

  async eliminar(id_usuario: number, id_gasto: number, id_hogar_preferido?: number) {
    const m = await this.hogares.obtenerMembresia(id_usuario, id_hogar_preferido);
    const gasto = await this.prisma.gasto.findUnique({ where: { id_gasto } });
    if (!gasto || gasto.id_hogar !== m.id_hogar) throw new NotFoundException('Gasto no encontrado');

    const puedeEliminar =
      m.rol === RolMiembro.ADMINISTRADOR ||
      (m.hogar.tipo_hogar === TipoHogar.COLABORATIVO && gasto.id_registrador === id_usuario) ||
      (gasto.id_registrador === id_usuario && gasto.estado_validacion === EstadoValidacion.PENDIENTE_APROBACION);

    if (!puedeEliminar) {
      throw new ForbiddenException('Solo el Jefe de Hogar puede eliminar gastos ya validados');
    }
    await this.prisma.gasto.delete({ where: { id_gasto } });
    return { ok: true };
  }
}
