import { Module } from '@nestjs/common';
import { HogaresModule } from '../hogares/hogares.module';
import { SuministrosController } from './suministros.controller';
import { SuministrosService } from './suministros.service';

@Module({
  imports: [HogaresModule],
  controllers: [SuministrosController],
  providers: [SuministrosService],
  exports: [SuministrosService],
})
export class SuministrosModule {}
