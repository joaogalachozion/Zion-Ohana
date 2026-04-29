-- ============================================================
-- ZION OHANA — Auth Setup
-- Cole este SQL no Supabase: SQL Editor → New query → Run
-- ============================================================

-- Tabela de controle de usuários (espelho do Auth)
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_sign_in_at TIMESTAMPTZ
);

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_usuarios" ON usuarios FOR ALL USING (true) WITH CHECK (true);
