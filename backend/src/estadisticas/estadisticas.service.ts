import { Injectable } from '@nestjs/common';
import { EstadoTarea } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HogaresService } from '../hogares/hogares.service';
import { PESO_DISPONIBILIDAD } from '../common/constantes';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Margen (en puntos porcentuales) bajo el cual la carga se considera equilibrada. */
const TOLERANCIA_BALANCE = 10;

@Injectable()
export class EstadisticasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hogares: HogaresService,
  ) {}

  /**
   * Participación por miembro, ponderada por disponibilidad.
   * porcentaje_esperado = peso(disponibilidad) / Σ pesos  (ALTA=3, MEDIA=2, BAJA=1)
   * porcentaje_real     = puntos del miembro / Σ puntos del hogar
   */
  async participacion(id_usuario: number) {
    const { id_hogar } = await this.hogares.obtenerMembresia(id_usuario);
    const miembros = await this.prisma.miembroHogar.findMany({
      where: { id_hogar },
      include: { usuario: { select: { id_usuario: true, nombre: true, avatar_url: true, disponibilidad: true, descripcion_carga: true } } },
    });
    const conteo = await this.prisma.tarea.groupBy({
      by: ['id_asignado', 'estado'],
      where: { id_hogar },
      _count: { _all: true },
    });
    const sinAsignar = conteo
      .filter((c) => c.id_asignado === null && c.estado === EstadoTarea.PENDIENTE)
      .reduce((acc, c) => acc + c._count._all, 0);

    const totalPuntos = miembros.reduce((acc, m) => acc + m.puntos_acumulados, 0);
    const totalPeso = miembros.reduce((acc, m) => acc + PESO_DISPONIBILIDAD[m.usuario.disponibilidad], 0) || 1;

    const detalle = miembros
      .map((m) => {
        const completadas = conteo.find((c) => c.id_asignado === m.id_usuario && c.estado === EstadoTarea.COMPLETADA)?._count._all ?? 0;
        const pendientes = conteo.find((c) => c.id_asignado === m.id_usuario && c.estado === EstadoTarea.PENDIENTE)?._count._all ?? 0;
        const porcentaje_esperado = Math.round((PESO_DISPONIBILIDAD[m.usuario.disponibilidad] / totalPeso) * 100);
        const porcentaje_real = totalPuntos ? Math.round((m.puntos_acumulados / totalPuntos) * 100) : 0;
        const diferencia = porcentaje_real - porcentaje_esperado;
        return {
          id_miembro: m.id_miembro,
          id_usuario: m.id_usuario,
          nombre: m.usuario.nombre,
          avatar_url: m.usuario.avatar_url,
          rol: m.rol,
          disponibilidad: m.usuario.disponibilidad,
          descripcion_carga: m.usuario.descripcion_carga,
          puntos: m.puntos_acumulados,
          completadas,
          pendientes,
          porcentaje_real,
          porcentaje_esperado,
          balance:
            totalPuntos === 0 || Math.abs(diferencia) <= TOLERANCIA_BALANCE
              ? 'EQUILIBRADO'
              : diferencia > 0
                ? 'SOBRECARGADO'
                : 'BAJO',
        };
      })
      .sort((a, b) => b.puntos - a.puntos);

    return {
      total_puntos: totalPuntos,
      total_completadas: detalle.reduce((acc, d) => acc + d.completadas, 0),
      total_pendientes: detalle.reduce((acc, d) => acc + d.pendientes, 0) + sinAsignar,
      sin_asignar: sinAsignar,
      miembros: detalle,
    };
  }

  /**
   * Serie diaria para el gráfico del Diario Mural.
   * @param dias cantidad de días hacia atrás (incluye hoy)
   * @param tzOffset valor de Date#getTimezoneOffset() del cliente (minutos), para agrupar por día local
   */
  async progreso(id_usuario: number, dias: number, tzOffset: number) {
    const { id_hogar } = await this.hogares.obtenerMembresia(id_usuario);
    const offsetMs = tzOffset * 60_000;
    const claveDia = (d: Date) => new Date(d.getTime() - offsetMs).toISOString().slice(0, 10);

    const hoyLocal = new Date(Date.now() - offsetMs);
    hoyLocal.setUTCHours(0, 0, 0, 0);
    const inicioLocal = new Date(hoyLocal.getTime() - (dias - 1) * 86_400_000);
    const finLocal = new Date(hoyLocal.getTime() + 86_400_000);
    const inicio = new Date(inicioLocal.getTime() + offsetMs);
    const fin = new Date(finLocal.getTime() + offsetMs);

    const [programadas, completadas] = await Promise.all([
      this.prisma.tarea.findMany({
        where: { id_hogar, fecha_limite: { gte: inicio, lt: fin } },
        select: { fecha_limite: true },
      }),
      this.prisma.tarea.findMany({
        where: { id_hogar, estado: EstadoTarea.COMPLETADA, fecha_completada: { gte: inicio, lt: fin } },
        select: { fecha_completada: true, puntos: true },
      }),
    ]);

    const serie = Array.from({ length: dias }, (_, i) => {
      const d = new Date(inicioLocal.getTime() + i * 86_400_000);
      return { fecha: d.toISOString().slice(0, 10), etiqueta: DIAS_SEMANA[d.getUTCDay()], programadas: 0, completadas: 0, puntos: 0 };
    });
    const indice = new Map(serie.map((s, i) => [s.fecha, i]));

    for (const t of programadas) {
      const i = indice.get(claveDia(t.fecha_limite!));
      if (i !== undefined) serie[i].programadas++;
    }
    for (const t of completadas) {
      const i = indice.get(claveDia(t.fecha_completada!));
      if (i !== undefined) {
        serie[i].completadas++;
        serie[i].puntos += t.puntos;
      }
    }
    return serie;
  }
}
