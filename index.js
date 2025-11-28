/**
 * SillyTavern AI Polisher (AI 润色插件)
 * 自动拦截 AI 回复并使用二级 LLM 进行润色/改写
 */

const MODULE_NAME = 'ai_polisher';

// 默认设置
const DEFAULT_SETTINGS = {
    enabled: false,
    apiEndpoint: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    systemPrompt: `你是一个专业的文本润色助手。请对以下文本进行润色和改写，使其更加流畅、生动、富有表现力。

要求：
1. 保持原文的核心意思和情节不变
2. 改善文字的流畅度和可读性
3. 增强描写的生动性和感染力
4. 修正任何语法或表达问题
5. 直接输出润色后的文本，不要添加任何解释或说明

原文：`,
    streamEnabled: true,
    maxTokens: 4096,
    temperature: 0.7,
    availableModels: []
};

// 插件状态
let isPolishing = false;
let abortController = null;

/**
 * 初始化插件设置
 */
function initSettings() {
    const context = SillyTavern.getContext();
    const { extensionSettings, saveSettingsDebounced } = context;

    if (!extensionSettings[MODULE_NAME]) {
        extensionSettings[MODULE_NAME] = { ...DEFAULT_SETTINGS };
        saveSettingsDebounced();
    }

    // 确保所有默认设置都存在
    for (const key in DEFAULT_SETTINGS) {
        if (extensionSettings[MODULE_NAME][key] === undefined) {
            extensionSettings[MODULE_NAME][key] = DEFAULT_SETTINGS[key];
        }
    }

    return extensionSettings[MODULE_NAME];
}

/**
 * 获取当前设置
 */
function getSettings() {
    const context = SillyTavern.getContext();
    return context.extensionSettings[MODULE_NAME] || DEFAULT_SETTINGS;
}

/**
 * 保存设置
 */
function saveSettings() {
    const context = SillyTavern.getContext();
    context.saveSettingsDebounced();
}

/**
 * 创建设置面板 HTML
 */
function createSettingsHtml() {
    const settings = getSettings();

    return `
    <div id="ai_polisher_settings" class="ai-polisher-settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>AI Polisher (AI 润色插件)</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <!-- 启用开关 -->
                <div class="ai-polisher-row">
                    <label class="checkbox_label" for="ai_polisher_enabled">
                        <input type="checkbox" id="ai_polisher_enabled" ${settings.enabled ? 'checked' : ''}>
                        <span>启用自动润色</span>
                    </label>
                </div>

                <!-- API 设置 -->
                <div class="ai-polisher-section">
                    <h4>API 设置</h4>

                    <div class="ai-polisher-row">
                        <label for="ai_polisher_endpoint">API Endpoint:</label>
                        <input type="text" id="ai_polisher_endpoint" class="text_pole"
                               value="${settings.apiEndpoint}"
                               placeholder="https://api.openai.com/v1">
                    </div>

                    <div class="ai-polisher-row">
                        <label for="ai_polisher_apikey">API Key:</label>
                        <div class="ai-polisher-apikey-row">
                            <input type="password" id="ai_polisher_apikey" class="text_pole"
                                   value="${settings.apiKey}"
                                   placeholder="sk-...">
                            <button id="ai_polisher_toggle_key" class="menu_button" title="显示/隐藏">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                        </div>
                    </div>

                    <div class="ai-polisher-row">
                        <label for="ai_polisher_model">模型:</label>
                        <div class="ai-polisher-model-row">
                            <select id="ai_polisher_model" class="text_pole">
                                <option value="${settings.model}">${settings.model}</option>
                            </select>
                            <button id="ai_polisher_fetch_models" class="menu_button" title="获取模型列表">
                                <i class="fa-solid fa-refresh"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 生成设置 -->
                <div class="ai-polisher-section">
                    <h4>生成设置</h4>

                    <div class="ai-polisher-row">
                        <label class="checkbox_label" for="ai_polisher_stream">
                            <input type="checkbox" id="ai_polisher_stream" ${settings.streamEnabled ? 'checked' : ''}>
                            <span>启用流式输出</span>
                        </label>
                    </div>

                    <div class="ai-polisher-row">
                        <label for="ai_polisher_max_tokens">最大 Tokens: <span id="ai_polisher_max_tokens_value">${settings.maxTokens}</span></label>
                        <input type="range" id="ai_polisher_max_tokens" min="256" max="16384" step="256" value="${settings.maxTokens}">
                    </div>

                    <div class="ai-polisher-row">
                        <label for="ai_polisher_temperature">Temperature: <span id="ai_polisher_temperature_value">${settings.temperature}</span></label>
                        <input type="range" id="ai_polisher_temperature" min="0" max="2" step="0.1" value="${settings.temperature}">
                    </div>
                </div>

                <!-- System Prompt -->
                <div class="ai-polisher-section">
                    <h4>System Prompt (系统提示词)</h4>
                    <textarea id="ai_polisher_system_prompt" class="text_pole" rows="8"
                              placeholder="输入系统提示词...">${settings.systemPrompt}</textarea>
                    <button id="ai_polisher_reset_prompt" class="menu_button">
                        <i class="fa-solid fa-rotate-left"></i> 重置为默认
                    </button>
                </div>

                <!-- 手动润色按钮 -->
                <div class="ai-polisher-section">
                    <h4>手动操作</h4>
                    <button id="ai_polisher_manual" class="menu_button">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> 润色最后一条消息
                    </button>
                    <button id="ai_polisher_stop" class="menu_button" style="display: none;">
                        <i class="fa-solid fa-stop"></i> 停止润色
                    </button>
                </div>

                <!-- 状态显示 -->
                <div id="ai_polisher_status" class="ai-polisher-status"></div>
            </div>
        </div>
    </div>
    `;
}

/**
 * 绑定设置面板事件
 */
function bindSettingsEvents() {
    const settings = getSettings();

    // 启用开关
    $('#ai_polisher_enabled').on('change', function() {
        settings.enabled = this.checked;
        saveSettings();
        updateStatus(this.checked ? '已启用自动润色' : '已禁用自动润色');
    });

    // API Endpoint
    $('#ai_polisher_endpoint').on('input', function() {
        settings.apiEndpoint = this.value.trim();
        saveSettings();
    });

    // API Key
    $('#ai_polisher_apikey').on('input', function() {
        settings.apiKey = this.value;
        saveSettings();
    });

    // 显示/隐藏 API Key
    $('#ai_polisher_toggle_key').on('click', function() {
        const input = $('#ai_polisher_apikey');
        const icon = $(this).find('i');
        if (input.attr('type') === 'password') {
            input.attr('type', 'text');
            icon.removeClass('fa-eye').addClass('fa-eye-slash');
        } else {
            input.attr('type', 'password');
            icon.removeClass('fa-eye-slash').addClass('fa-eye');
        }
    });

    // 模型选择
    $('#ai_polisher_model').on('change', function() {
        settings.model = this.value;
        saveSettings();
    });

    // 获取模型列表
    $('#ai_polisher_fetch_models').on('click', fetchModels);

    // 流式输出
    $('#ai_polisher_stream').on('change', function() {
        settings.streamEnabled = this.checked;
        saveSettings();
    });

    // Max Tokens
    $('#ai_polisher_max_tokens').on('input', function() {
        settings.maxTokens = parseInt(this.value);
        $('#ai_polisher_max_tokens_value').text(this.value);
        saveSettings();
    });

    // Temperature
    $('#ai_polisher_temperature').on('input', function() {
        settings.temperature = parseFloat(this.value);
        $('#ai_polisher_temperature_value').text(this.value);
        saveSettings();
    });

    // System Prompt
    $('#ai_polisher_system_prompt').on('input', function() {
        settings.systemPrompt = this.value;
        saveSettings();
    });

    // 重置 System Prompt
    $('#ai_polisher_reset_prompt').on('click', function() {
        settings.systemPrompt = DEFAULT_SETTINGS.systemPrompt;
        $('#ai_polisher_system_prompt').val(settings.systemPrompt);
        saveSettings();
        updateStatus('已重置系统提示词');
    });

    // 手动润色
    $('#ai_polisher_manual').on('click', manualPolish);

    // 停止润色
    $('#ai_polisher_stop').on('click', stopPolishing);
}

/**
 * 更新状态显示
 */
function updateStatus(message, isError = false) {
    const statusEl = $('#ai_polisher_status');
    statusEl.text(message);
    statusEl.toggleClass('error', isError);

    // 3秒后清除非错误状态
    if (!isError) {
        setTimeout(() => {
            if (statusEl.text() === message) {
                statusEl.text('');
            }
        }, 3000);
    }
}

/**
 * 获取模型列表
 */
async function fetchModels() {
    const settings = getSettings();

    if (!settings.apiEndpoint || !settings.apiKey) {
        updateStatus('请先填写 API Endpoint 和 API Key', true);
        return;
    }

    updateStatus('正在获取模型列表...');

    try {
        const response = await fetch(`${settings.apiEndpoint}/models`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${settings.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const models = data.data || data;

        if (!Array.isArray(models) || models.length === 0) {
            throw new Error('未获取到模型列表');
        }

        // 更新模型下拉列表
        const select = $('#ai_polisher_model');
        select.empty();

        // 按 ID 排序
        const sortedModels = models.sort((a, b) => {
            const idA = a.id || a;
            const idB = b.id || b;
            return idA.localeCompare(idB);
        });

        sortedModels.forEach(model => {
            const modelId = model.id || model;
            select.append(`<option value="${modelId}">${modelId}</option>`);
        });

        // 恢复之前选择的模型
        if (settings.model && select.find(`option[value="${settings.model}"]`).length > 0) {
            select.val(settings.model);
        } else {
            settings.model = select.val();
            saveSettings();
        }

        settings.availableModels = sortedModels.map(m => m.id || m);
        saveSettings();

        updateStatus(`成功获取 ${models.length} 个模型`);
    } catch (error) {
        console.error('[AI Polisher] 获取模型失败:', error);
        updateStatus(`获取模型失败: ${error.message}`, true);
    }
}

/**
 * 调用 API 进行润色
 */
async function polishText(text, onChunk) {
    const settings = getSettings();

    if (!settings.apiEndpoint || !settings.apiKey) {
        throw new Error('请先配置 API Endpoint 和 API Key');
    }

    abortController = new AbortController();

    const requestBody = {
        model: settings.model,
        messages: [
            { role: 'system', content: settings.systemPrompt },
            { role: 'user', content: text }
        ],
        max_tokens: settings.maxTokens,
        temperature: settings.temperature,
        stream: settings.streamEnabled
    };

    const response = await fetch(`${settings.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${settings.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 错误 (${response.status}): ${errorText}`);
    }

    if (settings.streamEnabled) {
        return await handleStreamResponse(response, onChunk);
    } else {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        if (onChunk) onChunk(content);
        return content;
    }
}

/**
 * 处理流式响应
 */
async function handleStreamResponse(response, onChunk) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;

                if (trimmedLine.startsWith('data: ')) {
                    try {
                        const json = JSON.parse(trimmedLine.slice(6));
                        const content = json.choices?.[0]?.delta?.content || '';
                        if (content) {
                            fullContent += content;
                            if (onChunk) onChunk(fullContent);
                        }
                    } catch (e) {
                        // 忽略解析错误
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }

    return fullContent;
}

/**
 * 获取最后一条 AI 消息
 */
function getLastAIMessage() {
    const context = SillyTavern.getContext();
    const chat = context.chat;

    if (!chat || chat.length === 0) return null;

    // 从后往前找最后一条非用户消息
    for (let i = chat.length - 1; i >= 0; i--) {
        if (!chat[i].is_user && chat[i].mes) {
            return { index: i, message: chat[i] };
        }
    }

    return null;
}

/**
 * 更新消息内容
 */
function updateMessage(index, newContent) {
    const context = SillyTavern.getContext();
    const chat = context.chat;

    if (chat[index]) {
        chat[index].mes = newContent;

        // 更新 DOM
        const messageEl = $(`.mes[mesid="${index}"]`);
        if (messageEl.length > 0) {
            const mesTextEl = messageEl.find('.mes_text');
            if (mesTextEl.length > 0) {
                // 使用 SillyTavern 的消息格式化
                if (typeof messageFormatting === 'function') {
                    mesTextEl.html(messageFormatting(newContent, chat[index].name, chat[index].is_system, chat[index].is_user, index));
                } else {
                    mesTextEl.text(newContent);
                }
            }
        }

        // 保存聊天
        if (context.saveChatDebounced) {
            context.saveChatDebounced();
        }
    }
}

/**
 * 手动润色最后一条消息
 */
async function manualPolish() {
    if (isPolishing) {
        updateStatus('正在润色中，请稍候...', true);
        return;
    }

    const lastMessage = getLastAIMessage();
    if (!lastMessage) {
        updateStatus('没有找到可润色的 AI 消息', true);
        return;
    }

    await performPolish(lastMessage.index, lastMessage.message.mes);
}

/**
 * 执行润色操作
 */
async function performPolish(messageIndex, originalText) {
    if (isPolishing) return;

    isPolishing = true;
    $('#ai_polisher_manual').hide();
    $('#ai_polisher_stop').show();
    updateStatus('正在润色...');

    try {
        const polishedText = await polishText(originalText, (chunk) => {
            // 流式更新消息
            updateMessage(messageIndex, chunk);
        });

        if (polishedText) {
            updateMessage(messageIndex, polishedText);
            updateStatus('润色完成！');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            updateStatus('润色已停止');
        } else {
            console.error('[AI Polisher] 润色失败:', error);
            updateStatus(`润色失败: ${error.message}`, true);
        }
    } finally {
        isPolishing = false;
        abortController = null;
        $('#ai_polisher_manual').show();
        $('#ai_polisher_stop').hide();
    }
}

/**
 * 停止润色
 */
function stopPolishing() {
    if (abortController) {
        abortController.abort();
    }
}

/**
 * 自动润色处理器
 */
async function onMessageReceived(messageIndex) {
    const settings = getSettings();

    if (!settings.enabled || isPolishing) return;

    const context = SillyTavern.getContext();
    const chat = context.chat;

    // 获取刚收到的消息
    const message = chat[messageIndex];
    if (!message || message.is_user) return;

    // 延迟一小段时间确保消息已完全渲染
    await new Promise(resolve => setTimeout(resolve, 500));

    await performPolish(messageIndex, message.mes);
}

/**
 * 插件入口
 */
jQuery(async () => {
    // 初始化设置
    initSettings();

    // 添加设置面板
    const settingsHtml = createSettingsHtml();
    $('#extensions_settings').append(settingsHtml);

    // 绑定事件
    bindSettingsEvents();

    // 监听消息接收事件
    const context = SillyTavern.getContext();
    const { eventSource, event_types } = context;

    if (eventSource && event_types) {
        // 监听生成结束事件
        eventSource.on(event_types.MESSAGE_RECEIVED, (data) => {
            const messageIndex = typeof data === 'number' ? data : context.chat.length - 1;
            onMessageReceived(messageIndex);
        });
    }

    console.log('[AI Polisher] 插件已加载');
});
