# Especificación Técnica del Proyecto: NeatHogar (Prompt para Agente Antigravity)

Actúa como un Arquitecto de Software y Desarrollador Full-Stack Senior. Tu objetivo es ensamblar y estructurar el proyecto completo **"NeatHogar"**, una aplicación móvil colaborativa para la organización de tareas domésticas, compras compartidas y distribución equitativa de responsabilidades en un hogar.

Debes respetar estrictamente el stack tecnológico, la contenedorización, el esquema de Prisma, el sistema de temas dinámicos y el diseño de pantallas detallado a continuación.

---

## 1. Stack Tecnológico y Arquitectura

El sistema utiliza una arquitectura **Cliente-Servidor** dividida en un entorno nativo para el cliente móvil y un entorno completamente contenedorizado para el servidor y la persistencia:

### 1.1. Frontend Móvil (Ejecución Local / Host)
* **Framework:** React Native con **Expo** (TypeScript).
* **Nota de Infraestructura:** **NO dockerizar la aplicación móvil**. Debe ejecutarse directamente en el host para permitir la conexión fluida con Expo Go vía LAN y emuladores locales.
* **Navegación:** React Navigation (v6+) / Expo Router combinando `Stack Navigator` y `Bottom Tab Navigator`.
* **Gestión de Temas y Persistencia Local:** React Context API (`ThemeContext`) + `@react-native-async-storage/async-storage` para persistir el tema elegido en el dispositivo.
* **Librerías UI Clave:**
  * `@expo/vector-icons` (Iconografía).
  * `react-native-svg` (Gráficas del Diario Mural en el Dashboard).
  * `react-native-safe-area-context` (`SafeAreaView`).
  * Componentes nativos (`FlatList`, `ScrollView`, `Pressable`, `Switch`, `TextInput`, `Modal`).

### 1.2. Backend y Base de Datos (Entorno Dockerizado)
* **Framework Backend:** **NestJS** (TypeScript) con arquitectura modular (Controladores, Servicios, Módulos, DTOs con `class-validator`).
* **ORM:** **Prisma ORM** (`@prisma/client` y `prisma` CLI) para el modelado de datos, migraciones tipadas y consultas a la base de datos.
* **Base de Datos:** **PostgreSQL** (v16-alpine).
* **Infraestructura (Docker):**
  * `Dockerfile` multi-stage para el servicio de **NestJS** (ejecutando `npx prisma generate` y `npx prisma migrate deploy` al iniciar).
  * `docker-compose.yml` en la raíz del proyecto que orqueste:
    1. `postgres-db`: Contenedor de PostgreSQL con volumen persistente (`pgdata`) y variables de entorno configuradas.
    2. `nestjs-api`: Contenedor del backend en NestJS conectado a la red de la base de datos, exponiendo el puerto `3000`.
    3. *(Opcional)* `prisma-studio`: Servicio o comando expuesto en el puerto `5555` para administración visual de la base de datos.

---

## 2. Roles de Usuario y Reglas de Negocio

Un usuario solo puede gestionar un hogar activo a la vez en el alcance actual.

1. **Administrador del Hogar (Jefe de hogar):**
   * Crea el núcleo familiar y genera códigos/invitaciones de vinculación.
   * Visualiza y gestiona los miembros del hogar y sus roles.
   * Crea, asigna tareas y consulta estadísticas generales.
   * Participa en tareas y listas de compras.
2. **Miembro del Hogar:**
   * Se une mediante código de invitación.
   * Visualiza tareas disponibles/asignadas, marca tareas como completadas y crea tareas.
   * Agrega y marca productos en la lista de compras compartida.
   * Registra su nivel de disponibilidad y consulta estadísticas.
3. **Característica de Perfil - Disponibilidad:**
   * *Nota arquitectónica:* La disponibilidad ("trabajador", "estudiante", Carga Alta/Media/Baja) **NO es un rol de sistema**, sino un atributo del perfil del miembro para ponderar las estadísticas y equilibrar la asignación de tareas.

### Exclusiones Explícitas (NO implementar)
* Pasarelas de pago, transferencias bancarias o finanzas avanzadas.
* Chat o mensajería interna.
* Integración con domótica / dispositivos IoT.
* Asignación automática por IA o pertenencia simultánea a múltiples hogares.

---

## 3. Sistema de Personalización Visual (4 Temas Predefinidos)

La aplicación debe implementar un `ThemeProvider` global que inyecte los colores dinámicamente en todas las pantallas y componentes. Además de persistirse localmente con `AsyncStorage`, la preferencia debe poder sincronizarse con el perfil del usuario.

### 3.1. Puntos de Acceso al Selector de Tema
1. **Desde `VinculacionPage` (Pantalla 1):** Al presionar el botón inferior **"Personaliza tu App"**, se debe abrir un Modal o pantalla secundaria (`ThemeSelectorModal`) para previsualizar y elegir el tema desde el primer momento.
2. **Desde `DashboardPage` (Tab "Hogar" / Configuración de Perfil):** Incluir un ícono de paleta/ajustes en la esquina superior derecha del Dashboard ("Diario Mural de la Casa") y en las configuraciones del perfil del usuario que abra el mismo selector de temas en cualquier momento.

### 3.2. Paletas de los 4 Temas Predefinidos

#### 🌙 Temas Oscuros (Dark Themes)

1. **Tema 1: "Noche Índigo" (Inspirado en el Mockup Original - Default)**
   * `background`: `#433878` (Púrpura/Índigo profundo)
   * `surface` / `card`: `#1F193D` (Azul/Violeta muy oscuro para tarjetas y barras)
   * `primary`: `#7E60BF` (Violeta suave para botones principales y tarjetas destacadas)
   * `secondary`: `#A594F9` (Lavanda brillante para switches activos, chips seleccionados y bordes)
   * `textPrimary`: `#FFFFFF`
   * `textSecondary`: `#D1C4E9`
   * `success`: `#66BB6A` | `warning`: `#FFA726` | `danger`: `#EF5350`

2. **Tema 2: "Bosque Nocturno" (Dark Slate & Emerald - Descanso Visual)**
   * `background`: `#0F172A` (Gris pizarra oscuro)
   * `surface` / `card`: `#1E293B` (Azul pizarra)
   * `primary`: `#10B981` (Verde esmeralda vibrante)
   * `secondary`: `#38BDF8` (Celeste cielo para detalles y métricas)
   * `textPrimary`: `#F8FAFC`
   * `textSecondary`: `#94A3B8`
   * `success`: `#22C55E` | `warning`: `#F59E0B` | `danger`: `#EF4444`

#### ☀️ Temas Claros (Light Themes)

3. **Tema 3: "Brisa Nórdica" (Clean Lavender & Daylight)**
   * `background`: `#F8FAFC` (Blanco humo muy suave)
   * `surface` / `card`: `#FFFFFF` (Blanco puro con sombra suave)
   * `primary`: `#6366F1` (Índigo moderno y amigable)
   * `secondary`: `#E0E7FF` (Lavanda claro para fondos secundarios y chips)
   * `textPrimary`: `#1E293B` (Gris carbón oscuro)
   * `textSecondary`: `#64748B` (Gris medio)
   * `success`: `#16A34A` | `warning`: `#D97706` | `danger`: `#DC2626`

4. **Tema 4: "Hogar Cálido" (Warm Terracotta & Cream)**
   * `background`: `#FDFBF7` (Crema cálido / Arena suave)
   * `surface` / `card`: `#F4EFE6` (Beige suave para tarjetas)
   * `primary`: `#E07A5F` (Terracota suave / Coral cálido)
   * `secondary`: `#81B29A` (Verde salvia para acentos y estados completados)
   * `textPrimary`: `#3D405B` (Azul pizarra oscuro para excelente legibilidad)
   * `textSecondary`: `#6B705C` (Oliva grisáceo)
   * `success`: `#52B788` | `warning`: `#F4A261` | `danger`: `#E63946`

---

## 4. Modelo de Datos en Prisma (`schema.prisma`)

Configura el archivo `prisma/schema.prisma` en el backend de NestJS respetando el modelo relacional del informe y añadiendo soporte para puntajes, disponibilidad y preferencia de tema:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum RolMiembro {
  ADMINISTRADOR
  MIEMBRO
}

enum EstadoTarea {
  PENDIENTE
  COMPLETADA
}

enum TipoCategoria {
  TAREA
  COMPRA
}

enum NivelDisponibilidad {
  ALTA
  MEDIA
  BAJA
}

model Usuario {
  id_usuario          Int                 @id @default(autoincrement())
  nombre              String
  email               String              @unique
  password_hash       String?
  avatar_url          String?
  disponibilidad      NivelDisponibilidad @default(MEDIA)
  descripcion_carga   String?             // Ej: "Estudiante", "Trabajador tiempo completo"
  tema_preferido      String              @default("noche_indigo")
  fecha_registro      DateTime            @default(now())

  membresias          MiembroHogar[]
  tareas_creadas      Tarea[]             @relation("TareasCreador")
  tareas_asignadas    Tarea[]             @relation("TareasAsignado")
  items_creados       ItemCompra[]        @relation("ItemsCreador")
  items_comprados     ItemCompra[]        @relation("ItemsComprador")

  @@map("usuario")
}

model Hogar {
  id_hogar            Int                 @id @default(autoincrement())
  nombre              String
  codigo_invitacion   String              @unique
  fecha_creacion      DateTime            @default(now())

  miembros            MiembroHogar[]
  tareas              Tarea[]
  items_compra        ItemCompra[]

  @@map("hogar")
}

model MiembroHogar {
  id_miembro          Int                 @id @default(autoincrement())
  id_usuario          Int
  id_hogar            Int
  rol                 RolMiembro          @default(MIEMBRO)
  puntos_acumulados   Int                 @default(0)
  fecha_ingreso       DateTime            @default(now())

  usuario             Usuario             @relation(fields: [id_usuario], references: [id_usuario], onDelete: Cascade)
  hogar               Hogar               @relation(fields: [id_hogar], references: [id_hogar], onDelete: Cascade)

  @@unique([id_usuario, id_hogar])
  @@map("miembro_hogar")
}

model Categoria {
  id_categoria        Int                 @id @default(autoincrement())
  nombre              String              // Ej: "Supermercado", "Ferretería", "Farmacia", "Limpieza"
  tipo                TipoCategoria

  tareas              Tarea[]
  items_compra        ItemCompra[]

  @@map("categoria")
}

model Tarea {
  id_tarea            Int                 @id @default(autoincrement())
  id_hogar            Int
  id_creador          Int
  id_asignado         Int?
  id_categoria        Int?
  titulo              String
  descripcion         String?
  puntos              Int                 @default(10) // Esfuerzo o dificultad de la tarea
  estado              EstadoTarea         @default(PENDIENTE)
  fecha_limite        DateTime?
  fecha_creacion      DateTime            @default(now())

  hogar               Hogar               @relation(fields: [id_hogar], references: [id_hogar], onDelete: Cascade)
  creador             Usuario             @relation("TareasCreador", fields: [id_creador], references: [id_usuario])
  asignado            Usuario?            @relation("TareasAsignado", fields: [id_asignado], references: [id_usuario])
  categoria           Categoria?          @relation(fields: [id_categoria], references: [id_categoria])

  @@map("tarea")
}

model ItemCompra {
  id_item             Int                 @id @default(autoincrement())
  id_hogar            Int
  id_creador          Int
  id_comprador        Int?
  id_categoria        Int?
  nombre              String
  cantidad            String              @default("1")
  comprado            Boolean             @default(false)
  fecha_creacion      DateTime            @default(now())
  fecha_compra        DateTime?

  hogar               Hogar               @relation(fields: [id_hogar], references: [id_hogar], onDelete: Cascade)
  creador             Usuario             @relation("ItemsCreador", fields: [id_creador], references: [id_usuario])
  comprador           Usuario?            @relation("ItemsComprador", fields: [id_comprador], references: [id_usuario])
  categoria           Categoria?          @relation(fields: [id_categoria], references: [id_categoria])

  @@map("item_compra")
}
```

---

## 5. Arquitectura de Navegación y Desglose de Pantallas (Mockups)

### 5.1. Estructura de Navegación
* **`RootStackNavigator` (Stack Navigator):**
  * `VinculacionPage` (Pantalla 1 - Inicial si el usuario no tiene hogar activo).
  * `MainTabs` (Contenedor de las 4 pestañas principales).
  * `AddMemberPage` (Pantalla 3 - Modal/Stack con botón Back).
  * `CreacionTareasPage` (Pantalla 6 - Modal/Stack con botón Back).
  * `ThemeSelectorModal` (Modal accesible desde `VinculacionPage` y desde `DashboardPage`).
* **`MainTabNavigator` (Bottom Tab Navigator):**
  1. **COMPRAS** (`ComprasCompartidasPage` - Pantalla 4).
  2. **HOGAR** (`DashboardPage` - Pantalla 2, pestaña central/principal).
  3. **TAREAS** (`TareasPage` - Pantallas 5.1 y 5.2).
  4. **GASTOS / ESTADÍSTICAS** (`GastosPage` - Pantalla 7).

### 5.2. Detalle de Vistas y Componentes

1. **Pantalla 1: `VinculacionPage` (Onboarding y Personalización)**
   * **UI:** Título superior `"Bienvenido a NeatHogar"`.
   * **Centro:** Dos tarjetas cuadradas lado a lado con iconos grandes:
     * `"Crear Núcleo Familiar"` (Icono de casa con familia) -> Crea grupo y ejecuta `navigation.replace('MainTabs')`.
     * `"Unirse a un Núcleo Familiar"` (Icono de eslabón/cadena) -> Pide código de invitación, valida y redirige a `MainTabs`.
   * **Parte Inferior:** Dos botones horizontales anchos:
     * `"Importe sus Datos"`
     * `"Personaliza tu App"` -> **Abre el selector visual con los 4 temas (2 oscuros y 2 claros)** y aplica el cambio en tiempo real.

2. **Pantalla 2: `DashboardPage` (Tab "HOGAR" - Diario Mural de la Casa)**
   * **Header:** Título `"Diario Mural de la Casa"` + Botón/Icono de configuración de Perfil, Disponibilidad y **Cambio de Tema** en la esquina superior.
   * **Gráfica Central:** Gráfico combinado de barras y línea (`react-native-svg`) mostrando el progreso y participación del hogar.
   * **Sección `"Lista de Miembros de la Casa"`:** `FlatList` de tarjetas horizontales con Avatar, Nombre Apellido, Rol (`Administrador` o `Miembro`) y badge de disponibilidad.
   * **Botón Inferior:** `"Añadir Miembro"` que hace `navigation.navigate('AddMemberPage')`.

3. **Pantalla 3: `AddMemberPage` (Añadir Miembro / Invitar)**
   * **Header:** Flecha atrás (`<-`) y título `"Añadir Miembro"`.
   * **Formulario:** Selector desplegable (`Tipo de Miembro`: Administrador / Miembro), lista de opciones configurables con `<Switch>` (`Opción 1`, `Opción 2`, `Opción 3` / permisos), visualización o envío de código de invitación y botón inferior `"Enviar Invitación"` con icono de avión de papel.

4. **Pantalla 4: `ComprasCompartidasPage` (Tab "COMPRAS")**
   * **Header:** Título `"Listas de Compras"`.
   * **Filtros Superiores (Chips Horizontales):** Píldoras seleccionables por categoría (`"Ferretería"`, `"Supermercado"`, `"Farmacia"`) + botón circular con icono de lápiz/agregar.
   * **Lista:** `FlatList` de ítems con texto del producto a la izquierda y checkbox/indicador de estado y cantidad a la derecha. Input rápido para agregar nuevos productos.

5. **Pantalla 5.1 y 5.2: `TareasPage` (Tab "TAREAS" - Vista Segmentada)**
   * **Header:** Título `"Lista de Tareas"` y botón `"+"` en la esquina superior derecha (navega a `CreacionTareasPage`).
   * **Segmented Control:** Dos pestañas internas superiores: **`"Por Persona"`** y **`"Calendario"`**.
   * **Vista 5.1 (`Por Persona`):** Lista vertical de integrantes (Avatar + Nombre Apellido + Rol) y, debajo de cada integrante, un contenedor con tarjetas cuadradas horizontales (`Información Tarea 1`, `Información Tarea 2`, `Información Tarea 3`) mostrando puntaje y botón para completar.
   * **Vista 5.2 (`Calendario`):** Grilla de calendario mensual/semanal con bloques de tareas coloreados en los días correspondientes y tarjeta inferior de `"Detalles"` que muestra el miembro responsable y la `"Información Tarea"` del día seleccionado.

6. **Pantalla 6: `CreacionTareasPage` (Formulario de Creación de Tareas)**
   * **Header:** Flecha atrás (`<-`) y título `"Creación de Tareas"`.
   * **Formulario:** Selector desplegable (`Nombre del Miembro` asignado), selector de categoría y dificultad/puntos, campo multilínea `"Detalles de la Tarea"` (`placeholder="Escriba aquí..."`), `<Switch>` de opciones adicionales y botón cuadrado inferior `"Confirmar"` con icono de check (`✓`).

7. **Pantalla 7: `GastosPage` (Tab "GASTOS" / Estadísticas y Gastos del Hogar)**
   * **Nota de Implementación:** En el mockup visual esta pestaña se titula `"Gastos Generales"` (listando ítems como *Compras Supermercado, Arriendo, Gastos Comunes, Luz, Agua* y el botón `"Ingresar Gasto"`), mientras que en el alcance funcional representa las **Estadísticas de Participación** (puntos acumulados, tareas completadas y barras de progreso vs. disponibilidad). Implementa un selector o vista combinada dentro de esta pantalla que permita alternar entre **"Participación / Puntos"** y **"Gastos Generales"** para cubrir al 100% tanto el mockup como la rúbrica funcional.

---

## 6. Estructura de Carpetas y Plan de Ensamblaje para Antigravity

Ejecuta la construcción del proyecto siguiendo este orden:

```text
neathogar/
├── docker-compose.yml          # Orquestación de PostgreSQL + NestJS Backend
├── .env.example                # Variables de entorno para DB y API
├── backend/                    # Proyecto NestJS
│   ├── Dockerfile
│   ├── prisma/
│   │   ├── schema.prisma       # Esquema relacional completo
│   │   └── seed.ts             # Datos de prueba (Categorías, Hogar demo, Usuarios)
│   └── src/
│       ├── prisma/             # PrismaModule y PrismaService
│       ├── usuarios/
│       ├── hogares/
│       ├── tareas/
│       ├── compras/
│       └── estadisticas/
└── mobile/                     # Proyecto React Native + Expo (NO Dockerizado)
    ├── App.tsx
    └── src/
        ├── theme/              # ThemeContext, AsyncStorage y las 4 paletas de colores
        ├── navigation/         # RootStackNavigator y MainTabNavigator
        ├── screens/            # Las 7 pantallas + ThemeSelectorModal
        ├── components/         # Componentes reutilizables conectados al ThemeContext
        └── services/           # Cliente HTTP (Axios/Fetch) apuntando al backend
```

1. **Paso 1:** Crea el `docker-compose.yml` y la carpeta `backend/` con NestJS y Prisma configurados. Incluye un script `seed.ts` para poblar categorías base (*Supermercado, Ferretería, Farmacia*) y datos de prueba.
2. **Paso 2:** Inicializa el proyecto `mobile/` con Expo y TypeScript. Configura primero el `ThemeContext` con los 4 temas (*Noche Índigo, Bosque Nocturno, Brisa Nórdica y Hogar Cálido*).
3. **Paso 3:** Implementa la navegación (`RootStack` y `MainTabs`) y maqueta las 7 pantallas junto con el modal de personalización de temas, conectándolas con los endpoints de NestJS.