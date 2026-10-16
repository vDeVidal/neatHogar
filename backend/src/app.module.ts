import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { UsuariosModule } from './usuarios/usuarios.module';
import { HogaresModule } from './hogares/hogares.module';
import { TareasModule } from './tareas/tareas.module';
import { ComprasModule } from './compras/compras.module';
import { EstadisticasModule } from './estadisticas/estadisticas.module';
import { GastosModule } from './gastos/gastos.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    HogaresModule,
    TareasModule,
    ComprasModule,
    EstadisticasModule,
    GastosModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
