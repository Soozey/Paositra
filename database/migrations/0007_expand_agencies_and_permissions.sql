-- Migration 0007 — Expansion référentiel agences, rôles RBAC et permissions étendues
-- Statut : Proposition KCI — à valider par PAOMA avant usage en production
-- Le DAO reste la référence contractuelle.

-- ============================================================
-- 1. Expansion de operations.agencies
-- ============================================================

ALTER TABLE operations.agencies
  ADD COLUMN IF NOT EXISTS public_code    varchar(20),
  ADD COLUMN IF NOT EXISTS codique        varchar(50),
  ADD COLUMN IF NOT EXISTS temporary_code varchar(50),
  ADD COLUMN IF NOT EXISTS type           varchar(50),
  ADD COLUMN IF NOT EXISTS region         varchar(100),
  ADD COLUMN IF NOT EXISTS district       varchar(100),
  ADD COLUMN IF NOT EXISTS commune        varchar(100),
  ADD COLUMN IF NOT EXISTS city           varchar(100),
  ADD COLUMN IF NOT EXISTS address        text,
  ADD COLUMN IF NOT EXISTS latitude       numeric(10,7),
  ADD COLUMN IF NOT EXISTS longitude      numeric(10,7),
  ADD COLUMN IF NOT EXISTS source_type    varchar(30) NOT NULL DEFAULT 'to_validate',
  ADD COLUMN IF NOT EXISTS source_name    varchar(200),
  ADD COLUMN IF NOT EXISTS source_url     varchar(500),
  ADD COLUMN IF NOT EXISTS source_note    text,
  ADD COLUMN IF NOT EXISTS validation_status varchar(20) NOT NULL DEFAULT 'to_validate',
  ADD COLUMN IF NOT EXISTS validated_by   uuid REFERENCES platform.users(id),
  ADD COLUMN IF NOT EXISTS validated_at   timestamptz;

COMMENT ON COLUMN operations.agencies.source_type IS
  'paoma_validated=officiel PAOMA | public_source=source publique | demo_only=démo uniquement | to_validate=à confirmer';
COMMENT ON COLUMN operations.agencies.validation_status IS
  'to_validate=en attente | validated=validé PAOMA | rejected=rejeté';

-- ============================================================
-- 2. Table platform.rbac_role_templates
-- Tous les rôles sont "proposition_a_valider" — aucun n'est contractuel
-- ============================================================

CREATE TABLE IF NOT EXISTS platform.rbac_role_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        varchar(80) UNIQUE NOT NULL,
  label       varchar(200) NOT NULL,
  lot         varchar(20) NOT NULL,
  scope_type  varchar(30) NOT NULL,
  description text,
  status      varchar(30) NOT NULL DEFAULT 'proposition_a_valider',
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rbac_role_lot_valid CHECK (lot IN ('common','lot1','lot2')),
  CONSTRAINT rbac_role_scope_valid CHECK (scope_type IN ('global','organ','direction','agency','counter'))
);

COMMENT ON TABLE platform.rbac_role_templates IS
  'Rôles RBAC candidats — statut proposition_a_valider — à confirmer par PAOMA';

-- ============================================================
-- 3. Table platform.rbac_role_permissions (liaison rôle <-> permission)
-- ============================================================

CREATE TABLE IF NOT EXISTS platform.rbac_role_permissions (
  role_code       varchar(80) NOT NULL REFERENCES platform.rbac_role_templates(code) ON DELETE CASCADE,
  permission_code varchar(160) NOT NULL REFERENCES platform.permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_code, permission_code)
);

-- ============================================================
-- 4. Nouvelles permissions (~40+)
-- ============================================================

INSERT INTO platform.permissions (code, description) VALUES
  -- platform
  ('platform:roles:read',           'Consulter les rôles et habilitations'),
  ('platform:roles:manage',         'Gérer les rôles et habilitations'),
  ('platform:agencies:validate',    'Valider officiellement une agence dans le référentiel'),
  ('platform:config:read',          'Consulter la configuration plateforme'),
  ('platform:config:manage',        'Gérer la configuration plateforme'),
  ('platform:notifications:read',   'Consulter les notifications'),
  ('platform:dashboard:read',       'Accéder au tableau de bord plateforme'),
  -- treasury
  ('treasury:dashboard:read',       'Accéder au tableau de bord trésorerie'),
  ('treasury:reports:read',         'Consulter les rapports trésorerie'),
  ('treasury:reports:export',       'Exporter les rapports trésorerie'),
  ('treasury:institutions:export',  'Exporter les institutions financières'),
  ('treasury:institutions:validate','Valider une institution financière'),
  ('treasury:placements:export',    'Exporter les placements'),
  ('treasury:placements:approve',   'Approuver un placement'),
  ('treasury:accounts:read',        'Consulter les comptes trésorerie'),
  ('treasury:accounts:manage',      'Gérer les comptes trésorerie'),
  ('treasury:flows:read',           'Consulter les flux trésorerie'),
  ('treasury:flows:manage',         'Gérer les flux trésorerie'),
  -- operations
  ('operations:agencies:validate',  'Valider une agence dans le référentiel'),
  ('operations:agencies:import',    'Importer des agences depuis un fichier CSV'),
  ('operations:agencies:export',    'Exporter les agences en CSV'),
  ('operations:dashboard:read',     'Accéder au tableau de bord opérations'),
  ('operations:counters:read',      'Consulter les guichets et caisses'),
  ('operations:counters:manage',    'Gérer les guichets et caisses'),
  ('operations:postal:read',        'Consulter les opérations postales'),
  ('operations:postal:manage',      'Gérer les opérations postales'),
  ('operations:reports:read',       'Consulter les rapports opérations'),
  ('operations:reports:export',     'Exporter les rapports opérations'),
  ('operations:parcels:read',       'Consulter les colis et envois'),
  ('operations:parcels:manage',     'Gérer les colis et envois'),
  ('operations:transfers:read',     'Consulter les transferts inter-agences'),
  ('operations:transfers:manage',   'Gérer les transferts inter-agences'),
  ('operations:financial:read',     'Consulter les opérations financières postales'),
  ('operations:financial:manage',   'Gérer les opérations financières postales')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 5. Insertion des 19 rôles templates (tous proposition_a_valider)
-- ============================================================

INSERT INTO platform.rbac_role_templates (code, label, lot, scope_type, description) VALUES
  ('dg',                    'Directeur Général',              'common', 'global',    'Accès complet lecture/écriture tous modules — à valider PAOMA'),
  ('dga',                   'Directeur Général Adjoint',      'common', 'global',    'Accès complet délégué — à valider PAOMA'),
  ('auditeur_interne',      'Auditeur Interne',               'common', 'global',    'Lecture audit et rapports tous modules'),
  ('responsable_conformite','Responsable Conformité',         'common', 'global',    'Lecture conformité et gestion des référentiels'),
  ('admin_systeme',         'Administrateur Système',         'common', 'global',    'Gestion utilisateurs, rôles et configuration'),
  ('responsable_reporting', 'Responsable Reporting',          'common', 'global',    'Lecture et export des rapports tous modules'),
  ('lecteur_audit',         'Lecteur Audit',                  'common', 'global',    'Lecture seule de la piste d''audit'),
  ('directeur_tresorerie',  'Directeur Trésorerie',           'lot1',   'direction', 'Accès complet Lot 1 — à valider PAOMA'),
  ('gestionnaire_placement','Gestionnaire Placements',        'lot1',   'organ',     'Saisie et suivi des placements'),
  ('tresorier',             'Trésorier',                      'lot1',   'organ',     'Validation et clôture des placements'),
  ('controleur_financier',  'Contrôleur Financier',           'lot1',   'organ',     'Lecture et contrôle flux trésorerie'),
  ('directeur_operations',  'Directeur Opérations',           'lot2',   'direction', 'Accès complet Lot 2 — à valider PAOMA'),
  ('chef_agence',           'Chef d''Agence',                 'lot2',   'agency',    'Gestion d''une agence : validation journée, fermeture, supervision'),
  ('gestionnaire_agence',   'Gestionnaire Agence',            'lot2',   'agency',    'Saisie et suivi des opérations d''une agence'),
  ('agent_guichet',         'Agent de Guichet',               'lot2',   'counter',   'Opérations caisse et guichet'),
  ('agent_courrier',        'Agent Courrier',                 'lot2',   'agency',    'Gestion des envois et colis'),
  ('agent_financier',       'Agent Financier Postal',         'lot2',   'counter',   'Opérations financières postales au guichet'),
  ('superviseur_regional',  'Superviseur Régional',           'lot2',   'direction', 'Supervision des agences d''une région'),
  ('chef_district',         'Chef de District Postal',        'lot2',   'direction', 'Supervision du district postal')
ON CONFLICT (code) DO NOTHING;
