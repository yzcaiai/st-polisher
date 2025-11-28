# SillyTavern AI Polisher (AI 润色插件)

一个为 SillyTavern (酒馆) 设计的插件，用于自动拦截 AI 的回复并使用二级 LLM 进行润色/改写。

## 功能特点

- **自动润色**：AI 回复完成后自动拦截并进行润色
- **高度自定义**：支持自定义 System Prompt (系统提示词)，告诉 AI 如何改写文本
- **兼容性强**：支持所有兼容 OpenAI 格式的 API (如 OpenAI, Claude via proxy, DeepSeek 等)
- **流式输出**：支持流式传输 (Stream)，像打字机一样实时显示润色过程
- **模型管理**：支持一键获取并选择模型

## 安装方法

### 方法一：手动安装

1. 下载本插件文件夹
2. 将整个 `SillyTavern-AI-Polisher` 文件夹复制到 SillyTavern 的扩展目录：
   - 路径：`SillyTavern/data/<用户名>/extensions/`
   - 如果 `extensions` 文件夹不存在，请手动创建
3. 重启 SillyTavern
4. 在扩展设置中找到 "AI Polisher (AI 润色插件)"

### 方法二：通过 Git 安装

```bash
cd SillyTavern/data/<用户名>/extensions/
git clone https://github.com/your-repo/SillyTavern-AI-Polisher.git
```

## 使用说明

### 基本配置

1. 打开 SillyTavern，进入扩展设置
2. 找到 "AI Polisher (AI 润色插件)" 并展开
3. 配置以下设置：
   - **API Endpoint**: 填写 API 地址（如 `https://api.openai.com/v1`）
   - **API Key**: 填写你的 API 密钥
   - **模型**: 选择要使用的模型，或点击刷新按钮获取模型列表

### 自动润色

1. 勾选 "启用自动润色"
2. 之后每次 AI 回复完成后，插件会自动调用二级 LLM 进行润色

### 手动润色

1. 点击 "润色最后一条消息" 按钮
2. 插件会对最后一条 AI 消息进行润色

### 自定义提示词

在 "System Prompt" 文本框中可以自定义润色指令，例如：

```
你是一个专业的文本润色助手。请对以下文本进行润色和改写。

要求：
1. 保持原文的核心意思和情节不变
2. 改善文字的流畅度和可读性
3. 增强描写的生动性和感染力
4. 直接输出润色后的文本，不要添加任何解释

原文：
```

## 支持的 API

本插件支持所有兼容 OpenAI Chat Completions API 格式的服务：

- OpenAI (GPT-4, GPT-3.5 等)
- Claude (通过兼容代理)
- DeepSeek
- 本地模型 (通过 LM Studio, Ollama 等)
- 其他兼容 OpenAI 格式的 API

## 参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| API Endpoint | API 服务地址 | https://api.openai.com/v1 |
| API Key | API 密钥 | - |
| 模型 | 使用的模型名称 | gpt-4o-mini |
| 流式输出 | 是否启用流式传输 | 开启 |
| 最大 Tokens | 生成的最大 token 数 | 4096 |
| Temperature | 生成的随机性 (0-2) | 0.7 |

## 注意事项

1. 使用本插件会产生额外的 API 调用费用
2. 润色过程中请勿关闭页面或切换聊天
3. 如果润色结果不理想，可以调整 System Prompt 或 Temperature
4. 建议先使用手动润色测试效果，再开启自动润色

## 常见问题

**Q: 为什么获取模型列表失败？**
A: 请检查 API Endpoint 和 API Key 是否正确，以及网络是否正常。

**Q: 润色后的文本和原文差异太大怎么办？**
A: 可以在 System Prompt 中添加更严格的约束，或降低 Temperature 值。

**Q: 支持中文润色吗？**
A: 支持，只需在 System Prompt 中使用中文指令即可。

## 许可证

MIT License
