/**
 * flowdeck 的最小 lint：只求兜住「真 bug 类」漂移（未定义变量、未用变量、空 catch 等），
 * 不做风格执法——本仓库风格靠惯例（无分号、单引号、2 空格），校验入口是 npm run verify。
 * 覆盖 *.mjs；index.html 的内联脚本不在静态分析范围（界面行为由 jsdom 烟雾验证兜底）。
 */
import js from '@eslint/js'
import globals from 'globals'

export default [
  { ignores: ['node_modules/**', '.scratch/**'] },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      // catch {} 是既定惯例（读不到就回落默认），允许空 catch 块。
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['lib/**/*.mjs'],
    rules: {
      // lib/parse.mjs 的行为由 verify 夹具断言钉住，正则转义按原样保留，规则豁免。
      'no-useless-escape': 'off',
    },
  },
]
