import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoValidacion, Prisma, RolMiembro, TipoCategoria, TipoHogar } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HogaresService } from '../hogares/hogares.service';
import {
  ActualizarItemDto,
  CrearCategoriaDto,
  CrearItemDto,
  FiltroCategoriasDto,
  FiltroItemsDto,
} from './dto/compra.dto';

const INCLUDE_ITEM = {
  categoria: true,
  creador: { select: { id_usuario: true, nombre: true } },
  comprador: { select: { id_usuario: true, nombre: true } },
} satisfies Prisma.ItemCompraInclude;

@Injectable()
export class ComprasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hogares: HogaresService,
  ) {}

  // ───────────── Categorías ─────────────

  listarCategorias(filtro: FiltroCategoriasDto) {
    return this.prisma.categoria.findMany({
      where: filtro.tipo ? { tipo: filtro.tipo } : undefined,
      orderBy: { id_categoria: 'asc' },
    });
  }

  async crearCategoria(dto: CrearCategoriaDto) {
    const nombre = dto.nombre.trim();
    const existente = await this.prisma.categoria.findFirst({
      where: { tipo: dto.tipo, nombre: { equals: nombre, mode: 'insensitive' } },
    });
    return existente ?? this.prisma.categoria.create({ data: { nombre, tipo: dto.tipo } });
  }

  // ───────────── Ítems de compra ─────────────

  async listar(id_usuario: number, filtro: FiltroItemsDto, id_hogar_preferido?: number) {
    const { id_hogar } = await this.hogares.obtenerMembresia(id_usuario, id_hogar_preferido);
    return this.prisma.itemCompra.findMany({
      where: {
        id_hogar,
        ...(filtro.id_categoria !== undefined && { id_categoria: filtro.id_categoria }),
        ...(filtro.comprado !== undefined && { comprado: filtro.comprado }),
      },
      include: INCLUDE_ITEM,
      orderBy: [{ comprado: 'asc' }, { fecha_creacion: 'desc' }],
    });
  }

  async crear(id_usuario: number, dto: CrearItemDto, id_hogar_preferido?: number) {
    const membresia = await this.hogares.obtenerMembresia(id_usuario, id_hogar_preferido);
    await this.validarCategoria(dto.id_categoria);

    const requiereValidacion =
      membresia.hogar.tipo_hogar === TipoHogar.JEFE_DE_HOGAR &&
      membresia.rol !== RolMiembro.ADMINISTRADOR &&
      !membresia.puede_gestionar_compras;

    return this.prisma.itemCompra.create({
      data: {
        id_hogar: membresia.id_hogar,
        id_creador: id_usuario,
        nombre: dto.nombre.trim(),
        cantidad: dto.cantidad?.trim() || '1',
        id_categoria: dto.id_categoria ?? null,
        estado_validacion: requiereValidacion
          ? EstadoValidacion.PENDIENTE_APROBACION
          : EstadoValidacion.APROBADO,
      },
      include: INCLUDE_ITEM,
    });
  }

  async actualizar(id_usuario: number, id_item: number, dto: ActualizarItemDto, id_hogar_preferido?: number) {
    const { membresia, item } = await this.buscarConMembresia(id_usuario, id_item, id_hogar_preferido);
    const puedeGestionar =
      membresia.hogar.tipo_hogar === TipoHogar.COLABORATIVO ||
      membresia.rol === RolMiembro.ADMINISTRADOR ||
      membresia.puede_gestionar_compras ||
      (item.id_creador === id_usuario && item.estado_validacion === EstadoValidacion.PENDIENTE_APROBACION);

    if (!puedeGestionar) {
      throw new ForbiddenException('Solo el Jefe de Hogar puede editar productos aprobados');
    }

    await this.validarCategoria(dto.id_categoria);
    return this.prisma.itemCompra.update({
      where: { id_item },
      data: { nombre: dto.nombre?.trim(), cantidad: dto.cantidad?.trim(), id_categoria: dto.id_categoria },
      include: INCLUDE_ITEM,
    });
  }

  /**
   * Alterna el estado comprado/no comprado:
   * - En COLABORATIVO o si es Jefe de Hogar / tiene permiso: marca como comprado directamente.
   * - En JEFE_DE_HOGAR siendo MIEMBRO sin permiso:
   *   marca COMPRA_POR_VALIDAR para que el Jefe de Hogar confirme la compra.
   */
  async alternar(id_usuario: number, id_item: number, id_hogar_preferido?: number) {
    const { membresia, item } = await this.buscarConMembresia(id_usuario, id_item, id_hogar_preferido);
    const puedeGestionar =
      membresia.hogar.tipo_hogar === TipoHogar.COLABORATIVO ||
      membresia.rol === RolMiembro.ADMINISTRADOR ||
      membresia.puede_gestionar_compras;

    if (!puedeGestionar) {
      if (item.estado_validacion === EstadoValidacion.PENDIENTE_APROBACION) {
        throw new ForbiddenException('El Jefe de Hogar debe aprobar primero este producto en la lista');
      }
      if (item.comprado) {
        throw new ForbiddenException('Solo el Jefe de Hogar puede desmarcar compras ya validadas');
      }
      if (item.estado_validacion === EstadoValidacion.COMPRA_POR_VALIDAR) {
        if (item.id_comprador === id_usuario) {
          return this.prisma.itemCompra.update({
            where: { id_item },
            data: { estado_validacion: EstadoValidacion.APROBADO, id_comprador: null },
            include: INCLUDE_ITEM,
          });
        }
        throw new ForbiddenException('Esta compra ya está esperando validación del Jefe de Hogar');
      }
      return this.prisma.itemCompra.update({
        where: { id_item },
        data: {
          estado_validacion: EstadoValidacion.COMPRA_POR_VALIDAR,
          id_comprador: id_usuario,
        },
        include: INCLUDE_ITEM,
      });
    }

    // Jefe de Hogar o modo Colaborativo:
    if (item.estado_validacion === EstadoValidacion.PENDIENTE_APROBACION) {
      return this.prisma.itemCompra.update({
        where: { id_item },
        data: { estado_validacion: EstadoValidacion.APROBADO },
        include: INCLUDE_ITEM,
      });
    }

    if (item.estado_validacion === EstadoValidacion.COMPRA_POR_VALIDAR) {
      return this.prisma.itemCompra.update({
        where: { id_item },
        data: {
          comprado: true,
          estado_validacion: EstadoValidacion.APROBADO,
          id_comprador: item.id_comprador ?? id_usuario,
          fecha_compra: new Date(),
        },
        include: INCLUDE_ITEM,
      });
    }

    const comprado = !item.comprado;
    return this.prisma.itemCompra.update({
      where: { id_item },
      data: {
        comprado,
        estado_validacion: EstadoValidacion.APROBADO,
        id_comprador: comprado ? id_usuario : null,
        fecha_compra: comprado ? new Date() : null,
      },
      include: INCLUDE_ITEM,
    });
  }

  /** Aprueba la solicitud de un producto (PENDIENTE_APROBACION) o valida su compra (COMPRA_POR_VALIDAR). */
  async validar(id_usuario: number, id_item: number, id_hogar_preferido?: number) {
    const { membresia, item } = await this.buscarConMembresia(id_usuario, id_item, id_hogar_preferido);
    if (
      membresia.rol !== RolMiembro.ADMINISTRADOR &&
      membresia.hogar.tipo_hogar !== TipoHogar.COLABORATIVO &&
      !membresia.puede_gestionar_compras
    ) {
      throw new ForbiddenException('Solo el Jefe de Hogar puede validar ítems de compra');
    }

    if (item.estado_validacion === EstadoValidacion.PENDIENTE_APROBACION) {
      return this.prisma.itemCompra.update({
        where: { id_item },
        data: { estado_validacion: EstadoValidacion.APROBADO },
        include: INCLUDE_ITEM,
      });
    }

    return this.prisma.itemCompra.update({
      where: { id_item },
      data: {
        comprado: true,
        estado_validacion: EstadoValidacion.APROBADO,
        id_comprador: item.id_comprador ?? id_usuario,
        fecha_compra: new Date(),
      },
      include: INCLUDE_ITEM,
    });
  }

  /** Rechaza una solicitud de producto (la elimina) o devuelve una compra por validar a pendiente. */
  async rechazar(id_usuario: number, id_item: number, id_hogar_preferido?: number) {
    const { membresia, item } = await this.buscarConMembresia(id_usuario, id_item, id_hogar_preferido);
    const esJefe = membresia.rol === RolMiembro.ADMINISTRADOR || membresia.puede_gestionar_compras;
    const esAutor =
      (item.estado_validacion === EstadoValidacion.PENDIENTE_APROBACION && item.id_creador === id_usuario) ||
      (item.estado_validacion === EstadoValidacion.COMPRA_POR_VALIDAR && item.id_comprador === id_usuario);

    if (!esJefe && !esAutor) {
      throw new ForbiddenException('Solo el Jefe de Hogar puede rechazar esta acción');
    }

    if (item.estado_validacion === EstadoValidacion.PENDIENTE_APROBACION) {
      await this.prisma.itemCompra.delete({ where: { id_item } });
      return { ok: true, eliminado: true, id_item };
    }

    return this.prisma.itemCompra.update({
      where: { id_item },
      data: {
        comprado: false,
        estado_validacion: EstadoValidacion.APROBADO,
        id_comprador: null,
        fecha_compra: null,
      },
      include: INCLUDE_ITEM,
    });
  }

  async eliminar(id_usuario: number, id_item: number, id_hogar_preferido?: number) {
    const { membresia, item } = await this.buscarConMembresia(id_usuario, id_item, id_hogar_preferido);
    const puedeEliminar =
      membresia.hogar.tipo_hogar === TipoHogar.COLABORATIVO ||
      membresia.rol === RolMiembro.ADMINISTRADOR ||
      membresia.puede_gestionar_compras ||
      (item.id_creador === id_usuario && item.estado_validacion === EstadoValidacion.PENDIENTE_APROBACION);

    if (!puedeEliminar) {
      throw new ForbiddenException('Solo el Jefe de Hogar puede eliminar productos de la lista');
    }

    await this.prisma.itemCompra.delete({ where: { id_item } });
    return { ok: true };
  }

  async limpiarComprados(id_usuario: number, id_hogar_preferido?: number) {
    const membresia = await this.hogares.obtenerMembresia(id_usuario, id_hogar_preferido);
    const puedeLimpiar =
      membresia.hogar.tipo_hogar === TipoHogar.COLABORATIVO ||
      membresia.rol === RolMiembro.ADMINISTRADOR ||
      membresia.puede_gestionar_compras;

    if (!puedeLimpiar) {
      throw new ForbiddenException('Solo el Jefe de Hogar puede limpiar los productos comprados');
    }

    const { count } = await this.prisma.itemCompra.deleteMany({
      where: { id_hogar: membresia.id_hogar, comprado: true },
    });
    return { ok: true, eliminados: count };
  }

  // ───────────── Privados ─────────────

  private async buscarConMembresia(id_usuario: number, id_item: number, id_hogar_preferido?: number) {
    const membresia = await this.hogares.obtenerMembresia(id_usuario, id_hogar_preferido);
    const item = await this.prisma.itemCompra.findUnique({ where: { id_item } });
    if (!item || item.id_hogar !== membresia.id_hogar) throw new NotFoundException('Producto no encontrado');
    return { membresia, item };
  }

  private async validarCategoria(id_categoria?: number | null) {
    if (!id_categoria) return;
    const cat = await this.prisma.categoria.findUnique({ where: { id_categoria } });
    if (!cat || cat.tipo !== TipoCategoria.COMPRA) {
      throw new BadRequestException('Categoría de compra inválida');
    }
  }
}
