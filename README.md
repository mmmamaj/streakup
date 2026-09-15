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


## Notificações do sistema
- O RiseUp pede permissão para notificações no navegador/PWA.
- Com a permissão ativa, novas notificações também usam a Notification API enquanto o site estiver aberto.
- Para receber notificações Push mesmo com o PWA/site fechado, configure no Vercel as variáveis `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT`. Gere as chaves VAPID com `npx web-push generate-vapid-keys` e use um `mailto:` em `VAPID_SUBJECT`.
- O navegador salva a assinatura no banco e o Service Worker exibe a notificação e abre a página correta ao tocar.

## v15 — UI social + composer
- Feed mobile redesenhado com navegação inferior, SVGs e espaçamento responsivo.
- Publicação abre em uma folha/modal nova pelo botão `+`, sem composer fixo no feed.
- Editor básico de foto: filtros, rotação e texto sobre a imagem.
- Perfil pode ser aberto/fechado pelo próprio navegador inferior e possui menu para sair.
- Stories usam círculos com overflow controlado e viewer em tela cheia.
- Push mantém assinatura Web Push no backend; VAPID continua sendo configurado pelas variáveis da Vercel.
