import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoCategoria } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HogaresService } from '../hogares/hogares.service';
import { ActualizarItemDto, CrearCategoriaDto, CrearItemDto, FiltroCategoriasDto, FiltroItemsDto } from './dto/compra.dto';

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

  async listar(id_usuario: number, filtro: FiltroItemsDto) {
    const { id_hogar } = await this.hogares.obtenerMembresia(id_usuario);
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

  async crear(id_usuario: number, dto: CrearItemDto) {
    const { id_hogar } = await this.hogares.obtenerMembresia(id_usuario);
    await this.validarCategoria(dto.id_categoria);
    return this.prisma.itemCompra.create({
      data: {
        id_hogar,
        id_creador: id_usuario,
        nombre: dto.nombre.trim(),
        cantidad: dto.cantidad?.trim() || '1',
        id_categoria: dto.id_categoria ?? null,
      },
      include: INCLUDE_ITEM,
    });
  }

  async actualizar(id_usuario: number, id_item: number, dto: ActualizarItemDto) {
    await this.buscar(id_usuario, id_item);
    await this.validarCategoria(dto.id_categoria);
    return this.prisma.itemCompra.update({
      where: { id_item },
      data: { nombre: dto.nombre?.trim(), cantidad: dto.cantidad?.trim(), id_categoria: dto.id_categoria },
      include: INCLUDE_ITEM,
    });
  }

  /** Alterna el estado comprado/no comprado registrando quién lo compró. */
  async alternar(id_usuario: number, id_item: number) {
    const item = await this.buscar(id_usuario, id_item);
    const comprado = !item.comprado;
    return this.prisma.itemCompra.update({
      where: { id_item },
      data: {
        comprado,
        id_comprador: comprado ? id_usuario : null,
        fecha_compra: comprado ? new Date() : null,
      },
      include: INCLUDE_ITEM,
    });
  }

  async eliminar(id_usuario: number, id_item: number) {
    await this.buscar(id_usuario, id_item);
    await this.prisma.itemCompra.delete({ where: { id_item } });
    return { ok: true };
  }

  async limpiarComprados(id_usuario: number) {
    const { id_hogar } = await this.hogares.obtenerMembresia(id_usuario);
    const { count } = await this.prisma.itemCompra.deleteMany({ where: { id_hogar, comprado: true } });
    return { ok: true, eliminados: count };
  }

  // ───────────── Privados ─────────────

  private async buscar(id_usuario: number, id_item: number) {
    const { id_hogar } = await this.hogares.obtenerMembresia(id_usuario);
    const item = await this.prisma.itemCompra.findUnique({ where: { id_item } });
    if (!item || item.id_hogar !== id_hogar) throw new NotFoundException('Producto no encontrado');
    return item;
  }

  private async validarCategoria(id_categoria?: number | null) {
    if (!id_categoria) return;
    const cat = await this.prisma.categoria.findUnique({ where: { id_categoria } });
    if (!cat || cat.tipo !== TipoCategoria.COMPRA) {
      throw new BadRequestException('Categoría de compra inválida');
    }
  }
}
