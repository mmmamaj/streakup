# StreakUp

Rede social online com contas reais, perfis, seguidores, vídeos curtos e chat persistente.

A página `/perfil` é o feed **For You**, focado em vídeos verticais curtos publicados por usuários reais. O perfil do usuário pode ser aberto pelo botão **Perfil** na navegação inferior ou pela engrenagem, que permanece visível no topo do mobile. A página `/configuracoes` permite editar nome, nome de usuário, foto por URL e senha.

A aplicação usa a database configurada pelo usuário. Os registros de login, perfis, posts, follows, curtidas, salvamentos, republicações, conversas e mensagens são persistidos por endpoints serverless. Não há posts, seguidores ou contatos artificiais: quando a database estiver vazia, o feed e o chat aparecem vazios.

## Rotas

`/` cria conta; `/login` faz login; `/perfil` mostra o For You; `/chat` mostra mensagens; `/configuracoes` abre o perfil e as configurações.

## Variáveis da Vercel

Configure `DATABASE_API_KEY` e, opcionalmente, `DATABASE_API_BASE_URL`. O valor padrão de `DATABASE_API_BASE_URL` é o endpoint oficial da documentação da database. A chave nunca deve ir para o navegador.

## Vídeos

O usuário escolhe um vídeo de até 50 MB no perfil. O backend envia o arquivo para o endpoint de arquivos da database, expõe o conteúdo pelo proxy `/api/media` e cria um registro `post`. O For You consulta apenas registros do tipo `post` com `mediaType` igual a `video`.

## Chat

O chat salva mensagens em registros `chat_email1__email2` e consulta a API periodicamente para atualizar a conversa. É persistente entre dispositivos e usuários. Para segurança de produção, o próximo passo é adicionar sessão assinada/token de usuário no backend; os endpoints atuais usam o e-mail enviado pela sessão local para identificar o remetente.
