import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AdminController } from './admin/admin.controller';
import { CONTROLEURS_CATALOGUE } from './catalogue/catalogue';
import { AuthGuard } from './common/auth';
import { SupabaseService } from './common/supabase.service';
import { CommandesController } from './commandes/commandes.controller';
import { PaiementsController } from './paiements/paiements.controller';
import { EventsGateway } from './realtime/events.gateway';
import { GpsSimulationService } from './realtime/gps-simulation.service';
import { PushService } from './realtime/push.service';
import { ReservationsController } from './reservations/reservations.controller';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [
    AdminController,
    CommandesController,
    PaiementsController,
    ReservationsController,
    ...CONTROLEURS_CATALOGUE,
  ],
  providers: [
    SupabaseService,
    EventsGateway,
    GpsSimulationService,
    PushService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
