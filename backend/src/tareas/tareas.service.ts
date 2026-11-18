import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoTarea, Prisma, RolMiembro, TipoCategoria, TipoHogar } from '@prisma/client';
import * as fs from 'fs';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { HogaresService } from '../hogares/hogares.service';
import { SELECT_USUARIO_PUBLICO } from '../common/constantes';
import {
  ActualizarTareaDto,
  CompletarConEvidenciaDto,
  CrearTareaDto,
  FiltroTareasDto,
  ValidarTareaDto,
} from './dto/tarea.dto';

const INCLUDE_TAREA = {
  asignado: { select: SELECT_USUARIO_PUBLICO },
  creador: { select: { id_usuario: true, nombre: true, identificador_unico: true } },
  completador: { select: { id_usuario: true, nombre: true, identificador_unico: true } },
  validador: { select: { id_usuario: true, nombre: true, identificador_unico: true } },
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
        requiere_foto: dto.requiere_foto ?? true,
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
        requiere_foto: dto.requiere_foto,
        fecha_limite:
          dto.fecha_limite === undefined ? undefined : dto.fecha_limite ? new Date(dto.fecha_limite) : null,
      },
      include: INCLUDE_TAREA,
    });
  }

  /**
   * POST /api/tareas/:idTarea/completar-con-evidencia
   * Recibe archivo fotográfico (multipart/form-data o base64), lo almacena en /uploads/evidencias/,
   * coloca la tarea en estado EN_REVISION y retiene los puntos hasta la aprobación del Administrador/Padre.
   */
  async completarConEvidencia(
    id_usuario: number,
    id_tarea: number,
    archivo: { filename?: string; buffer?: Buffer; originalname?: string } | undefined,
    dto: CompletarConEvidenciaDto,
    id_hogar_preferido?: number,
  ) {
    const membresia = await this.hogares.obtenerMembresia(id_usuario, id_hogar_preferido);
    const tarea = await this.buscarEnHogar(id_tarea, membresia.id_hogar);

    if (tarea.estado === EstadoTarea.COMPLETADA) {
      throw new BadRequestException('La tarea ya está completada y validada');
    }

    let evidenciaUrl = dto?.evidencia_foto_url?.trim() || null;
    const evidenciasDir = join(process.cwd(), 'uploads', 'evidencias');
    fs.mkdirSync(evidenciasDir, { recursive: true });

    if (archivo?.filename) {
      evidenciaUrl = `/uploads/evidencias/${archivo.filename}`;
    } else if (archivo?.buffer) {
      const ext = (archivo.originalname?.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '');
      const nombreArchivo = `tarea_${id_tarea}_${Date.now()}.${ext || 'jpg'}`;
      fs.writeFileSync(join(evidenciasDir, nombreArchivo), archivo.buffer);
      evidenciaUrl = `/uploads/evidencias/${nombreArchivo}`;
    } else if (dto?.foto_base64) {
      const rawBase64 = dto.foto_base64.replace(/^data:image\/\w+;base64,/, '');
      const nombreArchivo = `tarea_${id_tarea}_${Date.now()}.jpg`;
      fs.writeFileSync(join(evidenciasDir, nombreArchivo), Buffer.from(rawBase64, 'base64'));
      evidenciaUrl = `/uploads/evidencias/${nombreArchivo}`;
    }

    if (!evidenciaUrl) {
      throw new BadRequestException('Debes adjuntar una fotografía como evidencia de la tarea realizada');
    }

    const responsable = tarea.id_asignado ?? id_usuario;

    return this.prisma.tarea.update({
      where: { id_tarea },
      data: {
        estado: EstadoTarea.EN_REVISION,
        evidencia_foto_url: evidenciaUrl,
        comentario_revision: null,
        fecha_completada: new Date(),
        id_asignado: responsable,
        id_completador: id_usuario,
      },
      include: INCLUDE_TAREA,
    });
  }

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

    if (tarea.estado === EstadoTarea.POR_VALIDAR || tarea.estado === EstadoTarea.EN_REVISION) {
      if (!puedeValidar) {
        throw new ForbiddenException('Esta tarea ya fue enviada y está esperando validación del Jefe de Hogar');
      }
      const responsable = tarea.id_completador ?? tarea.id_asignado ?? id_usuario;
      const [actualizada] = await this.prisma.$transaction([
        this.prisma.tarea.update({
          where: { id_tarea },
          data: {
            estado: EstadoTarea.COMPLETADA,
            fecha_completada: tarea.fecha_completada ?? new Date(),
            fecha_validacion: new Date(),
            id_validador: id_usuario,
            comentario_revision: null,
            id_asignado: tarea.id_asignado ?? responsable,
          },
          include: INCLUDE_TAREA,
        }),
        this.ajustarPuntos(responsable, membresia.id_hogar, tarea.puntos),
      ]);
      return actualizada;
    }

    const responsable = tarea.id_asignado ?? id_usuario;
    if (!puedeValidar) {
      return this.prisma.tarea.update({
        where: { id_tarea },
        data: {
          estado: EstadoTarea.EN_REVISION,
          fecha_completada: new Date(),
          comentario_revision: null,
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
          fecha_validacion: new Date(),
          id_validador: id_usuario,
          comentario_revision: null,
          id_asignado: responsable,
          id_completador: id_usuario,
        },
        include: INCLUDE_TAREA,
      }),
      this.ajustarPuntos(responsable, membresia.id_hogar, tarea.puntos),
    ]);
    return actualizada;
  }

  /**
   * PATCH /api/tareas/:idTarea/validar
   * Si aprobado === false, devuelve la tarea a PENDIENTE con comentario_revision.
   * Si aprobado !== false, aprueba la tarea (-> COMPLETADA) y acredita los puntos al miembro.
   */
  async validar(
    id_usuario: number,
    id_tarea: number,
    dto?: ValidarTareaDto,
    id_hogar_preferido?: number,
  ) {
    if (dto?.aprobado === false) {
      return this.rechazar(id_usuario, id_tarea, dto.comentario_revision, id_hogar_preferido);
    }

    const membresia = await this.hogares.obtenerMembresia(id_usuario, id_hogar_preferido);
    const puedeValidar =
      membresia.rol === RolMiembro.ADMINISTRADOR ||
      membresia.hogar.tipo_hogar === TipoHogar.COLABORATIVO ||
      membresia.puede_validar_tareas;

    if (!puedeValidar) {
      throw new ForbiddenException('Solo el Jefe de Hogar / Administrador puede validar tareas');
    }

    const tarea = await this.buscarEnHogar(id_tarea, membresia.id_hogar);

    if (tarea.estado === EstadoTarea.PROPUESTA) {
      return this.prisma.tarea.update({
        where: { id_tarea },
        data: { estado: EstadoTarea.PENDIENTE, comentario_revision: null },
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
          fecha_completada: tarea.fecha_completada ?? new Date(),
          fecha_validacion: new Date(),
          id_validador: id_usuario,
          comentario_revision: dto?.comentario_revision?.trim() || null,
          id_asignado: tarea.id_asignado ?? responsable,
          id_completador: tarea.id_completador ?? id_usuario,
        },
        include: INCLUDE_TAREA,
      }),
      this.ajustarPuntos(responsable, membresia.id_hogar, tarea.puntos),
    ]);
    return actualizada;
  }

  /**
   * Rechaza una tarea PROPUESTA (la elimina) o devuelve una tarea EN_REVISION / POR_VALIDAR
   * a estado PENDIENTE guardando comentario_revision para que el miembro sepa qué corregir.
   */
  async rechazar(
    id_usuario: number,
    id_tarea: number,
    comentario_revision?: string,
    id_hogar_preferido?: number,
  ) {
    const membresia = await this.hogares.obtenerMembresia(id_usuario, id_hogar_preferido);
    const tarea = await this.buscarEnHogar(id_tarea, membresia.id_hogar);

    const esJefe = membresia.rol === RolMiembro.ADMINISTRADOR || membresia.puede_validar_tareas;
    const esAutorCancelando =
      ((tarea.estado === EstadoTarea.POR_VALIDAR || tarea.estado === EstadoTarea.EN_REVISION) &&
        tarea.id_completador === id_usuario) ||
      (tarea.estado === EstadoTarea.PROPUESTA && tarea.id_creador === id_usuario);

    if (!esJefe && !esAutorCancelando) {
      throw new ForbiddenException('Solo el Jefe de Hogar / Administrador puede rechazar esta tarea');
    }

    if (tarea.estado === EstadoTarea.PROPUESTA) {
      await this.prisma.tarea.delete({ where: { id_tarea } });
      return { ok: true, eliminada: true, id_tarea };
    }

    if (tarea.estado === EstadoTarea.POR_VALIDAR || tarea.estado === EstadoTarea.EN_REVISION) {
      return this.prisma.tarea.update({
        where: { id_tarea },
        data: {
          estado: EstadoTarea.PENDIENTE,
          id_completador: null,
          comentario_revision:
            comentario_revision?.trim() ||
            (esJefe ? 'Evidencia rechazada. Por favor corrige y vuelve a enviar foto.' : null),
        },
        include: INCLUDE_TAREA,
      });
    }

    throw new BadRequestException('La tarea no se encuentra en revisión o pendiente de validación');
  }

  async reabrir(id_usuario: number, id_tarea: number, id_hogar_preferido?: number) {
    const membresia = await this.hogares.obtenerMembresia(id_usuario, id_hogar_preferido);
    const tarea = await this.buscarEnHogar(id_tarea, membresia.id_hogar);

    if (tarea.estado === EstadoTarea.POR_VALIDAR || tarea.estado === EstadoTarea.EN_REVISION) {
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
        data: {
          estado: EstadoTarea.PENDIENTE,
          fecha_completada: null,
          fecha_validacion: null,
          id_completador: null,
          id_validador: null,
        },
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
