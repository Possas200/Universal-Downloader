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
    """Download otimizado para Playlists Massivas (500+ músicas)."""
    try:
        # Garante que o caminho existe
        if not os.path.exists(path):
            os.makedirs(path)
        os.chdir(path)
        
        # Detetar ambiente (EXE ou Script)
        if getattr(sys, 'frozen', False):
            base_command = ["spotdl"]
        else:
            base_command = [sys.executable, "-m", "spotdl"]

        # Adicionei --no-cache para evitar que dados corrompidos de downloads anteriores parem o processo
        command = base_command + [
            "download", url,
            "--threads", "4",
            "--format", "mp3",
            "--log-level", "ERROR",
            "--no-cache" 
        ]
        
        # CORREÇÃO PRINCIPAL:
        # stdout=subprocess.DEVNULL -> Envia o texto de progresso para o "lixo" do sistema.
        # Isto impede que o buffer de memória encha e trave o download na música 100 ou 200.
        # O progresso visual continua a ser gerido pelo folder_monitor do main.py.
        process = subprocess.Popen(
            command,
            stdout=subprocess.DEVNULL, 
            stderr=subprocess.PIPE, # Mantemos stderr para capturar erros fatais no final
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
            
            # Pequena pausa para não sobrecarregar o CPU durante as 540 músicas
            time.sleep(1.0)
            
        # Verifica se o processo terminou com erro
        if process.returncode != 0:
            # Lemos o erro apenas no final se falhar
            err = process.stderr.read()
            if err: print(f"Erro SpotDL: {err}")
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
                try: os.remove(os.path.join(path, file))
                except: pass
    except: pass
