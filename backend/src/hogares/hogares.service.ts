import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoTarea, EstadoValidacion, RolMiembro, TipoHogar } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizarNombreLogin, SELECT_USUARIO_PUBLICO } from '../common/constantes';
import {
  ActualizarTipoHogarDto,
  CambiarRolDto,
  CrearHogarDto,
  InvitarMiembroDto,
  UnirseHogarDto,
} from './dto/hogar.dto';

const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para evitar confusiones

@Injectable()
export class HogaresService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────────── Helpers reutilizados por otros módulos ─────────────────────────

  /**
   * Retorna la membresía activa del usuario junto con los datos del hogar.
   * Prioriza id_hogar_preferido (cabecera x-hogar-id), luego usuario.id_hogar_activo y por último la más reciente.
   */
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

    await this.prisma.usuario.update({
      where: { id_usuario },
      data: { id_hogar_activo: primera.id_hogar },
    }).catch(() => undefined);

    return primera;
  }

  async exigirAdministrador(id_usuario: number, id_hogar_preferido?: number) {
    const membresia = await this.obtenerMembresia(id_usuario, id_hogar_preferido);
    if (membresia.rol !== RolMiembro.ADMINISTRADOR) {
      throw new ForbiddenException('Solo el Jefe de Hogar / Administrador puede realizar esta acción');
    }
    return membresia;
  }

  /** Verifica que un usuario pertenezca al hogar indicado. */
  async verificarPertenencia(id_usuario: number, id_hogar: number) {
    const m = await this.prisma.miembroHogar.findUnique({
      where: { id_usuario_id_hogar: { id_usuario, id_hogar } },
    });
    if (!m) throw new BadRequestException('El usuario indicado no pertenece a este hogar');
    return m;
  }

  // ───────────────────────── Casos de uso Multi-Hogar ─────────────────────────

  /** Lista todos los hogares a los que pertenece el usuario para acceso rápido en Inicio y Header. */
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
              estado: { in: [EstadoTarea.POR_VALIDAR, EstadoTarea.PROPUESTA] },
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

  /** Cambia el hogar activo del usuario y devuelve su detalle completo. */
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
    const hogar = await this.prisma.hogar.create({
      data: {
        nombre: dto.nombre.trim(),
        tipo_hogar,
        codigo_invitacion: await this.generarCodigoUnico(),
        miembros: {
          create: {
            id_usuario,
            rol: RolMiembro.ADMINISTRADOR,
            puede_validar_tareas: true,
            puede_crear_tareas: true,
            puede_gestionar_compras: true,
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

  async unirse(id_usuario: number, dto: UnirseHogarDto) {
    const codigoBuscado = (dto.codigo || dto.codigo_invitacion || '').trim().toUpperCase();
    if (!codigoBuscado) {
      throw new BadRequestException('Debes ingresar el código de invitación del hogar');
    }

    const hogar = await this.prisma.hogar.findUnique({
      where: { codigo_invitacion: codigoBuscado },
    });
    if (!hogar) throw new NotFoundException('Código de invitación no válido o no encontrado');

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

  /** Añade directamente a un usuario ya registrado (por nombre o email) o retorna el código de invitación. */
  async invitar(id_admin: number, dto: InvitarMiembroDto, id_hogar_preferido?: number) {
    const admin = await this.exigirAdministrador(id_admin, id_hogar_preferido);

    if (!dto.email?.trim() && !dto.nombre?.trim()) {
      return this.detalle(admin.id_hogar, id_admin);
    }

    let usuario = null;
    if (dto.email?.trim()) {
      usuario = await this.prisma.usuario.findUnique({
        where: { email: dto.email.trim().toLowerCase() },
      });
    } else if (dto.nombre?.trim()) {
      const nombre_login = normalizarNombreLogin(dto.nombre);
      usuario =
        (await this.prisma.usuario.findUnique({ where: { nombre_login } })) ??
        (await this.prisma.usuario.findFirst({
          where: { nombre: { equals: dto.nombre.trim(), mode: 'insensitive' } },
        }));
    }

    if (!usuario) {
      throw new NotFoundException(
        'No encontramos una cuenta con ese nombre/correo. Comparte el código de vinculación para que se una.',
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
    await this.prisma.hogar.update({
      where: { id_hogar: admin.id_hogar },
      data: { codigo_invitacion: await this.generarCodigoUnico() },
    });
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

  /** El usuario abandona su hogar actual. Si era el último miembro, el hogar se elimina. */
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
      where: { id_hogar, estado: { in: [EstadoTarea.PENDIENTE, EstadoTarea.POR_VALIDAR] } },
      _count: { _all: true },
    });
    const mapaPendientes = new Map(pendientes.map((p) => [p.id_asignado, p._count._all]));
    const miRol = hogar.miembros.find((m) => m.id_usuario === id_usuario)?.rol ?? null;
    return {
      ...hogar,
      mi_rol: miRol,
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
      const existe = await this.prisma.hogar.findUnique({ where: { codigo_invitacion: codigo } });
      if (!existe) return codigo;
    }
    throw new ConflictException('No fue posible generar un código único, intenta nuevamente');
  }
}
