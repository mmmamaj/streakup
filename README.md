# StreakUp

Rede social online com contas reais, perfis, seguidores, vídeos curtos, stories, recomendações e chat persistente. A implementação usa as APIs serverless em `api/` e a database pública configurada por variáveis de ambiente do servidor.

## Recursos atuais

O feed For You e o feed Seguindo exibem vídeos reais. Usuários podem publicar stories com imagem, que expiram automaticamente após 24 horas. A foto de perfil é enviada diretamente do dispositivo para a storage; não é necessário colar URL.

Perfis podem ser públicos ou privados. Em um perfil privado, somente o dono e seus seguidores conseguem ver os posts. Mensagens só podem ser enviadas para uma pessoa que segue o remetente. O chat mantém a lista de contatos à esquerda no desktop e abre a conversa em tela inteira no mobile, com botão de voltar, link para analisar o perfil e apelido local da conversa.

A central de notificações reúne novas mensagens, seguidores, curtidas e republicações. O feed oferece recomendações de pessoas novas e busca global por usuários, nomes de vídeos e autores. O tema claro/escuro fica salvo no navegador. A identidade visual usa a logo StreakUp em gradiente coral, laranja, violeta e azul-marinho.

## Segurança

Cadastro e alteração de senha exigem no mínimo 10 caracteres, incluindo letra maiúscula, minúscula, número e símbolo. A chave da database fica somente no backend. O login atual ainda usa `localStorage` como identificação de sessão; a próxima evolução recomendada é substituir por sessão assinada ou token seguro no backend.

## Rotas principais

`/` cria uma conta; `/login` autentica; `/perfil` concentra For You, Seguindo, stories, busca, recomendações, perfil e publicação; `/chat` pesquisa pessoas e abre conversas; `/configuracoes` edita dados, avatar, privacidade, tema e senha.

As APIs são `/api/social`, `/api/users`, `/api/chat`, `/api/notifications`, `/api/stories`, `/api/upload` e `/api/media`. Configure `DATABASE_API_KEY` e, opcionalmente, `DATABASE_API_BASE_URL` na Vercel.
