# -*- coding: utf-8 -*-
"""Publica o dist/ (build do oasis ejetado) na VPS em /home/donna/clinica/dist.
Uso: python deploy/_deploy_dist.py   (rodar da raiz do repo, com dist/ ja buildado).
Nao mexe em nginx/compose — so envia os arquivos estaticos."""
import os, sys, posixpath
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko

# Credenciais NUNCA no codigo. Setar antes de rodar:
#   VPS_HOST (default 177.7.44.25), VPS_USER (default root), VPS_PASS (obrigatorio)
HOST = os.environ.get("VPS_HOST", "177.7.44.25")
USER = os.environ.get("VPS_USER", "root")
PWD  = os.environ.get("VPS_PASS")
LOCAL = os.path.join(os.path.dirname(__file__), '..', 'dist')
REMOTE = "/home/donna/clinica/dist"

if not PWD:
    print("ERRO: defina VPS_PASS no ambiente antes de rodar."); sys.exit(1)
if not os.path.isdir(LOCAL):
    print("ERRO: dist/ nao existe. Rode 'npm run build' antes."); sys.exit(1)

c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=USER, password=PWD, timeout=40)
sftp = c.open_sftp()

def mkdirs(path):
    parts = path.strip('/').split('/'); cur = ''
    for p in parts:
        cur += '/' + p
        try: sftp.stat(cur)
        except IOError: sftp.mkdir(cur)

mkdirs(REMOTE)
count = 0
for root, dirs, files in os.walk(LOCAL):
    rel = os.path.relpath(root, LOCAL).replace('\\', '/')
    rdir = REMOTE if rel == '.' else posixpath.join(REMOTE, rel)
    mkdirs(rdir)
    for f in files:
        sftp.put(os.path.join(root, f), posixpath.join(rdir, f))
        count += 1

sftp.close()
print("OK: %d arquivos publicados em %s" % (count, REMOTE))
_i, o, _e = c.exec_command("ls -la %s | head" % REMOTE)
print(o.read().decode('utf-8', 'replace'))
c.close()
