import { Module } from '@nestjs/common';
import { PlatsController } from './plats.controller';
import { PlatsService } from './plats.service';

@Module({
  controllers: [PlatsController],
  providers: [PlatsService],
})
export class PlatsModule {}