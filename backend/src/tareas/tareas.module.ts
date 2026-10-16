import { Module } from '@nestjs/common';
import { HogaresModule } from '../hogares/hogares.module';
import { TareasController } from './tareas.controller';
import { TareasService } from './tareas.service';

@Module({
  imports: [HogaresModule],
  controllers: [TareasController],
  providers: [TareasService],
})
export class TareasModule {}
