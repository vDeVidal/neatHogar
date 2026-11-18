/**
 * Seed de NeatHogar (Incremento v2).
 * - Pobla las categorías base (idempotente).
 * - Crea hogares demo con ambos tipos (COLABORATIVO y JEFE_DE_HOGAR).
 * - Pobla suministros iniciales (Monitor Exclusivo de Gas con historial + Despensa).
 *
 * Cuentas demo (PIN para todos: "1234", contraseña email: "neathogar123"):
 *   - Nombre: "Benjamín Vidal" | ID: "@benjamin.vidal" | PIN: 1234
 *   - Nombre: "Camila Moya"    | ID: "@camila.moya"    | PIN: 1234
 *   - Nombre: "Diego Letelier" | ID: "@diego.letelier" | PIN: 1234
 *   - Nombre: "Sofía Vidal"    | ID: "@sofia.vidal"    | PIN: 1234
 * Códigos de invitación demo: DEMO01 (Colaborativo), FAMI01 (Jefe de Hogar)
 */
import {
  PrismaClient,
  TipoCategoria,
  TipoHogar,
  TipoSuministro,
  NivelDisponibilidad,
  RolMiembro,
  EstadoTarea,
  EstadoValidacion,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CATEGORIAS: { nombre: string; tipo: TipoCategoria }[] = [
  { nombre: 'Supermercado', tipo: TipoCategoria.COMPRA },
  { nombre: 'Ferretería', tipo: TipoCategoria.COMPRA },
  { nombre: 'Farmacia', tipo: TipoCategoria.COMPRA },
  { nombre: 'Limpieza', tipo: TipoCategoria.TAREA },
  { nombre: 'Cocina', tipo: TipoCategoria.TAREA },
  { nombre: 'Lavandería', tipo: TipoCategoria.TAREA },
  { nombre: 'Mantención', tipo: TipoCategoria.TAREA },
  { nombre: 'Mascotas', tipo: TipoCategoria.TAREA },
];

function normalizarNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function diasDesdeHoy(dias: number, hora = 18): Date {
  const d = new Date();
  d.setHours(hora, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  return d;
}

async function seedCategorias() {
  const resultado: Record<string, number> = {};
  for (const c of CATEGORIAS) {
    const existente = await prisma.categoria.findFirst({ where: { nombre: c.nombre, tipo: c.tipo } });
    const cat = existente ?? (await prisma.categoria.create({ data: c }));
    resultado[`${c.tipo}:${c.nombre}`] = cat.id_categoria;
  }
  return resultado;
}

async function seedSuministrosSiVacio(id_hogar: number, id_comprador: number) {
  const total = await prisma.registroSuministro.count({ where: { id_hogar } });
  if (total > 0) return;

  await prisma.registroSuministro.createMany({
    data: [
      {
        id_hogar,
        id_comprador,
        tipo: TipoSuministro.GAS,
        nombre: 'Balón de Gas 15kg (Recarga anterior)',
        fecha_compra: diasDesdeHoy(-41),
        dias_alerta_inicial: 14,
        dias_alerta_critica: 21,
        activo: false,
        notas: 'Duró 25 días aproximadamente',
      },
      {
        id_hogar,
        id_comprador,
        tipo: TipoSuministro.GAS,
        nombre: 'Balón de Gas 15kg',
        fecha_compra: diasDesdeHoy(-16), // 16 días atrás -> activa alerta preventiva de 2 semanas (14 días)
        dias_alerta_inicial: 14,
        dias_alerta_critica: 21,
        activo: true,
        notas: 'Cilindro principal cocina / calefont',
      },
      {
        id_hogar,
        id_comprador,
        tipo: TipoSuministro.DESPENSA,
        nombre: 'Detergente Líquido 3L',
        fecha_compra: diasDesdeHoy(-18),
        dias_alerta_inicial: 15,
        dias_alerta_critica: 25,
        activo: true,
        notas: 'Revisar nivel en lavandería',
      },
      {
        id_hogar,
        id_comprador,
        tipo: TipoSuministro.DESPENSA,
        nombre: 'Aceite Vegetal 1L',
        fecha_compra: diasDesdeHoy(-5),
        dias_alerta_inicial: 14,
        dias_alerta_critica: 21,
        activo: true,
      },
      {
        id_hogar,
        id_comprador,
        tipo: TipoSuministro.DESPENSA,
        nombre: 'Arroz Grado 1 (5kg)',
        fecha_compra: diasDesdeHoy(-12),
        dias_alerta_inicial: 20,
        dias_alerta_critica: 30,
        activo: true,
      },
    ],
  });
}

async function seedHogaresDemo(cat: Record<string, number>) {
  const password_hash = await bcrypt.hash('neathogar123', 10);
  const pin_hash = await bcrypt.hash('1234', 10);

  const usuariosData = [
    {
      nombre: 'Benjamín Vidal',
      identificador_unico: '@benjamin.vidal',
      email: 'admin@neathogar.cl',
      disponibilidad: NivelDisponibilidad.MEDIA,
      descripcion_carga: 'Estudiante',
    },
    {
      nombre: 'Camila Moya',
      identificador_unico: '@camila.moya',
      email: 'camila@neathogar.cl',
      disponibilidad: NivelDisponibilidad.BAJA,
      descripcion_carga: 'Trabajadora tiempo completo',
    },
    {
      nombre: 'Diego Letelier',
      identificador_unico: '@diego.letelier',
      email: 'diego@neathogar.cl',
      disponibilidad: NivelDisponibilidad.ALTA,
      descripcion_carga: 'Estudiante part-time',
    },
    {
      nombre: 'Sofía Vidal',
      identificador_unico: '@sofia.vidal',
      email: 'sofia@neathogar.cl',
      disponibilidad: NivelDisponibilidad.MEDIA,
      descripcion_carga: 'Trabajadora part-time',
    },
  ];

  const usuarios = [];
  for (const u of usuariosData) {
    const nombre_login = normalizarNombre(u.nombre);
    usuarios.push(
      await prisma.usuario.upsert({
        where: { email: u.email },
        update: {
          nombre_login,
          identificador_unico: u.identificador_unico,
          pin_hash,
        },
        create: { ...u, nombre_login, password_hash, pin_hash },
      }),
    );
  }
  const [admin, camila, diego, sofia] = usuarios;

  // 1) Hogar Colaborativo Demo (DEMO01)
  let hogarDemo = await prisma.hogar.findUnique({ where: { codigo_invitacion: 'DEMO01' } });
  if (!hogarDemo) {
    hogarDemo = await prisma.hogar.create({
      data: {
        nombre: 'Casa Demo',
        tipo_hogar: TipoHogar.COLABORATIVO,
        codigo_invitacion: 'DEMO01',
        miembros: {
          create: [
            { id_usuario: admin.id_usuario, rol: RolMiembro.ADMINISTRADOR },
            { id_usuario: camila.id_usuario, rol: RolMiembro.MIEMBRO },
            { id_usuario: diego.id_usuario, rol: RolMiembro.MIEMBRO },
            { id_usuario: sofia.id_usuario, rol: RolMiembro.MIEMBRO },
          ],
        },
      },
    });

    const tareas = [
      { titulo: 'Lavar la loza', asignado: diego, cat: 'Cocina', puntos: 10, dia: -5, completada: true },
      { titulo: 'Aspirar living', asignado: admin, cat: 'Limpieza', puntos: 15, dia: -4, completada: true },
      { titulo: 'Sacar la basura', asignado: camila, cat: 'Limpieza', puntos: 5, dia: -3, completada: true },
      { titulo: 'Lavar ropa blanca', asignado: sofia, cat: 'Lavandería', puntos: 15, dia: -2, completada: true },
      { titulo: 'Cambiar ampolleta pasillo', asignado: diego, cat: 'Mantención', puntos: 20, dia: -1, completada: true },
      { titulo: 'Preparar almuerzo', asignado: admin, cat: 'Cocina', puntos: 20, dia: -1, completada: false },
      { titulo: 'Limpiar baño', asignado: diego, cat: 'Limpieza', puntos: 25, dia: 0, completada: false },
      { titulo: 'Pasear al perro', asignado: camila, cat: 'Mascotas', puntos: 10, dia: 0, completada: true },
      { titulo: 'Doblar ropa', asignado: sofia, cat: 'Lavandería', puntos: 10, dia: 1, completada: false },
      { titulo: 'Regar plantas', asignado: admin, cat: 'Mantención', puntos: 5, dia: 2, completada: false },
      { titulo: 'Limpiar refrigerador', asignado: diego, cat: 'Cocina', puntos: 20, dia: 3, completada: false },
      { titulo: 'Trapear cocina', asignado: null, cat: 'Limpieza', puntos: 15, dia: 4, completada: false },
    ];

    const puntos: Record<number, number> = {};
    for (const t of tareas) {
      const fecha_limite = diasDesdeHoy(t.dia);
      await prisma.tarea.create({
        data: {
          id_hogar: hogarDemo.id_hogar,
          id_creador: admin.id_usuario,
          id_asignado: t.asignado?.id_usuario ?? null,
          id_completador: t.completada ? (t.asignado?.id_usuario ?? admin.id_usuario) : null,
          id_categoria: cat[`TAREA:${t.cat}`],
          titulo: t.titulo,
          descripcion: `Tarea de ${t.cat.toLowerCase()} del hogar.`,
          puntos: t.puntos,
          estado: t.completada ? EstadoTarea.COMPLETADA : EstadoTarea.PENDIENTE,
          fecha_limite,
          fecha_completada: t.completada ? fecha_limite : null,
        },
      });
      if (t.completada && t.asignado) {
        puntos[t.asignado.id_usuario] = (puntos[t.asignado.id_usuario] ?? 0) + t.puntos;
      }
    }
    for (const [id_usuario, pts] of Object.entries(puntos)) {
      await prisma.miembroHogar.update({
        where: { id_usuario_id_hogar: { id_usuario: Number(id_usuario), id_hogar: hogarDemo.id_hogar } },
        data: { puntos_acumulados: pts },
      });
    }

    const items = [
      { nombre: 'Leche', cantidad: '2 L', cat: 'Supermercado', comprado: false },
      { nombre: 'Pan', cantidad: '1 kg', cat: 'Supermercado', comprado: true },
      { nombre: 'Huevos', cantidad: '12', cat: 'Supermercado', comprado: false },
      { nombre: 'Detergente', cantidad: '1', cat: 'Supermercado', comprado: false },
      { nombre: 'Tornillos 1/2"', cantidad: '20', cat: 'Ferretería', comprado: false },
      { nombre: 'Ampolletas LED', cantidad: '3', cat: 'Ferretería', comprado: true },
      { nombre: 'Paracetamol', cantidad: '1 caja', cat: 'Farmacia', comprado: false },
      { nombre: 'Alcohol gel', cantidad: '2', cat: 'Farmacia', comprado: false },
    ];
    for (const i of items) {
      await prisma.itemCompra.create({
        data: {
          id_hogar: hogarDemo.id_hogar,
          id_creador: camila.id_usuario,
          id_comprador: i.comprado ? diego.id_usuario : null,
          id_categoria: cat[`COMPRA:${i.cat}`],
          nombre: i.nombre,
          cantidad: i.cantidad,
          comprado: i.comprado,
          fecha_compra: i.comprado ? new Date() : null,
        },
      });
    }

    const gastos = [
      { concepto: 'Compras Supermercado', monto: 85990, quien: camila },
      { concepto: 'Arriendo', monto: 450000, quien: admin },
      { concepto: 'Gastos Comunes', monto: 62000, quien: admin },
      { concepto: 'Luz', monto: 32450, quien: sofia },
      { concepto: 'Agua', monto: 18900, quien: diego },
    ];
    for (const g of gastos) {
      await prisma.gasto.create({
        data: { id_hogar: hogarDemo.id_hogar, id_registrador: g.quien.id_usuario, concepto: g.concepto, monto: g.monto },
      });
    }

    console.log('✅ Hogar demo colaborativo "Casa Demo" creado (código DEMO01).');
  }
  await seedSuministrosSiVacio(hogarDemo.id_hogar, admin.id_usuario);

  // 2) Hogar Con Jefe de Hogar Demo (FAMI01)
  let familia = await prisma.hogar.findUnique({ where: { codigo_invitacion: 'FAMI01' } });
  if (!familia) {
    familia = await prisma.hogar.create({
      data: {
        nombre: 'Familia Vidal',
        tipo_hogar: TipoHogar.JEFE_DE_HOGAR,
        codigo_invitacion: 'FAMI01',
        miembros: {
          create: [
            {
              id_usuario: admin.id_usuario,
              rol: RolMiembro.ADMINISTRADOR,
              puede_validar_tareas: true,
              puede_crear_tareas: true,
              puede_gestionar_compras: true,
            },
            {
              id_usuario: diego.id_usuario,
              rol: RolMiembro.MIEMBRO,
              puede_validar_tareas: false,
              puede_crear_tareas: false,
              puede_gestionar_compras: false,
            },
            {
              id_usuario: sofia.id_usuario,
              rol: RolMiembro.MIEMBRO,
              puede_validar_tareas: false,
              puede_crear_tareas: false,
              puede_gestionar_compras: false,
            },
          ],
        },
      },
    });

    await prisma.tarea.createMany({
      data: [
        {
          id_hogar: familia.id_hogar,
          id_creador: admin.id_usuario,
          id_asignado: diego.id_usuario,
          id_completador: diego.id_usuario,
          id_categoria: cat['TAREA:Limpieza'],
          titulo: 'Ordenar dormitorio',
          descripcion: 'Hacer la cama y guardar la ropa.',
          puntos: 15,
          estado: EstadoTarea.EN_REVISION,
          fecha_completada: new Date(),
          fecha_limite: diasDesdeHoy(0),
        },
        {
          id_hogar: familia.id_hogar,
          id_creador: admin.id_usuario,
          id_asignado: sofia.id_usuario,
          id_categoria: cat['TAREA:Mascotas'],
          titulo: 'Dar comida a la mascota',
          descripcion: 'Servir alimento y cambiar el agua.',
          puntos: 10,
          estado: EstadoTarea.PENDIENTE,
          fecha_limite: diasDesdeHoy(0),
        },
      ],
    });

    await prisma.itemCompra.create({
      data: {
        id_hogar: familia.id_hogar,
        id_creador: diego.id_usuario,
        id_categoria: cat['COMPRA:Supermercado'],
        nombre: 'Cereal de desayuno',
        cantidad: '1 caja',
        comprado: false,
        estado_validacion: EstadoValidacion.PENDIENTE_APROBACION,
      },
    });

    console.log('✅ Hogar demo familiar "Familia Vidal" creado (código FAMI01).');
  }
  await seedSuministrosSiVacio(familia.id_hogar, admin.id_usuario);
}

async function main() {
  const cat = await seedCategorias();
  console.log(`✅ ${Object.keys(cat).length} categorías verificadas.`);
  await seedHogaresDemo(cat);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
