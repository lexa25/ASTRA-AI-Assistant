const STORAGE_KEY = 'astra_api_settings_v2';

const PROVIDERS = {
  openrouter: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    models: [
      { id: 'openrouter/free', label: '⭐ openrouter/free (бесплатно)' },
      { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B (free)' },
      { id: 'google/gemma-4-26b-a4b-it:free', label: 'Gemma 4 26B (free)' },
      { id: 'nvidia/nemotron-3.5-lightning:free', label: 'Nemotron 3.5 Lightning (free)' },
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
      { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini (через OpenRouter)' },
      { id: 'openai/gpt-4o', label: 'GPT-4o (через OpenRouter)' },
      { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' }
    ]
  },
  openai: {
    name: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
      { id: 'gpt-4.1', label: 'GPT-4.1' }
    ]
  },
  groq: {
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
      { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' }
    ]
  },
  custom: {
    name: 'Custom',
    url: '',
    models: [{ id: 'default', label: 'Модель из endpoint' }]
  }
};

const DEFAULT_PROMPT = `Ты ASTRA — футуристический женский ИИ-ассистент. Говоришь уверенно, дерзко и по-дружески на русском. Рядом с тобой компаньон Mia. Отвечай коротко, ярко и по делу. Не пиши длинные простыни без просьбы.`;

let settings = loadSettings();
let history = [];

const $ = (s) => document.querySelector(s);
const chat = $('#chat');
const form = $('#form');
const input = $('#prompt');
const sendBtn = $('#sendBtn');
const statusText = $('#statusText');
const statusPill = $('#statusPill');

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch {}
  return defaults();
}
function defaults() {
  return {
    provider: 'openrouter',
    model: 'openrouter/free',
    apiKey: '',
    customUrl: '',
    sysPrompt: DEFAULT_PROMPT
  };
}
function saveSettingsObj(s) {
  settings = s;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function setStatus(text, ok = true) {
  statusText.textContent = text;
  statusPill.style.borderColor = ok ? '#1a6a4a' : '#6a2a2a';
  statusPill.style.background = ok ? '#062a1f' : '#2a0e12';
  statusPill.style.color = ok ? '#7dffc0' : '#ffb0b8';
}

function addMsg(role, text, cls = '') {
  const div = document.createElement('div');
  div.className = `msg ${role}${cls ? ' ' + cls : ''}`;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return div;
}

function fillModels() {
  const sel = $('#model');
  const p = PROVIDERS[settings.provider] || PROVIDERS.openrouter;
  sel.innerHTML = '';
  p.models.forEach((m) => {
    const o = document.createElement('option');
    o.value = m.id;
    o.textContent = m.label;
    if (m.id === settings.model) o.selected = true;
    sel.appendChild(o);
  });
  if (![...sel.options].some((o) => o.value === settings.model) && sel.options[0]) {
    sel.value = sel.options[0].value;
  }
  $('#customWrap').hidden = settings.provider !== 'custom';
}

function openSettings() {
  $('#provider').value = settings.provider;
  $('#apiKey').value = settings.apiKey || '';
  $('#customUrl').value = settings.customUrl || '';
  $('#sysPrompt').value = settings.sysPrompt || DEFAULT_PROMPT;
  fillModels();
  $('#settingsMsg').textContent = '';
  $('#settingsModal').hidden = false;
}
function closeSettings() {
  $('#settingsModal').hidden = true;
}

async function callAI(userText) {
  const provider = PROVIDERS[settings.provider] || PROVIDERS.openrouter;
  let url = provider.url;
  if (settings.provider === 'custom') {
    url = (settings.customUrl || '').trim();
    if (!url) throw new Error('Укажи Base URL для своего endpoint');
  }
  if (!settings.apiKey) {
    throw new Error('Сначала вставь API-ключ в настройках ⚙');
  }

  const messages = [
    { role: 'system', content: settings.sysPrompt || DEFAULT_PROMPT },
    ...history.slice(-12),
    { role: 'user', content: userText }
  ];

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${settings.apiKey}`
  };
  if (settings.provider === 'openrouter') {
    headers['HTTP-Referer'] = location.origin;
    headers['X-Title'] = 'ASTRA AI Assistant';
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: settings.model,
      messages,
      temperature: 0.7,
      max_tokens: 1024
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err =
      data?.error?.message ||
      data?.message ||
      `HTTP ${res.status}`;
    if (res.status === 401 || /invalid.*key|incorrect api/i.test(err)) {
      throw new Error('Неверный API-ключ. Проверь ключ в настройках ⚙');
    }
    if (res.status === 402) {
      throw new Error('Недостаточно кредитов у провайдера');
    }
    if (/cors|failed to fetch/i.test(err) || res.status === 0) {
      throw new Error('CORS: этот провайдер блокирует запросы из браузера. Используй OpenRouter.');
    }
    throw new Error(err);
  }

  const answer =
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.text ||
    '';
  if (!answer) throw new Error('Пустой ответ модели');
  return answer.trim();
}

async function sendMessage(text) {
  const q = (text || input.value || '').trim();
  if (!q) return;
  input.value = '';
  addMsg('user', q);
  history.push({ role: 'user', content: q });

  const thinking = addMsg('bot', 'ASTRA думает…', 'thinking');
  sendBtn.disabled = true;
  setStatus('думает…', true);

  try {
    const answer = await callAI(q);
    thinking.remove();
    addMsg('bot', answer);
    history.push({ role: 'assistant', content: answer });
    setStatus('на связи', true);
  } catch (e) {
    thinking.remove();
    addMsg('bot', String(e.message || e), 'error');
    setStatus('ошибка', false);
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage();
});

document.querySelectorAll('#tools [data-prompt]').forEach((btn) => {
  btn.addEventListener('click', () => {
    input.value = btn.dataset.prompt;
    input.focus();
  });
});

$('#settingsBtn').addEventListener('click', openSettings);
$('#navSettings')?.addEventListener('click', openSettings);
$('#navProfile')?.addEventListener('click', openSettings);
$('#closeSettings').addEventListener('click', closeSettings);
$('#settingsModal').addEventListener('click', (e) => {
  if (e.target.id === 'settingsModal') closeSettings();
});

$('#provider').addEventListener('change', () => {
  settings.provider = $('#provider').value;
  const first = PROVIDERS[settings.provider]?.models?.[0]?.id;
  if (first) settings.model = first;
  fillModels();
});

$('#saveSettings').addEventListener('click', () => {
  const next = {
    provider: $('#provider').value,
    model: $('#model').value,
    apiKey: $('#apiKey').value.trim(),
    customUrl: $('#customUrl').value.trim(),
    sysPrompt: $('#sysPrompt').value.trim() || DEFAULT_PROMPT
  };
  saveSettingsObj(next);
  $('#settingsMsg').textContent = 'Сохранено ✓';
  setStatus(next.apiKey ? 'на связи' : 'нужен ключ', !!next.apiKey);
  setTimeout(closeSettings, 500);
});

$('#testSettings').addEventListener('click', async () => {
  const next = {
    provider: $('#provider').value,
    model: $('#model').value,
    apiKey: $('#apiKey').value.trim(),
    customUrl: $('#customUrl').value.trim(),
    sysPrompt: $('#sysPrompt').value.trim() || DEFAULT_PROMPT
  };
  saveSettingsObj(next);
  $('#settingsMsg').textContent = 'Проверяю…';
  try {
    const a = await callAI('Ответь одним словом: ок');
    $('#settingsMsg').textContent = 'Ключ работает ✓ Ответ: ' + a.slice(0, 80);
    setStatus('на связи', true);
  } catch (e) {
    $('#settingsMsg').textContent = String(e.message || e);
    setStatus('ошибка', false);
  }
});

// init
fillModels();
if (!settings.apiKey) {
  setStatus('нужен ключ ⚙', false);
  addMsg('bot', 'Привет! Я ASTRA. Открой ⚙ настройки, вставь ключ OpenRouter (бесплатно на openrouter.ai) — и можно общаться.\n\nChatGPT тоже можно: выбери OpenAI или модель GPT через OpenRouter.');
} else {
  setStatus('на связи', true);
  addMsg('bot', 'Привет! Я ASTRA ✦ Чем займёмся сегодня?');
}
