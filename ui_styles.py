import customtkinter as ctk

class UIStyles:
    @staticmethod
    def get_font(size=14, bold=False):
        # Usamos Segoe UI Variable, a fonte nativa do Windows 11
        return ("Segoe UI Variable", size, "bold" if bold else "normal")

    @staticmethod
    def center_window(window, width, height):
        screen_width = window.winfo_screenwidth()
        screen_height = window.winfo_screenheight()
        x = (screen_width // 2) - (width // 2)
        y = (screen_height // 2) - (height // 2)
        window.geometry(f"{width}x{height}+{x}+{y}")

class DownloadItem(ctk.CTkFrame):
    def __init__(self, master, title, **kwargs):
        # Aumentamos o corner_radius para 15 para um aspeto mais moderno
        super().__init__(master, fg_color=("gray92", "gray14"), corner_radius=15, **kwargs)
        
        # Aumentamos o padding lateral para o texto não bater nos cantos
        self.label = ctk.CTkLabel(self, text=title[:45] + "...", font=UIStyles.get_font(12), anchor="w")
        self.label.pack(padx=15, pady=(10, 0), fill="x")
        
        self.p_bar = ctk.CTkProgressBar(self, height=8, corner_radius=10, progress_color="#1f538d")
        self.p_bar.set(0)
        self.p_bar.pack(fill="x", padx=15, pady=(8, 12))

    def update_progress(self, val):
        self.p_bar.set(val)

class PlaylistPanel(ctk.CTkFrame):
    def __init__(self, master, **kwargs):
        # Design ultra-redondo para o painel lateral
        super().__init__(master, corner_radius=20, border_width=1, border_color=("gray80", "gray20"), **kwargs)
        self.label = ctk.CTkLabel(self, text="Fila de Processamento", font=UIStyles.get_font(18, True))
        self.label.pack(pady=15, padx=15)
        self.scroll = ctk.CTkScrollableFrame(self, width=340, height=450, fg_color="transparent")
        self.scroll.pack(pady=5, padx=10, fill="both", expand=True)
        self.items = {}

    def add_video(self, video_id, title):
        item = DownloadItem(self.scroll, title)
        item.pack(fill="x", pady=6, padx=5)
        self.items[video_id] = item
