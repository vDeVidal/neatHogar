import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoTarea, Prisma, RolMiembro, TipoCategoria } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HogaresService } from '../hogares/hogares.service';
import { SELECT_USUARIO_PUBLICO } from '../common/constantes';
import { ActualizarTareaDto, CrearTareaDto, FiltroTareasDto } from './dto/tarea.dto';

const INCLUDE_TAREA = {
  asignado: { select: SELECT_USUARIO_PUBLICO },
  creador: { select: { id_usuario: true, nombre: true } },
  categoria: true,
} satisfies Prisma.TareaInclude;

@Injectable()
export class TareasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hogares: HogaresService,
  ) {}

  async listar(id_usuario: number, filtro: FiltroTareasDto) {
    const { id_hogar } = await this.hogares.obtenerMembresia(id_usuario);
    const where: Prisma.TareaWhereInput = { id_hogar };
    if (filtro.desde || filtro.hasta) {
      where.fecha_limite = {
        ...(filtro.desde && { gte: new Date(filtro.desde) }),
        ...(filtro.hasta && { lte: new Date(filtro.hasta) }),
      };
    }
    return this.prisma.tarea.findMany({
      where,
      include: INCLUDE_TAREA,
      orderBy: [{ estado: 'asc' }, { fecha_limite: { sort: 'asc', nulls: 'last' } }, { id_tarea: 'desc' }],
    });
  }

  async crear(id_usuario: number, dto: CrearTareaDto) {
    const { id_hogar } = await this.hogares.obtenerMembresia(id_usuario);
    await this.validarReferencias(id_hogar, dto.id_asignado, dto.id_categoria);
    return this.prisma.tarea.create({
      data: {
        id_hogar,
        id_creador: id_usuario,
        titulo: dto.titulo.trim(),
        descripcion: dto.descripcion?.trim() || null,
        id_asignado: dto.id_asignado ?? null,
        id_categoria: dto.id_categoria ?? null,
        puntos: dto.puntos ?? 10,
        fecha_limite: dto.fecha_limite ? new Date(dto.fecha_limite) : null,
      },
      include: INCLUDE_TAREA,
    });
  }

  async actualizar(id_usuario: number, id_tarea: number, dto: ActualizarTareaDto) {
    const { tarea } = await this.obtenerEditable(id_usuario, id_tarea);
    if (
      tarea.estado === EstadoTarea.COMPLETADA &&
      ((dto.puntos !== undefined && dto.puntos !== tarea.puntos) ||
        (dto.id_asignado !== undefined && dto.id_asignado !== tarea.id_asignado))
    ) {
      throw new BadRequestException('Reabre la tarea antes de cambiar sus puntos o responsable');
    }
    await this.validarReferencias(tarea.id_hogar, dto.id_asignado, dto.id_categoria);
    return this.prisma.tarea.update({
      where: { id_tarea },
      data: {
        titulo: dto.titulo?.trim(),
        descripcion: dto.descripcion,
        id_asignado: dto.id_asignado,
        id_categoria: dto.id_categoria,
        puntos: dto.puntos,
        fecha_limite:
          dto.fecha_limite === undefined ? undefined : dto.fecha_limite ? new Date(dto.fecha_limite) : null,
      },
      include: INCLUDE_TAREA,
    });
  }

  /** Marca la tarea como completada y suma sus puntos al responsable (o a quien la completa si no tenía). */
  async completar(id_usuario: number, id_tarea: number) {
    const { id_hogar } = await this.hogares.obtenerMembresia(id_usuario);
    const tarea = await this.buscarEnHogar(id_tarea, id_hogar);
    if (tarea.estado === EstadoTarea.COMPLETADA) {
      throw new BadRequestException('La tarea ya está completada');
    }
    const responsable = tarea.id_asignado ?? id_usuario;
    const [actualizada] = await this.prisma.$transaction([
      this.prisma.tarea.update({
        where: { id_tarea },
        data: { estado: EstadoTarea.COMPLETADA, fecha_completada: new Date(), id_asignado: responsable },
        include: INCLUDE_TAREA,
      }),
      this.ajustarPuntos(responsable, id_hogar, tarea.puntos),
    ]);
    return actualizada;
  }

  /** Revierte una tarea completada a pendiente, descontando los puntos otorgados. */
  async reabrir(id_usuario: number, id_tarea: number) {
    const { id_hogar } = await this.hogares.obtenerMembresia(id_usuario);
    const tarea = await this.buscarEnHogar(id_tarea, id_hogar);
    if (tarea.estado !== EstadoTarea.COMPLETADA) {
      throw new BadRequestException('La tarea no está completada');
    }
    const ops: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.tarea.update({
        where: { id_tarea },
        data: { estado: EstadoTarea.PENDIENTE, fecha_completada: null },
        include: INCLUDE_TAREA,
      }),
    ];
    if (tarea.id_asignado) ops.push(this.ajustarPuntos(tarea.id_asignado, id_hogar, -tarea.puntos));
    const [actualizada] = await this.prisma.$transaction(ops);
    return actualizada;
  }

  async eliminar(id_usuario: number, id_tarea: number) {
    const { tarea } = await this.obtenerEditable(id_usuario, id_tarea);
    const ops: Prisma.PrismaPromise<unknown>[] = [this.prisma.tarea.delete({ where: { id_tarea } })];
    if (tarea.estado === EstadoTarea.COMPLETADA && tarea.id_asignado) {
      ops.push(this.ajustarPuntos(tarea.id_asignado, tarea.id_hogar, -tarea.puntos));
    }
    await this.prisma.$transaction(ops);
    return { ok: true };
  }

  // ───────────────────────── Privados ─────────────────────────

  private ajustarPuntos(id_usuario: number, id_hogar: number, delta: number) {
    return this.prisma.miembroHogar.updateMany({
      where: { id_usuario, id_hogar },
      data: { puntos_acumulados: { increment: delta } },
    });
  }

  private async buscarEnHogar(id_tarea: number, id_hogar: number) {
    const tarea = await this.prisma.tarea.findUnique({ where: { id_tarea } });
    if (!tarea || tarea.id_hogar !== id_hogar) throw new NotFoundException('Tarea no encontrada');
    return tarea;
  }

  /** Solo el creador, el asignado o un Administrador pueden editar/eliminar. */
  private async obtenerEditable(id_usuario: number, id_tarea: number) {
    const membresia = await this.hogares.obtenerMembresia(id_usuario);
    const tarea = await this.buscarEnHogar(id_tarea, membresia.id_hogar);
    const puede =
      membresia.rol === RolMiembro.ADMINISTRADOR ||
      tarea.id_creador === id_usuario ||
      tarea.id_asignado === id_usuario;
    if (!puede) throw new ForbiddenException('No tienes permisos para modificar esta tarea');
    return { membresia, tarea };
  }

  private async validarReferencias(id_hogar: number, id_asignado?: number | null, id_categoria?: number | null) {
    if (id_asignado) await this.hogares.verificarPertenencia(id_asignado, id_hogar);
    if (id_categoria) {
      const cat = await this.prisma.categoria.findUnique({ where: { id_categoria } });
      if (!cat || cat.tipo !== TipoCategoria.TAREA) {
        throw new BadRequestException('Categoría de tarea inválida');
      }
    }
  }
}
