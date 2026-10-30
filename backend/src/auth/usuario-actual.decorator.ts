import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UsuarioAutenticado {
  id_usuario: number;
  email: string;
  id_hogar?: number;
}

/** Inyecta el usuario autenticado (payload del JWT + hogar activo de cabecera x-hogar-id) en el handler. */
export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
