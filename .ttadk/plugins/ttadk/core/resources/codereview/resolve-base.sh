#!/usr/bin/env bash
set -euo pipefail

REVIEW_BASE_BRANCH="${REVIEW_BASE_BRANCH:-${BITS_CODE_TARGET_BRANCH:-}}"
MR_BASE_REPO="${REVIEW_BASE_REPO:-${BITS_CODE_TARGET_REPO:-}}"
MR_BASE_REMOTE=""
BASE_REF=""

if [ -z "$REVIEW_BASE_BRANCH" ]; then
  REVIEW_BASE_BRANCH=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##' || true)
fi

if [ -z "$REVIEW_BASE_BRANCH" ]; then
  for candidate in main master develop trunk; do
    if git rev-parse --verify "origin/$candidate" >/dev/null 2>&1 || git rev-parse --verify "$candidate" >/dev/null 2>&1; then
      REVIEW_BASE_BRANCH="$candidate"
      break
    fi
  done
fi

if [ -n "$REVIEW_BASE_BRANCH" ]; then
  if [ -n "$MR_BASE_REPO" ]; then
    MR_BASE_REMOTE=$(git remote -v | awk "index(\$2, \"code.byted.org:$MR_BASE_REPO\") || index(\$2, \"code.byted.org/$MR_BASE_REPO\") || index(\$2, \"$MR_BASE_REPO.git\") || index(\$2, \"/$MR_BASE_REPO\") {print \$1; exit}")
    if [ -n "$MR_BASE_REMOTE" ]; then
      git rev-parse --verify "$MR_BASE_REMOTE/$REVIEW_BASE_BRANCH" >/dev/null 2>&1 || git fetch --no-tags "$MR_BASE_REMOTE" "$REVIEW_BASE_BRANCH:refs/remotes/$MR_BASE_REMOTE/$REVIEW_BASE_BRANCH" 2>/dev/null || git fetch --no-tags "$MR_BASE_REMOTE" "$REVIEW_BASE_BRANCH" 2>/dev/null || true
      BASE_REF=$(git rev-parse --verify "$MR_BASE_REMOTE/$REVIEW_BASE_BRANCH" 2>/dev/null || true)
    fi
  fi
  if [ -z "$BASE_REF" ]; then
    if git remote get-url origin >/dev/null 2>&1; then
      git rev-parse --verify "origin/$REVIEW_BASE_BRANCH" >/dev/null 2>&1 || git fetch --no-tags origin "$REVIEW_BASE_BRANCH:refs/remotes/origin/$REVIEW_BASE_BRANCH" 2>/dev/null || git fetch --no-tags origin "$REVIEW_BASE_BRANCH" 2>/dev/null || true
      BASE_REF=$(git rev-parse --verify "origin/$REVIEW_BASE_BRANCH" 2>/dev/null || true)
    fi
    if [ -z "$BASE_REF" ]; then
      BASE_REF=$(git rev-parse --verify "$REVIEW_BASE_BRANCH" 2>/dev/null || true)
    fi
  fi
fi

if [ -n "$BASE_REF" ]; then
  BASE=$(git merge-base HEAD "$BASE_REF" 2>/dev/null) || BASE=""
else
  BASE=""
fi

if [ -n "$BASE" ]; then
  echo "BASE:$BASE"
else
  echo "ERROR:Unable to resolve review base branch locally. Fetch the base branch and rerun, set REVIEW_BASE_BRANCH/BITS_CODE_TARGET_BRANCH, or provide a Bits-Code MR number so the review scope can be determined from Bits-Code MR metadata."
fi

# --- Submodule base resolution ---
REVIEW_DEPTH="${REVIEW_DEPTH:-0}"
if [ -n "$BASE" ] && [ "$REVIEW_DEPTH" -eq 0 ]; then
  SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"

  git diff --name-only "$BASE" 2>/dev/null | while read -r sub_path; do
    if [ -d "$sub_path/.git" ] || [ -f "$sub_path/.git" ]; then
      cd "$sub_path" 2>/dev/null || continue
      sub_base=$(REVIEW_DEPTH=1 bash "$SCRIPT_PATH" 2>/dev/null | grep '^BASE:' | head -1 | sed 's/^BASE://')
      if [ -n "$sub_base" ]; then
        echo "SUBMODULE:${sub_path}:BASE:${sub_base}"
      else
        echo "SUBMODULE:${sub_path}:ERROR:Unable to resolve base in submodule"
      fi
      cd - >/dev/null || true
    fi
  done

  git submodule status 2>/dev/null | grep -E '^\+' | while read -r _sub_entry; do
    sub_path=$(echo "$_sub_entry" | awk '{print $2}')
    git diff --name-only "$BASE" 2>/dev/null | grep -qxF "$sub_path" && continue
    if [ -d "$sub_path/.git" ] || [ -f "$sub_path/.git" ]; then
      cd "$sub_path" 2>/dev/null || continue
      sub_base=$(REVIEW_DEPTH=1 bash "$SCRIPT_PATH" 2>/dev/null | grep '^BASE:' | head -1 | sed 's/^BASE://')
      if [ -n "$sub_base" ]; then
        echo "SUBMODULE:${sub_path}:BASE:${sub_base}"
      fi
      echo "SUBMODULE:${sub_path}:DIRTY:true"
      cd - >/dev/null || true
    fi
  done
fi
