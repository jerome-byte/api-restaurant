import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CommandesService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_ANON_KEY')!,
    );
  }

  async createCommande(dto: any) {
    // 1. Vérification du paiement Mobile Money
    if (dto.mode_paiement !== 'especes') {
      const paiementValide = await this.verifierPaiementMobile(dto.client_phone, dto.montant_total, dto.mode_paiement);
      if (!paiementValide) {
        throw new Error('Paiement refusé ou annulé par le client.');
      }
    }

    // 2. Création de la commande
    const { data, error } = await this.supabase
      .from('commandes')
      .insert([{
        client_phone: dto.client_phone,
        adresse_livraison: dto.adresse_livraison,
        mode_paiement: dto.mode_paiement,
        montant_total: dto.montant_total,
        details_plats: dto.details_plats,
        statut: dto.mode_paiement === 'especes' ? 'en_attente' : 'payee_en_preparation'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Fonction mock pour Yas Money et Moov Money
  private async verifierPaiementMobile(phone: string, montant: number, operateur: string): Promise<boolean> {
    console.log(`🟡 Demande de ${montant} FCFA envoyée au ${operateur.toUpperCase()} pour le ${phone}...`);
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`🟢 Paiement ${operateur.toUpperCase()} validé avec succès !`);
        resolve(true);
      }, 1000);
    });
  }
}