<div align="center">

<img src="assets/icon.ico" width="80" height="80" alt="SpotWave Logo">

# ⚡ SpotWave

**Descarrega músicas do YouTube e YouTube Music em MP3 com metadados completos — num só clique.**

[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square&logo=windows)](https://github.com/)
[![Made with Electron](https://img.shields.io/badge/made%20with-Electron-47848f?style=flat-square&logo=electron)](https://www.electronjs.org/)
[![Engine](https://img.shields.io/badge/engine-yt--dlp-ff0000?style=flat-square)](https://github.com/yt-dlp/yt-dlp)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

<br>

*Interface moderna · Portátil · Sem instalação · Metadados automáticos · Downloads paralelos*

</div>

---

## 🎯 O que é o SpotWave?

O SpotWave é uma aplicação desktop para **Windows** que te permite descarregar qualquer música, vídeo ou playlist do **YouTube** e **YouTube Music** diretamente para o teu computador em formato **MP3 de alta qualidade (320kbps)**, com todos os metadados embutidos automaticamente — título, artista, álbum, capa do álbum e muito mais.

Sem linhas de comando. Sem configurações complicadas. **Cola o link, clica Baixar, pronto.**

---

## ✨ Funcionalidades

| | Funcionalidade | Detalhe |
|---|---|---|
| 🎵 | **MP3 320kbps** | Máxima qualidade de áudio sempre |
| 🖼️ | **Capa do álbum embutida** | Thumbnail do YouTube convertida e inserida no MP3 |
| 🏷️ | **Metadados completos** | Título, artista, álbum, ano — tudo automático |
| ⚡ | **Downloads paralelos** | Até 20 músicas em simultâneo — termina em segundos |
| 📋 | **Playlists e álbuns** | Baixa centenas de músicas de uma só vez |
| 🍪 | **Cookies do browser** | Contorna rate limits do YouTube sem esforço |
| 🖥️ | **Terminal em tempo real** | Vê exatamente o que está a acontecer |
| 💾 | **Portátil** | Um único `.exe` — sem instalação, plug and play |
| 🎨 | **UI moderna** | Design estilo macOS, transparência e blur |

---

## 🚀 Como usar

> **Não precisas de instalar nada.** Descarrega o `SpotWave.exe` e abre-o diretamente.

### 1️⃣ Cola o link

Copia qualquer link do YouTube ou YouTube Music e cola na barra de pesquisa do SpotWave.

```
https://www.youtube.com/watch?v=...
https://www.youtube.com/playlist?list=...
https://music.youtube.com/watch?v=...
https://music.youtube.com/playlist?list=...
```

### 2️⃣ Escolhe a pasta

Clica na caixa da pasta de destino para escolher onde os MP3 vão ser guardados.  
A pasta fica **guardada automaticamente** — não precisas de escolher de novo.

### 3️⃣ Clica Baixar

O SpotWave trata do resto. Podes acompanhar o progresso em tempo real na sidebar e na barra principal.

### 4️⃣ Abre os ficheiros

No final, clica em **"Ver pasta"** para abrir diretamente a pasta com os MP3 descarregados.

---

## 🍪 Sistema de Cookies — Como funciona

O YouTube impõe **limites de taxa** a pedidos anónimos, o que pode fazer os downloads falharem ou ficarem lentos. O SpotWave resolve isto de forma inteligente e **100% local** — os teus cookies nunca saem do teu computador.

### Como configurar

1. Abre as **⚙️ Configurações** no SpotWave
2. Em **"Browser para cookies"**, seleciona o browser onde estás com sessão iniciada no YouTube
3. O SpotWave extrai os cookies automaticamente na primeira vez
4. A partir daí, os downloads funcionam como se fosses tu a ver os vídeos

### Browsers suportados

| Browser | Suportado |
|---|---|
| 🟦 Google Chrome | ✅ |
| 🔵 Microsoft Edge | ✅ |
| 🦁 Brave | ✅ |
| 🦊 Firefox | ✅ |
| 🎭 Opera | ✅ |
| 🔴 Vivaldi | ✅ |

> 💡 **Privacidade:** Os cookies são lidos diretamente do teu browser e guardados localmente em `%AppData%\spotwave`. Nunca são enviados para qualquer servidor externo.

---

## ⚡ Modo Paralelo — Downloads ultra-rápidos

O SpotWave tem um **Modo Paralelo** que corre múltiplos processos de download em simultâneo, ideal para playlists grandes.

Ativa nas ⚙️ **Configurações → Modo Paralelo** e usa o slider para escolher entre **1 e 20 processos simultâneos**.

```
Modo Normal  →  1 música de cada vez (sequencial)
Modo Paralelo →  até 20 músicas ao mesmo tempo 🚀
```

> ⚠️ Com valores muito altos (15-20) o YouTube pode impor rate limits temporários. O valor recomendado para playlists grandes é entre **5 e 10**.

---

## 🖥️ Terminal em tempo real

Clica em **"Ver detalhes"** durante um download para abrires o terminal integrado e veres exatamente o que o yt-dlp está a fazer — percentagem, conversão de áudio, aplicação de metadados e muito mais.

```
[download] Downloading item 3 of 13
[download]  76.0% of 2.63MiB at 53.80MiB/s ETA 00:00
[ExtractAudio] Destination: Fainted Love.mp3
[Metadata] Adding metadata to "Fainted Love.mp3"
[EmbedThumbnail] Adding thumbnail to "Fainted Love.mp3"
```

---

## 📂 Estrutura dos ficheiros de saída

```
Pasta escolhida/
├── Nome da Música 1.mp3
├── Nome da Música 2.mp3
├── Nome da Música 3.mp3
└── ...
```

Cada MP3 contém embutido:
- 🏷️ Título e artista
- 💿 Nome do álbum / playlist
- 🖼️ Capa (thumbnail do YouTube convertida para PNG)
- 📅 Metadados ID3v2 compatíveis com qualquer leitor de música

---

## ⚙️ Configurações

| Opção | Descrição | Padrão |
|---|---|---|
| **Pasta de destino** | Onde os MP3 são guardados | Pasta Músicas do sistema |
| **Downloads simultâneos** | Fragmentos paralelos por ficheiro (yt-dlp interno) | 3 |
| **Browser para cookies** | Browser para autenticação no YouTube | Nenhum |
| **Modo Paralelo** | Múltiplos processos de download em paralelo | Desativado |
| **Processos simultâneos** | Número de downloads paralelos (1–20) | 3 |

---

## 🔧 Tecnologia

| Componente | Função |
|---|---|
| [Electron](https://www.electronjs.org/) | Framework da aplicação desktop |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | Motor de download do YouTube |
| [FFmpeg](https://ffmpeg.org/) | Conversão de áudio e embedding de metadados |
| [electron-store](https://github.com/sindresorhus/electron-store) | Persistência de configurações |

> O `yt-dlp.exe` e o `ffmpeg.exe` estão **embutidos dentro do `.exe`** — não precisas de os instalar separadamente.

---

## 🏗️ Compilar a partir do código fonte

Se quiseres compilar o SpotWave tu mesmo:

```bash
# 1. Instala as dependências
npm install

# 2. Testa em modo dev
npm start

# 3. Compila o .exe portátil
npm run build
```

O executável final aparece em `dist/SpotWave.exe`.

**Pré-requisitos para compilar:**
- [Node.js](https://nodejs.org/) v18 ou superior
- `yt-dlp.exe` e `ffmpeg.exe` na pasta `bin/`
- `icon.ico` na pasta `assets/`

---

## 📋 Links suportados

```
✅ https://www.youtube.com/watch?v=XXXXXXXXXXX
✅ https://www.youtube.com/playlist?list=XXXXXXXXXXX
✅ https://youtu.be/XXXXXXXXXXX
✅ https://music.youtube.com/watch?v=XXXXXXXXXXX
✅ https://music.youtube.com/playlist?list=XXXXXXXXXXX
```

---

<div align="center">

Feito com ❤️ usando **Electron** + **yt-dlp** + **FFmpeg**

*Se gostaste do projeto, deixa uma ⭐ no GitHub!*

</div>
