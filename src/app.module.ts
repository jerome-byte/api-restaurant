import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlatsModule } from './plats/plats.module';
import { CommandesModule } from './commandes/commandes.module';
import { CommandesGateway } from './gateways/commandes.gateway';
import { ReservationsModule } from './reservations/reservations.module';
import { CategoriesModule } from './categories/categories.module';
import { EvenementsModule } from './evenements/evenements.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PlatsModule,
    CommandesModule,
    ReservationsModule,
    CategoriesModule,   // NOUVEAU
    EvenementsModule,   // NOUVEAU
  ],
  providers: [CommandesGateway],
})
export class AppModule {}