import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoTarea, Prisma, RolMiembro, TipoCategoria, TipoHogar } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HogaresService } from '../hogares/hogares.service';
import { SELECT_USUARIO_PUBLICO } from '../common/constantes';
import { ActualizarTareaDto, CrearTareaDto, FiltroTareasDto } from './dto/tarea.dto';

const INCLUDE_TAREA = {
  asignado: { select: SELECT_USUARIO_PUBLICO },
  creador: { select: { id_usuario: true, nombre: true } },
  completador: { select: { id_usuario: true, nombre: true } },
  categoria: true,
} satisfies Prisma.TareaInclude;

@Injectable()
export class TareasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hogares: HogaresService,
  ) {}

  async listar(id_usuario: number, filtro: FiltroTareasDto, id_hogar_preferido?: number) {
    const { id_hogar } = await this.hogares.obtenerMembresia(id_usuario, id_hogar_preferido);
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
      orderBy: [{ fecha_limite: { sort: 'asc', nulls: 'last' } }, { id_tarea: 'desc' }],
    });
  }

  async crear(id_usuario: number, dto: CrearTareaDto, id_hogar_preferido?: number) {
    const membresia = await this.hogares.obtenerMembresia(id_usuario, id_hogar_preferido);
    const { id_hogar, hogar } = membresia;
    await this.validarReferencias(id_hogar, dto.id_asignado, dto.id_categoria);

    // En hogar JEFE_DE_HOGAR, si no es Jefe ni tiene permiso explícito de crear tareas, se crea como PROPUESTA
    const requiereAprobacion =
      hogar.tipo_hogar === TipoHogar.JEFE_DE_HOGAR &&
      membresia.rol !== RolMiembro.ADMINISTRADOR &&
      !membresia.puede_crear_tareas;

    return this.prisma.tarea.create({
      data: {
        id_hogar,
        id_creador: id_usuario,
        titulo: dto.titulo.trim(),
        descripcion: dto.descripcion?.trim() || null,
        id_asignado: dto.id_asignado ?? null,
        id_categoria: dto.id_categoria ?? null,
        puntos: dto.puntos ?? 10,
        estado: requiereAprobacion ? EstadoTarea.PROPUESTA : EstadoTarea.PENDIENTE,
        fecha_limite: dto.fecha_limite ? new Date(dto.fecha_limite) : null,
      },
      include: INCLUDE_TAREA,
    });
  }

  async actualizar(id_usuario: number, id_tarea: number, dto: ActualizarTareaDto, id_hogar_preferido?: number) {
    const { tarea } = await this.obtenerEditable(id_usuario, id_tarea, id_hogar_preferido);
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

  /**
   * Marca la tarea como realizada:
   * - En hogar COLABORATIVO o si es Jefe de Hogar (ADMINISTRADOR) / tiene permiso `puede_validar_tareas`:
   *   pasa directo a COMPLETADA y suma los puntos.
   * - En hogar JEFE_DE_HOGAR siendo MIEMBRO sin permiso de autovalidar:
   *   pasa a POR_VALIDAR para que el Jefe de Hogar apruebe y entregue los puntos.
   */
  async completar(id_usuario: number, id_tarea: number, id_hogar_preferido?: number) {
    const membresia = await this.hogares.obtenerMembresia(id_usuario, id_hogar_preferido);
    const tarea = await this.buscarEnHogar(id_tarea, membresia.id_hogar);

    if (tarea.estado === EstadoTarea.COMPLETADA) {
      throw new BadRequestException('La tarea ya está completada');
    }

    const puedeValidar =
      membresia.hogar.tipo_hogar === TipoHogar.COLABORATIVO ||
      membresia.rol === RolMiembro.ADMINISTRADOR ||
      membresia.puede_validar_tareas;

    if (tarea.estado === EstadoTarea.PROPUESTA) {
      if (!puedeValidar) {
        throw new ForbiddenException('El Jefe de Hogar debe aprobar primero esta propuesta de tarea');
      }
      return this.prisma.tarea.update({
        where: { id_tarea },
        data: { estado: EstadoTarea.PENDIENTE },
        include: INCLUDE_TAREA,
      });
    }

    if (tarea.estado === EstadoTarea.POR_VALIDAR) {
      if (!puedeValidar) {
        throw new ForbiddenException('Esta tarea ya fue enviada y está esperando validación del Jefe de Hogar');
      }
      const responsable = tarea.id_completador ?? tarea.id_asignado ?? id_usuario;
      const [actualizada] = await this.prisma.$transaction([
        this.prisma.tarea.update({
          where: { id_tarea },
          data: {
            estado: EstadoTarea.COMPLETADA,
            fecha_completada: new Date(),
            id_asignado: tarea.id_asignado ?? responsable,
          },
          include: INCLUDE_TAREA,
        }),
        this.ajustarPuntos(responsable, membresia.id_hogar, tarea.puntos),
      ]);
      return actualizada;
    }

    // Estado PENDIENTE:
    const responsable = tarea.id_asignado ?? id_usuario;
    if (!puedeValidar) {
      // Miembro en JEFE_DE_HOGAR: solicita validación al Jefe de Hogar
      return this.prisma.tarea.update({
        where: { id_tarea },
        data: {
          estado: EstadoTarea.POR_VALIDAR,
          id_asignado: responsable,
          id_completador: id_usuario,
        },
        include: INCLUDE_TAREA,
      });
    }

    const [actualizada] = await this.prisma.$transaction([
      this.prisma.tarea.update({
        where: { id_tarea },
        data: {
          estado: EstadoTarea.COMPLETADA,
          fecha_completada: new Date(),
          id_asignado: responsable,
          id_completador: id_usuario,
        },
        include: INCLUDE_TAREA,
      }),
      this.ajustarPuntos(responsable, membresia.id_hogar, tarea.puntos),
    ]);
    return actualizada;
  }

  /** Valida explícitamente una tarea PROPUESTA (-> PENDIENTE) o POR_VALIDAR (-> COMPLETADA + puntos). */
  async validar(id_usuario: number, id_tarea: number, id_hogar_preferido?: number) {
    const membresia = await this.hogares.obtenerMembresia(id_usuario, id_hogar_preferido);
    const puedeValidar =
      membresia.rol === RolMiembro.ADMINISTRADOR ||
      membresia.hogar.tipo_hogar === TipoHogar.COLABORATIVO ||
      membresia.puede_validar_tareas;

    if (!puedeValidar) {
      throw new ForbiddenException('Solo el Jefe de Hogar puede validar tareas en este hogar');
    }

    const tarea = await this.buscarEnHogar(id_tarea, membresia.id_hogar);

    if (tarea.estado === EstadoTarea.PROPUESTA) {
      return this.prisma.tarea.update({
        where: { id_tarea },
        data: { estado: EstadoTarea.PENDIENTE },
        include: INCLUDE_TAREA,
      });
    }

    if (tarea.estado === EstadoTarea.COMPLETADA) {
      return this.prisma.tarea.findUniqueOrThrow({ where: { id_tarea }, include: INCLUDE_TAREA });
    }

    const responsable = tarea.id_completador ?? tarea.id_asignado ?? id_usuario;
    const [actualizada] = await this.prisma.$transaction([
      this.prisma.tarea.update({
        where: { id_tarea },
        data: {
          estado: EstadoTarea.COMPLETADA,
          fecha_completada: new Date(),
          id_asignado: tarea.id_asignado ?? responsable,
          id_completador: tarea.id_completador ?? id_usuario,
        },
        include: INCLUDE_TAREA,
      }),
      this.ajustarPuntos(responsable, membresia.id_hogar, tarea.puntos),
    ]);
    return actualizada;
  }

  /** Rechaza una tarea PROPUESTA (la elimina) o devuelve una tarea POR_VALIDAR a PENDIENTE sin otorgar puntos. */
  async rechazar(id_usuario: number, id_tarea: number, id_hogar_preferido?: number) {
    const membresia = await this.hogares.obtenerMembresia(id_usuario, id_hogar_preferido);
    const tarea = await this.buscarEnHogar(id_tarea, membresia.id_hogar);

    const esJefe = membresia.rol === RolMiembro.ADMINISTRADOR || membresia.puede_validar_tareas;
    const esAutorCancelando =
      (tarea.estado === EstadoTarea.POR_VALIDAR && tarea.id_completador === id_usuario) ||
      (tarea.estado === EstadoTarea.PROPUESTA && tarea.id_creador === id_usuario);

    if (!esJefe && !esAutorCancelando) {
      throw new ForbiddenException('Solo el Jefe de Hogar puede rechazar esta tarea');
    }

    if (tarea.estado === EstadoTarea.PROPUESTA) {
      await this.prisma.tarea.delete({ where: { id_tarea } });
      return { ok: true, eliminada: true, id_tarea };
    }

    if (tarea.estado === EstadoTarea.POR_VALIDAR) {
      return this.prisma.tarea.update({
        where: { id_tarea },
        data: { estado: EstadoTarea.PENDIENTE, id_completador: null },
        include: INCLUDE_TAREA,
      });
    }

    throw new BadRequestException('La tarea no se encuentra pendiente de validación');
  }

  /** Revierte una tarea completada (o en revisión) a pendiente, descontando los puntos si ya habían sido otorgados. */
  async reabrir(id_usuario: number, id_tarea: number, id_hogar_preferido?: number) {
    const membresia = await this.hogares.obtenerMembresia(id_usuario, id_hogar_preferido);
    const tarea = await this.buscarEnHogar(id_tarea, membresia.id_hogar);

    if (tarea.estado === EstadoTarea.POR_VALIDAR) {
      if (
        membresia.rol !== RolMiembro.ADMINISTRADOR &&
        !membresia.puede_validar_tareas &&
        tarea.id_completador !== id_usuario
      ) {
        throw new ForbiddenException('No tienes permiso para revertir esta tarea');
      }
      return this.prisma.tarea.update({
        where: { id_tarea },
        data: { estado: EstadoTarea.PENDIENTE, id_completador: null },
        include: INCLUDE_TAREA,
      });
    }

    const puedeValidar =
      membresia.hogar.tipo_hogar === TipoHogar.COLABORATIVO ||
      membresia.rol === RolMiembro.ADMINISTRADOR ||
      membresia.puede_validar_tareas;

    if (!puedeValidar) {
      throw new ForbiddenException('Solo el Jefe de Hogar puede reabrir tareas ya validadas');
    }

    if (tarea.estado !== EstadoTarea.COMPLETADA) {
      throw new BadRequestException('La tarea no está completada');
    }

    const beneficiario = tarea.id_completador ?? tarea.id_asignado;
    const ops: Prisma.PrismaPromise<unknown>[] = [
      this.prisma.tarea.update({
        where: { id_tarea },
        data: { estado: EstadoTarea.PENDIENTE, fecha_completada: null, id_completador: null },
        include: INCLUDE_TAREA,
      }),
    ];
    if (beneficiario) ops.push(this.ajustarPuntos(beneficiario, membresia.id_hogar, -tarea.puntos));
    const [actualizada] = await this.prisma.$transaction(ops);
    return actualizada;
  }

  async eliminar(id_usuario: number, id_tarea: number, id_hogar_preferido?: number) {
    const { tarea, membresia } = await this.obtenerEditable(id_usuario, id_tarea, id_hogar_preferido);
    if (
      membresia.hogar.tipo_hogar === TipoHogar.JEFE_DE_HOGAR &&
      membresia.rol !== RolMiembro.ADMINISTRADOR &&
      !membresia.puede_crear_tareas &&
      tarea.estado !== EstadoTarea.PROPUESTA
    ) {
      throw new ForbiddenException('Solo el Jefe de Hogar puede eliminar tareas activas');
    }
    const beneficiario = tarea.id_completador ?? tarea.id_asignado;
    const ops: Prisma.PrismaPromise<unknown>[] = [this.prisma.tarea.delete({ where: { id_tarea } })];
    if (tarea.estado === EstadoTarea.COMPLETADA && beneficiario) {
      ops.push(this.ajustarPuntos(beneficiario, tarea.id_hogar, -tarea.puntos));
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

  private async obtenerEditable(id_usuario: number, id_tarea: number, id_hogar_preferido?: number) {
    const membresia = await this.hogares.obtenerMembresia(id_usuario, id_hogar_preferido);
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
