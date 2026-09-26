# Rain Desk

一个无需账号的灵感与专注工作台。把想到的事先放进收集箱，再移到「正在进行」与「已经完成」；同时提供 25/50 分钟专注和 5 分钟休息计时。

## 功能

- 三列任务看板：新建、编辑、删除、搜索、拖放或点击箭头移动任务。
- 优先级标记、任务数量概览、本地 JSON 备份导入与导出。
- 专注计时器：开始、暂停、重置和时长切换。
- 适配桌面与手机；数据仅保存在当前浏览器的 `localStorage` 中。

## 运行

无需构建和后端。通过任何静态服务器打开项目根目录即可，例如：

```bash
npx serve .
```

运行基础数据校验测试：

```bash
npm test
```

静态文件也可直接复制到博客的 `public/rain/`，通过博客的 `/rain/` 路径访问。不同域名、浏览器或无痕窗口不会共享任务数据；更换设备前请先使用「导出数据」。

## 灵感来源

2026-09-26 浏览 [GitHub Trending](https://github.com/trending?since=daily) 时，看到 [Paperclip](https://github.com/paperclipai/paperclip) 和 [Superpowers](https://github.com/obra/superpowers) 等项目对工作流组织的关注。Rain Desk 是独立实现的个人轻量工具，专门保留了无需服务端也能使用的记录、推进和专注流程。

## 许可

MIT
