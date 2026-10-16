import { IsEnum, IsIn, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { NivelDisponibilidad } from '@prisma/client';
import { TEMAS_VALIDOS } from '../../common/constantes';

export class ActualizarPerfilDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  nombre?: string;

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

  @IsOptional()
  @IsUrl()
  avatar_url?: string;
}
