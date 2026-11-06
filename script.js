// ===== ASTRA AI Assistant — Real API Integration =====

const STORAGE_KEY = 'astra_api_settings';

const PROVIDERS = {
  openrouter: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    models: [
      { id: 'openrouter/free', label: 'openrouter/free (бесплатно)' },
      { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B (free)' },
      { id: 'meta-llama/llama-3.2-3b-instruct:free', label: 'Llama 3.2 3B (free)' },
      { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
      { id: 'openai/gpt-4o', label: 'GPT-4o' }
    ]
  },
  groq: {
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
      { id: 'gemma2-9b-it', label: 'Gemma2 9B' },
      { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' }
    ]
  },
  openai: {
    name: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
      { id: 'o4-mini', label: 'o4-mini' }
    ]
  },
  xai: {
    name: 'xAI Grok',
    url: 'https://api.x.ai/v1/chat/completions',
    models: [
      { id: 'grok-4', label: 'Grok 4' },
      { id: 'grok-4.1-fast', label: 'Grok 4.1 Fast' },
      { id: 'grok-3-mini', label: 'Grok 3 Mini' }
    ]
  }
};

const DEFAULT_PROMPT = `Ты ASTRA — футуристический женский ИИ-ассистент. Говоришь уверенно, дерзко и по-дружески на русском. Ты главная, рядом с тобой Mia. Отвечай коротко, ярко и по делу.`;

let settings = loadSettings();

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    provider: 'openrouter',
    apiKey: '',
    model: 'openrouter/free',
    systemPrompt: DEFAULT_PROMPT
  };
}

function saveSettingsToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('msgInput');
  const sendBtn = document.getElementById('sendBtn');
  const micBtn = document.getElementById('micBtn');
  const bubbleTitle = document.getElementById('bubbleTitle');
  const bubbleSub = document.getElementById('bubbleSub');
  const liveTime = document.getElementById('liveTime');
  const liveDate = document.getElementById('liveDate');
  const settingsBtn = document.getElementById('settingsBtn');
  const modal = document.getElementById('settingsModal');
  const closeSettings = document.getElementById('closeSettings');
  const saveBtn = document.getElementById('saveSettings');
  const clearBtn = document.getElementById('clearKey');
  const providerSelect = document.getElementById('apiProvider');
  const modelSelect = document.getElementById('apiModel');
  const keyInput = document.getElementById('apiKey');
  const promptInput = document.getElementById('systemPrompt');
  const toggleKey = document.getElementById('toggleKey');
  const apiStatus = document.getElementById('apiStatus');
  const statusText = document.getElementById('statusText');

  // --- Clock ---
  function updateClock() {
    const now = new Date();
    liveTime.textContent = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    liveDate.textContent = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()}`;
  }
  updateClock();
  setInterval(updateClock, 15000);

  // --- Bubble ---
  function setBubble(title, sub, thinking = false) {
    bubbleTitle.textContent = title;
    bubbleSub.textContent = sub;
    const bubble = document.getElementById('chatBubble');
    bubble.style.borderColor = thinking ? 'rgba(168, 85, 247, 0.55)' : 'rgba(0, 229, 255, 0.35)';
  }

  // --- API Status UI ---
  function updateApiStatus() {
    const hasKey = !!settings.apiKey;
    const indicator = apiStatus.querySelector('.status-indicator');
    const text = apiStatus.querySelector('span:last-child');

    if (hasKey) {
      indicator.className = 'status-indicator on';
      text.textContent = `Подключен: ${PROVIDERS[settings.provider]?.name || settings.provider} · ${settings.model}`;
      statusText.textContent = 'AI Online';
    } else {
      indicator.className = 'status-indicator off';
      text.textContent = 'API не подключен — открой настройки ⚙️';
      statusText.textContent = 'Онлайн';
    }
  }

  // --- Fill model select ---
  function fillModels(provider) {
    const list = PROVIDERS[provider]?.models || [];
    modelSelect.innerHTML = list.map(m =>
      `<option value="${m.id}">${m.label}</option>`
    ).join('');
    // try to keep previous model if exists
    if (list.some(m => m.id === settings.model)) {
      modelSelect.value = settings.model;
    } else if (list[0]) {
      modelSelect.value = list[0].id;
    }
  }

  // --- Open / Close modal ---
  function openModal() {
    providerSelect.value = settings.provider;
    keyInput.value = settings.apiKey;
    promptInput.value = settings.systemPrompt || DEFAULT_PROMPT;
    fillModels(settings.provider);
    updateApiStatus();
    modal.classList.add('open');
  }

  function closeModal() {
    modal.classList.remove('open');
  }

  settingsBtn.addEventListener('click', openModal);
  closeSettings.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  // Provider change → update models
  providerSelect.addEventListener('change', () => {
    fillModels(providerSelect.value);
  });

  // Toggle key visibility
  toggleKey.addEventListener('click', () => {
    keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
  });

  // Save
  saveBtn.addEventListener('click', () => {
    settings.provider = providerSelect.value;
    settings.apiKey = keyInput.value.trim();
    settings.model = modelSelect.value;
    settings.systemPrompt = promptInput.value.trim() || DEFAULT_PROMPT;
    saveSettingsToStorage();
    updateApiStatus();
    closeModal();
    setBubble('Настройки сохранены ✨', settings.apiKey ? 'API подключен, можно писать' : 'Ключ не указан');
  });

  // Clear key
  clearBtn.addEventListener('click', () => {
    keyInput.value = '';
    settings.apiKey = '';
    saveSettingsToStorage();
    updateApiStatus();
    setBubble('Ключ удалён', 'API отключен');
  });

  // --- Real AI call ---
  async function askAI(userMessage) {
    if (!settings.apiKey) {
      setBubble('Нужен API-ключ', 'Нажми ⚙️ и вставь ключ');
      openModal();
      return;
    }

    setBubble('ASTRA думает...', 'Обрабатываю запрос ✨', true);

    const provider = PROVIDERS[settings.provider];
    if (!provider) {
      setBubble('Неизвестный провайдер', 'Проверь настройки');
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      };

      // OpenRouter recommends these headers
      if (settings.provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://github.com/lexa25/ASTRA-AI-Assistant';
        headers['X-Title'] = 'ASTRA AI Assistant';
      }

      const body = {
        model: settings.model,
        messages: [
          { role: 'system', content: settings.systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.8,
        max_tokens: 1024
      };

      const res = await fetch(provider.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('API Error:', res.status, errText);
        let msg = `Ошибка ${res.status}`;
        if (res.status === 401) msg = 'Неверный API-ключ';
        if (res.status === 429) msg = 'Слишком много запросов, подожди';
        if (res.status === 402) msg = 'Недостаточно кредитов';
        setBubble(msg, 'Проверь ключ и баланс');
        return;
      }

      const data = await res.json();
      const answer = data.choices?.[0]?.message?.content?.trim() || 'Пустой ответ от модели';

      // Show first ~90 chars in bubble title, rest in sub if long
      if (answer.length > 90) {
        setBubble('✦ ' + answer.slice(0, 87) + '...', answer.slice(87, 180) + (answer.length > 180 ? '...' : ''));
      } else {
        setBubble('✦ ' + answer, 'ASTRA ответила');
      }

    } catch (err) {
      console.error(err);
      setBubble('Ошибка сети', 'Проверь интернет или CORS');
    }
  }

  // --- Send ---
  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    askAI(text);
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendMessage();
  });

  // --- Tools (local responses when no AI needed) ---
  const localReplies = {
    weather: { t: 'Погода: Берлин +12°C ☀️', s: 'Ясно, лёгкий ветер' },
    alarm: { t: 'Напоминания', s: 'Скажи время и что напомнить' },
    more: { t: 'Ещё инструменты', s: 'Скоро будет ещё больше' }
  };

  document.querySelectorAll('.tool').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      btn.style.transform = 'scale(0.94)';
      setTimeout(() => btn.style.transform = '', 150);

      if (localReplies[tool]) {
        setBubble(localReplies[tool].t, localReplies[tool].s);
        return;
      }

      // For chat / code / image etc — just prompt user to type
      const prompts = {
        chat: 'Напиши что угодно в поле ввода',
        code: 'Кидай код или вопрос по IT',
        image: 'Опиши картинку, которую хочешь',
        search: 'Что ищем?',
        translate: 'Напиши текст для перевода',
        agents: 'Опиши агента, которого хочешь создать',
        video: 'Опиши видео или анимацию',
        voice: 'Голосовой режим пока в разработке'
      };
      setBubble(prompts[tool] || 'Модуль готов', 'Пиши в поле ввода 👇');
      input.focus();
    });
  });

  // Mic (visual only for now)
  micBtn.addEventListener('click', () => {
    micBtn.classList.toggle('active');
    if (micBtn.classList.contains('active')) {
      setBubble('Слушаю...', 'Голосовой ввод скоро будет');
    } else {
      setBubble('Привет! Я ASTRA ✨', 'Чем займёмся сегодня?');
    }
  });

  // Bottom nav
  document.querySelectorAll('.nav').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav').forEach(n => n.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Avatar float animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes floatA {
      0%, 100% { transform: translateX(28px) translateY(0); }
      50% { transform: translateX(28px) translateY(-7px); }
    }
    @keyframes floatB {
      0%, 100% { transform: translateX(-28px) translateY(0); }
      50% { transform: translateX(-28px) translateY(-5px); }
    }
    .avatar.astra { animation: floatA 4.5s ease-in-out infinite; }
    .avatar.mia { animation: floatB 5s ease-in-out infinite 0.4s; }
    @media (max-width: 860px) {
      @keyframes floatA {
        0%, 100% { transform: translateX(16px) translateY(0); }
        50% { transform: translateX(16px) translateY(-5px); }
      }
      @keyframes floatB {
        0%, 100% { transform: translateX(-16px) translateY(0); }
        50% { transform: translateX(-16px) translateY(-4px); }
      }
    }
  `;
  document.head.appendChild(style);

  // Init
  updateApiStatus();
  if (!settings.apiKey) {
    setTimeout(() => {
      setBubble('Привет! Я ASTRA ✨', 'Нажми ⚙️ и вставь API-ключ, чтобы я ожила');
    }, 600);
  } else {
    setBubble('Привет! Я ASTRA ✨', 'API подключен, можно писать');
  }
});
