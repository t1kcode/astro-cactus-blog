---

title: vscode中使用Claude的登录问题

description: An introduction to using the note feature in Astro Cactus

publishDate: 2026-7-01 17:36:53

---

在vscode中使用Claude时，就算打开了CC-Switch的跳过Claude Code初次安装确认，还是会跳登录

**解决办法**

> 在vscode中使用快捷键ctrl+shift+p，搜索open user settings (JSON)，在文件中加上下面的代码然后重启vscode即可

```json
 {
 	"claudeCode.environmentVariables": [
         { "name": "ANTHROPIC_BASE_URL", "value": "https://xxxx" },
         { "name": "ANTHROPIC_AUTH_TOKEN", "value": "xxxx" }
     ],
 }
```
