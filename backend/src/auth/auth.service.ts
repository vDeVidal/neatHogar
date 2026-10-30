import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { HogaresService } from '../hogares/hogares.service';
import { normalizarNombreLogin, SELECT_USUARIO_PUBLICO } from '../common/constantes';
import { LoginDto, PinLoginDto, PinRegistroDto, RegistroDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly hogares: HogaresService,
  ) {}

  /** Crea cuenta tradicional con email/password (mantenido por retrocompatibilidad). */
  async registrar(dto: RegistroDto) {
    const email = dto.email.trim().toLowerCase();
    const nombre = dto.nombre.trim();
    const nombre_login = normalizarNombreLogin(nombre);

    const existeEmail = await this.prisma.usuario.findUnique({ where: { email } });
    if (existeEmail) {
      throw new ConflictException('Ya existe una cuenta con ese correo.');
    }

    const existeNombre = await this.prisma.usuario.findUnique({ where: { nombre_login } });
    const pin_hash = dto.pin ? await bcrypt.hash(dto.pin, 10) : null;

    const usuario = await this.prisma.usuario.create({
      data: {
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

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    if (!usuario?.password_hash || !(await bcrypt.compare(dto.password, usuario.password_hash))) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }
    return this.respuestaConToken(this.limpiarUsuario(usuario));
  }

  /** Crea una cuenta nueva usando solo Nombre + PIN (o asigna PIN si era cuenta previa sin PIN). */
  async registrarConPin(dto: PinRegistroDto) {
    const nombre = dto.nombre.trim();
    const nombre_login = normalizarNombreLogin(nombre);

    const existente = await this.buscarPorNombre(nombre_login, nombre);
    if (existente) {
      if (!existente.pin_hash) {
        const actualizado = await this.prisma.usuario.update({
          where: { id_usuario: existente.id_usuario },
          data: {
            nombre_login,
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

    const slug = nombre_login.replace(/[^a-z0-9]/g, '') || 'usuario';
    const email = `${slug}.${Date.now().toString().slice(-6)}@pin.neathogar.cl`;
    const pin_hash = await bcrypt.hash(dto.pin, 10);

    const usuario = await this.prisma.usuario.create({
      data: {
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

  /** Re-ingresa a una cuenta existente con Nombre + PIN (y opcionalmente se une/activa un hogar por código). */
  async loginConPin(dto: PinLoginDto) {
    const nombre = dto.nombre.trim();
    const nombre_login = normalizarNombreLogin(nombre);

    const usuario = await this.buscarPorNombre(nombre_login, nombre);
    if (!usuario) {
      throw new UnauthorizedException('No encontramos una cuenta con ese nombre. Verifica cómo lo escribiste o crea tu cuenta.');
    }

    if (!usuario.pin_hash) {
      // Cuenta antigua previa al sistema de PIN: adopta este primer PIN
      await this.prisma.usuario.update({
        where: { id_usuario: usuario.id_usuario },
        data: {
          nombre_login,
          pin_hash: await bcrypt.hash(dto.pin, 10),
        },
      });
    } else if (!(await bcrypt.compare(dto.pin, usuario.pin_hash))) {
      throw new UnauthorizedException('PIN incorrecto para este usuario.');
    }

    if (!usuario.nombre_login) {
      await this.prisma.usuario.update({
        where: { id_usuario: usuario.id_usuario },
        data: { nombre_login },
      }).catch(() => undefined);
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

  /**
   * Acceso rápido inteligente por Nombre + PIN (usado al Crear o Unirse a un hogar sin sesión previa):
   * - Si el nombre no existe: registra la cuenta con ese PIN.
   * - Si el nombre ya existe y el PIN coincide (o no tenía PIN): inicia sesión en esa cuenta existente.
   * - Si el nombre ya existe pero el PIN no coincide: informa claramente el conflicto.
   */
  async accesoConPin(dto: PinRegistroDto) {
    const nombre = dto.nombre.trim();
    const nombre_login = normalizarNombreLogin(nombre);

    const existente = await this.buscarPorNombre(nombre_login, nombre);
    if (existente) {
      if (!existente.pin_hash) {
        const actualizado = await this.prisma.usuario.update({
          where: { id_usuario: existente.id_usuario },
          data: {
            nombre_login,
            pin_hash: await bcrypt.hash(dto.pin, 10),
          },
          select: SELECT_USUARIO_PUBLICO,
        });
        return this.respuestaConToken(actualizado);
      }
      if (await bcrypt.compare(dto.pin, existente.pin_hash)) {
        return this.respuestaConToken(this.limpiarUsuario(existente));
      }
      throw new UnauthorizedException(
        'Ese nombre ya está registrado con otro PIN. Si es tu cuenta, escribe tu PIN correcto; si eres otra persona, agrega tu apellido o inicial.',
      );
    }

    return this.registrarConPin(dto);
  }

  private async buscarPorNombre(nombre_login: string, nombreOriginal: string) {
    const porLogin = await this.prisma.usuario.findUnique({ where: { nombre_login } });
    if (porLogin) return porLogin;
    return this.prisma.usuario.findFirst({
      where: { nombre: { equals: nombreOriginal.trim(), mode: 'insensitive' } },
      orderBy: { id_usuario: 'desc' },
    });
  }

  private limpiarUsuario(usuario: any) {
    const { password_hash: _p, pin_hash: _pin, ...publico } = usuario;
    return publico;
  }

  private async respuestaConToken<T extends { id_usuario: number; email: string; id_hogar_activo?: number | null }>(
    usuario: T,
  ) {
    const token = await this.jwt.signAsync({ sub: usuario.id_usuario, email: usuario.email });
    const hogares = await this.hogares.listarMisHogares(usuario.id_usuario);

    let hogarActivoResumen =
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
