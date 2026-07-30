import type { AstroExpressiveCodeOptions } from "astro-expressive-code";
import type { SiteConfig } from "@/types";

export const siteConfig: SiteConfig = {
	// ! 请记得将以下站点属性替换为您自己的域名，该属性在 astro.config.ts 中使用
	url: "https://t1kdoor.cc.cd/",
	/*
		- 用于构建 src/components/BaseHead.astro 第 11 行的 meta 标题属性
		- 用于 astro.config.ts 第 42 行的 webmanifest 名称
		- 用于 src/components/layout/Header.astro 第 35 行的链接值
		- 用于 src/components/layout/Footer.astro 第 12 行的页脚
	*/
	title: "t1k's blog",
	// 同时用作 meta 属性（位于 src/components/BaseHead.astro 第 31 行和第 49 行）
	// 以及生成的 satori png 图片（位于 src/pages/og-image/[slug].png.ts）
	author: "t1k",
	// 用作默认的 description meta 属性和 webmanifest 描述
	description: "An opinionated starter theme for Astro",
	// HTML 语言属性，位于 src/layouts/Base.astro 第 18 行和 astro.config.ts 第 48 行
	lang: "zh-CN",
	// Meta 属性，位于 src/components/BaseHead.astro 第 42 行
  	ogLocale: "zh_CN",
  	// 决定是否在模板页眉中显示 logo
	showLogo: true,
	// Date.prototype.toLocaleDateString() 的参数，位于 src/utils/date.ts
	date: {
		options: {
			day: "numeric",
			month: "short",
			year: "numeric",
		},
	},
};
export const menu: string = "主页";
export const posts: string = "文章";
export const notes: string = "随记";
export const archive: string = "封档";
export const about: string = "关于";
export const PinnedPosts: string = "置顶文章";
// 用于在页眉（Header）和页脚（Footer）中生成链接。
export const menuLinks: { path: string; title: string; inFooter?: boolean}[] = [
	{
		path: "/",
		title: menu,
		inFooter: true,
	},

	{
		path: "/posts/",
		title: posts,
		inFooter: true,
	},
	{
		path: "/notes/",
		title: notes,
		inFooter: true,
	},
	// 新增封档入口
	{
		path: "/archived/",
		title: archive,
		inFooter: true,
	},
	{
		path: "/about/",
		title: about,
		inFooter: false,
	},
];

// https://expressive-code.com/reference/configuration/
export const expressiveCodeOptions: AstroExpressiveCodeOptions = {
	styleOverrides: {
		borderRadius: "4px",
		codeFontFamily:
			'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
		codeFontSize: "0.875rem",
		codeLineHeight: "1.7142857rem",
		codePaddingInline: "1rem",
		frames: {
			frameBoxShadowCssValue: "none",
		},
		uiLineHeight: "inherit",
	},
	themeCssSelector(theme, { styleVariants }) {
		// 如果配置了一深一浅两种主题
		// 则会生成与 cactus-theme 深色模式切换兼容的 CSS 选择器
		if (styleVariants.length >= 2) {
			const baseTheme = styleVariants[0]?.theme;
			const altTheme = styleVariants.find((v) => v.theme.type !== baseTheme?.type)?.theme;
			if (theme === baseTheme || theme === altTheme) return `[data-theme='${theme.type}']`;
		}
		// 否则返回默认选择器
		return `[data-theme="${theme.name}"]`;
	},
	// 一深一浅两种主题 => https://expressive-code.com/guides/themes/#available-themes
	themes: ["dracula", "github-light"],
	useThemedScrollbars: false,
};
