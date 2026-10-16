import { Module } from '@nestjs/common';
import { HogaresController } from './hogares.controller';
import { HogaresService } from './hogares.service';

@Module({
  controllers: [HogaresController],
  providers: [HogaresService],
  exports: [HogaresService],
})
export class HogaresModule {}
