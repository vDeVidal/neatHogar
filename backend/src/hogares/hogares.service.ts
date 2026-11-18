import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoTarea, EstadoValidacion, RolMiembro, TipoHogar } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  normalizarIdentificadorUnico,
  normalizarNombreLogin,
  SELECT_USUARIO_PUBLICO,
} from '../common/constantes';
import {
  ActualizarTipoHogarDto,
  CambiarRolDto,
  CrearHogarDto,
  InvitarMiembroDto,
  UnirseHogarDto,
} from './dto/hogar.dto';

const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TTL_INVITACION_MS = 5 * 60 * 1000; // 5 minutos exactos (300s)

@Injectable()
export class HogaresService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────────── Helpers reutilizados por otros módulos ─────────────────────────

  async obtenerMembresia(id_usuario: number, id_hogar_preferido?: number) {
    if (id_hogar_preferido) {
      const preferida = await this.prisma.miembroHogar.findUnique({
        where: { id_usuario_id_hogar: { id_usuario, id_hogar: id_hogar_preferido } },
        include: { hogar: true },
      });
      if (preferida) return preferida;
    }

    const usr = await this.prisma.usuario.findUnique({
      where: { id_usuario },
      select: { id_hogar_activo: true },
    });

    if (usr?.id_hogar_activo) {
      const activa = await this.prisma.miembroHogar.findUnique({
        where: { id_usuario_id_hogar: { id_usuario, id_hogar: usr.id_hogar_activo } },
        include: { hogar: true },
      });
      if (activa) return activa;
    }

    const primera = await this.prisma.miembroHogar.findFirst({
      where: { id_usuario },
      include: { hogar: true },
      orderBy: { fecha_ingreso: 'desc' },
    });
    if (!primera) {
      throw new NotFoundException('Aún no perteneces a un núcleo familiar');
    }

    await this.prisma.usuario
      .update({
        where: { id_usuario },
        data: { id_hogar_activo: primera.id_hogar },
      })
      .catch(() => undefined);

    return primera;
  }

  async exigirAdministrador(id_usuario: number, id_hogar_preferido?: number) {
    const membresia = await this.obtenerMembresia(id_usuario, id_hogar_preferido);
    if (membresia.rol !== RolMiembro.ADMINISTRADOR) {
      throw new ForbiddenException('Solo el Jefe de Hogar / Administrador puede realizar esta acción');
    }
    return membresia;
  }

  async verificarPertenencia(id_usuario: number, id_hogar: number) {
    const m = await this.prisma.miembroHogar.findUnique({
      where: { id_usuario_id_hogar: { id_usuario, id_hogar } },
    });
    if (!m) throw new BadRequestException('El usuario indicado no pertenece a este hogar');
    return m;
  }

  // ───────────────────────── Casos de uso Multi-Hogar ─────────────────────────

  async listarMisHogares(id_usuario: number) {
    const membresias = await this.prisma.miembroHogar.findMany({
      where: { id_usuario },
      include: {
        hogar: {
          include: {
            _count: { select: { miembros: true } },
          },
        },
      },
      orderBy: { fecha_ingreso: 'asc' },
    });

    const resultados = await Promise.all(
      membresias.map(async (m) => {
        const [tareasPorValidar, comprasPorValidar, gastosPorValidar] = await Promise.all([
          this.prisma.tarea.count({
            where: {
              id_hogar: m.id_hogar,
              estado: {
                in: [EstadoTarea.EN_REVISION, EstadoTarea.POR_VALIDAR, EstadoTarea.PROPUESTA],
              },
            },
          }),
          this.prisma.itemCompra.count({
            where: {
              id_hogar: m.id_hogar,
              estado_validacion: {
                in: [EstadoValidacion.PENDIENTE_APROBACION, EstadoValidacion.COMPRA_POR_VALIDAR],
              },
            },
          }),
          this.prisma.gasto.count({
            where: {
              id_hogar: m.id_hogar,
              estado_validacion: EstadoValidacion.PENDIENTE_APROBACION,
            },
          }),
        ]);

        return {
          id_hogar: m.hogar.id_hogar,
          nombre: m.hogar.nombre,
          tipo_hogar: m.hogar.tipo_hogar,
          codigo_invitacion: m.hogar.codigo_invitacion,
          fecha_creacion: m.hogar.fecha_creacion,
          mi_rol: m.rol,
          puntos_acumulados: m.puntos_acumulados,
          puede_validar_tareas: m.puede_validar_tareas,
          puede_crear_tareas: m.puede_crear_tareas,
          puede_gestionar_compras: m.puede_gestionar_compras,
          total_miembros: m.hogar._count.miembros,
          validaciones_pendientes: tareasPorValidar + comprasPorValidar + gastosPorValidar,
        };
      }),
    );

    return resultados;
  }

  async activar(id_usuario: number, id_hogar: number) {
    await this.verificarPertenencia(id_usuario, id_hogar);
    await this.prisma.usuario.update({
      where: { id_usuario },
      data: { id_hogar_activo: id_hogar },
    });
    return this.detalle(id_hogar, id_usuario);
  }

  async crear(id_usuario: number, dto: CrearHogarDto) {
    const tipo_hogar = dto.tipo_hogar ?? TipoHogar.COLABORATIVO;
    const codigoBase = await this.generarCodigoUnico();
    const expiraEn = new Date(Date.now() + TTL_INVITACION_MS);

    const hogar = await this.prisma.hogar.create({
      data: {
        nombre: dto.nombre.trim(),
        tipo_hogar,
        codigo_invitacion: codigoBase,
        miembros: {
          create: {
            id_usuario,
            rol: RolMiembro.ADMINISTRADOR,
            puede_validar_tareas: true,
            puede_crear_tareas: true,
            puede_gestionar_compras: true,
          },
        },
        codigos_invitacion: {
          create: {
            codigo: codigoBase,
            id_creador: id_usuario,
            rol_asignado: RolMiembro.MIEMBRO,
            puede_validar_tareas: tipo_hogar === TipoHogar.COLABORATIVO,
            puede_crear_tareas: tipo_hogar === TipoHogar.COLABORATIVO,
            puede_gestionar_compras: tipo_hogar === TipoHogar.COLABORATIVO,
            expira_en: expiraEn,
          },
        },
      },
    });
    await this.prisma.usuario.update({
      where: { id_usuario },
      data: { id_hogar_activo: hogar.id_hogar },
    });
    return this.detalle(hogar.id_hogar, id_usuario);
  }

  // ───────────────────────── Invitaciones Dinámicas Efímeras (TTL 5 min) ─────────────────────────

  /**
   * Genera un código dinámico de invitación con vigencia exacta de 5 minutos (300 segundos).
   * Invalida códigos anteriores no usados del mismo creador en ese hogar.
   */
  async generarCodigoTemporal(
    id_admin: number,
    id_hogar_objetivo?: number,
    dto?: InvitarMiembroDto,
  ) {
    const admin = await this.exigirAdministrador(id_admin, id_hogar_objetivo);
    const id_hogar = admin.id_hogar;
    const esColaborativo = admin.hogar.tipo_hogar === TipoHogar.COLABORATIVO;
    const rolAsignado = dto?.rol ?? RolMiembro.MIEMBRO;
    const esRolAdmin = rolAsignado === RolMiembro.ADMINISTRADOR;

    await this.prisma.codigoInvitacion.updateMany({
      where: { id_hogar, id_creador: id_admin, usado: false },
      data: { usado: true },
    });

    const nuevoCodigo = await this.generarCodigoUnico();
    const ahora = new Date();
    const expira_en = new Date(ahora.getTime() + TTL_INVITACION_MS);

    const registro = await this.prisma.codigoInvitacion.create({
      data: {
        codigo: nuevoCodigo,
        id_hogar,
        id_creador: id_admin,
        rol_asignado: rolAsignado,
        puede_validar_tareas: esRolAdmin ? true : (dto?.puede_validar_tareas ?? esColaborativo),
        puede_crear_tareas: esRolAdmin ? true : (dto?.puede_crear_tareas ?? esColaborativo),
        puede_gestionar_compras: esRolAdmin ? true : (dto?.puede_gestionar_compras ?? esColaborativo),
        creado_en: ahora,
        expira_en,
        usado: false,
      },
    });

    // Si no es un hogar demo fijo (DEMO01 / FAMI01), sincronizar el código visible del hogar con el código temporal activo
    if (
      admin.hogar.codigo_invitacion !== 'DEMO01' &&
      admin.hogar.codigo_invitacion !== 'FAMI01'
    ) {
      await this.prisma.hogar
        .update({
          where: { id_hogar },
          data: { codigo_invitacion: nuevoCodigo },
        })
        .catch(() => undefined);
    }

    return {
      id_codigo: registro.id_codigo,
      codigo: registro.codigo,
      codigo_invitacion: registro.codigo,
      id_hogar,
      rol_asignado: registro.rol_asignado,
      creado_en: registro.creado_en,
      expira_en: registro.expira_en,
      segundos_restantes: 300,
    };
  }

  /** Retorna el código temporal activo del hogar (si aún no ha expirado). */
  async obtenerInvitacionActiva(id_usuario: number, id_hogar_preferido?: number) {
    const membresia = await this.obtenerMembresia(id_usuario, id_hogar_preferido);
    const ahora = new Date();

    const activa = await this.prisma.codigoInvitacion.findFirst({
      where: {
        id_hogar: membresia.id_hogar,
        usado: false,
        expira_en: { gt: ahora },
      },
      orderBy: { creado_en: 'desc' },
    });

    if (!activa) {
      return {
        activa: false,
        codigo: null,
        expira_en: null,
        segundos_restantes: 0,
      };
    }

    const segundos_restantes = Math.max(
      0,
      Math.ceil((activa.expira_en.getTime() - ahora.getTime()) / 1000),
    );

    return {
      activa: segundos_restantes > 0,
      id_codigo: activa.id_codigo,
      codigo: activa.codigo,
      rol_asignado: activa.rol_asignado,
      creado_en: activa.creado_en,
      expira_en: activa.expira_en,
      segundos_restantes,
    };
  }

  /**
   * Une al usuario a un hogar mediante código temporal (TTL 5 minutos) o código de hogar.
   * Si el código pertenece a CodigoInvitacion y ya expiró, retorna 410 Gone.
   */
  async unirse(id_usuario: number, dto: UnirseHogarDto) {
    const raw = (dto.codigo || dto.codigo_invitacion || '').trim().toUpperCase();
    const codigoLimpio = raw.replace(/^NH-/, '');
    if (!raw) {
      throw new BadRequestException('Debes ingresar el código de invitación del hogar');
    }

    // 1. Buscar primero en la tabla de códigos dinámicos efímeros (TTL 5 min)
    const invTemporal =
      (await this.prisma.codigoInvitacion.findUnique({ where: { codigo: raw } })) ??
      (await this.prisma.codigoInvitacion.findUnique({ where: { codigo: codigoLimpio } }));

    if (invTemporal) {
      const ahora = new Date();
      if (invTemporal.usado || ahora > invTemporal.expira_en) {
        throw new GoneException(
          'El código de invitación ha expirado (límite de 5 minutos). Solicita uno nuevo al propietario.',
        );
      }

      const yaMiembro = await this.prisma.miembroHogar.findUnique({
        where: {
          id_usuario_id_hogar: { id_usuario, id_hogar: invTemporal.id_hogar },
        },
      });

      if (!yaMiembro) {
        await this.prisma.miembroHogar.create({
          data: {
            id_usuario,
            id_hogar: invTemporal.id_hogar,
            rol: invTemporal.rol_asignado,
            puede_validar_tareas: invTemporal.puede_validar_tareas,
            puede_crear_tareas: invTemporal.puede_crear_tareas,
            puede_gestionar_compras: invTemporal.puede_gestionar_compras,
          },
        });
      }

      await this.prisma.usuario.update({
        where: { id_usuario },
        data: { id_hogar_activo: invTemporal.id_hogar },
      });

      return this.detalle(invTemporal.id_hogar, id_usuario);
    }

    // 2. Fallback a código de hogar (p. ej. hogares demo DEMO01 / FAMI01)
    const hogar =
      (await this.prisma.hogar.findUnique({ where: { codigo_invitacion: raw } })) ??
      (await this.prisma.hogar.findUnique({ where: { codigo_invitacion: codigoLimpio } }));

    if (!hogar) {
      throw new NotFoundException('Código de invitación no válido o no encontrado');
    }

    const yaMiembro = await this.prisma.miembroHogar.findUnique({
      where: { id_usuario_id_hogar: { id_usuario, id_hogar: hogar.id_hogar } },
    });

    if (!yaMiembro) {
      const esColaborativo = hogar.tipo_hogar === TipoHogar.COLABORATIVO;
      await this.prisma.miembroHogar.create({
        data: {
          id_usuario,
          id_hogar: hogar.id_hogar,
          rol: RolMiembro.MIEMBRO,
          puede_validar_tareas: esColaborativo,
          puede_crear_tareas: esColaborativo,
          puede_gestionar_compras: esColaborativo,
        },
      });
    }

    await this.prisma.usuario.update({
      where: { id_usuario },
      data: { id_hogar_activo: hogar.id_hogar },
    });

    return this.detalle(hogar.id_hogar, id_usuario);
  }

  async actual(id_usuario: number, id_hogar_preferido?: number) {
    const membresia = await this.obtenerMembresia(id_usuario, id_hogar_preferido);
    return this.detalle(membresia.id_hogar, id_usuario);
  }

  async actualizarTipoHogar(id_admin: number, dto: ActualizarTipoHogarDto, id_hogar_preferido?: number) {
    const admin = await this.exigirAdministrador(id_admin, id_hogar_preferido);
    const esColaborativo = dto.tipo_hogar === TipoHogar.COLABORATIVO;

    await this.prisma.$transaction([
      this.prisma.hogar.update({
        where: { id_hogar: admin.id_hogar },
        data: { tipo_hogar: dto.tipo_hogar },
      }),
      this.prisma.miembroHogar.updateMany({
        where: { id_hogar: admin.id_hogar, rol: RolMiembro.MIEMBRO },
        data: {
          puede_validar_tareas: esColaborativo,
          puede_crear_tareas: esColaborativo,
          puede_gestionar_compras: esColaborativo,
        },
      }),
    ]);

    return this.detalle(admin.id_hogar, id_admin);
  }

  /**
   * Si se indica nombre/@identificador o email, vincula al usuario existente;
   * si no se indica, genera un nuevo código de invitación temporal de 5 minutos.
   */
  async invitar(id_admin: number, dto: InvitarMiembroDto, id_hogar_preferido?: number) {
    const admin = await this.exigirAdministrador(id_admin, id_hogar_preferido);

    if (!dto.email?.trim() && !dto.nombre?.trim()) {
      const codigoTemp = await this.generarCodigoTemporal(id_admin, admin.id_hogar, dto);
      const detalleHogar = await this.detalle(admin.id_hogar, id_admin);
      return {
        ...detalleHogar,
        codigo_temporal: codigoTemp,
      };
    }

    let usuario = null;
    if (dto.email?.trim()) {
      usuario = await this.prisma.usuario.findUnique({
        where: { email: dto.email.trim().toLowerCase() },
      });
    } else if (dto.nombre?.trim()) {
      const raw = dto.nombre.trim();
      const idNorm = normalizarIdentificadorUnico(raw);
      const nombre_login = normalizarNombreLogin(raw.replace(/^@+/, ''));
      usuario =
        (await this.prisma.usuario.findUnique({ where: { identificador_unico: idNorm } })) ??
        (await this.prisma.usuario.findUnique({ where: { nombre_login } })) ??
        (await this.prisma.usuario.findFirst({
          where: { nombre: { equals: raw.replace(/^@+/, ''), mode: 'insensitive' } },
        }));
    }

    if (!usuario) {
      throw new NotFoundException(
        'No encontramos una cuenta con ese nombre/@identificador. Genera el código temporal de 5 minutos para que se una.',
      );
    }

    const yaEnEsteHogar = await this.prisma.miembroHogar.findUnique({
      where: { id_usuario_id_hogar: { id_usuario: usuario.id_usuario, id_hogar: admin.id_hogar } },
    });
    if (yaEnEsteHogar) {
      throw new ConflictException('Ese usuario ya es miembro de este hogar');
    }

    const esColaborativo = admin.hogar.tipo_hogar === TipoHogar.COLABORATIVO;
    const rolAsignado = dto.rol ?? RolMiembro.MIEMBRO;
    const esAdmin = rolAsignado === RolMiembro.ADMINISTRADOR;

    await this.prisma.miembroHogar.create({
      data: {
        id_usuario: usuario.id_usuario,
        id_hogar: admin.id_hogar,
        rol: rolAsignado,
        puede_validar_tareas: esAdmin ? true : (dto.puede_validar_tareas ?? esColaborativo),
        puede_crear_tareas: esAdmin ? true : (dto.puede_crear_tareas ?? esColaborativo),
        puede_gestionar_compras: esAdmin ? true : (dto.puede_gestionar_compras ?? esColaborativo),
      },
    });
    return this.detalle(admin.id_hogar, id_admin);
  }

  async regenerarCodigo(id_admin: number, id_hogar_preferido?: number) {
    const admin = await this.exigirAdministrador(id_admin, id_hogar_preferido);
    await this.generarCodigoTemporal(id_admin, admin.id_hogar);
    return this.detalle(admin.id_hogar, id_admin);
  }

  async cambiarRol(id_admin: number, id_miembro: number, dto: CambiarRolDto, id_hogar_preferido?: number) {
    const admin = await this.exigirAdministrador(id_admin, id_hogar_preferido);
    const objetivo = await this.miembroDelHogar(id_miembro, admin.id_hogar);
    if (dto.rol && objetivo.rol === RolMiembro.ADMINISTRADOR && dto.rol === RolMiembro.MIEMBRO) {
      await this.asegurarOtroAdministrador(admin.id_hogar, objetivo.id_miembro);
    }
    const dataToUpdate: Record<string, unknown> = {};
    if (dto.rol !== undefined) {
      dataToUpdate.rol = dto.rol;
      if (dto.rol === RolMiembro.ADMINISTRADOR) {
        dataToUpdate.puede_validar_tareas = true;
        dataToUpdate.puede_crear_tareas = true;
        dataToUpdate.puede_gestionar_compras = true;
      }
    }
    if (dto.puede_validar_tareas !== undefined) dataToUpdate.puede_validar_tareas = dto.puede_validar_tareas;
    if (dto.puede_crear_tareas !== undefined) dataToUpdate.puede_crear_tareas = dto.puede_crear_tareas;
    if (dto.puede_gestionar_compras !== undefined) dataToUpdate.puede_gestionar_compras = dto.puede_gestionar_compras;

    await this.prisma.miembroHogar.update({ where: { id_miembro }, data: dataToUpdate });
    return this.detalle(admin.id_hogar, id_admin);
  }

  async eliminarMiembro(id_admin: number, id_miembro: number, id_hogar_preferido?: number) {
    const admin = await this.exigirAdministrador(id_admin, id_hogar_preferido);
    const objetivo = await this.miembroDelHogar(id_miembro, admin.id_hogar);
    if (objetivo.rol === RolMiembro.ADMINISTRADOR) {
      await this.asegurarOtroAdministrador(admin.id_hogar, objetivo.id_miembro);
    }
    await this.prisma.miembroHogar.delete({ where: { id_miembro } });
    return this.detalle(admin.id_hogar, id_admin);
  }

  async salir(id_usuario: number, id_hogar_preferido?: number) {
    const m = await this.obtenerMembresia(id_usuario, id_hogar_preferido);
    const total = await this.prisma.miembroHogar.count({ where: { id_hogar: m.id_hogar } });
    if (total === 1) {
      await this.prisma.hogar.delete({ where: { id_hogar: m.id_hogar } });
    } else {
      if (m.rol === RolMiembro.ADMINISTRADOR) {
        await this.asegurarOtroAdministrador(m.id_hogar, m.id_miembro);
      }
      await this.prisma.tarea.updateMany({
        where: { id_hogar: m.id_hogar, id_asignado: id_usuario, estado: EstadoTarea.PENDIENTE },
        data: { id_asignado: null },
      });
      await this.prisma.miembroHogar.delete({ where: { id_miembro: m.id_miembro } });
    }

    const otra = await this.prisma.miembroHogar.findFirst({
      where: { id_usuario },
      orderBy: { fecha_ingreso: 'desc' },
    });
    await this.prisma.usuario.update({
      where: { id_usuario },
      data: { id_hogar_activo: otra?.id_hogar ?? null },
    });

    return { ok: true, nuevo_hogar_activo: otra?.id_hogar ?? null };
  }

  async obtenerDetalleHogar(id_hogar: number, id_usuario?: number) {
    return this.detalle(id_hogar, id_usuario);
  }

  // ───────────────────────── Privados ─────────────────────────

  private async detalle(id_hogar: number, id_usuario?: number) {
    const hogar = await this.prisma.hogar.findUniqueOrThrow({
      where: { id_hogar },
      include: {
        miembros: {
          orderBy: [{ rol: 'asc' }, { fecha_ingreso: 'asc' }],
          include: { usuario: { select: SELECT_USUARIO_PUBLICO } },
        },
      },
    });
    const pendientes = await this.prisma.tarea.groupBy({
      by: ['id_asignado'],
      where: {
        id_hogar,
        estado: {
          in: [EstadoTarea.PENDIENTE, EstadoTarea.EN_REVISION, EstadoTarea.POR_VALIDAR],
        },
      },
      _count: { _all: true },
    });
    const mapaPendientes = new Map(pendientes.map((p) => [p.id_asignado, p._count._all]));
    const miRol = hogar.miembros.find((m) => m.id_usuario === id_usuario)?.rol ?? null;

    const ahora = new Date();
    const codigoActivo = await this.prisma.codigoInvitacion.findFirst({
      where: { id_hogar, usado: false, expira_en: { gt: ahora } },
      orderBy: { creado_en: 'desc' },
    });

    return {
      ...hogar,
      mi_rol: miRol,
      invitacion_temporal: codigoActivo
        ? {
            id_codigo: codigoActivo.id_codigo,
            codigo: codigoActivo.codigo,
            rol_asignado: codigoActivo.rol_asignado,
            expira_en: codigoActivo.expira_en,
            segundos_restantes: Math.max(
              0,
              Math.ceil((codigoActivo.expira_en.getTime() - ahora.getTime()) / 1000),
            ),
          }
        : null,
      miembros: hogar.miembros.map((m) => ({
        ...m,
        tareas_pendientes: mapaPendientes.get(m.id_usuario) ?? 0,
      })),
    };
  }

  private async miembroDelHogar(id_miembro: number, id_hogar: number) {
    const m = await this.prisma.miembroHogar.findUnique({ where: { id_miembro } });
    if (!m || m.id_hogar !== id_hogar) throw new NotFoundException('Miembro no encontrado en este hogar');
    return m;
  }

  private async asegurarOtroAdministrador(id_hogar: number, excluir_id_miembro: number) {
    const otros = await this.prisma.miembroHogar.count({
      where: { id_hogar, rol: RolMiembro.ADMINISTRADOR, NOT: { id_miembro: excluir_id_miembro } },
    });
    if (otros === 0) {
      throw new BadRequestException('El hogar debe conservar al menos un Jefe de Hogar / Administrador');
    }
  }

  private async generarCodigoUnico(): Promise<string> {
    for (let intento = 0; intento < 10; intento++) {
      const codigo = Array.from(
        { length: 6 },
        () => ALFABETO_CODIGO[Math.floor(Math.random() * ALFABETO_CODIGO.length)],
      ).join('');
      const [existeHogar, existeTemp] = await Promise.all([
        this.prisma.hogar.findUnique({ where: { codigo_invitacion: codigo } }),
        this.prisma.codigoInvitacion.findUnique({ where: { codigo } }),
      ]);
      if (!existeHogar && !existeTemp) return codigo;
    }
    throw new ConflictException('No fue posible generar un código único, intenta nuevamente');
  }
}
