#!/usr/bin/env python3
"""Dependency-free local launcher. Default: loopback only."""
import argparse, functools, http.server, pathlib, socket, threading, webbrowser
parser=argparse.ArgumentParser(description='Park Photo Planner を起動')
parser.add_argument('--lan',action='store_true',help='同じWi-Fiのスマホから接続可能にする')
parser.add_argument('--port',type=int,default=8765)
parser.add_argument('--no-browser',action='store_true')
args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parent
class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map={**http.server.SimpleHTTPRequestHandler.extensions_map,'.mjs':'text/javascript','.webmanifest':'application/manifest+json'}
    def end_headers(self):
        self.send_header('Cache-Control','no-cache')
        self.send_header('X-Content-Type-Options','nosniff')
        super().end_headers()
    def list_directory(self,path):
        self.send_error(404)
        return None
handler=functools.partial(Handler,directory=str(root))
server=None
for port in range(args.port,args.port+20):
    try:
        server=http.server.ThreadingHTTPServer(('0.0.0.0' if args.lan else '127.0.0.1',port),handler)
        break
    except OSError:
        continue
if server is None:
    raise SystemExit('起動できません。別のポート番号を --port で指定してください。')
url=f'http://localhost:{server.server_port}'
print(f'\nPark Photo Planner\nMac: {url}\n停止するには Control + C\n',flush=True)
if args.lan:
    ip='MacのWi-Fi IPアドレス'
    try:
        with socket.socket(socket.AF_INET,socket.SOCK_DGRAM) as s:
            s.connect(('192.0.2.1',80)); ip=s.getsockname()[0]
    except OSError:
        pass
    print(f'同じWi-Fiのスマホ: http://{ip}:{server.server_port}\nLANのHTTP接続では現在地・オフライン保存が使えない場合があります。地図タップは使えます。\n',flush=True)
if not args.no_browser:
    threading.Timer(.6,lambda:webbrowser.open(url)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    print('\n停止しました。')
finally:
    server.server_close()
