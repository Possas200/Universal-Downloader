import customtkinter as ctk
import tkinter.messagebox as messagebox
import threading
import os
import time
import ctypes
import json
import re
import sys
import multiprocessing
from yt_core import download_youtube, get_playlist_info 
from sp_core import download_spotify_track, get_local_spotify_files
from ui_styles import UIStyles, PlaylistPanel

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(1)
except: pass

SETTINGS_FILE = "settings.json"

def apply_icon_fix(window):
    try:
        window.update_idletasks()
        window.iconbitmap('') 
    except Exception:
        pass

# CLASSE DE REDIRECIONAMENTO DE LOGS
class PrintLogger:
    def __init__(self, text_widget):
        self.text_widget = text_widget
        self.terminal = sys.stdout

    def write(self, message):
        self.terminal.write(message)
        self.text_widget.after(0, self._append_text, message)

    def _append_text(self, message):
        try:
            self.text_widget.configure(state="normal")
            self.text_widget.insert("end", message)
            self.text_widget.see("end")
            self.text_widget.configure(state="disabled")
        except: pass

    def flush(self):
        self.terminal.flush()

class App(ctk.CTk):
    def __init__(self):
        super().__init__()
        apply_icon_fix(self)

        self.title("Media Downloader Pro")
        UIStyles.center_window(self, 650, 650)
        self.configure(corner_radius=25)

        self.load_settings()
        
        self.cancel_event = threading.Event()
        self.detected_files = set()
        self.pre_existing_files = set()
        
        self.log_window = None
        self.original_stdout = sys.stdout
        self.original_stderr = sys.stderr
        
        # Variável para o rótulo de contagem (NOVO)
        self.count_lbl = None

        # Configuração da Grid Principal
        self.grid_columnconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=0)
        # Linha 0 para o contador (na col 1) e frame principal
        # Linha 1 para a lista (na col 1)
        self.grid_rowconfigure(0, weight=0) 
        self.grid_rowconfigure(1, weight=1)

        self.main_frame = ctk.CTkFrame(self, fg_color="transparent")
        # Main frame ocupa as duas linhas na coluna 0
        self.main_frame.grid(row=0, column=0, rowspan=2, sticky="nsew", padx=40, pady=30)

        self.title_lbl = ctk.CTkLabel(self.main_frame, text="Media Downloader", font=UIStyles.get_font(32, True))
        self.title_lbl.pack(pady=(10, 25))
        
        self.mode_switch = ctk.CTkSegmentedButton(self.main_frame, values=["YouTube", "Spotify"], 
                                                command=self.update_mode_ui, height=45, corner_radius=15)
        self.mode_switch.set("YouTube")
        self.mode_switch.pack(pady=10, fill="x")

        self.url_entry = ctk.CTkEntry(self.main_frame, placeholder_text="Cole o link aqui...", 
                                     width=450, height=50, corner_radius=15, font=UIStyles.get_font(14))
        self.url_entry.pack(pady=20)

        self.path_display_lbl = ctk.CTkLabel(self.main_frame, text=self.get_short_path(), 
                                            font=UIStyles.get_font(11), text_color="gray")
        self.path_display_lbl.pack(pady=(0, 5))

        self.options_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        self.options_frame.pack(fill="x", pady=5)
        
        self.fmt_menu = ctk.CTkOptionMenu(self.options_frame, values=["MP4", "MP3"], 
                                        width=120, height=40, corner_radius=12, font=UIStyles.get_font(13))
        self.fmt_menu.set("MP4")
        self.fmt_menu.pack(side="left", padx=5)

        self.logs_btn = ctk.CTkButton(self.options_frame, text="📜 Logs", width=80,
                                     height=40, corner_radius=12, font=UIStyles.get_font(13),
                                     fg_color=("gray75", "gray30"), text_color=("black", "white"),
                                     command=self.toggle_logs)
        self.logs_btn.pack(side="right", padx=5)

        self.path_btn = ctk.CTkButton(self.options_frame, text="📁 Alterar Destino", 
                                     height=40, corner_radius=12, font=UIStyles.get_font(13),
                                     fg_color=("gray80", "gray25"), text_color=("black", "white"),
                                     command=self.change_dir)
        self.path_btn.pack(side="right", padx=5)

        self.main_progress = ctk.CTkProgressBar(self.main_frame, height=12, corner_radius=10)
        self.main_progress.set(0)

        self.dl_btn = ctk.CTkButton(self.main_frame, text="Iniciar Download", height=65, 
                                   command=self.start_download, corner_radius=18,
                                   font=UIStyles.get_font(16, True))
        self.dl_btn.pack(pady=25, fill="x")

        self.stop_btn = ctk.CTkButton(self.main_frame, text="🛑 CANCELAR PROCESSO", height=50, 
                                     fg_color="#E74C3C", hover_color="#C0392B",
                                     command=self.stop_all_downloads, corner_radius=15,
                                     font=UIStyles.get_font(14, True))

        self.side_panel = None

    # --- LOGS ---
    def toggle_logs(self):
        if self.log_window is None or not self.log_window.winfo_exists():
            self.open_logs()
        else:
            self.close_logs()

    def open_logs(self):
        self.log_window = ctk.CTkToplevel(self)
        apply_icon_fix(self.log_window)
        self.log_window.title("Logs do Sistema")
        self.log_window.geometry("500x400")
        
        self.log_text = ctk.CTkTextbox(self.log_window, font=("Consolas", 12))
        self.log_text.pack(fill="both", expand=True, padx=10, pady=10)
        self.log_text.configure(state="disabled")

        self.log_window.protocol("WM_DELETE_WINDOW", self.close_logs)

        logger = PrintLogger(self.log_text)
        sys.stdout = logger
        sys.stderr = logger
        print(f"--- Logs Iniciados ---\nDestino: {self.download_path}\n")

    def close_logs(self):
        sys.stdout = self.original_stdout
        sys.stderr = self.original_stderr
        if self.log_window:
            self.log_window.destroy()
            self.log_window = None

    # --- SETTINGS ---
    def load_settings(self):
        default_path = os.path.expanduser("~\\Downloads")
        if os.path.exists(SETTINGS_FILE):
            try:
                with open(SETTINGS_FILE, 'r') as f:
                    data = json.load(f)
                    self.download_path = data.get("path", default_path)
                    if not os.path.exists(self.download_path):
                        self.download_path = default_path
            except:
                self.download_path = default_path
        else:
            self.download_path = default_path

    def save_settings(self):
        try:
            with open(SETTINGS_FILE, 'w') as f:
                json.dump({"path": self.download_path}, f)
        except: pass

    def get_short_path(self):
        parts = os.path.normpath(self.download_path).split(os.sep)
        if len(parts) > 2:
            return f"Destino: .../{parts[-2]}/{parts[-1]}"
        return f"Destino: {self.download_path}"

    def change_dir(self):
        folder = ctk.filedialog.askdirectory()
        if folder:
            self.download_path = folder
            self.path_display_lbl.configure(text=self.get_short_path())
            self.save_settings()
            print(f"Diretório alterado: {self.download_path}")

    def update_mode_ui(self, mode):
        if mode == "Spotify":
            self.fmt_menu.pack_forget()
        else:
            self.fmt_menu.pack(side="left", padx=5, before=self.path_btn)

    def stop_all_downloads(self):
        print("Cancelamento solicitado...")
        self.cancel_event.set()
        self.toggle_ui(False)
        self.reset_ui()
        messagebox.showinfo("Sistema", "Downloads interrompidos.")

    def sanitize_filename(self, name):
        return re.sub(r'[\\/*?:"<>|]', "", name)

    def start_download(self):
        url = self.url_entry.get().strip()
        if not url: return
        
        print(f"Iniciando download: {url}")
        self.cancel_event.clear()
        self.detected_files.clear()
        
        try:
            self.pre_existing_files = set(os.listdir(self.download_path))
            print(f"Ficheiros existentes ignorados: {len(self.pre_existing_files)}")
        except:
            self.pre_existing_files = set()

        self.dl_btn.configure(state="disabled", text="A PROCESSAR...")
        self.main_progress.pack(pady=15, fill="x", before=self.dl_btn)
        self.stop_btn.pack(pady=5, fill="x", after=self.dl_btn)
        
        threading.Thread(target=self.folder_monitor, daemon=True).start()
        threading.Thread(target=self.processor, args=(url,), daemon=True).start()

    def folder_monitor(self):
        while not self.cancel_event.is_set():
            if self.side_panel:
                current_files = get_local_spotify_files(self.download_path)
                for filename in current_files:
                    if filename not in self.detected_files and filename not in self.pre_existing_files:
                        self.detected_files.add(filename)
                        print(f"Transferido: {filename}")
                        self.after(0, lambda f=filename: self.add_to_side_list(f))
            time.sleep(0.5)

    def add_to_side_list(self, filename):
        if self.side_panel:
            self.side_panel.add_video(filename, filename)
            
            # ATUALIZAÇÃO DO CONTADOR (NOVO)
            total = len(self.detected_files)
            if self.count_lbl:
                self.count_lbl.configure(text=f"Músicas Baixadas: {total}")

            def animate():
                for i in range(0, 101, 10):
                    if self.cancel_event.is_set(): break
                    self.sync_all(filename, i/100)
                    time.sleep(0.01)
            threading.Thread(target=animate, daemon=True).start()

    def processor(self, url):
        mode = self.mode_switch.get()
        try:
            if mode == "YouTube":
                entries, is_playlist = get_playlist_info(url)
                if is_playlist:
                    self.after(0, self.toggle_ui, True)
                    from concurrent.futures import ThreadPoolExecutor
                    
                    filtered_entries = []
                    for e in entries:
                        safe_title = self.sanitize_filename(e['title'])
                        already_exists = False
                        for existing in self.pre_existing_files:
                            if safe_title in existing:
                                already_exists = True
                                break
                        if not already_exists: filtered_entries.append(e)

                    if not filtered_entries and entries:
                         print("Todos os vídeos já existem.")
                         self.after(0, lambda: messagebox.showinfo("Info", "Nada de novo para baixar."))

                    print(f"A baixar {len(filtered_entries)} vídeos...")
                    with ThreadPoolExecutor(max_workers=3) as executor:
                        for e in filtered_entries:
                            if self.cancel_event.is_set(): break
                            v_url = f"https://www.youtube.com/watch?v={e['id']}"
                            executor.submit(download_youtube, v_url, self.download_path, self.fmt_menu.get(), 
                                         lambda p, u=None: self.main_progress.set(p))
                else:
                    download_youtube(url, self.download_path, self.fmt_menu.get(), self.main_progress.set)
            
            elif mode == "Spotify":
                if "/playlist/" in url or "/album/" in url:
                    self.after(0, self.toggle_ui, True)
                print("Motor Spotify iniciado (Modo Ilimitado)...")
                download_spotify_track(url, self.download_path, self.cancel_event)

            if not self.cancel_event.is_set():
                print("Concluído.")
                self.after(0, self.final_popup)
        except Exception as e:
            print(f"ERRO: {e}")
            if not self.cancel_event.is_set():
                self.after(0, lambda: messagebox.showerror("Erro", str(e)))
        finally:
            self.after(0, self.reset_ui)

    def reset_ui(self):
        self.stop_btn.pack_forget()
        self.main_progress.pack_forget()
        self.dl_btn.configure(state="normal", text="Iniciar Download")

    def toggle_ui(self, expand):
        if expand:
            # MOSTRAR UI EXPANDIDA
            if not self.count_lbl:
                self.count_lbl = ctk.CTkLabel(self, text="Músicas Baixadas: 0", font=UIStyles.get_font(18, True))
                # Coloca o contador na linha 0, coluna 1
                self.count_lbl.grid(row=0, column=1, sticky="ew", pady=(30, 0)) 

            if not self.side_panel:
                self.side_panel = PlaylistPanel(self)
                # Coloca a lista na linha 1, coluna 1 (abaixo do contador)
                self.side_panel.grid(row=1, column=1, sticky="nsew", padx=(0, 20), pady=(5, 20))
                
            UIStyles.center_window(self, 1050, 650)
        else:
            # OCULTAR UI
            if self.count_lbl:
                self.count_lbl.grid_forget()
                self.count_lbl = None
            if self.side_panel:
                self.side_panel.grid_forget()
                self.side_panel = None
            UIStyles.center_window(self, 650, 650)

    def sync_all(self, uid, val):
        if self.side_panel and uid in self.side_panel.items:
            self.after(0, lambda: self.side_panel.items[uid].update_progress(val))

    def final_popup(self):
        win = ctk.CTkToplevel(self)
        apply_icon_fix(win)
        win.title("Download Finalizado")
        UIStyles.center_window(win, 400, 250)
        win.attributes("-topmost", True)
        win.configure(corner_radius=20)
        
        ctk.CTkLabel(win, text="✓ Tarefa Concluída", font=UIStyles.get_font(20, True)).pack(pady=(30, 20))
        
        ctk.CTkButton(win, text="📁 Abrir Pasta", 
                     fg_color=("gray80", "gray25"), text_color=("black", "white"),
                     width=200, height=45, corner_radius=12,
                     command=lambda: os.startfile(self.download_path)).pack(pady=10)

        ctk.CTkButton(win, text="Concluído", fg_color="#2ECC71", hover_color="#27AE60", 
                     width=200, height=45, corner_radius=12,
                     command=lambda: [self.toggle_ui(False), win.destroy()]).pack(pady=10)

if __name__ == "__main__":
    multiprocessing.freeze_support()
    app = App()
    app.mainloop()
