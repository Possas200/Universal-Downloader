import subprocess
import sys
import os
import time

def get_local_spotify_files(path):
    """Varre a pasta de destino à procura de ficheiros finalizados."""
    files = []
    extensoes_suportadas = (".mp3", ".mp4", ".m4a", ".webm", ".wav", ".mkv")
    try:
        if os.path.exists(path):
            for file in os.listdir(path):
                if file.lower().endswith(extensoes_suportadas) and not file.startswith("HIDDEN_"):
                    files.append(file)
    except: pass
    return files

def download_spotify_track(url, path, cancel_event):
    """Download otimizado com correção de travagem no processamento."""
    try:
        # Garante que o caminho existe antes de mudar o diretório
        if not os.path.exists(path):
            os.makedirs(path)
        os.chdir(path)
        
        # COMANDO CORRIGIDO: 
        # Usamos 'python -m spotdl' para garantir que usa o ambiente correto
        # Adicionado --log-level ERROR para evitar que o buffer de saída encha e trave o processo
        command = [
            sys.executable, "-m", "spotdl", "download", url,
            "--threads", "4",
            "--format", "mp3",
            "--log-level", "ERROR" 
        ]
        
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, # Captura erros separadamente
            universal_newlines=True,
            encoding='utf-8',
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
        )

        # Monitorização ativa
        while process.poll() is None:
            if cancel_event.is_set():
                process.terminate()
                cleanup_incomplete_downloads(path)
                return False
            time.sleep(0.5)
            
        # Verifica se o processo terminou com erro
        if process.returncode != 0:
            return False
            
        return True
    except Exception as e:
        print(f"Erro no motor Spotify: {e}")
        return False

def cleanup_incomplete_downloads(path):
    """Elimina ficheiros temporários em caso de cancelamento."""
    try:
        for file in os.listdir(path):
            if file.endswith(".spotdl") or file.endswith(".temp"):
                os.remove(os.path.join(path, file))
    except: pass
