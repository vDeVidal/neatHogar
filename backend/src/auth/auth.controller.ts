import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, PinLoginDto, PinRegistroDto, RegistroDto } from './dto/auth.dto';
import { Public } from './public.decorator';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('registro')
  registrar(@Body() dto: RegistroDto) {
    return this.auth.registrar(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** Crea cuenta sencilla con Nombre + PIN. */
  @Post('pin/registro')
  registrarConPin(@Body() dto: PinRegistroDto) {
    return this.auth.registrarConPin(dto);
  }

  /** Re-ingresa ("relogearse") con Nombre + PIN y opcionalmente código de hogar. */
  @Post('pin/login')
  @HttpCode(200)
  loginConPin(@Body() dto: PinLoginDto) {
    return this.auth.loginConPin(dto);
  }

  /** Identificación rápida con Nombre + PIN (registra si es nuevo, o autentica si ya existe con ese PIN). */
  @Post('pin/acceso')
  @HttpCode(200)
  accesoConPin(@Body() dto: PinRegistroDto) {
    return this.auth.accesoConPin(dto);
  }
}
