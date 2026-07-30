export class CreateCommandeDto {
  client_phone!: string;
  adresse_livraison!: string;
  mode_paiement!: 'especes' | 'yas' | 'moov';
  montant_total!: number;
  details_plats!: any[];
}