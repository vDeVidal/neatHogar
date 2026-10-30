import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const [tipo, token] = (request.headers.authorization ?? '').split(' ');
    if (tipo !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token de acceso requerido');
    }
    try {
      const payload = await this.jwt.verifyAsync(token);
      const rawHogar = request.headers['x-hogar-id'];
      const parsedHogar = rawHogar ? parseInt(String(rawHogar), 10) : undefined;
      request.user = {
        id_usuario: payload.sub,
        email: payload.email,
        id_hogar: parsedHogar && Number.isFinite(parsedHogar) && parsedHogar > 0 ? parsedHogar : undefined,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
