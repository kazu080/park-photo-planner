#!/bin/zsh
cd -- "${0:A:h}"
exec ./start.command --lan "$@"
