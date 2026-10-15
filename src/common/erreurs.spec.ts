import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { nettoyer } from '../catalogue/crud.factory';
import { verifier, versHttp } from './erreurs';

describe('utilitaires API', () => {
  it('nettoyer garde seulement les champs autorisés et convertit "" en null', () => {
    expect(
      nettoyer({ nom_fr: 'A', prix: '', pirate: 1 }, ['nom_fr', 'prix']),
    ).toEqual({
      nom_fr: 'A',
      prix: null,
    });
  });

  it('convertit les codes PostgreSQL en erreurs HTTP', () => {
    expect(versHttp({ code: '42501', message: 'x' })).toBeInstanceOf(
      ForbiddenException,
    );
    expect(versHttp({ code: 'P0002', message: 'x' })).toBeInstanceOf(
      NotFoundException,
    );
    expect(versHttp({ code: 'P0001', message: 'Panier vide' }).message).toBe(
      'Panier vide',
    );
  });

  it('verifier renvoie les données ou lève une erreur', () => {
    expect(verifier({ data: [1], error: null })).toEqual([1]);
    expect(() => verifier({ data: null, error: null })).toThrow(
      NotFoundException,
    );
    expect(() =>
      verifier({ data: null, error: { code: 'P0001', message: 'non' } }),
    ).toThrow(BadRequestException);
  });
});
