import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { RolMiembro, TipoHogar } from '@prisma/client';

export class CrearHogarDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  nombre!: string;

  @IsOptional()
  @IsEnum(TipoHogar)
  tipo_hogar?: TipoHogar;
}

export class UnirseHogarDto {
  @IsOptional()
  @IsString()
  @Length(4, 16)
  codigo?: string;

  @IsOptional()
  @IsString()
  @Length(4, 16)
  codigo_invitacion?: string;
}

export class InvitarMiembroDto {
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  nombre?: string;

  @IsOptional()
  @IsEnum(RolMiembro)
  rol?: RolMiembro;

  @IsOptional()
  @IsBoolean()
  puede_validar_tareas?: boolean;

  @IsOptional()
  @IsBoolean()
  puede_crear_tareas?: boolean;

  @IsOptional()
  @IsBoolean()
  puede_gestionar_compras?: boolean;
}

export class CambiarRolDto {
  @IsOptional()
  @IsEnum(RolMiembro)
  rol?: RolMiembro;

  @IsOptional()
  @IsBoolean()
  puede_validar_tareas?: boolean;

  @IsOptional()
  @IsBoolean()
  puede_crear_tareas?: boolean;

  @IsOptional()
  @IsBoolean()
  puede_gestionar_compras?: boolean;
}

export class ActualizarTipoHogarDto {
  @IsEnum(TipoHogar)
  tipo_hogar!: TipoHogar;
}
