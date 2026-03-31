#!/bin/bash
# Run this once after cloning: bash scripts/setup-dev.sh

set -e

echo "→ Installing gstack Claude Code skills..."
if [ -d "$HOME/.claude/skills/gstack" ]; then
  echo "  gstack already installed, skipping."
else
  git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
  cd ~/.claude/skills/gstack && ./setup
  cd - > /dev/null
  echo "  gstack installed."
fi

echo "→ Installing npm dependencies..."
npm install

echo ""
echo "✓ Dev setup complete."
echo ""
echo "Next: fill in .env with your Supabase and Gemini API keys (see .env.example)."
