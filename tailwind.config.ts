import type { Config } from "tailwindcss";

export default {
	plugins: [require("@tailwindcss/typography")],
	theme: {
		extend: {
			typography: () => ({
				DEFAULT: {
					css: {
						a: {
							textUnderlineOffset: "2px",
							"&:hover": {
								"@media (hover: hover)": {
									textDecorationColor: "var(--color-link)",
									textDecorationThickness: "2px",
								},
							},
						},
						// 1. 设置 blockquote 的本体样式，并消除默认底边距
						blockquote: {
							borderLeftWidth: "0",
							backgroundColor: "rgba(128, 128, 128, 0.1)",
							borderRadius: "0.5rem",
							padding: "0.75rem 1rem",
							fontStyle: "normal",
							fontWeight: "400",
							marginBottom: "0 !important", // 【关键】强制消除底边距，防止撑开下一个盒子
						},
						
						// 2. 两个 blockquote 紧挨着时，只留 4px 缝隙产生缺角
						"blockquote + blockquote": {
							marginTop: "0.5px !important",
						},
						
						// 3. 清空内部段落 <p> 自带的所有上下边距，防止盒子内部被撑大
						"blockquote p": {
							marginTop: "0 !important",
							marginBottom: "0 !important",
						},

						// 4. 彻底移除所有引用段落前后的双引号
						"blockquote p::before": {
							content: "none",
						},
						"blockquote p::after": {
							content: "none",
						},
						// 2. 覆盖 astro-expressive-code 插件的代码块样式
						".expressive-code .frame": {
							boxShadow: "none !important", // 移除默认的外边框线
							borderRadius: "0.5rem !important",
						},
						".expressive-code .frame pre": {
							backgroundColor: "rgba(128, 128, 128, 0.1) !important", // 强制使用半透明背景
							borderRadius: "0.5rem !important",
							padding: "1rem 1.25rem !important", 
						},
						// 兼容带顶部文件名的代码块，让标题栏的背景也融为一体
						".expressive-code .frame .header": {
							backgroundColor: "rgba(128, 128, 128, 0.05) !important",
							borderBottom: "none !important",
						},
						// === 新增：统一在 Tailwind 配置中修改标题前 # 号的颜色 ===
						"h2::before": {
							color: "#2bbc8a !important", 
						},
						"h1::before, h3::before, h4::before, h5::before, h6::before": {
							content: "none !important", // 移除其他标题前的 # 号
						},
						"h1, h1 a": {
							color: "#2bbc8a !important", 
						},
						code: {
							border: "1px dotted #666",
							borderRadius: "2px",
						},
						kbd: {
							"&:where([data-theme='dark'], [data-theme='dark'] *)": {
								background: "var(--color-global-text)",
							},
						},
						hr: {
							borderTopStyle: "dashed",
						},
						strong: {
							fontWeight: "700",
						},
						sup: {
							marginInlineStart: "calc(var(--spacing) * 0.5)",
							a: {
								"&:after": {
									content: "']'",
								},
								"&:before": {
									content: "'['",
								},
								"&:hover": {
									"@media (hover: hover)": {
										color: "var(--color-link)",
									},
								},
							},
						},
						/* Table */
						"tbody tr": {
							borderBottomWidth: "none",
						},
						tfoot: {
							borderTop: "1px dashed #666",
						},
						thead: {
							borderBottomWidth: "none",
						},
						"thead th": {
							borderBottom: "1px dashed #666",
							fontWeight: "700",
						},
						'th[align="center"], td[align="center"]': {
							"text-align": "center",
						},
						'th[align="right"], td[align="right"]': {
							"text-align": "right",
						},
						'th[align="left"], td[align="left"]': {
							"text-align": "left",
						},
						".expressive-code, .admonition, .github-card": {
							marginTop: "calc(var(--spacing)*4)",
							marginBottom: "calc(var(--spacing)*4)",
						},
					},
				},
				sm: {
					css: {
						code: {
							fontSize: "var(--text-sm)",
							fontWeight: "400",
						},
					},
				},
			}),
		},
	},
} satisfies Config;
