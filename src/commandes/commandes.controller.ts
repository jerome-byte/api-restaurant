import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ClientSupabase,
  Roles,
  STAFF,
  UtilisateurCourant,
  type Utilisateur,
} from '../common/auth';
import { verifier } from '../common/erreurs';
import { EventsGateway } from '../realtime/events.gateway';
import { GpsSimulationService } from '../realtime/gps-simulation.service';
import {
  AnnulerDto,
  AssignerLivreurDto,
  ChangerStatutDto,
  CreerCommandeDto,
  STATUTS_COMMANDE,
  ValiderCodePromoDto,
} from './commandes.dto';

const SELECT_DETAIL =
  '*, commande_items(*), commande_historique(statut, note, created_at), paiements(*), zones_livraison(nom)';

type Commande = {
  id: string;
  statut: string;
  latitude: number | null;
  longitude: number | null;
  livreur_id: string | null;
  livreur_lat: number | null;
  livreur_lng: number | null;
  [k: string]: unknown;
};

@Controller()
export class CommandesController {
  constructor(
    private readonly gateway: EventsGateway,
    private readonly gps: GpsSimulationService,
  ) {}

  /** Passer une commande (client connecté). Les montants sont recalculés en base. */
  @Post('commandes')
  async creer(
    @ClientSupabase() db: SupabaseClient,
    @Body() dto: CreerCommandeDto,
  ) {
    const cmd = verifier(
      await db.rpc('creer_commande', { p: dto }).single<Commande>(),
    );
    this.gateway.nouvelleCommande(cmd);
    return cmd;
  }

  /** Liste des commandes : celles du client, ou toutes pour le personnel. */
  @Get('commandes')
  async lister(
    @ClientSupabase() db: SupabaseClient,
    @Query('statut') statut?: string,
    @Query('limite') limite = '100',
  ) {
    let q = db
      .from('commandes')
      .select('*, commande_items(nom, quantite, total)')
      .order('created_at', { ascending: false })
      .limit(Math.min(Number(limite) || 100, 500));
    const statuts = (statut ?? '')
      .split(',')
      .filter((s) => (STATUTS_COMMANDE as readonly string[]).includes(s));
    if (statuts.length) q = q.in('statut', statuts);
    return verifier(await q);
  }

  @Get('commandes/:id')
  async detail(
    @ClientSupabase() db: SupabaseClient,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return verifier(
      await db.from('commandes').select(SELECT_DETAIL).eq('id', id).single(),
    );
  }

  /** Faire avancer une commande (cuisine, livreur, gérant…). */
  @Patch('commandes/:id/statut')
  @Roles(...STAFF)
  async changerStatut(
    @ClientSupabase() db: SupabaseClient,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangerStatutDto,
  ) {
    const cmd = verifier(
      await db
        .rpc('changer_statut_commande', {
          p_id: id,
          p_statut: dto.statut,
          p_note: dto.note ?? null,
        })
        .single<Commande>(),
    );
    this.gateway.commandeMiseAJour(cmd);
    if (cmd.statut === 'en_route') void this.gps.demarrer(cmd);
    if (cmd.statut === 'livree' || cmd.statut === 'annulee')
      this.gps.arreter(cmd.id);
    return cmd;
  }

  @Patch('commandes/:id/livreur')
  @Roles('admin', 'gerant', 'livreur')
  async assigner(
    @ClientSupabase() db: SupabaseClient,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignerLivreurDto,
  ) {
    const cmd = verifier(
      await db
        .rpc('assigner_livreur', {
          p_commande: id,
          p_livreur: dto.livreur_id ?? null,
        })
        .single<Commande>(),
    );
    this.gateway.commandeMiseAJour(cmd);
    return cmd;
  }

  /** Le client annule sa commande (seulement tant qu'elle n'est pas acceptée). */
  @Post('commandes/:id/annuler')
  async annuler(
    @ClientSupabase() db: SupabaseClient,
    @UtilisateurCourant() u: Utilisateur,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AnnulerDto,
  ) {
    const fn =
      u.role === 'client' ? 'annuler_ma_commande' : 'changer_statut_commande';
    const args =
      u.role === 'client'
        ? { p_id: id, p_motif: dto.motif ?? null }
        : { p_id: id, p_statut: 'annulee', p_note: dto.motif ?? null };
    const cmd = verifier(await db.rpc(fn, args).single<Commande>());
    this.gateway.commandeMiseAJour(cmd);
    this.gps.arreter(cmd.id);
    return cmd;
  }

  @Post('codes-promo/valider')
  async validerCode(
    @ClientSupabase() db: SupabaseClient,
    @Body() dto: ValiderCodePromoDto,
  ) {
    return verifier(
      await db.rpc('valider_code_promo', {
        p_code: dto.code,
        p_sous_total: dto.sous_total,
      }),
    );
  }
}
