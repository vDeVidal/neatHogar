import { Module } from '@nestjs/common';
import { HogaresModule } from '../hogares/hogares.module';
import { CategoriasController, ComprasController } from './compras.controller';
import { ComprasService } from './compras.service';

@Module({
  imports: [HogaresModule],
  controllers: [CategoriasController, ComprasController],
  providers: [ComprasService],
})
export class ComprasModule {}
