import { Module } from '@nestjs/common';
import { HogaresModule } from '../hogares/hogares.module';
import { UsuariosController } from './usuarios.controller';

@Module({
  imports: [HogaresModule],
  controllers: [UsuariosController],
})
export class UsuariosModule {}
