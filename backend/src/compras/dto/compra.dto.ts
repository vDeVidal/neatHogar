import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { TipoCategoria } from '@prisma/client';

export class CrearItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cantidad?: string;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  id_categoria?: number | null;
}

export class ActualizarItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cantidad?: string;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsInt()
  id_categoria?: number | null;
}

export class FiltroItemsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  id_categoria?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  comprado?: boolean;
}

export class FiltroCategoriasDto {
  @IsOptional()
  @IsEnum(TipoCategoria)
  tipo?: TipoCategoria;
}

export class CrearCategoriaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  nombre!: string;

  @IsEnum(TipoCategoria)
  tipo!: TipoCategoria;
}
