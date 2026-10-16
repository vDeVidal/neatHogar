import { IsEmail, IsEnum, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { RolMiembro } from '@prisma/client';

export class CrearHogarDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  nombre!: string;
}

export class UnirseHogarDto {
  @IsString()
  @Length(4, 12)
  codigo!: string;
}

export class InvitarMiembroDto {
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @IsOptional()
  @IsEnum(RolMiembro)
  rol?: RolMiembro;
}

export class CambiarRolDto {
  @IsEnum(RolMiembro)
  rol!: RolMiembro;
}
