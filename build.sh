#!/usr/bin/env bash
set -euo pipefail

echo "[build] Installation des dependances blog-app..."
cd blog-app
npm ci
echo "[build] Build Next.js..."
npm run build
cd ..

echo "[build] Preparation du dossier de publication..."
rm -rf out
mkdir -p out

echo "[build] Copie des fichiers statiques du site principal..."
rsync -a \
  --exclude=blog-app \
  --exclude=out \
  --exclude=.git \
  --exclude=.gitignore \
  --exclude=build.sh \
  --exclude="*.toml" \
  --exclude="*.sh" \
  . out/

echo "[build] Fusion des pages blog (Next.js output)..."
cp -r blog-app/out/blog out/blog

echo "[build] Terminé. Publication depuis out/"
