import subprocess
import os
import re
import yt_dlp

def get_playlist_info(url):
    ydl_opts = {'quiet': True, 'extract_flat': True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        if 'entries' in info:
            return list(info['entries']), True
        return [info], False

def download_youtube(url, path, format_type, progress_callback):
    is_mp3 = format_type == 'MP3'
    # PASSO A: Nome Oculto
    output_template = os.path.join(path, "HIDDEN_%(title)s.temp.%(ext)s")

    # PASSO B: Invocação via Shell
    command = ['yt-dlp', '--newline', '-o', output_template, url]

    if is_mp3:
        command.extend(['-x', '--audio-format', 'mp3', '--audio-quality', '192K'])
    else:
        # SELETOR HÍBRIDO: MP4 > WebM > Best
        command.extend([
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo[ext=webm]+bestaudio[ext=webm]/best[ext=mp4]/best',
            '--merge-output-format', 'mp4'
        ])

    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True,
        encoding='utf-8',
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
    )

    # PASSO C: Regex de Progresso
    for line in process.stdout:
        match = re.search(r'(\d+\.\d+)%', line)
        if match:
            percent = float(match.group(1)) / 100
            progress_callback(percent)

    process.wait()

    # PASSO D: Finalização e Revelação
    for filename in os.listdir(path):
        if filename.startswith("HIDDEN_"):
            old_file = os.path.join(path, filename)
            # Determina extensão final real
            final_ext = ".mp3" if is_mp3 else ".mp4"
            # Remove prefixo, .temp e garante a extensão correta
            name_no_prefix = filename.replace("HIDDEN_", "").replace(".temp", "")
            base_name = os.path.splitext(name_no_prefix)[0]
            new_file = os.path.join(path, base_name + final_ext)
            
            if os.path.exists(new_file): os.remove(new_file)
            os.rename(old_file, new_file)