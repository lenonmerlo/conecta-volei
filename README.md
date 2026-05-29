# Conecta Vôlei

Aplicação web mobile-first para organizar os jogos do grupo Conecta Vôlei: inscrição em listas, gestão de presença, sorteio de times, perfil de atletas e feed de scraps.

## Badges de tecnologia

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=061923)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES202x-F7DF1E?logo=javascript&logoColor=222)
![React Router](https://img.shields.io/badge/React_Router-7-CA4245?logo=reactrouter&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-2-3ECF8E?logo=supabase&logoColor=083)
![PWA](https://img.shields.io/badge/PWA-vite--plugin--pwa-5A0FC8)
![Lucide](https://img.shields.io/badge/Lucide_Icons-UI-111?logo=lucide&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-10-4B32C3?logo=eslint&logoColor=white)

## Visão geral

O projeto foi construído para atender o fluxo real de um grupo de vôlei recreativo, com foco em uso no celular e regras específicas de lista.

Principais objetivos:

- facilitar entrada e gestão de atletas
- controlar listas de jogos (principal, espera e convidados)
- organizar presença e histórico
- permitir sorteio equilibrado de times
- oferecer painel administrativo
- criar interação social via scrapbook

## Funcionalidades atuais

- login e cadastro por WhatsApp
- aceite de regras para concluir cadastro
- jogos oficiais e jogos extras
- inscrições com regras diferentes por dia do jogo
- promoção automática da lista de espera
- perfil do atleta com estatísticas e badges
- scrapbook por atleta e feed global de scraps
- exclusão de scrap com regra de permissão (autor, destinatário ou admin)
- painel administrativo para operação de jogos
- navegação mobile com barra inferior

## Regras de lista (resumo)

- quarta-feira: lista abre na segunda às 19h
- domingo: lista abre na quinta às 19h
- regra de convidados varia conforme o dia do jogo
- ao sair da lista principal, o sistema promove da espera quando houver vaga

## Stack e bibliotecas

- React 19
- Vite 8
- React Router DOM 7
- Supabase JS 2
- Lucide React
- vite-plugin-pwa
- ESLint 10

## Estrutura de pastas

```text
src/
	app/                # Shell da aplicação, rotas e contexto de autenticação
	components/         # Componentes reutilizáveis (UI e blocos de tela)
	data/               # Camada de acesso ao Supabase
	domain/             # Regras de negócio e constantes
	pages/              # Páginas da aplicação
	lib/                # Cliente e integrações base
```

## Rotas principais

- `/` login (quando deslogado) ou home (quando logado)
- `/rules` regras e aceite
- `/athletes` lista de atletas
- `/athlete/:id` perfil público de atleta
- `/scrapbook` feed global de scraps
- `/profile` perfil do usuário
- `/game/:id` detalhes de jogo
- `/teams` visualização de times
- `/admin` painel administrativo (somente admins)

## Banco e integrações

O projeto usa Supabase como backend, incluindo tabelas e storage.

Entidades usadas no app:

- `players`
- `games`
- `game_registrations`
- `game_presences`
- `game_teams`
- `scraps`
- bucket `avatars` no Supabase Storage

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

Sem essas variáveis, fluxos dependentes do banco não funcionarão corretamente.

## Requisitos

- Node.js 20+
- npm 10+

## Como rodar localmente

```bash
npm install
npm run dev
```

Aplicação local: `http://localhost:5173`

## Scripts disponíveis

- `npm run dev` inicia ambiente de desenvolvimento
- `npm run build` gera build de produção
- `npm run preview` serve a build localmente
- `npm run lint` executa análise estática com ESLint

## PWA

O projeto está configurado com `vite-plugin-pwa`, com manifesto, ícones e registro automático de atualizações.

## Perfis administrativos

Admins e super admins são controlados atualmente por lista de WhatsApp em `src/domain/admins.js`.

## Deploy

Pode ser publicado em plataformas como Vercel ou Netlify.

Checklist mínimo de deploy:

- configurar variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- validar build com `npm run build`
- validar lint com `npm run lint`

## Roadmap sugerido

- mover controle de admins para tabela no banco
- ampliar cobertura de testes
- observabilidade de erros em produção

---

Projeto do grupo Conecta Vôlei.
