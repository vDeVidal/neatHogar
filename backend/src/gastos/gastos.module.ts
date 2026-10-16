import { Module } from '@nestjs/common';
import { HogaresModule } from '../hogares/hogares.module';
import { GastosController } from './gastos.controller';
import { GastosService } from './gastos.service';

@Module({
  imports: [HogaresModule],
  controllers: [GastosController],
  providers: [GastosService],
})
export class GastosModule {}
