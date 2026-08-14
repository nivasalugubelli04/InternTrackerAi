module.exports = {
  'apps/api/**/*.{ts,tsx}': ['eslint --fix --max-warnings 0', 'prettier --write'],
  'apps/mobile/**/*.{ts,tsx}': ['prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};

