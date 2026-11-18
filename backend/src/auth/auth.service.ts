import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { HogaresService } from '../hogares/hogares.service';
import {
  generarIdentificadorDesdeNombre,
  normalizarIdentificadorUnico,
  normalizarNombreLogin,
  SELECT_USUARIO_PUBLICO,
} from '../common/constantes';
import { LoginDto, PinLoginDto, PinRegistroDto, RegistroDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly hogares: HogaresService,
  ) {}

  /** Crea cuenta con email, password e identificador_unico (opcional o autogenerado). */
  async registrar(dto: RegistroDto) {
    const email = dto.email.trim().toLowerCase();
    const nombre = dto.nombre.trim();
    const nombre_login = normalizarNombreLogin(nombre);

    const existeEmail = await this.prisma.usuario.findUnique({ where: { email } });
    if (existeEmail) {
      throw new ConflictException('Ya existe una cuenta con ese correo.');
    }

    const identificador_unico = await this.resolverIdentificadorUnico(nombre, dto.identificador_unico);
    const existeNombre = await this.prisma.usuario.findUnique({ where: { nombre_login } });
    const pin_hash = dto.pin ? await bcrypt.hash(dto.pin, 10) : null;

    const usuario = await this.prisma.usuario.create({
      data: {
        identificador_unico,
        nombre,
        nombre_login: existeNombre ? `${nombre_login}_${Date.now().toString().slice(-4)}` : nombre_login,
        email,
        password_hash: await bcrypt.hash(dto.password, 10),
        pin_hash,
        disponibilidad: dto.disponibilidad,
        descripcion_carga: dto.descripcion_carga,
        tema_preferido: dto.tema_preferido,
      },
      select: SELECT_USUARIO_PUBLICO,
    });
    return this.respuestaConToken(usuario);
  }

  /** Autentica mediante email o @identificador_unico + password. */
  async login(dto: LoginDto) {
    const credencial = (dto.identificador_unico || dto.email || '').trim();
    if (!credencial) {
      throw new BadRequestException('Ingresa tu correo electrónico o tu @identificador');
    }

    let usuario = null;
    if (credencial.includes('@') && !credencial.startsWith('@')) {
      usuario = await this.prisma.usuario.findUnique({
        where: { email: credencial.toLowerCase() },
      });
    } else {
      const idNorm = normalizarIdentificadorUnico(credencial);
      usuario =
        (await this.prisma.usuario.findUnique({ where: { identificador_unico: idNorm } })) ??
        (await this.prisma.usuario.findUnique({ where: { email: credencial.toLowerCase() } })) ??
        (await this.buscarPorNombreOIdentificador(credencial));
    }

    if (!usuario?.password_hash || !(await bcrypt.compare(dto.password, usuario.password_hash))) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (!usuario.identificador_unico) {
      const nuevoId = await this.resolverIdentificadorUnico(usuario.nombre);
      await this.prisma.usuario
        .update({
          where: { id_usuario: usuario.id_usuario },
          data: { identificador_unico: nuevoId },
        })
        .catch(() => undefined);
      usuario.identificador_unico = nuevoId;
    }

    return this.respuestaConToken(this.limpiarUsuario(usuario));
  }

  /** Crea una cuenta nueva usando solo Nombre + PIN (+ identificador_unico opcional o autogenerado). */
  async registrarConPin(dto: PinRegistroDto) {
    const nombre = dto.nombre.trim();
    const nombre_login = normalizarNombreLogin(nombre);

    const existente = await this.buscarPorNombreOIdentificador(nombre);
    if (existente) {
      if (!existente.pin_hash) {
        const idUnico =
          existente.identificador_unico ??
          (await this.resolverIdentificadorUnico(nombre, dto.identificador_unico));
        const actualizado = await this.prisma.usuario.update({
          where: { id_usuario: existente.id_usuario },
          data: {
            nombre_login,
            identificador_unico: idUnico,
            pin_hash: await bcrypt.hash(dto.pin, 10),
          },
          select: SELECT_USUARIO_PUBLICO,
        });
        return this.respuestaConToken(actualizado);
      }
      throw new ConflictException(
        'Ya existe una cuenta con ese nombre. Si es tuya, ingresa con tu PIN; si eres otra persona, añade tu apellido o inicial.',
      );
    }

    const identificador_unico = await this.resolverIdentificadorUnico(nombre, dto.identificador_unico);
    const slug = nombre_login.replace(/[^a-z0-9]/g, '') || 'usuario';
    const email = `${slug}.${Date.now().toString().slice(-6)}@pin.neathogar.cl`;
    const pin_hash = await bcrypt.hash(dto.pin, 10);

    const usuario = await this.prisma.usuario.create({
      data: {
        identificador_unico,
        nombre,
        nombre_login,
        email,
        pin_hash,
        disponibilidad: dto.disponibilidad,
        descripcion_carga: dto.descripcion_carga,
        tema_preferido: dto.tema_preferido,
      },
      select: SELECT_USUARIO_PUBLICO,
    });
    return this.respuestaConToken(usuario);
  }

  /** Re-ingresa a una cuenta existente con Nombre o @identificador_unico + PIN. */
  async loginConPin(dto: PinLoginDto) {
    const entrada = dto.nombre.trim();
    const nombre_login = normalizarNombreLogin(entrada);

    const usuario = await this.buscarPorNombreOIdentificador(entrada);
    if (!usuario) {
      throw new UnauthorizedException(
        'No encontramos una cuenta con ese nombre o @identificador. Verifica cómo lo escribiste o crea tu cuenta.',
      );
    }

    if (!usuario.pin_hash) {
      await this.prisma.usuario.update({
        where: { id_usuario: usuario.id_usuario },
        data: {
          nombre_login: usuario.nombre_login ?? nombre_login,
          pin_hash: await bcrypt.hash(dto.pin, 10),
        },
      });
    } else if (!(await bcrypt.compare(dto.pin, usuario.pin_hash))) {
      throw new UnauthorizedException('PIN incorrecto para este usuario.');
    }

    const updates: Record<string, unknown> = {};
    if (!usuario.nombre_login && !entrada.startsWith('@')) {
      updates.nombre_login = nombre_login;
    }
    if (!usuario.identificador_unico) {
      updates.identificador_unico = await this.resolverIdentificadorUnico(usuario.nombre);
    }
    if (Object.keys(updates).length > 0) {
      await this.prisma.usuario
        .update({
          where: { id_usuario: usuario.id_usuario },
          data: updates,
        })
        .catch(() => undefined);
    }

    if (dto.codigo_invitacion?.trim()) {
      await this.hogares.unirse(usuario.id_usuario, { codigo: dto.codigo_invitacion.trim() });
    }

    const actualizado = await this.prisma.usuario.findUniqueOrThrow({
      where: { id_usuario: usuario.id_usuario },
      select: SELECT_USUARIO_PUBLICO,
    });
    return this.respuestaConToken(actualizado);
  }

  /** Acceso rápido inteligente por Nombre + PIN (usado al Crear o Unirse a un hogar sin sesión previa). */
  async accesoConPin(dto: PinRegistroDto) {
    const entrada = dto.nombre.trim();
    const nombre_login = normalizarNombreLogin(entrada);

    const existente = await this.buscarPorNombreOIdentificador(entrada);
    if (existente) {
      if (!existente.pin_hash) {
        const idUnico =
          existente.identificador_unico ??
          (await this.resolverIdentificadorUnico(existente.nombre, dto.identificador_unico));
        const actualizado = await this.prisma.usuario.update({
          where: { id_usuario: existente.id_usuario },
          data: {
            nombre_login: existente.nombre_login ?? nombre_login,
            identificador_unico: idUnico,
            pin_hash: await bcrypt.hash(dto.pin, 10),
          },
          select: SELECT_USUARIO_PUBLICO,
        });
        return this.respuestaConToken(actualizado);
      }
      if (await bcrypt.compare(dto.pin, existente.pin_hash)) {
        if (!existente.identificador_unico) {
          const idUnico = await this.resolverIdentificadorUnico(existente.nombre);
          await this.prisma.usuario
            .update({
              where: { id_usuario: existente.id_usuario },
              data: { identificador_unico: idUnico },
            })
            .catch(() => undefined);
          existente.identificador_unico = idUnico;
        }
        return this.respuestaConToken(this.limpiarUsuario(existente));
      }
      throw new UnauthorizedException(
        'Ese nombre ya está registrado con otro PIN. Si es tu cuenta, escribe tu PIN correcto; si eres otra persona, agrega tu apellido o inicial.',
      );
    }

    return this.registrarConPin(dto);
  }

  private async buscarPorNombreOIdentificador(entrada: string) {
    const limpio = entrada.trim();
    const idNorm = normalizarIdentificadorUnico(limpio);
    const porId = await this.prisma.usuario.findUnique({ where: { identificador_unico: idNorm } });
    if (porId) return porId;

    const nombre_login = normalizarNombreLogin(limpio.replace(/^@+/, ''));
    const porLogin = await this.prisma.usuario.findUnique({ where: { nombre_login } });
    if (porLogin) return porLogin;

    return this.prisma.usuario.findFirst({
      where: { nombre: { equals: limpio.replace(/^@+/, ''), mode: 'insensitive' } },
      orderBy: { id_usuario: 'desc' },
    });
  }

  private async resolverIdentificadorUnico(nombre: string, solicitado?: string): Promise<string> {
    if (solicitado?.trim()) {
      const normalizado = normalizarIdentificadorUnico(solicitado);
      const ocupado = await this.prisma.usuario.findUnique({
        where: { identificador_unico: normalizado },
      });
      if (ocupado) {
        throw new ConflictException(`El identificador ${normalizado} ya está en uso. Elige otro.`);
      }
      return normalizado;
    }

    const base = generarIdentificadorDesdeNombre(nombre);
    const ocupadoBase = await this.prisma.usuario.findUnique({
      where: { identificador_unico: base },
    });
    if (!ocupadoBase) return base;

    for (let i = 0; i < 5; i++) {
      const sufijo = Math.floor(100 + Math.random() * 900);
      const candidato = generarIdentificadorDesdeNombre(nombre, sufijo);
      const ocupado = await this.prisma.usuario.findUnique({
        where: { identificador_unico: candidato },
      });
      if (!ocupado) return candidato;
    }
    return generarIdentificadorDesdeNombre(nombre, Date.now().toString().slice(-4));
  }

  private limpiarUsuario(usuario: any) {
    const { password_hash: _p, pin_hash: _pin, ...publico } = usuario;
    return publico;
  }

  private async respuestaConToken<
    T extends { id_usuario: number; email: string; id_hogar_activo?: number | null },
  >(usuario: T) {
    const token = await this.jwt.signAsync({ sub: usuario.id_usuario, email: usuario.email });
    const hogares = await this.hogares.listarMisHogares(usuario.id_usuario);

    const hogarActivoResumen =
      hogares.find((h) => h.id_hogar === usuario.id_hogar_activo) ?? hogares[0] ?? null;

    let hogarDetalle = null;
    if (hogarActivoResumen) {
      hogarDetalle = await this.hogares.obtenerDetalleHogar(
        hogarActivoResumen.id_hogar,
        usuario.id_usuario,
      );
    }

    return {
      token,
      usuario,
      hogar: hogarDetalle,
      rol: hogarActivoResumen?.mi_rol ?? null,
      hogares,
    };
  }
}
