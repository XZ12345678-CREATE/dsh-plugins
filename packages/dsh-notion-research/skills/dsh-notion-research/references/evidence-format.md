# 本地证据文件

在用户工作区内为一次研究新建目录，不覆盖已有资料。`sources.json` 使用 UTF-8 JSON：

```json
{
  "schemaVersion": 1,
  "sources": [{
    "id": "S1",
    "title": "页面标题",
    "url": "https://www.notion.so/0123456789abcdef0123456789abcdef",
    "retrievedAt": "2026-11-02T12:00:00Z",
    "partial": false,
    "text": "工具本次实际返回的页面文本。"
  }],
  "evidence": [{
    "id": "E1",
    "sourceId": "S1",
    "quote": "实际返回的页面文本",
    "locator": "可选的区块 ID 或小节名"
  }]
}
```

报告用 `[E1]` 引用，在参考资料处同时提供 E1 的页面链接。来源原文要逐字保留；正文未完整取得时 `partial` 必须为 true。只保存任务需要且已获授权访问的内容。完整摘录留在本地；面向外部的报告采用短引用和归纳。

检查命令中的脚本路径相对于本技能目录：

```sh
node ../../scripts/check-evidence.mjs /absolute/path/sources.json /absolute/path/report.md
```

从任意工作目录执行时，先将脚本路径解析为绝对路径。脚本不联网，读取每个输入文件最多 10 MiB，输出 JSON；通过时退出码为 0，问题或输入错误为 1。它不证明原文来自 Notion、不核验权限或远端是否变化，也不做语义蕴含验证。`partialSources` 需要人工处理，不能隐瞒。
