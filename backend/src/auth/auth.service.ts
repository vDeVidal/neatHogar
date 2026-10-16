import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { SELECT_USUARIO_PUBLICO } from '../common/constantes';
import { LoginDto, RegistroDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async registrar(dto: RegistroDto) {
    const email = dto.email.trim().toLowerCase();
    const existe = await this.prisma.usuario.findUnique({ where: { email } });
    if (existe) {
      throw new ConflictException('Ya existe una cuenta con ese email. Usa "Importe sus Datos" para ingresar.');
    }
    const usuario = await this.prisma.usuario.create({
      data: {
        nombre: dto.nombre.trim(),
        email,
        password_hash: await bcrypt.hash(dto.password, 10),
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
    const { password_hash: _omit, ...publico } = usuario;
    return this.respuestaConToken(publico);
  }

  private async respuestaConToken<T extends { id_usuario: number; email: string }>(usuario: T) {
    const token = await this.jwt.signAsync({ sub: usuario.id_usuario, email: usuario.email });
    const membresia = await this.prisma.miembroHogar.findFirst({
      where: { id_usuario: usuario.id_usuario },
      include: { hogar: true },
    });
    return { token, usuario, hogar: membresia?.hogar ?? null, rol: membresia?.rol ?? null };
  }
}
