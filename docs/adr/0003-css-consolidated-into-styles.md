# CSS 集中到 styles/、内联样式外抽（JS 仍内联）

flowdeck 把全部运行时 CSS 集中到根级 `styles/`：三套 token 文件移入、新增 `tokens-cold.css`、并把 index.html 原内联的 `<style>`（约 250 行，含 `--fd-*` 别名块与组件样式）抽成 `styles/app.css` 用 `<link>` 引入；server.mjs 的 `STATIC_FILES` 白名单与 `<link>` URL 同步。

刻意保留的不对称：CSS 外置到 `styles/`，但 JS 仍内联在 index.html。理由：本次改动（多主题 + 流式缩放）全在 CSS 侧，token 文件本就外置，把 `app.css` 也外置才能让「所有 CSS 一处集中」成立、便于按主题/别名维护；JS 不在本次改动面内，没有触发它外置的理由，维持内联以保留「打开 index.html 即见全部行为」的可读性。这是「按改动面就近重构」而非「全量对称拆分」的取舍。

## Consequences

未来读者会问「为何 CSS 外置而 JS 内联」——答案是上面的非对称取舍，不要为对称把 JS 也拆出去（牺牲单文件可读性且与目标无关）。`styles/` 是运行时必需资源，删除会使应用无样式；它放在根级而非 `docs/`，正是为了避开「docs 看起来可删实则不可删」的坑。
