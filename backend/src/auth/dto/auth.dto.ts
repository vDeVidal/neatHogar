import { IsEmail, IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
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
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password!: string;

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
