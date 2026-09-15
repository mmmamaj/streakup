# RiseUp v12

Versão restaurada a partir da base social v10 para preservar os vídeos, stories, perfis e dados já existentes.

## Correções
- Migração automática das chaves antigas `streakup_*` para `riseup_*`, sem perder a sessão e ações locais.
- Feed preservado e com suporte a vídeos e fotos.
- Stories preservados, com visualização sequencial, progresso e expiração controlada pela API.
- Perfil próprio abre corretamente pelo botão Perfil.
- Perfil de outros usuários continua usando `/perfil?u=...`.
- Navegação com animações e feedback de toque.
- Comentários persistidos na mesma database.
- Service Worker v12 para evitar cache antigo.
