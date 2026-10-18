"""Тимчасовий локальний сервер, щоб застосунок (відкритий у браузері) забрав import.json з цього комп'ютера.
Віддає тільки backups/books/import.json, лише на 127.0.0.1. Запуск: python tools/serve_import.py"""
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

FILE = Path(r"D:/Personal projects claude/kitchen-app/backups/books/import.json")


class H(BaseHTTPRequestHandler):
    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "https://ngomelska.github.io")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")

    def do_OPTIONS(self):
        self.send_response(204); self.cors(); self.end_headers()

    def do_GET(self):
        if self.path.split("?")[0] != "/import.json" or not FILE.exists():
            self.send_response(404); self.cors(); self.end_headers(); return
        data = FILE.read_bytes()
        self.send_response(200); self.cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data))); self.end_headers()
        self.wfile.write(data)


HTTPServer(("127.0.0.1", 5174), H).serve_forever()
