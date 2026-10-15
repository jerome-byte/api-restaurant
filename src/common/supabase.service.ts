import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const OPTIONS_SERVEUR = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

/**
 * Accès à Supabase.
 *  - `admin`   : clé service_role (contourne la RLS) — réservé aux opérations système
 *                (paiement simulé, GPS simulé, vérification des sessions).
 *  - `anon`    : clé publique, pour les lectures publiques sans connexion.
 *  - `pourUtilisateur(token)` : agit AU NOM de l'utilisateur connecté → la RLS
 *                et les contrôles de rôle des fonctions SQL s'appliquent.
 */
@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  readonly admin: SupabaseClient;
  readonly anon: SupabaseClient;
  readonly serviceRoleDisponible: boolean;
  private readonly url: string;
  private readonly anonKey: string;

  constructor(config: ConfigService) {
    this.url = config.getOrThrow<string>('SUPABASE_URL');
    this.anonKey = config.getOrThrow<string>('SUPABASE_ANON_KEY');
    const serviceKey = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.serviceRoleDisponible = !!serviceKey;
    if (!serviceKey) {
      this.logger.warn(
        '⚠️  SUPABASE_SERVICE_ROLE_KEY manquante : paiement simulé, GPS simulé et gestion de l’équipe désactivés.',
      );
    }
    this.anon = createClient(this.url, this.anonKey, OPTIONS_SERVEUR);
    this.admin = createClient(
      this.url,
      serviceKey ?? this.anonKey,
      OPTIONS_SERVEUR,
    );
  }

  pourUtilisateur(token: string): SupabaseClient {
    return createClient(this.url, this.anonKey, {
      ...OPTIONS_SERVEUR,
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }
}
