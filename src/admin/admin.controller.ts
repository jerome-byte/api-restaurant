import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  ClientSupabase,
  Public,
  Roles,
  STAFF,
  UtilisateurCourant,
  type Utilisateur,
} from '../common/auth';
import { verifier, versHttp } from '../common/erreurs';
import { SupabaseService } from '../common/supabase.service';
import { nettoyer } from '../catalogue/crud.factory';

const ROLES_STAFF = ['admin', 'gerant', 'cuisine', 'livreur'] as const;

export class CreerMembreDto {
  @IsEmail({}, { message: 'Email invalide.' }) email!: string;
  @IsString()
  @MinLength(6, { message: 'Mot de passe : 6 caractères minimum.' })
  password!: string;
  @IsString() @MaxLength(80) nom!: string;
  @IsOptional() @IsString() @MaxLength(20) telephone?: string;
  @IsIn(ROLES_STAFF) role!: string;
}

export class MajMembreDto {
  @IsOptional() @IsIn(['client', ...ROLES_STAFF]) role?: string;
  @IsOptional() @IsBoolean() actif?: boolean;
  @IsOptional() @IsString() @MaxLength(80) nom?: string;
  @IsOptional() @IsString() @MaxLength(20) telephone?: string;
}

export class HoraireDto {
  @Type(() => Number) @IsInt() @Min(0) @Max(6) jour!: number;
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/) ouverture!: string;
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/) fermeture!: string;
  @IsBoolean() ferme!: boolean;
}
export class HorairesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HoraireDto)
  horaires!: HoraireDto[];
}

export class PositionDto {
  @IsNumber() latitude!: number;
  @IsNumber() longitude!: number;
}

export class DiffusionDto {
  @IsString() @MaxLength(80) titre!: string;
  @IsString() @MaxLength(300) message!: string;
  @IsOptional() @IsIn(['clients', 'staff']) cible?: 'clients' | 'staff';
}

const CHAMPS_PARAMETRES = [
  'nom_restaurant',
  'slogan',
  'telephone',
  'email',
  'adresse',
  'latitude',
  'longitude',
  'logo_url',
  'mode_ouverture',
  'message_fermeture',
  'livraison_active',
  'emporter_active',
  'reservation_active',
  'reservation_auto_confirmee',
  'capacite_par_creneau',
  'duree_creneau_min',
  'delai_min_reservation_min',
  'frais_livraison_defaut',
  'temps_preparation_moyen',
  'fidelite_active',
  'fidelite_tranche',
  'fidelite_valeur_point',
  'fidelite_seuil',
  'simulation_paiement',
  'simulation_gps',
];

@Controller()
export class AdminController {
  constructor(private readonly supa: SupabaseService) {}

  @Public()
  @Get()
  sante() {
    return {
      service: 'API Carnivore',
      statut: 'ok',
      version: '2.1.0',
      service_role: this.supa.serviceRoleDisponible,
      date: new Date().toISOString(),
    };
  }

  // ---------------- Restaurant ----------------
  @Public()
  @Get('restaurant')
  async restaurant(@ClientSupabase() db: SupabaseClient) {
    return verifier(await db.rpc('infos_restaurant'));
  }

  @Get('parametres')
  @Roles('admin', 'gerant')
  async parametres(@ClientSupabase() db: SupabaseClient) {
    return verifier(
      await db.from('parametres').select('*').eq('id', 1).single(),
    );
  }

  @Patch('parametres')
  @Roles('admin', 'gerant')
  async majParametres(
    @ClientSupabase() db: SupabaseClient,
    @Body() body: Record<string, unknown>,
  ) {
    return verifier(
      await db
        .from('parametres')
        .update(nettoyer(body, CHAMPS_PARAMETRES))
        .eq('id', 1)
        .select()
        .single(),
    );
  }

  @Put('horaires')
  @Roles('admin', 'gerant')
  async majHoraires(
    @ClientSupabase() db: SupabaseClient,
    @Body() dto: HorairesDto,
  ) {
    const { error } = await db.from('horaires').upsert(dto.horaires);
    if (error) throw versHttp(error);
    return verifier(await db.from('horaires').select('*').order('jour'));
  }

  // ---------------- Tableau de bord ----------------
  @Get('stats')
  @Roles('admin', 'gerant')
  async stats(
    @ClientSupabase() db: SupabaseClient,
    @Query('debut') debut?: string,
    @Query('fin') fin?: string,
  ) {
    const args: Record<string, string> = {};
    if (debut) args.p_debut = debut;
    if (fin) args.p_fin = fin;
    return verifier(await db.rpc('stats_dashboard', args));
  }

  @Get('compteurs')
  @Roles(...STAFF)
  async compteurs(@ClientSupabase() db: SupabaseClient) {
    return verifier(await db.rpc('compteurs_staff'));
  }

  // ---------------- Cuisine : rupture de stock ----------------
  @Patch('plats/:id/rupture')
  @Roles('admin', 'gerant', 'cuisine')
  async rupture(
    @ClientSupabase() db: SupabaseClient,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { en_rupture: boolean },
  ) {
    return verifier(
      await db
        .from('plats')
        .update({ en_rupture: !!body?.en_rupture })
        .eq('id', id)
        .select('id, nom_fr, en_rupture')
        .single(),
    );
  }

  // ---------------- Livreurs ----------------
  @Get('livreurs')
  @Roles(...STAFF)
  async livreurs(@ClientSupabase() db: SupabaseClient) {
    return verifier(
      await db
        .from('profiles')
        .select('id, nom, telephone, email, actif, avatar_url, livreurs(*)')
        .eq('role', 'livreur')
        .order('nom'),
    );
  }

  @Patch('livreurs/:id')
  @Roles('admin', 'gerant')
  async majLivreur(
    @ClientSupabase() db: SupabaseClient,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return verifier(
      await db
        .from('livreurs')
        .update(nettoyer(body, ['vehicule', 'immatriculation', 'disponible']))
        .eq('id', id)
        .select()
        .single(),
    );
  }

  @Post('livreurs/position')
  @Roles('livreur')
  async position(
    @ClientSupabase() db: SupabaseClient,
    @Body() dto: PositionDto,
  ) {
    verifier(
      await db.rpc('maj_position_livreur', {
        p_lat: dto.latitude,
        p_lng: dto.longitude,
      }),
    );
    return { ok: true };
  }

  // ---------------- Équipe ----------------
  @Get('equipe')
  @Roles('admin', 'gerant')
  async equipe(@ClientSupabase() db: SupabaseClient) {
    return verifier(
      await db
        .from('profiles')
        .select('*')
        .neq('role', 'client')
        .order('role')
        .order('nom'),
    );
  }

  @Post('equipe')
  @Roles('admin')
  async creerMembre(@Body() dto: CreerMembreDto) {
    if (!this.supa.serviceRoleDisponible) {
      throw new ServiceUnavailableException(
        'Clé service_role manquante sur le serveur.',
      );
    }
    const { data, error } = await this.supa.admin.auth.admin.createUser({
      email: dto.email.trim().toLowerCase(),
      password: dto.password,
      email_confirm: true,
      user_metadata: { nom: dto.nom, telephone: dto.telephone },
    });
    if (error || !data.user) {
      throw new BadRequestException(
        error?.message?.includes('already')
          ? 'Un compte existe déjà avec cet email.'
          : error?.message,
      );
    }
    return verifier(
      await this.supa.admin
        .from('profiles')
        .update({
          role: dto.role,
          nom: dto.nom,
          telephone: dto.telephone ?? null,
        })
        .eq('id', data.user.id)
        .select()
        .single(),
    );
  }

  @Patch('equipe/:id')
  @Roles('admin')
  async majMembre(
    @ClientSupabase() db: SupabaseClient,
    @UtilisateurCourant() u: Utilisateur,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MajMembreDto,
  ) {
    if (
      id === u.id &&
      ((dto.role !== undefined && dto.role !== 'admin') || dto.actif === false)
    ) {
      throw new BadRequestException(
        'Vous ne pouvez pas retirer vos propres droits administrateur.',
      );
    }
    return verifier(
      await db.from('profiles').update(dto).eq('id', id).select().single(),
    );
  }

  // ---------------- Notifications ----------------
  @Post('notifications/diffuser')
  @Roles('admin', 'gerant')
  async diffuser(
    @ClientSupabase() db: SupabaseClient,
    @Body() dto: DiffusionDto,
  ) {
    return verifier(
      await db
        .from('notifications')
        .insert({
          cible: dto.cible ?? 'clients',
          titre: dto.titre,
          message: dto.message,
          type: 'info',
        })
        .select()
        .single(),
    );
  }
}
