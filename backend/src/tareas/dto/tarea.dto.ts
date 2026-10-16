import { Type } from 'class-transformer';
import {
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

/** Campos opcionales comunes a la creación y edición de tareas. */
class CamposTareaDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  /** id_usuario del miembro asignado (null = sin asignar). */
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
