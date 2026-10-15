import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

interface ErreurSupabase {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
}

/** Convertit une erreur PostgreSQL / PostgREST en erreur HTTP lisible (en français). */
export function versHttp(e: ErreurSupabase): HttpException {
  const msg = e.message || 'Erreur inconnue';
  switch (e.code) {
    case '42501':
      return new ForbiddenException(
        msg.includes('row-level security') ? 'Action non autorisée.' : msg,
      );
    case 'P0002':
    case 'PGRST116':
      return new NotFoundException(
        msg.includes('JSON object') ? 'Élément introuvable.' : msg,
      );
    case '28000':
      return new UnauthorizedException(msg);
    case '23505':
      return new ConflictException('Cet élément existe déjà (doublon).');
    case '23503':
      return new BadRequestException('Cet élément est lié à d’autres données.');
    case '22P02':
      return new BadRequestException('Valeur invalide envoyée.');
    default:
      return new BadRequestException(msg);
  }
}

/** Renvoie `data` ou lève l'erreur HTTP correspondante (404 si vide). */
export function verifier<T>(res: {
  data: T;
  error: ErreurSupabase | null;
}): NonNullable<T> {
  if (res.error) throw versHttp(res.error);
  if (res.data === null || res.data === undefined)
    throw new NotFoundException('Élément introuvable.');
  return res.data;
}
