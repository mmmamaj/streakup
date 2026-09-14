# StreakUp

Rede social de progresso pessoal com feed, mídia, comentários, mensagens e suporte a PWA.

## URLs da aplicação

- `/` — criação de conta
- `/login` — login
- `/perfil` — feed For You e criação de posts
- `/chat` — mensagens diretas

Os arquivos `.html` continuam no projeto como implementação estática, mas `vercel.json` configura as URLs limpas sem a extensão.

## Funcionalidades do protótipo

- Feed For You com rolagem e carregamento de mais posts.
- Publicação de texto, imagem e vídeo pelo navegador.
- Curtidas, comentários e compartilhamento visual.
- Posts de demonstração com foto e vídeo.
- Chat com conversas, seleção de contatos e envio de mensagens.
- Persistência local de posts, comentários, curtidas e mensagens via `localStorage`.
- Perfil do usuário após cadastro ou login.
- PWA instalável com manifesto, service worker e ícone.

## Estrutura

- `index.html` — cadastro
- `login.html` — login
- `perfil.html` — feed social
- `chat.html` — chat
- `style` embutido nos HTMLs — identidade visual
- `script.js` — cadastro
- `login.js` — login
- `social.js` — feed, posts, mídia, curtidas e comentários
- `chat.js` — conversas e mensagens
- `manifest.json`, `sw.js`, `icon.svg` — PWA
- `vercel.json` — URLs limpas e configurações da Vercel
- `api/register.js`, `api/login.js` — endpoints serverless

## Observação sobre produção

O feed e o chat desta versão funcionam no navegador usando `localStorage`. Para uma rede social real entre vários usuários e dispositivos, será necessário conectar posts, mídia, curtidas, comentários e mensagens a um banco de dados e a WebSockets ou outra camada de tempo real. A variável `DATABASE_API_KEY` deve ser configurada na Vercel para o cadastro e login.
