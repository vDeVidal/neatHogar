import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

class CamposTareaDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  id_asignado?: number | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  id_categoria?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  puntos?: number;

  @IsOptional()
  @IsBoolean()
  requiere_foto?: boolean;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsDateString()
  fecha_limite?: string | null;
}

export class CrearTareaDto extends CamposTareaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  titulo!: string;
}

export class ActualizarTareaDto extends CamposTareaDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  titulo?: string;
}

export class FiltroTareasDto {
  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;
}

export class CompletarConEvidenciaDto {
  @IsOptional()
  @IsString()
  foto_base64?: string;

  @IsOptional()
  @IsString()
  evidencia_foto_url?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_usuario?: number;
}

export class ValidarTareaDto {
  @IsOptional()
  @IsBoolean()
  aprobado?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_validador?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  comentario_revision?: string;
}
