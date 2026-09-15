# Estrutura do StreakUp

```text
streakup-main/
├── api/                  # Funções serverless e integração com a database
│   ├── chat.js
│   ├── notifications.js
│   ├── social.js
│   ├── stories.js
│   ├── upload.js
│   └── ...
├── assets/
│   ├── css/
│   │   └── theme-fix.css # Camada visual compartilhada e responsiva
│   ├── images/
│   │   ├── icon.svg      # Ícone instalável do app
│   │   └── streakup-logo.png
│   └── js/
│       ├── chat.js
│       ├── login.js
│       ├── notifications.js
│       ├── reels.js
│       ├── settings.js
│       ├── theme.js
│       └── ...
├── index.html            # Cadastro
├── login.html            # Login
├── perfil.html           # Feed, perfis, stories, busca e publicação
├── chat.html             # Lista de mensagens e conversa
├── configuracoes.html    # Conta, bio, avatar, privacidade e senha
├── manifest.json         # Configuração PWA
├── sw.js                 # Cache e atualização offline
├── vercel.json           # Rewrites e headers de produção
└── README.md
```

As páginas permanecem na raiz para manter as rotas `/`, `/login`, `/perfil`, `/chat` e `/configuracoes` compatíveis com as rewrites atuais da Vercel. O código executável do navegador fica em `assets/js`, o design compartilhado em `assets/css` e as imagens em `assets/images`.
