// ===== ASTRA AI Assistant — Real API Integration =====

const STORAGE_KEY = 'astra_api_settings';

// Только OpenRouter работает напрямую из браузера (без CORS-ошибок).
// OpenAI / Groq / xAI из фронтенда обычно блокируются.
const PROVIDERS = {
  openrouter: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    models: [
      { id: 'openrouter/free', label: '⭐ openrouter/free (бесплатно)' },
      { id: 'google/gemma-2-9b-it:free', label: 'Gemma 2 9B (free)' },
      { id: 'meta-llama/llama-3.2-3b-instruct:free', label: 'Llama 3.2 3B (free)' },
      { id: 'microsoft/phi-3-mini-128k-instruct:free', label: 'Phi-3 Mini (free)' },
      { id: 'qwen/qwen-2-7b-instruct:free', label: 'Qwen2 7B (free)' }
    ]
  }
};

const DEFAULT_PROMPT = `Ты ASTRA — футуристический женский ИИ-ассистент. Говоришь уверенно, дерзко и по-дружески на русском. Ты главная, рядом с тобой Mia. Отвечай коротко, ярко и по делу.`;

let settings = loadSettings();

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      // Миграция: если был другой провайдер — сбрасываем на openrouter
      if (s.provider !== 'openrouter') {
        s.provider = 'openrouter';
        s.model = 'openrouter/free';
      }
      return s;
    }
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

  function updateClock() {
    const now = new Date();
    if (liveTime) liveTime.textContent = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    if (liveDate) liveDate.textContent = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()}`;
  }
  updateClock();
  setInterval(updateClock, 15000);

  function setBubble(title, sub, thinking = false) {
    if (bubbleTitle) bubbleTitle.textContent = title;
    if (bubbleSub) bubbleSub.textContent = sub;
    const bubble = document.getElementById('chatBubble');
    if (bubble) bubble.style.borderColor = thinking ? 'rgba(168, 85, 247, 0.55)' : 'rgba(0, 229, 255, 0.35)';
  }

  function updateApiStatus() {
    if (!apiStatus) return;
    const hasKey = !!settings.apiKey;
    const indicator = apiStatus.querySelector('.status-indicator');
    const text = apiStatus.querySelector('span:last-child');
    if (hasKey) {
      if (indicator) indicator.className = 'status-indicator on';
      if (text) text.textContent = `Ключ сохранён · ${settings.model}`;
      if (statusText) statusText.textContent = 'AI Online';
    } else {
      if (indicator) indicator.className = 'status-indicator off';
      if (text) text.textContent = 'Нужен ключ OpenRouter — открой настройки ⚙️';
      if (statusText) statusText.textContent = 'Онлайн';
    }
  }

  function fillModels() {
    if (!modelSelect) return;
    const list = PROVIDERS.openrouter.models;
    modelSelect.innerHTML = list.map(m =>
      `<option value="${m.id}">${m.label}</option>`
    ).join('');
    if (list.some(m => m.id === settings.model)) {
      modelSelect.value = settings.model;
    } else {
      modelSelect.value = list[0].id;
    }
  }

  function openModal() {
    if (providerSelect) providerSelect.value = 'openrouter';
    if (keyInput) keyInput.value = settings.apiKey;
    if (promptInput) promptInput.value = settings.systemPrompt || DEFAULT_PROMPT;
    fillModels();
    updateApiStatus();
    if (modal) modal.classList.add('open');
  }

  function closeModal() {
    if (modal) modal.classList.remove('open');
  }

  if (settingsBtn) settingsBtn.addEventListener('click', openModal);
  if (closeSettings) closeSettings.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  if (toggleKey) {
    toggleKey.addEventListener('click', () => {
      if (keyInput) keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      settings.provider = 'openrouter';
      settings.apiKey = (keyInput?.value || '').trim();
      settings.model = modelSelect?.value || 'openrouter/free';
      settings.systemPrompt = (promptInput?.value || '').trim() || DEFAULT_PROMPT;
      saveSettingsToStorage();
      updateApiStatus();
      closeModal();

      if (!settings.apiKey) {
        setBubble('Ключ не указан', 'Вставь ключ OpenRouter');
        return;
      }

      // Авто-тест ключа
      setBubble('Проверяю ключ...', 'Секунду', true);
      testKey().then(ok => {
        if (ok) {
          setBubble('Ключ рабочий! ✨', 'Можно писать сообщения');
        } else {
          setBubble('Ключ не подошёл', 'Создай новый на openrouter.ai');
        }
      });
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (keyInput) keyInput.value = '';
      settings.apiKey = '';
      saveSettingsToStorage();
      updateApiStatus();
      setBubble('Ключ удалён', 'API отключен');
    });
  }

  async function testKey() {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
          'HTTP-Referer': 'https://lexa25.github.io/ASTRA-AI-Assistant/',
          'X-Title': 'ASTRA AI'
        },
        body: JSON.stringify({
          model: settings.model || 'openrouter/free',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5
        })
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async function askAI(userMessage) {
    if (!settings.apiKey) {
      setBubble('Нужен API-ключ', 'Нажми ⚙️ → OpenRouter → вставь ключ');
      openModal();
      return;
    }

    setBubble('ASTRA думает...', 'Обрабатываю ✨', true);

    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
          'HTTP-Referer': 'https://lexa25.github.io/ASTRA-AI-Assistant/',
          'X-Title': 'ASTRA AI Assistant'
        },
        body: JSON.stringify({
          model: settings.model || 'openrouter/free',
          messages: [
            { role: 'system', content: settings.systemPrompt },
            { role: 'user', content: userMessage }
          ],
          temperature: 0.85,
          max_tokens: 800
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('API Error:', res.status, errText);

        let msg = `Ошибка ${res.status}`;
        let sub = 'Попробуй другой ключ';

        if (res.status === 401) {
          msg = 'Неверный API-ключ';
          sub = 'Ключ должен начинаться с sk-or-v1- ... Создай новый на openrouter.ai';
        } else if (res.status === 402) {
          msg = 'Нет кредитов';
          sub = 'Пополни баланс или выбери :free модель';
        } else if (res.status === 429) {
          msg = 'Лимит запросов';
          sub = 'Подожди минуту и попробуй снова';
        } else if (res.status === 404) {
          msg = 'Модель недоступна';
          sub = 'Выбери другую модель в настройках';
        }

        setBubble(msg, sub);
        return;
      }

      const data = await res.json();
      const answer = data.choices?.[0]?.message?.content?.trim() || 'Пустой ответ';

      if (answer.length > 100) {
        setBubble('✦ ' + answer.slice(0, 95) + '...', answer.slice(95, 200) + (answer.length > 200 ? '...' : ''));
      } else {
        setBubble('✦ ' + answer, 'ASTRA ответила');
      }

    } catch (err) {
      console.error(err);
      setBubble('Ошибка сети', 'Проверь интернет. OpenRouter должен работать.');
    }
  }

  function sendMessage() {
    const text = (input?.value || '').trim();
    if (!text) return;
    if (input) input.value = '';
    askAI(text);
  }

  if (sendBtn) sendBtn.addEventListener('click', sendMessage);
  if (input) {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  // Tools
  document.querySelectorAll('.tool').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      btn.style.transform = 'scale(0.94)';
      setTimeout(() => btn.style.transform = '', 150);

      const prompts = {
        chat: ['Чат готов', 'Пиши что угодно 👇'],
        code: ['Код и IT', 'Кидай вопрос или код'],
        image: ['Генерация картинок', 'Пока опиши словами — подключим позже'],
        search: ['Поиск', 'Что ищем?'],
        translate: ['Переводчик', 'Напиши текст для перевода'],
        weather: ['Погода: Берлин +12°C ☀️', 'Ясно'],
        alarm: ['Напоминания', 'Скажи время и что напомнить'],
        agents: ['Агенты', 'Опиши, какого агента создать'],
        more: ['Ещё инструменты', 'Скоро будет больше'],
        video: ['Видео', 'Пока в разработке'],
        voice: ['Голос', 'Пока в разработке']
      };

      const p = prompts[tool] || ['Готово', 'Пиши в поле ввода'];
      setBubble(p[0], p[1]);
      if (input) input.focus();
    });
  });

  if (micBtn) {
    micBtn.addEventListener('click', () => {
      micBtn.classList.toggle('active');
      setBubble(
        micBtn.classList.contains('active') ? 'Слушаю...' : 'Привет! Я ASTRA ✨',
        micBtn.classList.contains('active') ? 'Голосовой ввод скоро' : 'Чем займёмся?'
      );
    });
  }

  document.querySelectorAll('.nav').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav').forEach(n => n.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Float animation
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
        0%, 100% { transform: translateX(12px) translateY(0); }
        50% { transform: translateX(12px) translateY(-5px); }
      }
      @keyframes floatB {
        0%, 100% { transform: translateX(-12px) translateY(0); }
        50% { transform: translateX(-12px) translateY(-4px); }
      }
    }
  `;
  document.head.appendChild(style);

  updateApiStatus();
  if (!settings.apiKey) {
    setTimeout(() => setBubble('Привет! Я ASTRA ✨', 'Нажми ⚙️ и вставь ключ OpenRouter'), 500);
  } else {
    setTimeout(() => setBubble('Привет! Я ASTRA ✨', 'Ключ есть — можно писать'), 500);
  }
});
