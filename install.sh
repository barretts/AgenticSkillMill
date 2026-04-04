#!/usr/bin/env bash
# install.sh -- Remote-friendly bootstrap installer (for curl|bash use)
# Installs the npm package globally, then runs install-local.sh in skills-only mode.

set -euo pipefail

PACKAGE_NAME="${SKILLMILL_PACKAGE_NAME:-agentic-skill-mill}"
PACKAGE_VERSION="${SKILLMILL_PACKAGE_VERSION:-latest}"

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  echo "Usage: bash install.sh [tool flags]"
  echo ""
  echo "This script installs ${PACKAGE_NAME}@${PACKAGE_VERSION} globally and then"
  echo "runs install-local.sh --skills-only with the flags you provide."
  echo ""
  echo "Examples:"
  echo "  bash install.sh --all"
  echo "  bash install.sh --cursor"
  echo ""
  echo "Environment overrides:"
  echo "  SKILLMILL_PACKAGE_NAME    Package to install (default: agentic-skill-mill)"
  echo "  SKILLMILL_PACKAGE_VERSION Version tag (default: latest)"
  exit 0
fi

echo "==> Installing utility library: ${PACKAGE_NAME}@${PACKAGE_VERSION}"
npm install -g "${PACKAGE_NAME}@${PACKAGE_VERSION}"

GLOBAL_NODE_MODULES="$(npm root -g)"
PACKAGE_DIR="${GLOBAL_NODE_MODULES}/${PACKAGE_NAME}"
LOCAL_INSTALLER="${PACKAGE_DIR}/install-local.sh"

if [[ ! -f "$LOCAL_INSTALLER" ]]; then
  echo "ERROR: Could not find install-local.sh at: $LOCAL_INSTALLER"
  echo "Check the package 'files' list to ensure install-local.sh is published."
  exit 1
fi

echo "==> Installing skills via local installer (skills-only mode)"
bash "$LOCAL_INSTALLER" --skills-only "$@"

echo ""
echo "==> Done."
echo "Utility and skills installed."
