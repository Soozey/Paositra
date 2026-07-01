-- 0019 - Herite les nouvelles habilitations depuis les droits metier existants.
-- Aucun droit n'est retire et aucun compte n'est modifie.

WITH mapping(source_code, target_code) AS (VALUES
  ('treasury:accounts:read', 'treasury:wallets:read'),
  ('treasury:accounts:read', 'treasury:imports:read'),
  ('treasury:accounts:manage', 'treasury:wallets:manage'),
  ('treasury:accounts:manage', 'treasury:imports:manage'),
  ('treasury:budget:read', 'treasury:attachments:read'),
  ('treasury:budget:manage', 'treasury:attachments:manage')
)
INSERT INTO platform.user_permissions(id,user_id,permission_code,scope_type,scope_id,granted_by)
SELECT gen_random_uuid(), p.user_id, m.target_code, p.scope_type, p.scope_id, p.granted_by
FROM platform.user_permissions p
JOIN mapping m ON m.source_code=p.permission_code
WHERE NOT EXISTS (
  SELECT 1 FROM platform.user_permissions existing
  WHERE existing.user_id=p.user_id AND existing.permission_code=m.target_code
    AND existing.scope_type=p.scope_type AND existing.scope_id IS NOT DISTINCT FROM p.scope_id
);

WITH mapping(source_code, target_code) AS (VALUES
  ('treasury:accounts:read', 'treasury:wallets:read'),
  ('treasury:accounts:read', 'treasury:imports:read'),
  ('treasury:accounts:manage', 'treasury:wallets:manage'),
  ('treasury:accounts:manage', 'treasury:imports:manage'),
  ('treasury:budget:read', 'treasury:attachments:read'),
  ('treasury:budget:manage', 'treasury:attachments:manage')
)
INSERT INTO platform.rbac_role_permissions(role_code,permission_code)
SELECT p.role_code,m.target_code
FROM platform.rbac_role_permissions p JOIN mapping m ON m.source_code=p.permission_code
ON CONFLICT DO NOTHING;
