# Especificación Técnica - Incremento v2: NeatHogar (Prompt para Agente Antigravity)

Actúa como un Arquitecto de Software y Desarrollador Full-Stack Senior. Tu objetivo es implementar el **Incremento v2** sobre la base existente de **"NeatHogar"** (React Native + Expo en local, NestJS + Prisma ORM + PostgreSQL dockerizados y el sistema de 4 temas predefinidos).

Debes integrar tres grandes bloques funcionales manteniendo la coherencia visual (`ThemeContext`), la limpieza de la experiencia de usuario (UX) y la integridad relacional en Prisma.

---

## 1. Resumen de Nuevas Funcionalidades (Incremento v2)

1. **Autenticación con Identificador Único e Invitaciones Dinámicas Efímeras (TTL 5 minutos):**
   * Registro e inicio de sesión de usuarios con un identificador único público (`@username` / código de usuario) además de sus credenciales.
   * Reemplazo del código estático del hogar por **códigos dinámicos de invitación de un solo uso o tiempo limitado (5 minutos exactos)** generados bajo demanda por el propietario/administrador del hogar.
2. **Flujo de Evidencia Fotográfica y Validación de Tareas (Padre/Admin -> Hijo/Miembro):**
   * Al marcar una tarea como realizada, el miembro debe capturar una fotografía con la cámara (`expo-image-picker`) como evidencia.
   * La tarea pasa a un estado intermedio **`EN_REVISION`** y muestra la fotografía directamente en la tarjeta de la pestaña **Tareas** para que un usuario con rol `ADMINISTRADOR` (Padre/Propietario) la **Apruebe** (otorgando los puntos) o la **Rechace** (devolviéndola a `PENDIENTE` con motivo).
3. **Nuevo Módulo: Control de Suministros, Despensa y Monitor Exclusivo de Gas:**
   * Registro de compras recurrentes del hogar con fecha exacta de adquisición (`fecha_compra`) y umbral de alerta por tiempo transcurrido.
   * **Sección Exclusiva para el Gas (Cilindro / Balón de Gas):** Panel destacado donde se registra la fecha en que se compró el gas (ej. 20 de octubre) y se dispara un sistema escalonado de alertas preventivas a partir de las **2 semanas (14 días)**, intensificándose a la **3ª semana (21 días)** y posteriores mediante notificaciones locales (`expo-notifications`) y alertas visuales en la app.

---

## 2. Actualización del Modelo de Datos (`prisma/schema.prisma`)

Actualiza el esquema de Prisma en `backend/prisma/schema.prisma` y genera una nueva migración (`npx prisma migrate dev --name incremento_v2`).

```prisma
// Añadir/Actualizar Enums existentes

enum EstadoTarea {
  PENDIENTE
  EN_REVISION   // Nuevo estado: evidencia subida, esperando aprobación del Admin/Padre
  COMPLETADA
  RECHAZADA     // Opcional para historial, o vuelve a PENDIENTE con nota de rechazo
}

enum TipoSuministro {
  GAS           // Apartado exclusivo con alertas escalonadas (Semana 2, Semana 3+)
  DESPENSA      // Insumos generales con fecha de compra y alerta por antigüedad
}

// Actualizar modelo Usuario
model Usuario {
  id_usuario          Int                 @id @default(autoincrement())
  identificador_unico String              @unique // Ej: "lucas.moya" o "#NH-8492"
  nombre              String
  email               String              @unique
  password_hash       String
  avatar_url          String?
  disponibilidad      NivelDisponibilidad @default(MEDIA)
  descripcion_carga   String?
  tema_preferido      String              @default("noche_indigo")
  expo_push_token     String?             // Para alertas locales/push
  fecha_registro      DateTime            @default(now())

  membresias          MiembroHogar[]
  codigos_generados   CodigoInvitacion[]
  tareas_creadas      Tarea[]             @relation("TareasCreador")
  tareas_asignadas    Tarea[]             @relation("TareasAsignado")
  tareas_validadas    Tarea[]             @relation("TareasValidador")
  items_creados       ItemCompra[]        @relation("ItemsCreador")
  items_comprados     ItemCompra[]        @relation("ItemsComprador")
  suministros         RegistroSuministro[]

  @@map("usuario")
}

// Actualizar modelo Hogar (Eliminar codigo_invitacion estático)
model Hogar {
  id_hogar            Int                  @id @default(autoincrement())
  nombre              String
  fecha_creacion      DateTime             @default(now())

  miembros            MiembroHogar[]
  codigos_invitacion  CodigoInvitacion[]
  tareas              Tarea[]
  items_compra        ItemCompra[]
  suministros         RegistroSuministro[]

  @@map("hogar")
}

// Nueva Tabla: Códigos de Invitación Dinámicos (TTL 5 minutos)
model CodigoInvitacion {
  id_codigo           Int       @id @default(autoincrement())
  codigo              String    @unique // Código alfanumérico corto (ej: "A7X-92K")
  id_hogar            Int
  id_creador          Int
  rol_asignado        RolMiembro @default(MIEMBRO)
  creado_en           DateTime  @default(now())
  expira_en           DateTime  // creado_en + 5 minutos
  usado               Boolean   @default(false)

  hogar               Hogar     @relation(fields: [id_hogar], references: [id_hogar], onDelete: Cascade)
  creador             Usuario   @relation(fields: [id_creador], references: [id_usuario])

  @@map("codigo_invitacion")
}

// Actualizar modelo Tarea para Evidencia Fotográfica y Validación
model Tarea {
  id_tarea            Int         @id @default(autoincrement())
  id_hogar            Int
  id_creador          Int
  id_asignado         Int?
  id_validador        Int?        // Usuario Administrador/Padre que aprueba
  id_categoria        Int?
  titulo              String
  descripcion         String?
  puntos              Int         @default(10)
  estado              EstadoTarea @default(PENDIENTE)
  requiere_foto       Boolean     @default(true)
  evidencia_foto_url  String?     // Ruta o URL de la foto subida al completar
  comentario_revision String?     // Motivo en caso de rechazo
  fecha_completada    DateTime?   // Momento en que el miembro subió la foto
  fecha_validacion    DateTime?   // Momento en que el padre/admin aprobó
  fecha_limite        DateTime?
  fecha_creacion      DateTime    @default(now())

  hogar               Hogar       @relation(fields: [id_hogar], references: [id_hogar], onDelete: Cascade)
  creador             Usuario     @relation("TareasCreador", fields: [id_creador], references: [id_usuario])
  asignado            Usuario?    @relation("TareasAsignado", fields: [id_asignado], references: [id_usuario])
  validador           Usuario?    @relation("TareasValidador", fields: [id_validador], references: [id_usuario])
  categoria           Categoria?  @relation(fields: [id_categoria], references: [id_categoria])

  @@map("tarea")
}

// Nueva Tabla: Control de Suministros, Despensa y Gas
model RegistroSuministro {
  id_suministro         Int            @id @default(autoincrement())
  id_hogar              Int
  id_comprador          Int
  tipo                  TipoSuministro @default(DESPENSA)
  nombre                String         // Ej: "Balón de Gas 15kg", "Aceite", "Arroz"
  fecha_compra          DateTime       @default(now())
  dias_alerta_inicial   Int            @default(14) // Por defecto 2 semanas (14 días)
  dias_alerta_critica   Int            @default(21) // Por defecto 3 semanas (21 días)
  activo                Boolean        @default(true) // true = suministro actual en uso; false = histórico reemplazado
  notas                 String?

  hogar                 Hogar          @relation(fields: [id_hogar], references: [id_hogar], onDelete: Cascade)
  comprador             Usuario        @relation(fields: [id_comprador], references: [id_usuario])

  @@map("registro_suministro")
}
```

---

## 3. Especificación Backend (NestJS)

### 3.1. Módulo de Autenticación y Usuarios (`auth/` & `usuarios/`)
* **`POST /auth/register`**: Crea cuenta solicitando `nombre`, `email`, `password` e `identificador_unico` (validar unicidad y formato limpio en minúsculas). Si no se provee identificador, autogenerar uno legible (ej. `nombre.apellido#1234`).
* **`POST /auth/login`**: Autentica mediante `email` o `identificador_unico` + `password` y retorna JWT junto con los datos del usuario y su hogar activo (si tiene).

### 3.2. Módulo de Invitaciones Dinámicas (`hogares/invitaciones`)
* **`POST /hogares/:idHogar/invitaciones`**:
  * Solo ejecutable por un usuario con rol `ADMINISTRADOR` en ese hogar.
  * Genera un código aleatorio criptográfico corto de 6 caracteres (ej. `NH-84K2`), invalida códigos anteriores no usados del mismo creador (opcional) y establece `expira_en = new Date(Date.now() + 5 * 60 * 1000)` (5 minutos).
  * Retorna `{ codigo, expira_en, segundos_restantes: 300 }`.
* **`POST /hogares/unirse`**:
  * Recibe `{ codigo, id_usuario }`.
  * Verifica que el código exista, no haya sido usado (`usado === false`) y que `new Date() <= codigo.expira_en`.
  * Si expiró (`new Date() > codigo.expira_en`), retorna error HTTP `410 Gone` con mensaje: *"El código de invitación ha expirado (límite de 5 minutos). Solicita uno nuevo al propietario."*
  * Si es válido, crea el registro en `MiembroHogar`, marca el código o permite múltiples ingresos dentro de la ventana de 5 minutos (configurable; por defecto permitir múltiples usos dentro de los 5 minutos para no bloquear si invita a dos personas a la vez, o marcar según parámetro) y redirige al hogar.

### 3.3. Módulo de Tareas con Evidencia Fotográfica (`tareas/`)
* **Almacenamiento de Imágenes:** Configurar `Multer` en NestJS (`@nestjs/platform-express`) guardando las evidencias en un volumen persistente de Docker (`./uploads/evidencias`) servido estáticamente vía `ServeStaticModule` en `/uploads/...`.
* **`POST /tareas/:idTarea/completar-con-evidencia`**:
  * Endpoint `multipart/form-data` que recibe el archivo `foto` y el `id_usuario`.
  * Guarda la imagen, actualiza `evidencia_foto_url`, `fecha_completada = now()` y cambia el estado de la tarea a **`EN_REVISION`**.
  * **Importante:** Los puntos NO se suman al `MiembroHogar` todavía; quedan retenidos hasta la aprobación.
* **`PATCH /tareas/:idTarea/validar`**:
  * Solo ejecutable por un `ADMINISTRADOR` (Padre/Propietario) del hogar.
  * Recibe `{ aprobado: boolean, id_validador: number, comentario_revision?: string }`.
  * Si `aprobado === true`: Cambia estado a `COMPLETADA`, registra `fecha_validacion`, y suma `tarea.puntos` a `MiembroHogar.puntos_acumulados` del usuario asignado.
  * Si `aprobado === false`: Devuelve la tarea a estado `PENDIENTE`, guarda `comentario_revision` para que el hijo/miembro sepa qué corregir y vuelva a subir foto.

### 3.4. Módulo de Suministros y Monitor de Gas (`suministros/`)
* **`POST /hogares/:idHogar/suministros`**:
  * Crea un registro en `RegistroSuministro`. Si `tipo === 'GAS'`, marca automáticamente los registros anteriores de `GAS` del mismo hogar como `activo = false` (pasándolos al historial de recargas) y establece el nuevo como `activo = true` con `dias_alerta_inicial = 14` y `dias_alerta_critica = 21`.
* **`GET /hogares/:idHogar/suministros`**:
  * Retorna el gas activo actual (con cálculo en tiempo real de `dias_transcurridos`, `semanas_transcurridas` y `nivel_alerta`: `'NORMAL' | 'ADVERTENCIA_2_SEMANAS' | 'CRITICO_3_SEMANAS'`), el historial de compras de gas y la lista de suministros de despensa ordenados por antigüedad.

---

## 4. Especificación Frontend Móvil (React Native + Expo)

### 4.1. Nuevas Librerías Expo a Instalar en `mobile/`
Ejecutar en la carpeta `mobile/`:
```bash
npx expo install expo-image-picker expo-notifications expo-clipboard
```

### 4.2. Flujo de Registro, Acceso e Invitaciones (UX Fluida)
1. **Pantalla de Login / Registro (`AuthPage`):**
   * Permite crear cuenta ingresando Nombre, Correo, Contraseña y un **Identificador Único** (ej. `@benja_vidal`), mostrando claramente su ID de usuario en el perfil.
2. **En `VinculacionPage` (Pantalla 1):**
   * Al pulsar **"Unirse a un Núcleo Familiar"**, se abre un modal limpio con un campo de 6 dígitos para ingresar el código temporal de 5 minutos, con feedback inmediato si el código venció o es inválido, sin romper la estética ni el flujo original de la app.
3. **En `AddMemberPage` (Pantalla 3 - Vista del Administrador/Propietario):**
   * Añadir sección **"Generar Código Temporal (5 min)"**:
     * Botón **"Generar Código de Invitación"**.
     * Muestra el código en grande con botón de **Copiar al portapapeles** (`expo-clipboard`) y **Compartir** (`Share` nativo de React Native).
     * Incluye un **temporizador visual en cuenta regresiva en vivo (`04:59`, `04:58`...)** que, al llegar a `00:00`, invalida visualmente el código y ofrece generar uno nuevo con un toque.

### 4.3. Flujo de Evidencia Fotográfica y Validación en `TareasPage` (Pantalla 5)
1. **Para el Miembro / Hijo:**
   * Al presionar **"Completar Tarea"**, se abre la cámara del dispositivo (`ImagePicker.launchCameraAsync` con fallback a galería en simulador) para capturar la evidencia del trabajo realizado.
   * Tras confirmar la foto, la tarjeta de la tarea muestra una etiqueta **`"En Revisión"`** (color `warning` del tema activo) y la miniatura de la foto tomada.
2. **Para el Administrador / Padre (en la misma pestaña `TareasPage`):**
   * Las tareas en estado `EN_REVISION` destacan en la parte superior o dentro de la tarjeta del integrante mostrando **directamente la fotografía de evidencia** (ampliable al tocarla).
   * Incluye dos botones de acción directa en la tarjeta:
     * **`✓ Aprobar`** (color `success`): Valida la tarea y acredita los puntos al miembro.
     * **`✕ Rechazar`** (color `danger`): Abre un mini-input opcional de motivo y devuelve la tarea a `PENDIENTE`.

### 4.4. Nuevo Apartado: Despensa y Monitor Exclusivo de Gas (`SuministrosPage`)
Integrar este apartado de forma limpia en la navegación sin saturar la barra inferior: puede ubicarse como una sub-pestaña superior dentro de **COMPRAS** (ej. Segmented Control: `"Lista por Comprar"` | `"Despensa y Gas"`) o reemplazando/expandiendo la pestaña **GASTOS / SUMINISTROS**. *(Recomendación UX: Integrarlo como pestaña segmentada dentro de **COMPRAS** o accesible desde un acceso directo en el **DashboardPage** para mantener intactas las 4 tabs inferiores del mockup).*

1. **Tarjeta Hero Exclusiva: "Control del Gas del Hogar" 🔥**
   * Muestra de forma visual y destacada:
     * **Fecha de última compra:** (ej. *"Comprado el 20 de octubre"*).
     * **Tiempo transcurrido:** *"Han pasado X días (Y semanas)"*.
     * **Barra de estado / Semáforo dinámico:**
       * **0 a 13 días (`NORMAL`):** Verde (`success`) — *"Nivel óptimo"*.
       * **14 a 20 días (`ADVERTENCIA_2_SEMANAS`):** Ámbar (`warning`) — *"⚠️ Han pasado 2 semanas desde la última compra. Verifica el nivel del gas"*.
       * **21+ días (`CRITICO_3_SEMANAS`):** Rojo (`danger`) — *"🚨 ¡3 semanas o más! Es muy probable que el gas esté por acabarse"*.
   * **Botón Principal:** `"Registrar Nueva Compra de Gas"` (permite elegir fecha: *Hoy* o seleccionar en calendario como el *20 de octubre*, y programa automáticamente recordatorios locales con `expo-notifications` a los **14 días**, **21 días** y **28 días**).
   * **Historial desplegable:** Lista de fechas anteriores en las que se compró el gas para calcular el promedio de duración del hogar.

2. **Sección Inferior: "Control de Despensa e Insumos"**
   * Lista de productos comprados con su fecha de compra (ej. *Detergente - hace 18 días*, *Aceite - hace 5 días*).
   * Botón `+ Registrar Compra en Despensa` donde se indica el nombre del producto, la fecha de compra y en cuántos días se desea recibir una alerta de revisión (ej. 15 o 30 días).
   * Alertas visuales automáticas en las tarjetas cuya fecha de compra haya superado el umbral configurado.

---

## 5. Instrucciones de Ejecución para Antigravity

1. **Docker y Backend:**
   * Asegúrate de que `docker-compose.yml` monte un volumen `./backend/uploads:/app/uploads` en el contenedor `nestjs-api` para que las fotos de evidencia de tareas persistan entre reinicios.
   * Actualiza `schema.prisma`, ejecuta la migración y crea los nuevos módulos/controladores (`auth`, `invitaciones`, `suministros` y endpoints de `evidencia/validacion` en `tareas`).
2. **Frontend Móvil (Local):**
   * Respeta estrictamente el `ThemeContext` (los 4 temas: *Noche Índigo, Bosque Nocturno, Brisa Nórdica, Hogar Cálido*) en todos los nuevos modales, temporizadores, tarjetas de revisión de fotos y el panel exclusivo del Gas.
   * Configura `expo-notifications` al iniciar la app para solicitar permisos y programar las alertas locales escalonadas (Semana 2, Semana 3+) cada vez que se registre una compra de gas o despensa.