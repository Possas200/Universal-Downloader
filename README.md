# 🎵 SpotWave — Guia de Instalação Completo

Aplicativo desktop para baixar músicas do Spotify, YouTube e YouTube Music  
em MP3 com metadados completos (artista, álbum, capa, letras).

---

## 📁 Estrutura de Pastas

```
spotwave/
├── main.js          ← Processo principal do Electron (backend)
├── preload.js       ← Ponte segura entre backend e frontend
├── package.json     ← Dependências do projeto
├── src/
│   ├── index.html   ← Interface visual
│   └── app.js       ← Lógica do frontend
└── README.md        ← Este ficheiro
```

---

## ✅ Pré-requisitos

Precisas de instalar estas ferramentas **antes** de abrir o projeto:

### 1. Node.js (v18 ou superior)
Vai a https://nodejs.org e baixa a versão LTS.  
Verifica com: `node --version`

### 2. Python (3.9 ou superior)
Vai a https://python.org e baixa a versão mais recente.  
Verifica com: `python --version`

### 3. spotdl
```bash
pip install spotdl
```
Verifica com: `spotdl --version`

### 4. FFmpeg
**Windows:**
- Vai a https://ffmpeg.org/download.html
- Baixa a build para Windows
- Extrai e adiciona a pasta `bin` ao PATH do sistema
- Verifica com: `ffmpeg -version`

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt install ffmpeg
```

---

## 🚀 Passo a Passo no VS Code

### Passo 1 — Abrir o projeto
1. Abre o VS Code
2. Vai a `File > Open Folder`
3. Seleciona a pasta `spotwave`

### Passo 2 — Abrir o terminal integrado
- Pressiona `` Ctrl+` `` (Windows/Linux) ou `` Cmd+` `` (macOS)
- Ou vai a `Terminal > New Terminal`

### Passo 3 — Instalar dependências Node
```bash
npm install
```
Aguarda terminar (pode demorar 1-2 minutos na primeira vez).

### Passo 4 — Iniciar a aplicação
```bash
npm start
```
A janela do SpotWave abre automaticamente! ✨

---

## 🔧 Resolução de Problemas

### "spotdl não encontrado"
O spotdl não está no PATH. Tenta reinstalar:
```bash
pip install --upgrade spotdl
```
Se usas conda ou pyenv, garante que o ambiente correto está ativo.

### "FFmpeg não encontrado"
O spotdl precisa do FFmpeg para converter áudio.  
Segue as instruções de instalação acima para o teu sistema.

### A janela aparece sem transparência (Linux)
A transparência real requer um compositor (Picom, Compton, KWin).  
No GNOME/KDE funciona nativamente. No i3/bspwm instala Picom.

### Erro "ENOENT electron"
```bash
npm install  # instala as dependências que faltam
```

### Downloads muito lentos
Vai às ⚙️ Configurações e reduz os downloads simultâneos para 1 ou 2.

---

## 💡 Como usar

1. Cola um link do **Spotify**, **YouTube** ou **YouTube Music**
2. Escolhe a pasta de destino (é guardada automaticamente)
3. Clica em **Baixar**
4. Acompanha o progresso na barra lateral e na barra principal
5. No final, clica **Ver pasta** para abrir os ficheiros  
   ou **Baixar mais** para voltar ao início

### Links suportados
- `https://open.spotify.com/track/...` — música individual
- `https://open.spotify.com/playlist/...` — playlist
- `https://open.spotify.com/album/...` — álbum completo
- `https://www.youtube.com/watch?v=...` — vídeo do YouTube
- `https://www.youtube.com/playlist?list=...` — playlist do YouTube
- `https://music.youtube.com/...` — YouTube Music

### Estrutura das pastas de download
```
Pasta escolhida/
└── Artista/
    └── Álbum/
        ├── Música 1.mp3
        ├── Música 2.mp3
        └── ...
```

---

## ⚙️ Configurações disponíveis

| Opção | Descrição | Padrão |
|-------|-----------|--------|
| Downloads simultâneos | Quantas músicas baixar ao mesmo tempo (1-10) | 3 |
| Pasta de destino | Onde os MP3 são guardados | Pasta Música do sistema |

A pasta de destino **é guardada entre sessões** — não precisas de escolher de novo.

---

## 📦 Dependências usadas

| Pacote | Função |
|--------|--------|
| `electron` | Framework para apps desktop |
| `electron-store` | Guardar configurações entre sessões |
| `spotdl` (Python) | Motor de download e metadados |
| `ffmpeg` | Conversão de áudio para MP3 |

---

## 🏗️ Para compilar um executável (.exe / .dmg / .AppImage)

```bash
npm run build
```
O executável é criado na pasta `dist/`.

---

Feito com ❤️ usando Electron + spotdl
