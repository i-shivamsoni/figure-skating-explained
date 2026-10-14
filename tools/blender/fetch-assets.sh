#!/usr/bin/env bash
# Downloads the CC0 Blender Studio Human Base Meshes bundle used by build_skater.py.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)/assets/human-base-meshes"
mkdir -p "$DIR"
cd "$DIR"
curl -sSL --retry 3 -o human-base-meshes-bundle-v1.4.1.zip "https://mirror.blender.org/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.4.1.zip"
unzip -q -o human-base-meshes-bundle-v1.4.1.zip
echo "ready: $DIR/human-base-meshes-bundle-v1.4.1/human_base_meshes_bundle.blend"
