import { ControleurCrud } from './crud.factory';

export const CategoriesController = ControleurCrud({
  chemin: 'categories',
  table: 'categories',
  lecturePublique: true,
  tri: [
    { colonne: 'ordre_affichage', asc: true },
    { colonne: 'nom_fr', asc: true },
  ],
  champs: [
    'nom_fr',
    'description',
    'type',
    'icone',
    'image_url',
    'ordre_affichage',
    'actif',
  ],
});

export const PlatsController = ControleurCrud({
  chemin: 'plats',
  table: 'plats',
  lecturePublique: true,
  select: '*, categories(id, nom_fr, type)',
  tri: [
    { colonne: 'ordre_affichage', asc: true },
    { colonne: 'created_at', asc: false },
  ],
  champs: [
    'categorie_id',
    'nom_fr',
    'description_fr',
    'ingredients',
    'prix',
    'prix_promo',
    'image_url',
    'temps_preparation',
    'calories',
    'est_specialite',
    'est_populaire',
    'en_promo',
    'est_epice',
    'est_vegetarien',
    'actif',
    'en_rupture',
    'ordre_affichage',
  ],
});

export const EvenementsController = ControleurCrud({
  chemin: 'evenements',
  table: 'evenements',
  lecturePublique: true,
  tri: [{ colonne: 'heure_debut', asc: true }],
  champs: [
    'nom',
    'description',
    'image_url',
    'heure_debut',
    'heure_fin',
    'lieu',
    'prix_entree',
    'places_max',
    'promotion_active',
    'texte_promo',
    'actif',
  ],
});

export const ZonesController = ControleurCrud({
  chemin: 'zones-livraison',
  table: 'zones_livraison',
  lecturePublique: true,
  tri: [
    { colonne: 'ordre', asc: true },
    { colonne: 'nom', asc: true },
  ],
  champs: [
    'nom',
    'description',
    'frais',
    'delai_min',
    'latitude',
    'longitude',
    'actif',
    'ordre',
  ],
});

export const CodesPromoController = ControleurCrud({
  chemin: 'codes-promo',
  table: 'codes_promo',
  rolesLecture: ['admin', 'gerant'],
  champs: [
    'code',
    'description',
    'type',
    'valeur',
    'minimum_commande',
    'reduction_max',
    'date_debut',
    'date_fin',
    'utilisations_max',
    'utilisations_par_client',
    'premiere_commande_only',
    'actif',
  ],
});

export const TablesController = ControleurCrud({
  chemin: 'tables',
  table: 'tables_restaurant',
  rolesLecture: ['admin', 'gerant', 'cuisine'],
  tri: [{ colonne: 'numero', asc: true }],
  champs: ['numero', 'zone', 'capacite', 'actif'],
});

export const CONTROLEURS_CATALOGUE = [
  CategoriesController,
  PlatsController,
  EvenementsController,
  ZonesController,
  CodesPromoController,
  TablesController,
];
