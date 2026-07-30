import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { CommandesService } from './commandes.service';
import { CommandesGateway } from '../gateways/commandes.gateway';

@Controller('commandes')
export class CommandesController {
  constructor(
    private readonly commandesService: CommandesService,
    private readonly commandesGateway: CommandesGateway // Injection du temps réel
  ) {}

  @Post()
  async create(@Body() body: any) {
    return this.commandesService.createCommande(body);
  }

  // Route de TEST pour simuler un changement de statut depuis le navigateur
  // Exemple d'URL : http://localhost:3000/commandes/test-statut/VOTRE_ID_COMMANDE?statut=en_route
  @Get('test-statut/:id')
  async testStatut(@Param('id') id: string, @Query('statut') statut: string) {
    this.commandesGateway.emettreStatut(id, statut);
    return { message: `Statut '${statut}' émis pour la commande ${id}` };
  }
}