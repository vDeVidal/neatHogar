import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RolMiembro } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SELECT_USUARIO_PUBLICO } from '../common/constantes';
import { CambiarRolDto, CrearHogarDto, InvitarMiembroDto, UnirseHogarDto } from './dto/hogar.dto';

const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para evitar confusiones

@Injectable()
export class HogaresService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────────── Helpers reutilizados por otros módulos ─────────────────────────

  /** Retorna la membresía activa del usuario (regla: un hogar activo a la vez). */
  async obtenerMembresia(id_usuario: number) {
    const membresia = await this.prisma.miembroHogar.findFirst({ where: { id_usuario } });
    if (!membresia) {
      throw new NotFoundException('Aún no perteneces a un núcleo familiar');
    }
    return membresia;
  }

  async exigirAdministrador(id_usuario: number) {
    const membresia = await this.obtenerMembresia(id_usuario);
    if (membresia.rol !== RolMiembro.ADMINISTRADOR) {
      throw new ForbiddenException('Solo el Administrador del Hogar puede realizar esta acción');
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

  // ───────────────────────── Casos de uso ─────────────────────────

  async crear(id_usuario: number, dto: CrearHogarDto) {
    await this.asegurarSinHogar(id_usuario);
    const hogar = await this.prisma.hogar.create({
      data: {
        nombre: dto.nombre.trim(),
        codigo_invitacion: await this.generarCodigoUnico(),
        miembros: { create: { id_usuario, rol: RolMiembro.ADMINISTRADOR } },
      },
    });
    return this.detalle(hogar.id_hogar);
  }

  async unirse(id_usuario: number, dto: UnirseHogarDto) {
    await this.asegurarSinHogar(id_usuario);
    const hogar = await this.prisma.hogar.findUnique({
      where: { codigo_invitacion: dto.codigo.trim().toUpperCase() },
    });
    if (!hogar) throw new NotFoundException('Código de invitación no válido');
    await this.prisma.miembroHogar.create({
      data: { id_usuario, id_hogar: hogar.id_hogar, rol: RolMiembro.MIEMBRO },
    });
    return this.detalle(hogar.id_hogar);
  }

  async actual(id_usuario: number) {
    const membresia = await this.obtenerMembresia(id_usuario);
    return this.detalle(membresia.id_hogar, id_usuario);
  }

  /** Añade directamente a un usuario ya registrado (sin hogar) con el rol elegido. */
  async invitar(id_admin: number, dto: InvitarMiembroDto) {
    const admin = await this.exigirAdministrador(id_admin);
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!usuario) {
      throw new NotFoundException(
        'No existe una cuenta con ese email. Comparte el código de invitación para que se registre.',
      );
    }
    const yaMiembro = await this.prisma.miembroHogar.findFirst({ where: { id_usuario: usuario.id_usuario } });
    if (yaMiembro) {
      throw new ConflictException(
        yaMiembro.id_hogar === admin.id_hogar
          ? 'Ese usuario ya es miembro de tu hogar'
          : 'Ese usuario ya pertenece a otro hogar',
      );
    }
    await this.prisma.miembroHogar.create({
      data: { id_usuario: usuario.id_usuario, id_hogar: admin.id_hogar, rol: dto.rol ?? RolMiembro.MIEMBRO },
    });
    return this.detalle(admin.id_hogar, id_admin);
  }

  async regenerarCodigo(id_admin: number) {
    const admin = await this.exigirAdministrador(id_admin);
    await this.prisma.hogar.update({
      where: { id_hogar: admin.id_hogar },
      data: { codigo_invitacion: await this.generarCodigoUnico() },
    });
    return this.detalle(admin.id_hogar, id_admin);
  }

  async cambiarRol(id_admin: number, id_miembro: number, dto: CambiarRolDto) {
    const admin = await this.exigirAdministrador(id_admin);
    const objetivo = await this.miembroDelHogar(id_miembro, admin.id_hogar);
    if (objetivo.rol === RolMiembro.ADMINISTRADOR && dto.rol === RolMiembro.MIEMBRO) {
      await this.asegurarOtroAdministrador(admin.id_hogar, objetivo.id_miembro);
    }
    await this.prisma.miembroHogar.update({ where: { id_miembro }, data: { rol: dto.rol } });
    return this.detalle(admin.id_hogar, id_admin);
  }

  async eliminarMiembro(id_admin: number, id_miembro: number) {
    const admin = await this.exigirAdministrador(id_admin);
    const objetivo = await this.miembroDelHogar(id_miembro, admin.id_hogar);
    if (objetivo.rol === RolMiembro.ADMINISTRADOR) {
      await this.asegurarOtroAdministrador(admin.id_hogar, objetivo.id_miembro);
    }
    await this.prisma.miembroHogar.delete({ where: { id_miembro } });
    return this.detalle(admin.id_hogar, id_admin);
  }

  /** El usuario abandona su hogar actual. Si era el último miembro, el hogar se elimina. */
  async salir(id_usuario: number) {
    const m = await this.obtenerMembresia(id_usuario);
    const total = await this.prisma.miembroHogar.count({ where: { id_hogar: m.id_hogar } });
    if (total === 1) {
      await this.prisma.hogar.delete({ where: { id_hogar: m.id_hogar } });
      return { ok: true, hogarEliminado: true };
    }
    if (m.rol === RolMiembro.ADMINISTRADOR) {
      await this.asegurarOtroAdministrador(m.id_hogar, m.id_miembro);
    }
    await this.prisma.tarea.updateMany({
      where: { id_hogar: m.id_hogar, id_asignado: id_usuario, estado: 'PENDIENTE' },
      data: { id_asignado: null },
    });
    await this.prisma.miembroHogar.delete({ where: { id_miembro: m.id_miembro } });
    return { ok: true, hogarEliminado: false };
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
      where: { id_hogar, estado: 'PENDIENTE' },
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

  private async asegurarSinHogar(id_usuario: number) {
    const m = await this.prisma.miembroHogar.findFirst({ where: { id_usuario } });
    if (m) throw new ConflictException('Ya perteneces a un núcleo familiar activo');
  }

  private async miembroDelHogar(id_miembro: number, id_hogar: number) {
    const m = await this.prisma.miembroHogar.findUnique({ where: { id_miembro } });
    if (!m || m.id_hogar !== id_hogar) throw new NotFoundException('Miembro no encontrado en tu hogar');
    return m;
  }

  private async asegurarOtroAdministrador(id_hogar: number, excluir_id_miembro: number) {
    const otros = await this.prisma.miembroHogar.count({
      where: { id_hogar, rol: RolMiembro.ADMINISTRADOR, NOT: { id_miembro: excluir_id_miembro } },
    });
    if (otros === 0) {
      throw new BadRequestException('El hogar debe conservar al menos un Administrador');
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
