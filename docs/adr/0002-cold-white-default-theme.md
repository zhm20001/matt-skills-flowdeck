# 三套主题字面并列，冷白为默认（靠标记属性而非 CSS base）

flowdeck 的主题从「暖纸为无条件 `:root` 基底 + 暗色覆写」的二元结构，改为冷白 · 暖纸 · GitHub 暗**三套字面并列**的主题，各自 `:root[data-theme="X"]`，由顶栏下拉切换。默认主题是**冷白**，动因：暖纸的淡黄纸感先入为主，而「默认」在直觉上应对应纯白底。

因为不再有任何主题充当无条件 base，默认值改住在**标记里**：index.html 的 `<html>` 静态写死 `data-theme="cold"`，head 防闪脚本在绘制前按 localStorage（`cold`/`paper`/`dark`）覆写。无 JS 或 localStorage 抛错时，标记上的 cold 仍命中，优雅降级到默认主题，页面不会裸奔无色。

`tokens-paper.css` 随之**解冻**：它是 flowdeck 自有的独立拷贝（与外部 paper-palette-lab 生成原件已分叉），不再「禁止修改」。本决策把它 re-scope 为 `:root[data-theme="paper"]`，并重写其头部——删去「唯一权威 / 禁止修改本文件 / `:root` 基底」与陈旧的跨项目 symlink 指针说明。仍然有效的 token 纪律（裸色值与字体栈只准出现在 `tokens-*.css`；业务样式只消费一层 `--fd-*` 别名）保留，但规则文字迁到 `styles/app.css` 的别名块统一声明，因为已无任何一个 token 文件凌驾于其他之上。

## Consequences

默认主题不再是结构性的 base，而是一个标记属性 + 三套对等覆写。未来读者若疑惑「为什么没有 `:root` 基底色、默认主题写在哪」，答案是 `<html data-theme="cold">`，不要去恢复某个主题的 base 地位。
