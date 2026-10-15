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
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ClientSupabase,
  Public,
  Roles,
  UtilisateurCourant,
  type Utilisateur,
} from '../common/auth';
import { verifier } from '../common/erreurs';

export class CreerReservationDto {
  @IsDateString() date_heure!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) nombre_personnes!: number;
  @IsOptional() @IsString() @MaxLength(40) zone?: string;
  @IsOptional() @IsString() @MaxLength(80) client_nom?: string;
  @IsOptional() @IsString() @MaxLength(20) client_phone?: string;
  @IsOptional() @IsString() @MaxLength(60) occasion?: string;
  @IsOptional() @IsString() @MaxLength(300) notes?: string;
}

export class MajReservationDto {
  @IsOptional()
  @IsIn(['en_attente', 'confirmee', 'arrivee', 'terminee', 'annulee', 'absent'])
  statut?: string;
  @IsOptional() @IsUUID() table_id?: string | null;
  @IsOptional() @IsString() @MaxLength(300) motif_annulation?: string;
  @IsOptional() @IsString() @MaxLength(300) notes?: string;
}

@Controller('reservations')
export class ReservationsController {
  @Public()
  @Get('disponibilite')
  async disponibilite(
    @ClientSupabase() db: SupabaseClient,
    @Query('date_heure') dateHeure: string,
    @Query('personnes') personnes = '2',
  ) {
    return verifier(
      await db.rpc('disponibilite_reservation', {
        p_date_heure: dateHeure,
        p_personnes: Number(personnes) || 2,
      }),
    );
  }

  @Post()
  async creer(
    @ClientSupabase() db: SupabaseClient,
    @Body() dto: CreerReservationDto,
  ) {
    return verifier(await db.rpc('creer_reservation', { p: dto }).single());
  }

  @Get()
  async lister(
    @ClientSupabase() db: SupabaseClient,
    @Query('depuis') depuis?: string,
  ) {
    let q = db
      .from('reservations')
      .select('*, tables_restaurant(numero, zone)')
      .order('date_heure', { ascending: true });
    if (depuis) q = q.gte('date_heure', depuis);
    return verifier(await q);
  }

  @Patch(':id')
  @Roles('admin', 'gerant')
  async modifier(
    @ClientSupabase() db: SupabaseClient,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MajReservationDto,
  ) {
    return verifier(
      await db.from('reservations').update(dto).eq('id', id).select().single(),
    );
  }

  @Post(':id/annuler')
  async annuler(
    @ClientSupabase() db: SupabaseClient,
    @UtilisateurCourant() u: Utilisateur,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { motif?: string },
  ) {
    if (u.role === 'client') {
      return verifier(
        await db
          .rpc('annuler_ma_reservation', {
            p_id: id,
            p_motif: body?.motif ?? null,
          })
          .single(),
      );
    }
    return verifier(
      await db
        .from('reservations')
        .update({ statut: 'annulee', motif_annulation: body?.motif ?? null })
        .eq('id', id)
        .select()
        .single(),
    );
  }
}
