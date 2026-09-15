# StreakUp

Rede social online com contas reais, perfis, seguidores, vídeos curtos e chat persistente. A implementação ativa usa as APIs serverless em `api/` e a database pública configurada por variáveis de ambiente do servidor.

## Rotas da aplicação

`/` cria uma conta; `/login` autentica; `/perfil` mostra o feed For You e o feed Seguindo; `/chat` permite pesquisar usuários reais e conversar; `/configuracoes` edita nome, nome de usuário, avatar e senha.

O botão **Perfil** abre o perfil completo no feed. O botão **Postar** leva ao compositor de vídeos, que envia arquivos de até 50 MB para a database antes de criar o registro do post. O feed não cria posts, seguidores, contatos ou bots artificiais: quando a database estiver vazia, os estados vazios são exibidos de forma explícita.

## Variáveis da Vercel

Configure `DATABASE_API_KEY` e, opcionalmente, `DATABASE_API_BASE_URL`. O valor padrão de `DATABASE_API_BASE_URL` é o endpoint oficial da documentação da database. A chave permanece somente no backend e não é enviada ao navegador.

A função de upload usa um limite de corpo de aproximadamente 52 MB para suportar vídeos de até 50 MB. As respostas de `/api/*` recebem `Cache-Control: no-store`.

## API pública usada pelo frontend

A aplicação consulta `/api/social` para feed, perfis, seguir/deixar de seguir, publicação e interações. `/api/users` lista apenas dados públicos de contas reais — e-mail, nome, username, avatar e bio — sem expor senhas. `/api/chat` persiste mensagens por conversa, `/api/upload` envia arquivos e `/api/media` entrega vídeos por proxy.

## Cache e modo online

O service worker mantém apenas o shell estático da aplicação. Requisições para `/api/*` nunca entram no cache e são feitas com `cache: "no-store"`; isso evita que o mobile continue vendo respostas antigas ou uma versão quebrada depois de uma publicação.

## Segurança

O login existente continua baseado na database configurada, mas ainda usa `localStorage` para identificar a sessão no navegador. Para uma instalação de produção com maior segurança, o próximo passo é trocar essa identificação por uma sessão assinada ou token de usuário no backend.
