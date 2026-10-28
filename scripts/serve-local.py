#!/usr/bin/env python3
"""Servidor local do site -- reproduz as rotas do vercel.json.

Uso (na raiz do projeto):
    python scripts/serve-local.py          # porta 8000
    python scripts/serve-local.py 8080     # outra porta

Rotas:
    /br    -> serve index.html (mesmo rewrite do vercel.json), sem mudar a URL
    /br/   -> 301 para /br (equivale ao trailingSlash: false)

Assim o site se comporta localmente como em producao na Vercel.
"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Mesmas rotas do bloco "rewrites" do vercel.json.
REWRITES = {
    "/br": "/index.html",
}


class SiteHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _route(self):
        parts = urlsplit(self.path)
        if parts.path == "/br/":
            self.send_response(301)
            self.send_header("Location", "/br" + (("?" + parts.query) if parts.query else ""))
            self.end_headers()
            return False
        if parts.path in REWRITES:
            self.path = REWRITES[parts.path] + (("?" + parts.query) if parts.query else "")
        return True

    def do_GET(self):
        if self._route():
            super().do_GET()

    def do_HEAD(self):
        if self._route():
            super().do_HEAD()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = ThreadingHTTPServer(("127.0.0.1", port), SiteHandler)
    print("Site local:   http://127.0.0.1:%d/" % port)
    print("Home em /br:  http://127.0.0.1:%d/br" % port)
    print("Ctrl+C para parar.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
