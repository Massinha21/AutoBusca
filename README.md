# 🚗 AutoBusca — Buscador Agregado de Veículos

O **AutoBusca** é um agregador inteligente de anúncios de veículos seminovos em Ribeirão Preto (SP). Ele permite que o usuário pesquise modelos e marcas de carros em **múltiplas revendas parceiras simultaneamente** e compare os resultados de forma instantânea em uma única interface responsiva.

---

## ⚡ Principais Funcionalidades

### 1. Motor de Busca e Performance
* **Streaming em Tempo Real (SSE)**: Resultados transmitidos incrementalmente por site de revenda utilizando Server-Sent Events (SSE), evitando tempos de espera prolongados.
* **Cache Inteligente**: Armazenamento em cache no banco de dados (válido por 24 horas) para respostas instantâneas (< 200ms) de termos de busca já indexados.
* **Revalidação Periódica (SWR)**: Sistema híbrido de requisição de cache que cai para busca em tempo real (streaming) caso o cache esteja expirado ou indisponível.
* **PWA (Progressive Web App)**: Instalável em dispositivos móveis e desktop, com cache em disco via Service Worker para carregamento offline instantâneo.

### 2. Análise e Comparação de Preços
* **Comparativo FIPE**: Banner global e badges individuais de preços (verdes e laranjas) calculando a variação absoluta (em R$) e percentual em relação à Tabela FIPE de referência.
* **Visualização Lado a Lado**: Seleção direta no grid de até 3 anúncios para exibição detalhada de especificações em uma tabela comparativa flutuante.
* **Layouts Personalizados**: Alternância rápida entre visualizações de Grade (Grid) e Lista (List) com salvamento de preferências no navegador.

### 3. Experiência do Usuário (UX)
* **Filtros Avançados**: Gaveta lateral responsiva (drawer no mobile) para filtros por preço, ano, quilometragem, marca e revendas.
* **Reconhecimento por Imagem**: Envio de fotos de veículos processadas e identificadas de forma inteligente utilizando a API do Gemini.
* **Busca por Voz**: Captação de áudio nativa (Web Speech API) com feedback pulsante de gravação e submissão automática.
* **Mini-mapa Interativo**: Mapa integrado (Leaflet.js) com as coordenadas geográficas das revendas integradas. Pins integrados aos filtros da busca, esmaecendo se a revenda não possuir carros ativos e destacando popups com filtros rápidos.

### 4. Estoque Geral e Área de Usuário
* **Estoque Consolidado**: Aba "Estoque Geral" para exibir a totalidade de carros cadastrados com rolagem infinita.
* **Sincronização Administrativa**: Painel administrativo para sincronização manual sequencial do estoque com barra de progresso individual por revenda.
* **Autenticação de Usuários**: Sistema de login e cadastro proxy integrado ao Supabase Auth.
* **Alertas por E-mail**: Cadastro de alertas para queda de preço de veículos selecionados ou termos de busca específicos.
* **Histórico de Preços**: Acompanhamento da flutuação de preço do anúncio exibido em tabelas e gráficos em formato SVG puro embutidos.

---

## 📁 Estrutura de Arquivos Principal

* `public/` - Arquivos estáticos do frontend (HTML, CSS, JS e Ativos do PWA).
  * `index.html` - Interface de busca e painéis principais.
  * `fipe.html` - Módulo de consulta e integração da FIPE.
  * `status.html` - Status administrativo de saúde dos scrapers.
  * `js/app.js` - Controlador principal do frontend.
  * `js/api.js` - Interface cliente de chamadas HTTP e EventSource.
  * `js/ui.js` - Renderizador de elementos DOM do grid e cards.
* `api/` - Código do backend executado como Serverless Functions na Vercel.
  * `buscar-carros.js` - Endpoint tradicional de busca JSON e cache.
  * `buscar-carros-stream.js` - Endpoint de busca SSE em tempo real.
  * `estoque-geral.js` - Serviço de consulta paginado do estoque do banco.
  * `sync-inventory.js` - Manutenção e sincronização do estoque no Supabase.
  * `auth.js` - Gerenciador proxy de autenticação do Supabase.
  * `alerts.js` - Gerenciamento de alertas de preços.
  * `price-history.js` - Histórico de variações de preços.
  * `_scrapers/` - Conjunto de scrapers específicos para cada uma das 25 revendas.

---

## 🛠️ Configuração e Execução Local

### Pré-requisitos
* Node.js v18 ou superior.

### Instalação de Dependências
```bash
npm install
```

### Configurando o Supabase (Opcional - Modo Simulado)
Crie um arquivo `.env` na raiz do projeto com as chaves de acesso ao seu projeto Supabase:
```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSy...
```

> 💡 **Tolerância a Falhas / Modo offline**: Caso o arquivo `.env` não esteja configurado ou não possua credenciais do banco, o AutoBusca é inicializado em **Modo Simulação**. Todas as interações (login, alertas, histórico e sincronização) funcionarão localmente com geradores e mocks dinâmicos em memória.

### Executando o Servidor de Desenvolvimento
Para rodar a aplicação localmente de forma simples sem chaves da Vercel:
```bash
node scratch/dev_server.js
```
Acesse a aplicação em [http://localhost:3000](http://localhost:3000).

---

## 🗄️ Esquema de Tabelas (Supabase)

Para o pleno funcionamento online, crie as seguintes tabelas no painel do seu Supabase:

### 1. `search_cache`
* `query` (text, Primary Key)
* `results` (jsonb)
* `updated_at` (timestamp with time zone)

### 2. `vehicles`
* `url` (text, Primary Key)
* `title` (text)
* `price` (text)
* `price_value` (numeric)
* `image_url` (text, nullable)
* `dealer_name` (text)
* `year` (integer, nullable)
* `km` (integer, nullable)
* `brand` (text, nullable)
* `updated_at` (timestamp with time zone)

### 3. `price_history`
* `id` (bigint, Generated Always as Identity, Primary Key)
* `vehicle_url` (text, Foreign Key para `vehicles.url` ON DELETE CASCADE)
* `price_value` (numeric)
* `recorded_at` (timestamp with time zone)

### 4. `price_alerts`
* `id` (uuid, Primary Key, default: `gen_random_uuid()`)
* `user_id` (uuid, nullable)
* `email` (text)
* `vehicle_url` (text, nullable)
* `query` (text, nullable)
* `target_price` (numeric)
* `created_at` (timestamp with time zone)
