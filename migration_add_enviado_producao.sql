-- Execute uma vez no MySQL da tabela `pedidos` (antes ou junto com o deploy da API).
-- Pedidos antigos passam a valer como já enviados (1). Novos cadastros pela API usam 0 até marcar.

ALTER TABLE pedidos
  ADD COLUMN enviado_producao TINYINT(1) NOT NULL DEFAULT 1
  COMMENT '1 = enviado para produção, 0 = ainda não enviado';
