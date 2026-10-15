import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { SupabaseService } from '../common/supabase.service';
import { EventsGateway } from './events.gateway';

interface CommandeGps {
  id: string;
  statut: string;
  latitude: number | null;
  longitude: number | null;
  livreur_id: string | null;
  livreur_lat: number | null;
  livreur_lng: number | null;
}

const ETAPES = 40; // nombre de positions envoyées
const INTERVALLE_MS = 3000; // toutes les 3 s → ~2 minutes de trajet

/**
 * 🛵 SIMULATION GPS DU LIVREUR
 * Tant qu'aucune vraie position n'est envoyée par le livreur, l'API fait
 * avancer un point du restaurant vers le client. À remplacer par le vrai GPS
 * (application livreur) plus tard : il suffira de désactiver "simulation_gps"
 * dans les paramètres.
 */
@Injectable()
export class GpsSimulationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GpsSimulationService.name);
  private readonly trajets = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly supa: SupabaseService,
    private readonly gateway: EventsGateway,
  ) {}

  async onModuleInit() {
    if (!this.supa.serviceRoleDisponible) return;
    // reprend les livraisons en cours après un redémarrage du serveur
    const { data } = await this.supa.admin
      .from('commandes')
      .select(
        'id, statut, latitude, longitude, livreur_id, livreur_lat, livreur_lng',
      )
      .eq('statut', 'en_route');
    for (const cmd of (data ?? []) as CommandeGps[]) void this.demarrer(cmd);
  }

  onModuleDestroy() {
    for (const t of this.trajets.values()) clearInterval(t);
    this.trajets.clear();
  }

  async demarrer(cmd: CommandeGps) {
    if (!this.supa.serviceRoleDisponible || this.trajets.has(cmd.id)) return;

    const { data: p } = await this.supa.admin
      .from('parametres')
      .select('simulation_gps, latitude, longitude')
      .eq('id', 1)
      .single<{
        simulation_gps: boolean;
        latitude: number;
        longitude: number;
      }>();
    if (!p?.simulation_gps) return;

    // Un vrai livreur partage déjà sa position ? On ne simule pas.
    if (cmd.livreur_id) {
      const { data: l } = await this.supa.admin
        .from('livreurs')
        .select('position_maj_at')
        .eq('id', cmd.livreur_id)
        .maybeSingle<{ position_maj_at: string | null }>();
      if (
        l?.position_maj_at &&
        Date.now() - new Date(l.position_maj_at).getTime() < 120_000
      )
        return;
    }

    const depart = {
      lat: cmd.livreur_lat ?? p.latitude,
      lng: cmd.livreur_lng ?? p.longitude,
    };
    const arrivee = {
      lat: cmd.latitude ?? p.latitude + 0.012,
      lng: cmd.longitude ?? p.longitude + 0.009,
    };

    let etape = 0;
    this.logger.log(`🛵 Simulation GPS démarrée pour ${cmd.id}`);
    const timer = setInterval(() => {
      etape++;
      const t = Math.min(etape / ETAPES, 1);
      // petite courbe + bruit pour un trajet réaliste
      const bruit = t < 1 ? (Math.random() - 0.5) * 0.0004 : 0;
      const courbe = Math.sin(t * Math.PI) * 0.002;
      const lat = depart.lat + (arrivee.lat - depart.lat) * t + courbe + bruit;
      const lng =
        depart.lng + (arrivee.lng - depart.lng) * t - courbe / 2 + bruit;

      void this.supa.admin
        .from('commandes')
        .update({ livreur_lat: lat, livreur_lng: lng })
        .eq('id', cmd.id)
        .eq('statut', 'en_route')
        .select('id')
        .then(({ data, error }) => {
          if (error || !data?.length) return this.arreter(cmd.id); // commande livrée/annulée
          this.gateway.position(cmd.id, lat, lng);
          if (t >= 1) this.arreter(cmd.id);
        });
    }, INTERVALLE_MS);
    this.trajets.set(cmd.id, timer);
  }

  arreter(commandeId: string) {
    const t = this.trajets.get(commandeId);
    if (t) {
      clearInterval(t);
      this.trajets.delete(commandeId);
    }
  }
}
