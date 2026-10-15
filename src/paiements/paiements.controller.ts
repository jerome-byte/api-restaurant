import {
  BadRequestException,
  Body,
  Controller,
  NotImplementedException,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { ClientSupabase } from '../common/auth';
import { verifier } from '../common/erreurs';
import { SupabaseService } from '../common/supabase.service';
import { EventsGateway } from '../realtime/events.gateway';

export class SimulerPaiementDto {
  @IsUUID() commande_id!: string;
  @IsIn(['yas', 'moov']) operateur!: 'yas' | 'moov';
  @IsString()
  @Matches(/^\+?[0-9 ]{8,15}$/, { message: 'Numéro de téléphone invalide.' })
  telephone!: string;
  @IsOptional() @IsString() @MaxLength(6) pin?: string;
}

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 💳 PAIEMENT MOBILE MONEY — MODE SIMULATION
 * Reproduit le parcours Yas Money / Moov Money :
 *   - délai de validation ~2,5 s
 *   - code PIN "0000" → paiement refusé (pour tester les erreurs)
 *   - tout autre code → paiement accepté
 * Pour brancher les vraies API plus tard : remplacer le bloc "SIMULATION"
 * par l'appel à l'opérateur, puis appeler la même fonction SQL
 * enregistrer_paiement() avec p_simule = false.
 */
@Controller('paiements')
export class PaiementsController {
  constructor(
    private readonly supa: SupabaseService,
    private readonly gateway: EventsGateway,
  ) {}

  @Post('simuler')
  async simuler(
    @ClientSupabase() db: SupabaseClient,
    @Body() dto: SimulerPaiementDto,
  ) {
    if (!this.supa.serviceRoleDisponible) {
      throw new ServiceUnavailableException(
        'Paiement indisponible : clé service_role non configurée sur le serveur.',
      );
    }
    const { data: param } = await this.supa.admin
      .from('parametres')
      .select('simulation_paiement')
      .eq('id', 1)
      .single<{ simulation_paiement: boolean }>();
    if (!param?.simulation_paiement) {
      throw new NotImplementedException(
        'Le paiement réel n’est pas encore branché.',
      );
    }

    // La commande doit être visible par l'utilisateur (= c'est la sienne)
    const cmd = verifier(
      await db
        .from('commandes')
        .select('id, statut, statut_paiement, montant_total, numero')
        .eq('id', dto.commande_id)
        .single<{
          id: string;
          statut: string;
          statut_paiement: string;
          montant_total: number;
          numero: string;
        }>(),
    );
    if (cmd.statut_paiement === 'paye')
      throw new BadRequestException('Cette commande est déjà payée.');
    if (cmd.statut === 'annulee')
      throw new BadRequestException('Cette commande est annulée.');

    // ---------------- SIMULATION ----------------
    await attendre(2500);
    const succes = dto.pin !== '0000';
    const reference = `SIM-${dto.operateur.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const message = succes
      ? `Paiement de ${cmd.montant_total} FCFA accepté.`
      : 'Paiement refusé : solde insuffisant ou code incorrect.';
    // ---------------------------------------------

    const paiement = verifier(
      await this.supa.admin
        .rpc('enregistrer_paiement', {
          p_commande: cmd.id,
          p_operateur: dto.operateur,
          p_telephone: dto.telephone,
          p_succes: succes,
          p_reference: reference,
          p_message: message,
          p_simule: true,
        })
        .single(),
    );
    this.gateway.paiement(cmd.id, { succes, reference, message });
    return { succes, reference, message, paiement };
  }
}
