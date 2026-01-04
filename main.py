import customtkinter as ctk
import tkinter.messagebox as messagebox
import threading
import os
import time
import ctypes
import json
from yt_core import download_youtube, get_playlist_info 
from sp_core import download_spotify_track, get_local_spotify_files
from ui_styles import UIStyles, PlaylistPanel

try:
    ctypes.windll.shcore.SetProcessDpiAwareness(1)
except: pass

# Nome do ficheiro de configurações
SETTINGS_FILE = "settings.json"

class App(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("Media Downloader Pro")
        UIStyles.center_window(self, 650, 650) # Aumentado para acomodar o texto do caminho
        self.configure(corner_radius=25)

        # Carregar configurações ou definir padrão
        self.load_settings()
        
        self.cancel_event = threading.Event()
        self.detected_files = set()
        self.initial_files = set()
        self.transferred_count = 0
        self.count_label = None

        self.grid_columnconfigure(0, weight=1)
        self.grid_columnconfigure(1, weight=0)
        self.grid_rowconfigure(0, weight=1)

        self.main_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.main_frame.grid(row=0, column=0, sticky="nsew", padx=40, pady=30)

        self.title_lbl = ctk.CTkLabel(self.main_frame, text="Media Downloader", font=UIStyles.get_font(32, True))
        self.title_lbl.pack(pady=(10, 25))
        
        self.mode_switch = ctk.CTkSegmentedButton(self.main_frame, values=["YouTube", "Spotify"], 
                                                command=self.update_mode_ui, height=45, corner_radius=15)
        self.mode_switch.set("YouTube")
        self.mode_switch.pack(pady=10, fill="x")

        self.url_entry = ctk.CTkEntry(self.main_frame, placeholder_text="Cole o link aqui...", 
                                     width=450, height=50, corner_radius=15, font=UIStyles.get_font(14))
        self.url_entry.pack(pady=20)

        # Rótulo para mostrar o caminho atual (PROFISSIONAL)
        self.path_display_lbl = ctk.CTkLabel(self.main_frame, text=self.get_short_path(), 
                                            font=UIStyles.get_font(11), text_color="gray")
        self.path_display_lbl.pack(pady=(0, 5))

        self.options_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        self.options_frame.pack(fill="x", pady=5)
        
        self.fmt_menu = ctk.CTkOptionMenu(self.options_frame, values=["MP4", "MP3"], 
                                        width=120, height=40, corner_radius=12, font=UIStyles.get_font(13))
        self.fmt_menu.set("MP4")
        self.fmt_menu.pack(side="left", padx=5)

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

    def load_settings(self):
        """Carrega o diretório salvo no ficheiro settings.json"""
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
        """Guarda o diretório atual no ficheiro settings.json"""
        try:
            with open(SETTINGS_FILE, 'w') as f:
                json.dump({"path": self.download_path}, f)
        except: pass

    def get_short_path(self):
        """Retorna as últimas duas partes do diretório para exibição"""
        parts = os.path.normpath(self.download_path).split(os.sep)
        if len(parts) > 2:
            return f"Destino: .../{parts[-2]}/{parts[-1]}"
        return f"Destino: {self.download_path}"

    def change_dir(self):
        folder = ctk.filedialog.askdirectory()
        if folder:
            self.download_path = folder
            self.path_display_lbl.configure(text=self.get_short_path())
            self.save_settings() # Salva imediatamente ao mudar

    def update_mode_ui(self, mode):
        if mode == "Spotify":
            self.fmt_menu.pack_forget()
        else:
            self.fmt_menu.pack(side="left", padx=5, before=self.path_btn)

    def stop_all_downloads(self):
        self.cancel_event.set()
        self.toggle_ui(False)
        self.reset_ui()
        messagebox.showinfo("Sistema", "Downloads interrompidos.")

    def start_download(self):
        url = self.url_entry.get().strip()
        if not url: return
        self.cancel_event.clear()
        self.transferred_count = 0
        if self.count_label:
            self.count_label.configure(text="Ficheiros transferidos: 0")
        self.initial_files = set(get_local_spotify_files(self.download_path))
        self.detected_files.clear()
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
                    # Ignora ficheiros que já existiam antes do download
                    if filename in self.initial_files:
                        continue

                    # Só trata dos ficheiros novos desta sessão
                    if filename not in self.detected_files:
                        self.detected_files.add(filename)
                        self.after(0, lambda f=filename: self.add_to_side_list(f))
            time.sleep(0.25)


    def add_to_side_list(self, filename):
        if self.side_panel:
            self.side_panel.add_video(filename, filename)
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
                    with ThreadPoolExecutor(max_workers=len(entries)) as executor:
                        for e in entries:
                            if self.cancel_event.is_set(): break
                            v_url = f"https://www.youtube.com/watch?v={e['id']}"
                            executor.submit(download_youtube, v_url, self.download_path, self.fmt_menu.get(), 
                                         lambda p, u=None: self.main_progress.set(p))
                else:
                    download_youtube(url, self.download_path, self.fmt_menu.get(), self.main_progress.set)
            
            elif mode == "Spotify":
                if "/playlist/" in url or "/album/" in url:
                    self.after(0, self.toggle_ui, True)
                download_spotify_track(url, self.download_path, self.cancel_event)

            if not self.cancel_event.is_set():
                self.after(0, self.final_popup)
        except Exception as e:
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
            if not self.side_panel:
                self.side_panel = PlaylistPanel(self)
                self.side_panel.grid(row=0, column=1, sticky="nsew", padx=(0, 20), pady=20)
                self.transferred_count = 0  
            self.count_label = ctk.CTkLabel(
                self.side_panel,
                text="Ficheiros transferidos: 0",
                font=UIStyles.get_font(12)
            )
            self.count_label.pack(pady=(5, 0))

            UIStyles.center_window(self, 1050, 650)
        else:
            if self.side_panel:
                self.side_panel.grid_forget()
                self.side_panel = None
                self.count_label = None
            UIStyles.center_window(self, 650, 650)

    def sync_all(self, uid, val):
        if self.side_panel and uid in self.side_panel.items:
            self.after(0, lambda: self.side_panel.items[uid].update_progress(val))

    def final_popup(self):
        win = ctk.CTkToplevel(self)
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
    app = App()
    app.mainloop()
