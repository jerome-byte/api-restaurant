import { Module } from '@nestjs/common';
import { CommandesController } from './commandes.controller';
import { CommandesService } from './commandes.service';
import { CommandesGateway } from '../gateways/commandes.gateway';

@Module({
  controllers: [CommandesController],
  providers: [CommandesService, CommandesGateway], // Ajout du Gateway ici
})
export class CommandesModule {}