import { Injectable, NotFoundException } from '@nestjs/common';
import { RegistroSuministro, TipoSuministro } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HogaresService } from '../hogares/hogares.service';
import { CrearSuministroDto } from './dto/suministro.dto';

export type NivelAlertaSuministro = 'NORMAL' | 'ADVERTENCIA_2_SEMANAS' | 'CRITICO_3_SEMANAS';

@Injectable()
export class SuministrosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hogares: HogaresService,
  ) {}

  private enriquecer(item: RegistroSuministro & { comprador?: { id_usuario: number; nombre: string } }) {
    const msTranscurridos = Math.max(0, Date.now() - new Date(item.fecha_compra).getTime());
    const dias_transcurridos = Math.floor(msTranscurridos / 86_400_000);
    const semanas_transcurridas = Number((dias_transcurridos / 7).toFixed(1));

    let nivel_alerta: NivelAlertaSuministro = 'NORMAL';
    if (dias_transcurridos >= item.dias_alerta_critica) {
      nivel_alerta = 'CRITICO_3_SEMANAS';
    } else if (dias_transcurridos >= item.dias_alerta_inicial) {
      nivel_alerta = 'ADVERTENCIA_2_SEMANAS';
    }

    return {
      ...item,
      dias_transcurridos,
      semanas_transcurridas,
      nivel_alerta,
    };
  }

  async listar(id_usuario: number, id_hogar_objetivo?: number) {
    const membresia = await this.hogares.obtenerMembresia(id_usuario, id_hogar_objetivo);
    const id_hogar = membresia.id_hogar;

    const registros = await this.prisma.registroSuministro.findMany({
      where: { id_hogar },
      include: {
        comprador: { select: { id_usuario: true, nombre: true, identificador_unico: true } },
      },
      orderBy: [{ fecha_compra: 'desc' }, { id_suministro: 'desc' }],
    });

    const todosGas = registros
      .filter((r) => r.tipo === TipoSuministro.GAS)
      .map((r) => this.enriquecer(r));

    const gas_activo = todosGas.find((g) => g.activo) ?? todosGas[0] ?? null;
    const historial_gas = todosGas.filter((g) => g.id_suministro !== gas_activo?.id_suministro);

    // Calcular promedio de duración en días entre compras de gas consecutivas
    let promedio_duracion_dias: number | null = null;
    if (todosGas.length >= 2) {
      const ordenados = [...todosGas].sort(
        (a, b) => new Date(a.fecha_compra).getTime() - new Date(b.fecha_compra).getTime(),
      );
      let sumaDias = 0;
      for (let i = 1; i < ordenados.length; i++) {
        const diff =
          (new Date(ordenados[i].fecha_compra).getTime() -
            new Date(ordenados[i - 1].fecha_compra).getTime()) /
          86_400_000;
        sumaDias += Math.max(1, Math.round(diff));
      }
      promedio_duracion_dias = Math.round(sumaDias / (ordenados.length - 1));
    }

    const despensa = registros
      .filter((r) => r.tipo === TipoSuministro.DESPENSA && r.activo)
      .map((r) => this.enriquecer(r))
      .sort((a, b) => b.dias_transcurridos - a.dias_transcurridos);

    return {
      gas_activo,
      historial_gas,
      promedio_duracion_dias,
      despensa,
    };
  }

  async crear(id_usuario: number, dto: CrearSuministroDto, id_hogar_objetivo?: number) {
    const membresia = await this.hogares.obtenerMembresia(id_usuario, id_hogar_objetivo);
    const id_hogar = membresia.id_hogar;
    const tipo = dto.tipo ?? TipoSuministro.DESPENSA;
    const fecha_compra = dto.fecha_compra ? new Date(dto.fecha_compra) : new Date();

    if (tipo === TipoSuministro.GAS) {
      // Si es GAS, marcar registros anteriores de GAS de este hogar como activo = false (pasan al historial)
      await this.prisma.registroSuministro.updateMany({
        where: { id_hogar, tipo: TipoSuministro.GAS, activo: true },
        data: { activo: false },
      });
    }

    const diasInicial = dto.dias_alerta_inicial ?? 14;
    const diasCritica = dto.dias_alerta_critica ?? Math.max(21, diasInicial + 7);

    const creado = await this.prisma.registroSuministro.create({
      data: {
        id_hogar,
        id_comprador: id_usuario,
        tipo,
        nombre: dto.nombre.trim(),
        fecha_compra,
        dias_alerta_inicial: diasInicial,
        dias_alerta_critica: diasCritica,
        activo: true,
        notas: dto.notas?.trim() || null,
      },
      include: {
        comprador: { select: { id_usuario: true, nombre: true, identificador_unico: true } },
      },
    });

    return this.enriquecer(creado);
  }

  async eliminar(id_usuario: number, id_suministro: number, id_hogar_objetivo?: number) {
    const membresia = await this.hogares.obtenerMembresia(id_usuario, id_hogar_objetivo);
    const existente = await this.prisma.registroSuministro.findUnique({
      where: { id_suministro },
    });
    if (!existente || existente.id_hogar !== membresia.id_hogar) {
      throw new NotFoundException('Suministro no encontrado en este hogar');
    }

    await this.prisma.registroSuministro.delete({ where: { id_suministro } });
    return { ok: true };
  }
}
