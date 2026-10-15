import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const STATUTS_COMMANDE = [
  'en_attente',
  'confirmee',
  'en_preparation',
  'prete',
  'en_route',
  'livree',
  'annulee',
] as const;
export type StatutCommande = (typeof STATUTS_COMMANDE)[number];

export class LigneCommandeDto {
  @IsUUID() plat_id!: string;
  @IsInt() @Min(1) quantite!: number;
  @IsOptional() @IsString() @MaxLength(200) notes?: string;
}

export class CreerCommandeDto {
  @IsIn(['livraison', 'emporter']) type!: 'livraison' | 'emporter';
  @IsArray()
  @ArrayMinSize(1, { message: 'Votre panier est vide.' })
  @ValidateNested({ each: true })
  @Type(() => LigneCommandeDto)
  items!: LigneCommandeDto[];
  @IsOptional() @IsUUID() zone_id?: string;
  @IsOptional() @IsString() @MaxLength(300) adresse_livraison?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() @MaxLength(300) instructions?: string;
  @IsOptional() @IsString() @MaxLength(80) client_nom?: string;
  @IsOptional() @IsString() @MaxLength(20) client_phone?: string;
  @IsIn(['especes', 'yas', 'moov']) mode_paiement!: 'especes' | 'yas' | 'moov';
  @IsOptional() @IsString() @MaxLength(40) code_promo?: string;
  @IsOptional() @IsInt() @Min(0) points_utilises?: number;
}

export class ChangerStatutDto {
  @IsIn(STATUTS_COMMANDE) statut!: StatutCommande;
  @IsOptional() @IsString() @MaxLength(300) note?: string;
}

export class AssignerLivreurDto {
  @IsOptional() @IsUUID() livreur_id?: string | null;
}

export class AnnulerDto {
  @IsOptional() @IsString() @MaxLength(300) motif?: string;
}

export class ValiderCodePromoDto {
  @IsString() @MaxLength(40) code!: string;
  @IsNumber() @Min(0) sous_total!: number;
}
