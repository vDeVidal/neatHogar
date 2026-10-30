import { IsEmail, IsEnum, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { NivelDisponibilidad } from '@prisma/client';
import { TEMAS_VALIDOS } from '../../common/constantes';

export class RegistroDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  nombre!: string;

  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @IsString()
  @MinLength(4, { message: 'La contraseña debe tener al menos 4 caracteres' })
  password!: string;

  @IsOptional()
  @Matches(/^\d{4,6}$/, { message: 'El PIN debe tener entre 4 y 6 dígitos numéricos' })
  pin?: string;

  @IsOptional()
  @IsEnum(NivelDisponibilidad)
  disponibilidad?: NivelDisponibilidad;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  descripcion_carga?: string;

  @IsOptional()
  @IsIn(TEMAS_VALIDOS)
  tema_preferido?: string;
}

export class LoginDto {
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @IsString()
  password!: string;
}

export class PinRegistroDto {
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(60)
  nombre!: string;

  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'El PIN debe tener entre 4 y 6 dígitos numéricos' })
  pin!: string;

  @IsOptional()
  @IsEnum(NivelDisponibilidad)
  disponibilidad?: NivelDisponibilidad;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  descripcion_carga?: string;

  @IsOptional()
  @IsIn(TEMAS_VALIDOS)
  tema_preferido?: string;
}

export class PinLoginDto {
  @IsString()
  @MinLength(2, { message: 'Ingresa tu nombre' })
  @MaxLength(60)
  nombre!: string;

  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'El PIN debe tener entre 4 y 6 dígitos numéricos' })
  pin!: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  codigo_invitacion?: string;
}
