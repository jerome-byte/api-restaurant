import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

export type Role = 'client' | 'admin' | 'gerant' | 'cuisine' | 'livreur';
export const STAFF: Role[] = ['admin', 'gerant', 'cuisine', 'livreur'];

export interface Utilisateur {
  id: string;
  email?: string;
  role: Role;
  nom?: string | null;
  token: string;
}

const CLE_PUBLIC = 'route_publique';
const CLE_ROLES = 'roles_autorises';

/** Route accessible sans connexion (l'utilisateur est quand même identifié si un jeton est fourni). */
export const Public = () => SetMetadata(CLE_PUBLIC, true);
/** Restreint la route à certains rôles. */
export const Roles = (...roles: Role[]) => SetMetadata(CLE_ROLES, roles);

export const UtilisateurCourant = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Utilisateur | undefined =>
    ctx.switchToHttp().getRequest<{ utilisateur?: Utilisateur }>().utilisateur,
);

/** Client Supabase à utiliser pour la requête (celui de l'utilisateur, sinon anonyme). */
export const ClientSupabase = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): SupabaseClient =>
    ctx.switchToHttp().getRequest<{ supabase: SupabaseClient }>().supabase,
);

@Injectable()
export class AuthGuard implements CanActivate {
  private cache = new Map<
    string,
    { u: Omit<Utilisateur, 'token'>; expire: number }
  >();

  constructor(
    private readonly reflector: Reflector,
    private readonly supa: SupabaseService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true;
    const cibles = [ctx.getHandler(), ctx.getClass()];
    const estPublic = this.reflector.getAllAndOverride<boolean>(
      CLE_PUBLIC,
      cibles,
    );
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(
      CLE_ROLES,
      cibles,
    );
    const req = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      utilisateur?: Utilisateur;
      supabase: SupabaseClient;
    }>();

    req.supabase = this.supa.anon;
    const entete = req.headers['authorization'] ?? '';
    const token = entete.startsWith('Bearer ') ? entete.slice(7).trim() : '';

    if (!token) {
      if (estPublic) return true;
      throw new UnauthorizedException('Connexion requise.');
    }

    const u = await this.identifier(token);
    if (!u) {
      if (estPublic) return true;
      throw new UnauthorizedException('Session expirée, reconnectez-vous.');
    }
    req.utilisateur = { ...u, token };
    req.supabase = this.supa.pourUtilisateur(token);

    if (roles?.length && !roles.includes(u.role)) {
      throw new ForbiddenException(
        'Vous n’avez pas les droits pour cette action.',
      );
    }
    return true;
  }

  private async identifier(
    token: string,
  ): Promise<Omit<Utilisateur, 'token'> | null> {
    const now = Date.now();
    const enCache = this.cache.get(token);
    if (enCache && enCache.expire > now) return enCache.u;

    const { data, error } = await this.supa.anon.auth.getUser(token);
    if (error || !data.user) return null;

    const client = this.supa.pourUtilisateur(token);
    const { data: profil } = await client
      .from('profiles')
      .select('role, nom, actif')
      .eq('id', data.user.id)
      .maybeSingle<{ role: Role; nom: string | null; actif: boolean }>();
    if (profil && profil.actif === false) {
      throw new ForbiddenException('Ce compte est désactivé.');
    }
    const u = {
      id: data.user.id,
      email: data.user.email,
      role: profil?.role ?? 'client',
      nom: profil?.nom,
    };
    if (this.cache.size > 500) this.cache.clear();
    this.cache.set(token, { u, expire: now + 60_000 });
    return u;
  }
}
