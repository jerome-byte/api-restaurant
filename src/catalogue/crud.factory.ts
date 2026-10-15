import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  SetMetadata,
  Type,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ClientSupabase, Roles, type Role } from '../common/auth';
import { verifier, versHttp } from '../common/erreurs';

export interface ConfigCrud {
  /** chemin de l'URL, ex : "plats" */
  chemin: string;
  /** table Supabase */
  table: string;
  /** colonnes acceptées en écriture (tout le reste est ignoré) */
  champs: string[];
  select?: string;
  tri?: { colonne: string; asc: boolean }[];
  /** lecture sans connexion ? (la RLS masque quand même les éléments inactifs) */
  lecturePublique?: boolean;
  rolesLecture?: Role[];
  rolesEcriture?: Role[];
}

/** Garde uniquement les champs autorisés, et transforme "" en null. */
export function nettoyer(body: Record<string, unknown>, champs: string[]) {
  const out: Record<string, unknown> = {};
  for (const c of champs) {
    if (body && c in body) {
      const v = body[c];
      out[c] = typeof v === 'string' && v.trim() === '' ? null : v;
    }
  }
  return out;
}

/**
 * Fabrique un contrôleur CRUD complet (GET / POST / PATCH / DELETE)
 * pour une table du catalogue. Les droits réels sont garantis par la RLS.
 */
export function ControleurCrud(cfg: ConfigCrud): Type<unknown> {
  const ecriture = cfg.rolesEcriture ?? ['admin', 'gerant'];
  const select = cfg.select ?? '*';

  @Controller(cfg.chemin)
  class CrudController {
    @Get()
    @SetMetadata('route_publique', !!cfg.lecturePublique)
    @Roles(...(cfg.rolesLecture ?? []))
    async lister(@ClientSupabase() db: SupabaseClient) {
      let q = db.from(cfg.table).select(select);
      for (const t of cfg.tri ?? [{ colonne: 'created_at', asc: false }]) {
        q = q.order(t.colonne, { ascending: t.asc });
      }
      return verifier(await q);
    }

    @Get(':id')
    @SetMetadata('route_publique', !!cfg.lecturePublique)
    @Roles(...(cfg.rolesLecture ?? []))
    async lire(
      @ClientSupabase() db: SupabaseClient,
      @Param('id', ParseUUIDPipe) id: string,
    ) {
      return verifier(
        await db.from(cfg.table).select(select).eq('id', id).single(),
      );
    }

    @Post()
    @Roles(...ecriture)
    async creer(
      @ClientSupabase() db: SupabaseClient,
      @Body() body: Record<string, unknown>,
    ) {
      return verifier(
        await db
          .from(cfg.table)
          .insert(nettoyer(body, cfg.champs))
          .select(select)
          .single(),
      );
    }

    @Patch(':id')
    @Roles(...ecriture)
    async modifier(
      @ClientSupabase() db: SupabaseClient,
      @Param('id', ParseUUIDPipe) id: string,
      @Body() body: Record<string, unknown>,
    ) {
      return verifier(
        await db
          .from(cfg.table)
          .update(nettoyer(body, cfg.champs))
          .eq('id', id)
          .select(select)
          .single(),
      );
    }

    @Delete(':id')
    @Roles(...ecriture)
    async supprimer(
      @ClientSupabase() db: SupabaseClient,
      @Param('id', ParseUUIDPipe) id: string,
    ) {
      const { error } = await db.from(cfg.table).delete().eq('id', id);
      if (error) throw versHttp(error);
      return { supprime: true };
    }
  }

  Object.defineProperty(CrudController, 'name', {
    value: `Crud_${cfg.table}_Controller`,
  });
  return CrudController;
}
