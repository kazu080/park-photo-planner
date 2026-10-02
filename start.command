#!/bin/zsh
cd -- "${0:A:h}"
if command -v python3 >/dev/null 2>&1; then
  exec python3 server.py "$@"
elif [[ -x "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3" ]]; then
  exec "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3" server.py "$@"
else
  print 'Python 3 が必要です。Python 3 をインストールしてから再度起動してください。'
  read -r '?Enter で閉じる'
fi
