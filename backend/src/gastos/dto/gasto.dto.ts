import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CrearGastoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  concepto!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  monto!: number;

  @IsOptional()
  @IsDateString()
  fecha?: string;
}

export class FiltroGastosDto {
  /** Mes en formato YYYY-MM. Por defecto, el mes actual. */
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'mes debe tener formato YYYY-MM' })
  mes?: string;
}
