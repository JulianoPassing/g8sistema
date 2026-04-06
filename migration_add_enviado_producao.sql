-- Opcional: o sistema grava `enviado_producao` dentro do JSON `dados`.
-- Só execute se quiser uma coluna dedicada no futuro (não é necessário para o recurso funcionar).

-- ALTER TABLE pedidos
--   ADD COLUMN enviado_producao TINYINT(1) NOT NULL DEFAULT 1
--   COMMENT '1 = enviado para produção, 0 = ainda não enviado';
