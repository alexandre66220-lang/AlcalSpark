#!/usr/bin/env bash
set -euo pipefail

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
  --exclude=design_handoff_alcalspark_da \
  . out/

# Build Next.js blog uniquement si les variables Sanity sont disponibles
if [ -n "${NEXT_PUBLIC_SANITY_PROJECT_ID:-}" ]; then
  echo "[build] Variables Sanity detectees, build du blog..."
  cd blog-app
  npm ci --prefer-offline
  npm run build
  cd ..
  if [ -d blog-app/out/blog ]; then
    echo "[build] Fusion des pages blog..."
    cp -r blog-app/out/blog out/blog
  fi
else
  echo "[build] Variables Sanity absentes, le blog est ignore (site statique seul)."
fi

echo "[build] Termine. Publication depuis out/"
