# StreakUp

Rede social online com contas reais, perfis, seguidores, vídeos curtos, stories, destaques, recomendações, busca e chat persistente.

## Experiência mobile e navegação

A navegação inferior usa cinco destinos: **For You**, **Pesquisar**, **Postar** no botão central, **Mensagens** e **Perfil**. O perfil abre um painel próprio com capa, avatar enviado pelo dispositivo, nome, @username, estatísticas, bio, destaques, abas de conteúdo, edição e compartilhamento.

O chat mantém conversas em lista vertical. No desktop, a lista e a conversa dividem a tela; no mobile, selecionar uma pessoa abre a conversa em tela inteira, com voltar para chats, abrir o perfil do contato e definir apelido local.

## Publicações, stories e destaques

O compositor permite editar a legenda antes de publicar, marcar pessoas usando `@username` e revisar o vídeo selecionado. Pessoas marcadas recebem notificação. Stories são enviados diretamente do dispositivo e expiram em 24 horas. O primeiro story próprio pode ser usado como capa do destaque do perfil; o botão **Novo** inicia outro story para destaque.

## Pesquisa e descoberta

A busca combina correspondência parcial em nome, username, e-mail, descrição do vídeo e autor. Os resultados separam usuários e vídeos e permitem abrir o perfil ou localizar o vídeo no feed. O feed também mostra recomendações de pessoas novas.

## Privacidade e segurança

Perfis podem ser públicos ou privados. Posts privados ficam visíveis ao dono e aos seguidores. Mensagens somente podem ser enviadas para pessoas que seguem o remetente. Cadastro e alteração de senha exigem no mínimo 10 caracteres, com maiúscula, minúscula, número e símbolo.

## APIs

As rotas principais são `/api/social`, `/api/users`, `/api/chat`, `/api/notifications`, `/api/stories`, `/api/upload` e `/api/media`. Configure `DATABASE_API_KEY` e, opcionalmente, `DATABASE_API_BASE_URL` na Vercel. A chave da database fica somente no backend.

A sessão atual continua baseada em `localStorage`, como na versão anterior. Para uma etapa posterior de segurança de produção, recomenda-se migrar para cookies de sessão assinados ou tokens emitidos pelo backend.

## Estrutura do projeto

`api/` contém as funções serverless e integrações com a database. `assets/js/` contém os módulos de autenticação, feed, chat, configurações, notificações e tema. `assets/css/` contém a camada visual compartilhada e os overrides responsivos. `assets/images/` concentra a logo e o ícone instalável. As páginas HTML e os arquivos de configuração ficam na raiz para manter as rewrites da Vercel simples e previsíveis.
