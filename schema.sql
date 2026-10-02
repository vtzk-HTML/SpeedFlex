-- Execute este script no SQL Editor do Neon (console.neon.tech) uma única vez.

CREATE TABLE IF NOT EXISTS solicitacoes (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  servico TEXT,
  tipo_problema TEXT NOT NULL,
  descricao TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Consulta útil para ver as solicitações mais recentes primeiro:
-- SELECT * FROM solicitacoes ORDER BY criado_em DESC;

-- Se a tabela JÁ EXISTE no Neon, rode apenas este comando (uma vez):
-- ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS servico TEXT;
