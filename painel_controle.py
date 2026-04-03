"""
PortalAF - Painel de Desenvolvimento
App simples para gerenciar o projeto sem precisar saber programacao.
Fluxo: editar localmente -> salvar e enviar -> Vercel atualiza sozinho.
"""

import json
import os
import queue
import shutil
import subprocess
import threading
import time
import webbrowser
from pathlib import Path
from tkinter import filedialog, messagebox, scrolledtext, ttk
import tkinter as tk

# ---------------------------------------------------------------------------
# Configuracao persistente (salva na home de cada usuario)
# ---------------------------------------------------------------------------
CONFIG_DIR = Path.home() / ".portalaf-dev"
CONFIG_FILE = CONFIG_DIR / "config.json"
GITHUB_URL = "https://github.com/portalafsolucoes/portalafsolucoes"
VERCEL_URL = "https://vercel.com/portalafsolucoes-3134s-projects/portalafsolucoes"
SITE_URL = "https://portalafsolucoes-delta.vercel.app"
LOCAL_URL = "http://localhost:3000"


def load_config() -> dict:
    CONFIG_DIR.mkdir(exist_ok=True)
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {}


def save_config(cfg: dict) -> None:
    CONFIG_DIR.mkdir(exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")


def ask_project_folder(parent: tk.Tk | None = None) -> str | None:
    folder = filedialog.askdirectory(
        title="Selecione a pasta do projeto PortalAF",
        parent=parent,
    )
    return folder if folder else None


# ---------------------------------------------------------------------------
# App principal
# ---------------------------------------------------------------------------
class DevControlApp:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("PortalAF - Painel de Desenvolvimento")
        self.root.geometry("1200x820")
        self.root.minsize(1050, 720)

        self.event_queue: "queue.Queue[tuple[str, str]]" = queue.Queue()
        self.dev_process: subprocess.Popen | None = None
        self.log_reader_thread: threading.Thread | None = None
        self.busy = False

        # Carrega ou pede a pasta do projeto
        cfg = load_config()
        self.repo_root: Path | None = None
        saved = cfg.get("project_folder")
        if saved and Path(saved).is_dir():
            self.repo_root = Path(saved)
        else:
            folder = ask_project_folder(root)
            if folder:
                self.repo_root = Path(folder)
                cfg["project_folder"] = folder
                save_config(cfg)
            else:
                messagebox.showerror("Erro", "Nenhuma pasta selecionada. O app vai fechar.")
                root.destroy()
                return

        self.state_dir = self.repo_root / ".dev-control"
        self.state_dir.mkdir(exist_ok=True)
        self.pid_path = self.state_dir / "next-dev.pid"

        # Variaveis da UI
        self.folder_var = tk.StringVar(value=str(self.repo_root))
        self.branch_var = tk.StringVar(value="...")
        self.changes_var = tk.StringVar(value="...")
        self.server_var = tk.StringVar(value="Parado")
        self.message_var = tk.StringVar(value="Pronto.")
        self.commit_msg_var = tk.StringVar()

        self._build_ui()
        self._load_existing_process()
        self.root.after(300, self._process_events)
        # Refresh em background para a janela aparecer imediatamente
        self.root.after(500, self.refresh_all)
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    # -----------------------------------------------------------------------
    # UI
    # -----------------------------------------------------------------------
    def _build_ui(self) -> None:
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(2, weight=1)

        self._build_header()
        self._build_toolbar()
        self._build_main_area()
        self._build_statusbar()

    def _build_header(self) -> None:
        hdr = ttk.Frame(self.root, padding=(16, 12, 16, 4))
        hdr.grid(row=0, column=0, sticky="ew")
        hdr.columnconfigure(1, weight=1)

        ttk.Label(hdr, text="PortalAF - Painel de Desenvolvimento",
                  font=("Segoe UI", 17, "bold")).grid(row=0, column=0, columnspan=3, sticky="w")

        ttk.Label(hdr, text="Pasta do projeto:", font=("Segoe UI", 9)).grid(
            row=1, column=0, sticky="w", pady=(8, 0))
        ttk.Label(hdr, textvariable=self.folder_var, font=("Segoe UI", 9, "italic")).grid(
            row=1, column=1, sticky="w", padx=(6, 0), pady=(8, 0))
        ttk.Button(hdr, text="Trocar pasta", command=self._change_folder).grid(
            row=1, column=2, sticky="e", pady=(8, 0))

    def _build_toolbar(self) -> None:
        bar = ttk.Frame(self.root, padding=(16, 6, 16, 2))
        bar.grid(row=1, column=0, sticky="ew")

        info = ttk.Frame(bar)
        info.pack(fill="x")

        ttk.Label(info, text="Branch:", font=("Segoe UI", 9, "bold")).pack(side="left")
        ttk.Label(info, textvariable=self.branch_var, font=("Segoe UI", 9)).pack(side="left", padx=(4, 16))
        ttk.Label(info, text="Mudancas:", font=("Segoe UI", 9, "bold")).pack(side="left")
        ttk.Label(info, textvariable=self.changes_var, font=("Segoe UI", 9)).pack(side="left", padx=(4, 16))
        ttk.Label(info, text="Servidor:", font=("Segoe UI", 9, "bold")).pack(side="left")
        self.server_label = ttk.Label(info, textvariable=self.server_var, font=("Segoe UI", 9, "bold"))
        self.server_label.pack(side="left", padx=(4, 0))

        ttk.Button(info, text="Atualizar", command=self.refresh_all).pack(side="right")

    def _build_main_area(self) -> None:
        content = ttk.Panedwindow(self.root, orient=tk.HORIZONTAL)
        content.grid(row=2, column=0, sticky="nsew", padx=16, pady=(4, 8))

        left = ttk.Frame(content, padding=6)
        right = ttk.Frame(content, padding=6)
        left.columnconfigure(0, weight=1)
        right.columnconfigure(0, weight=1)
        right.rowconfigure(1, weight=1)

        content.add(left, weight=1)
        content.add(right, weight=2)

        row = 0

        # -- Secao: Fluxo de Trabalho --
        row = self._section(left, row, "Fluxo de Trabalho")

        ttk.Label(left, text="Mensagem (descreva o que voce fez):").grid(
            row=row, column=0, sticky="w", pady=(0, 2))
        row += 1
        ttk.Entry(left, textvariable=self.commit_msg_var, font=("Segoe UI", 10)).grid(
            row=row, column=0, sticky="ew", pady=(0, 8))
        row += 1

        bf1 = ttk.Frame(left)
        bf1.grid(row=row, column=0, sticky="ew")
        row += 1
        bf1.columnconfigure(0, weight=1)
        bf1.columnconfigure(1, weight=1)

        self.btn_save_send = ttk.Button(bf1, text="Salvar e Enviar",
                                        command=self._commit_and_push)
        self.btn_save_send.grid(row=0, column=0, sticky="ew", padx=(0, 4), pady=2)
        self._tooltip(self.btn_save_send, "Salva suas mudancas e envia pro GitHub.\nA Vercel atualiza o site automaticamente.")

        self.btn_save_only = ttk.Button(bf1, text="Apenas Salvar",
                                        command=self._commit_only)
        self.btn_save_only.grid(row=0, column=1, sticky="ew", padx=(4, 0), pady=2)
        self._tooltip(self.btn_save_only, "Salva suas mudancas localmente sem enviar pro GitHub.")

        bf2 = ttk.Frame(left)
        bf2.grid(row=row, column=0, sticky="ew")
        row += 1
        bf2.columnconfigure(0, weight=1)
        bf2.columnconfigure(1, weight=1)

        self.btn_pull = ttk.Button(bf2, text="Puxar alteracoes",
                                   command=self._git_pull)
        self.btn_pull.grid(row=0, column=0, sticky="ew", padx=(0, 4), pady=2)
        self._tooltip(self.btn_pull, "Baixa as ultimas mudancas que seu colega enviou.")

        self.btn_push = ttk.Button(bf2, text="Enviar pro GitHub",
                                   command=self._git_push)
        self.btn_push.grid(row=0, column=1, sticky="ew", padx=(4, 0), pady=2)
        self._tooltip(self.btn_push, "Envia os commits locais pro GitHub.")

        # -- Secao: Rodar o Site --
        row = self._section(left, row, "Rodar o Site Localmente")

        bf3 = ttk.Frame(left)
        bf3.grid(row=row, column=0, sticky="ew")
        row += 1
        bf3.columnconfigure(0, weight=1)
        bf3.columnconfigure(1, weight=1)

        self.btn_start = ttk.Button(bf3, text="Iniciar site", command=self._start_server)
        self.btn_start.grid(row=0, column=0, sticky="ew", padx=(0, 4), pady=2)
        self._tooltip(self.btn_start, "Inicia o site localmente na porta 3000.")

        self.btn_stop = ttk.Button(bf3, text="Parar site", command=self._stop_server)
        self.btn_stop.grid(row=0, column=1, sticky="ew", padx=(4, 0), pady=2)

        bf4 = ttk.Frame(left)
        bf4.grid(row=row, column=0, sticky="ew")
        row += 1
        bf4.columnconfigure(0, weight=1)
        bf4.columnconfigure(1, weight=1)

        self.btn_open_local = ttk.Button(bf4, text="Abrir no navegador",
                                         command=lambda: webbrowser.open(LOCAL_URL))
        self.btn_open_local.grid(row=0, column=0, sticky="ew", padx=(0, 4), pady=2)

        self.btn_free_port = ttk.Button(bf4, text="Liberar porta 3000",
                                        command=self._free_port)
        self.btn_free_port.grid(row=0, column=1, sticky="ew", padx=(4, 0), pady=2)
        self._tooltip(self.btn_free_port, "Mata qualquer programa usando a porta 3000.\nUse se o site nao conseguir iniciar.")

        # -- Secao: Ferramentas --
        row = self._section(left, row, "Ferramentas")

        bf5 = ttk.Frame(left)
        bf5.grid(row=row, column=0, sticky="ew")
        row += 1
        bf5.columnconfigure(0, weight=1)
        bf5.columnconfigure(1, weight=1)

        b_install = ttk.Button(bf5, text="Instalar dependencias",
                               command=lambda: self._run("Instalar dependencias", ["npm.cmd", "install"]))
        b_install.grid(row=0, column=0, sticky="ew", padx=(0, 4), pady=2)
        self._tooltip(b_install, "Instala pacotes necessarios do projeto.\nRode apos puxar alteracoes.")

        b_prisma = ttk.Button(bf5, text="Gerar banco de dados",
                              command=lambda: self._run("Gerar banco", ["npm.cmd", "run", "db:generate"]))
        b_prisma.grid(row=0, column=1, sticky="ew", padx=(4, 0), pady=2)
        self._tooltip(b_prisma, "Gera o cliente do banco de dados (Prisma).")

        bf6 = ttk.Frame(left)
        bf6.grid(row=row, column=0, sticky="ew")
        row += 1
        bf6.columnconfigure(0, weight=1)
        bf6.columnconfigure(1, weight=1)

        b_build = ttk.Button(bf6, text="Testar build",
                             command=lambda: self._run("Build", ["npm.cmd", "run", "build"]))
        b_build.grid(row=0, column=0, sticky="ew", padx=(0, 4), pady=2)
        self._tooltip(b_build, "Testa se o projeto compila sem erros.\nBom para verificar antes de enviar.")

        b_folder = ttk.Button(bf6, text="Abrir pasta do projeto",
                              command=self._open_folder)
        b_folder.grid(row=0, column=1, sticky="ew", padx=(4, 0), pady=2)

        # -- Secao: Links --
        row = self._section(left, row, "Links Rapidos")
        bf7 = ttk.Frame(left)
        bf7.grid(row=row, column=0, sticky="ew")
        row += 1
        bf7.columnconfigure(0, weight=1)
        bf7.columnconfigure(1, weight=1)
        bf7.columnconfigure(2, weight=1)

        ttk.Button(bf7, text="GitHub",
                   command=lambda: webbrowser.open(GITHUB_URL)).grid(
            row=0, column=0, sticky="ew", padx=(0, 4), pady=2)
        ttk.Button(bf7, text="Vercel",
                   command=lambda: webbrowser.open(VERCEL_URL)).grid(
            row=0, column=1, sticky="ew", padx=4, pady=2)
        ttk.Button(bf7, text="Site Online",
                   command=lambda: webbrowser.open(SITE_URL)).grid(
            row=0, column=2, sticky="ew", padx=(4, 0), pady=2)

        # -- Console / Logs --
        top_r = ttk.Frame(right)
        top_r.grid(row=0, column=0, sticky="ew")
        top_r.columnconfigure(0, weight=1)
        ttk.Label(top_r, text="Console", font=("Segoe UI", 12, "bold")).grid(
            row=0, column=0, sticky="w")
        ttk.Button(top_r, text="Limpar", command=self._clear_output).grid(
            row=0, column=1, sticky="e")

        self.output = scrolledtext.ScrolledText(right, wrap=tk.WORD, font=("Consolas", 10))
        self.output.grid(row=1, column=0, sticky="nsew", pady=(6, 0))
        self.output.configure(state="disabled")

    def _build_statusbar(self) -> None:
        bar = ttk.Frame(self.root, padding=(16, 4, 16, 6))
        bar.grid(row=3, column=0, sticky="ew")
        bar.columnconfigure(0, weight=1)
        self.status_label = ttk.Label(bar, textvariable=self.message_var,
                                      font=("Segoe UI", 9))
        self.status_label.grid(row=0, column=0, sticky="w")

    def _section(self, parent: ttk.Frame, row: int, title: str) -> int:
        ttk.Separator(parent, orient="horizontal").grid(
            row=row, column=0, sticky="ew", pady=(10, 2))
        row += 1
        ttk.Label(parent, text=title, font=("Segoe UI", 11, "bold")).grid(
            row=row, column=0, sticky="w", pady=(0, 6))
        row += 1
        return row

    # -----------------------------------------------------------------------
    # Tooltips simples
    # -----------------------------------------------------------------------
    def _tooltip(self, widget: tk.Widget, text: str) -> None:
        tip_window: list[tk.Toplevel | None] = [None]

        def show(event: tk.Event) -> None:
            if tip_window[0]:
                return
            tw = tk.Toplevel(widget)
            tip_window[0] = tw
            tw.wm_overrideredirect(True)
            tw.wm_geometry(f"+{event.x_root + 12}+{event.y_root + 12}")
            lbl = ttk.Label(tw, text=text, background="#ffffe0",
                            relief="solid", borderwidth=1, padding=(6, 4),
                            font=("Segoe UI", 9))
            lbl.pack()

        def hide(_: tk.Event) -> None:
            tw = tip_window[0]
            if tw:
                tw.destroy()
                tip_window[0] = None

        widget.bind("<Enter>", show)
        widget.bind("<Leave>", hide)

    # -----------------------------------------------------------------------
    # Output e mensagens
    # -----------------------------------------------------------------------
    def _append(self, text: str) -> None:
        self.output.configure(state="normal")
        self.output.insert(tk.END, text)
        self.output.see(tk.END)
        self.output.configure(state="disabled")

    def _clear_output(self) -> None:
        self.output.configure(state="normal")
        self.output.delete("1.0", tk.END)
        self.output.configure(state="disabled")

    def _set_status(self, text: str) -> None:
        self.message_var.set(text)

    # -----------------------------------------------------------------------
    # Event loop (thread-safe -> UI)
    # -----------------------------------------------------------------------
    def _process_events(self) -> None:
        try:
            while True:
                kind, payload = self.event_queue.get_nowait()
                if kind == "log":
                    self._append(payload)
                elif kind == "status":
                    self._set_status(payload)
                elif kind == "refresh":
                    self.refresh_all()
                elif kind == "done":
                    self.busy = False
                elif kind == "clear_commit":
                    self.commit_msg_var.set("")
        except queue.Empty:
            pass
        finally:
            self.root.after(300, self._process_events)

    # -----------------------------------------------------------------------
    # Comandos genericos
    # -----------------------------------------------------------------------
    def _run(self, title: str, cmd: list[str], after_refresh: bool = True) -> None:
        if self.busy:
            self._set_status("Aguarde o comando anterior terminar...")
            return
        self.busy = True

        def worker() -> None:
            self.event_queue.put(("status", f"{title}..."))
            self.event_queue.put(("log", f"\n{'=' * 40}\n  {title}\n{'=' * 40}\n$ {' '.join(cmd)}\n\n"))
            try:
                result = subprocess.run(
                    cmd, cwd=self.repo_root,
                    capture_output=True, text=True,
                    encoding="utf-8", errors="replace",
                )
                if result.stdout:
                    self.event_queue.put(("log", result.stdout))
                if result.stderr:
                    self.event_queue.put(("log", result.stderr))
                ok = result.returncode == 0
                self.event_queue.put(("status",
                    f"{title} — {'OK' if ok else f'erro (codigo {result.returncode})'}"))
            except Exception as exc:
                self.event_queue.put(("log", f"\nERRO: {exc}\n"))
                self.event_queue.put(("status", f"{title} — falhou"))
            finally:
                if after_refresh:
                    self.event_queue.put(("refresh", ""))
                self.event_queue.put(("done", ""))

        threading.Thread(target=worker, daemon=True).start()

    def _run_seq(self, title: str, steps: list[tuple[str, list[str]]],
                 on_finish: "callable | None" = None) -> None:
        """Executa uma sequencia de comandos, parando no primeiro erro."""
        if self.busy:
            self._set_status("Aguarde o comando anterior terminar...")
            return
        self.busy = True

        def worker() -> None:
            self.event_queue.put(("status", f"{title}..."))
            all_ok = True
            for step_title, cmd in steps:
                self.event_queue.put(("log", f"\n--- {step_title} ---\n$ {' '.join(cmd)}\n"))
                try:
                    result = subprocess.run(
                        cmd, cwd=self.repo_root,
                        capture_output=True, text=True,
                        encoding="utf-8", errors="replace",
                    )
                    if result.stdout:
                        self.event_queue.put(("log", result.stdout))
                    if result.stderr:
                        self.event_queue.put(("log", result.stderr))
                    if result.returncode != 0:
                        self.event_queue.put(("status", f"{step_title} — erro"))
                        all_ok = False
                        break
                except Exception as exc:
                    self.event_queue.put(("log", f"\nERRO: {exc}\n"))
                    self.event_queue.put(("status", f"{step_title} — falhou"))
                    all_ok = False
                    break

            if all_ok:
                self.event_queue.put(("status", f"{title} — OK"))
            if on_finish:
                on_finish(all_ok)
            self.event_queue.put(("refresh", ""))
            self.event_queue.put(("done", ""))

        threading.Thread(target=worker, daemon=True).start()

    def _safe_run(self, cmd: list[str], timeout: int = 10) -> str:
        try:
            r = subprocess.run(cmd, cwd=self.repo_root, capture_output=True,
                               text=True, encoding="utf-8", errors="replace",
                               timeout=timeout)
            return (r.stdout or r.stderr or "").strip()
        except (subprocess.TimeoutExpired, Exception):
            return ""

    # -----------------------------------------------------------------------
    # Git: Fluxo de Trabalho
    # -----------------------------------------------------------------------
    def _git_pull(self) -> None:
        self._run("Puxar alteracoes", ["git", "pull", "--ff-only"])

    def _git_push(self) -> None:
        msg = self.commit_msg_var.get().strip()
        if not msg:
            msg = "atualiza alteracoes locais"

        def on_done(ok: bool) -> None:
            if ok:
                self.event_queue.put(("clear_commit", ""))

        self._run_seq("Enviar pro GitHub", [
            ("Preparar arquivos", ["git", "add", "-A"]),
            ("Salvar (commit)", ["git", "commit", "-m", msg]),
            ("Enviar pro GitHub", ["git", "push", "origin", "main"]),
        ], on_finish=on_done)

    def _commit_only(self) -> None:
        msg = self.commit_msg_var.get().strip()
        if not msg:
            messagebox.showwarning("Commit", "Escreva uma mensagem descrevendo o que voce fez.")
            return

        def on_done(ok: bool) -> None:
            if ok:
                self.event_queue.put(("clear_commit", ""))

        self._run_seq("Salvar mudancas", [
            ("Preparar arquivos", ["git", "add", "-A"]),
            ("Salvar (commit)", ["git", "commit", "-m", msg]),
        ], on_finish=on_done)

    def _commit_and_push(self) -> None:
        msg = self.commit_msg_var.get().strip()
        if not msg:
            messagebox.showwarning("Commit", "Escreva uma mensagem descrevendo o que voce fez.")
            return

        def on_done(ok: bool) -> None:
            if ok:
                self.event_queue.put(("clear_commit", ""))

        self._run_seq("Salvar e Enviar", [
            ("Preparar arquivos", ["git", "add", "-A"]),
            ("Salvar (commit)", ["git", "commit", "-m", msg]),
            ("Enviar pro GitHub", ["git", "push", "origin", "main"]),
        ], on_finish=on_done)

    # -----------------------------------------------------------------------
    # Servidor local
    # -----------------------------------------------------------------------
    def _kill_server_process(self) -> None:
        """Encerra o servidor e qualquer processo na porta 3000."""
        # 1. Mata pelo PID salvo
        pid = self._read_pid()
        if pid:
            self._append(f"  Encerrando servidor (PID {pid})...\n")
            try:
                subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"],
                               capture_output=True, text=True,
                               encoding="utf-8", errors="replace")
            except Exception:
                pass

        # 2. Mata qualquer processo remanescente na porta 3000
        try:
            result = subprocess.run(
                ["netstat", "-ano"], capture_output=True,
                text=True, encoding="utf-8", errors="replace",
            )
            for line in result.stdout.splitlines():
                if ":3000" in line and "LISTENING" in line:
                    parts = line.split()
                    pid_str = parts[-1] if parts else ""
                    if pid_str.isdigit() and pid_str != "0":
                        self._append(f"  Encerrando processo na porta 3000 (PID {pid_str})...\n")
                        subprocess.run(["taskkill", "/PID", pid_str, "/T", "/F"],
                                       capture_output=True, text=True,
                                       encoding="utf-8", errors="replace")
        except Exception:
            pass

        self.pid_path.unlink(missing_ok=True)
        self.dev_process = None

    def _clean_next_cache(self) -> bool:
        """Remove a pasta .next. Retorna True se ficou limpa."""
        next_dir = self.repo_root / ".next"
        if not next_dir.exists():
            return True
        try:
            shutil.rmtree(next_dir)
            self._append("  Cache .next limpo com sucesso.\n")
            return True
        except Exception as exc:
            self._append(f"  Falha ao limpar .next: {exc}\n")
            return False

    def _start_server(self) -> None:
        if self.busy:
            self._set_status("Aguarde o comando anterior terminar...")
            return

        self.busy = True

        def worker() -> None:
            self.event_queue.put(("log",
                "\n========================================\n"
                "  Iniciando site local\n"
                "========================================\n"))

            # 1. Parar servidor anterior (se houver)
            if self._is_server_running() or self._read_pid():
                self.event_queue.put(("log", "\n--- Parando servidor anterior ---\n"))
                self._kill_server_process()
                time.sleep(2)  # Aguarda o Windows liberar os locks dos arquivos

            # 2. Limpar cache .next
            self.event_queue.put(("log", "\n--- Limpando cache de build (.next) ---\n"))
            if not self._clean_next_cache():
                # Tenta mais uma vez apos aguardar
                time.sleep(2)
                self._clean_next_cache()

            # 3. Iniciar o servidor
            self.event_queue.put(("log", "\n--- Iniciando npm run dev ---\n"))
            self.event_queue.put(("status", "Iniciando site local..."))

            creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0

            self.dev_process = subprocess.Popen(
                ["npm.cmd", "run", "dev"],
                cwd=self.repo_root,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL,
                text=True, encoding="utf-8", errors="replace",
                creationflags=creation_flags,
            )
            self.pid_path.write_text(str(self.dev_process.pid), encoding="utf-8")

            # Le a saida do servidor em tempo real
            try:
                for line in self.dev_process.stdout or []:
                    self.event_queue.put(("log", line))
            finally:
                self.event_queue.put(("refresh", ""))
                self.event_queue.put(("done", ""))

        threading.Thread(target=worker, daemon=True).start()
        self.root.after(3000, self.refresh_all)

    def _stop_server(self) -> None:
        if not self._is_server_running() and not self._read_pid():
            self._set_status("O site local nao esta rodando.")
            return

        self._append("\n========================================\n"
                     "  Parando site local\n"
                     "========================================\n")
        self._kill_server_process()
        self.refresh_all()
        self._set_status("Site local parado.")

    def _free_port(self) -> None:
        if not messagebox.askyesno("Liberar porta",
                "Isso vai fechar QUALQUER programa usando a porta 3000.\nDeseja continuar?"):
            return

        self._append("\n--- Liberando porta 3000 ---\n")
        try:
            result = subprocess.run(
                ["netstat", "-ano"], capture_output=True,
                text=True, encoding="utf-8", errors="replace",
            )
            pids_killed: set[str] = set()
            for line in result.stdout.splitlines():
                if ":3000" in line and ("LISTENING" in line or "ESTABLISHED" in line):
                    parts = line.split()
                    pid_str = parts[-1] if parts else ""
                    if pid_str.isdigit() and pid_str != "0" and pid_str not in pids_killed:
                        pids_killed.add(pid_str)
                        self._append(f"  Matando PID {pid_str}...\n")
                        subprocess.run(["taskkill", "/PID", pid_str, "/T", "/F"],
                                       capture_output=True, text=True,
                                       encoding="utf-8", errors="replace")

            if pids_killed:
                self._append(f"  {len(pids_killed)} processo(s) encerrado(s).\n")
                self._set_status("Porta 3000 liberada.")
            else:
                self._append("  Nenhum processo encontrado na porta 3000.\n")
                self._set_status("Porta 3000 ja estava livre.")
        except Exception as exc:
            self._append(f"  ERRO: {exc}\n")

        self.pid_path.unlink(missing_ok=True)
        self.dev_process = None
        self.refresh_all()

    def _is_server_running(self) -> bool:
        pid = self._read_pid()
        if not pid:
            return False
        try:
            r = subprocess.run(["tasklist", "/FI", f"PID eq {pid}"],
                               capture_output=True, text=True,
                               encoding="utf-8", errors="replace",
                               timeout=5)
            return str(pid) in r.stdout
        except (subprocess.TimeoutExpired, Exception):
            return False

    def _read_pid(self) -> int | None:
        if not self.pid_path.exists():
            return None
        try:
            return int(self.pid_path.read_text(encoding="utf-8").strip())
        except (ValueError, OSError):
            return None

    def _load_existing_process(self) -> None:
        pid = self._read_pid()
        if pid and not self._is_server_running():
            self.pid_path.unlink(missing_ok=True)

    # -----------------------------------------------------------------------
    # Refresh
    # -----------------------------------------------------------------------
    def refresh_all(self) -> None:
        branch = self._safe_run(["git", "branch", "--show-current"]) or "?"
        self.branch_var.set(branch)

        status = self._safe_run(["git", "status", "--short"])
        lines = [l for l in status.splitlines() if l.strip()]
        n = len(lines)
        self.changes_var.set(f"{n} arquivo(s) modificado(s)" if n else "Nenhuma mudanca")

        if self._is_server_running():
            self.server_var.set("Rodando")
            try:
                self.server_label.configure(foreground="green")
            except Exception:
                pass
        else:
            self.server_var.set("Parado")
            try:
                self.server_label.configure(foreground="red")
            except Exception:
                pass

    # -----------------------------------------------------------------------
    # Pasta do projeto
    # -----------------------------------------------------------------------
    def _change_folder(self) -> None:
        folder = ask_project_folder(self.root)
        if not folder:
            return
        self.repo_root = Path(folder)
        self.folder_var.set(folder)
        self.state_dir = self.repo_root / ".dev-control"
        self.state_dir.mkdir(exist_ok=True)
        self.pid_path = self.state_dir / "next-dev.pid"
        cfg = load_config()
        cfg["project_folder"] = folder
        save_config(cfg)
        self.refresh_all()
        self._set_status(f"Pasta alterada para: {folder}")

    def _open_folder(self) -> None:
        if os.name == "nt":
            os.startfile(self.repo_root)
        else:
            subprocess.Popen(["xdg-open", str(self.repo_root)])

    # -----------------------------------------------------------------------
    # Fechar
    # -----------------------------------------------------------------------
    def _on_close(self) -> None:
        self.root.destroy()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    root = tk.Tk()
    style = ttk.Style()
    style.theme_use("clam")
    style.configure("TButton", padding=(8, 4))

    app = DevControlApp(root)
    if app.repo_root:
        app._append(f"Projeto: {app.repo_root}\n")
        app._append("Pronto para uso. Clique nos botoes para executar acoes.\n")
        root.mainloop()


if __name__ == "__main__":
    main()
