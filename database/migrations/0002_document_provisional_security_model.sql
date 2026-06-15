COMMENT ON TABLE platform.permissions IS
  'Identifiants techniques provisoires pour contrôler les routes. Ils ne constituent ni des rôles, ni des profils, ni une matrice contractuelle validée par le DAO.';

COMMENT ON TABLE platform.user_permissions IS
  'Attributions techniques provisoires. Toute attribution nécessite une validation humaine du périmètre et ne vaut pas validation de la matrice RBAC contractuelle.';

COMMENT ON COLUMN platform.user_permissions.scope_type IS
  'Taxonomie technique provisoire à valider avant usage client.';

COMMENT ON COLUMN treasury.placements.status IS
  'État technique provisoire nécessaire au flux actuel; le référentiel métier définitif reste à clarifier.';

COMMENT ON COLUMN operations.agencies.status IS
  'État technique provisoire nécessaire au flux actuel; le référentiel métier définitif reste à clarifier.';

UPDATE platform.permissions
SET description = '[Technique provisoire, non validée comme rôle DAO] ' || description
WHERE description NOT LIKE '[Technique provisoire, non validée comme rôle DAO] %';
