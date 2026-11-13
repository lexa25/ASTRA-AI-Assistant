const STORAGE_KEY = 'astra_api_settings_v3';

const PROVIDERS = {
  demo: {
    name: 'Демо',
    url: '',
    models: [{ id: 'local', label: 'Локальный демо-режим (без ключа)' }]
  },
  openrouter: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    models: [
      { id: 'openrouter/free', label: '⭐ openrouter/free (бесплатно)' },
      { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B (free)' },
      { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'openai/gpt-4o', label: 'GPT-4o' },
      { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' }
    ]
  },
  openai: {
    name: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'gpt-4o', label: 'GPT-4o' }
    ]
  },
  groq: {
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B' }
    ]
  },
  custom: {
    name: 'Custom',
    url: '',
    models: [{ id: 'default', label: 'Модель endpoint' }]
  }
};

const DEFAULT_PROMPT = `Ты ASTRA — футуристический женский ИИ. Говоришь уверенно и по-дружески на русском. Рядом Mia. Отвечай коротко и ярко.`;

let settings = loadSettings();
let history = [];

const $ = (s) => document.querySelector(s);
const chat = $('#chat');
const form = $('#form');
const input = $('#prompt');
const sendBtn = $('#sendBtn');
const statusText = $('#statusText');
const statusPill = $('#statusPill');

function defaults() {
  return { provider: 'demo', model: 'local', apiKey: '', customUrl: '', sysPrompt: DEFAULT_PROMPT };
}
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch {}
  return defaults();
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
  const p = PROVIDERS[settings.provider] || PROVIDERS.demo;
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

function demoReply(q) {
  const t = q.toLowerCase();
  if (/прив|здрав|hello|hi\b/.test(t)) return 'Привет! Я ASTRA, рядом Mia. Пиши задачу — код, текст, план, идея. Для умного ИИ как ChatGPT открой ⚙ и подключи OpenRouter (бесплатно).';
  if (/код|code|скрипт|python|js\b/.test(t)) return 'Могу набросать структуру кода. В демо-режиме — кратко. Подключи OpenRouter/GPT в ⚙ — и разверну полный рабочий пример.';
  if (/агент|24\/7|автоном/.test(t)) return 'Настоящие агенты 24/7 нужны на сервере (Cloudflare Workers / твой astra-vpn). Этот сайт — клиент. На Workers уже есть Agent Factory и очереди задач.';
  if (/мия|mia/.test(t)) return 'Mia — контент-компаньон: сценарии, посты, идеи роликов. Скажи тему — накидаю план.';
  if (/погод/.test(t)) return 'В виджете сейчас заглушка +12°C Берлин. Для живой погоды нужен API (Open-Meteo можно добавить без ключа).';
  if (/ключ|api|chatgpt|gpt|openrouter/.test(t)) return '⚙ → режим OpenRouter → ключ с openrouter.ai (sk-or-v1-…) → модель openrouter/free или openai/gpt-4o-mini. Демо работает и без ключа.';
  return 'Приняла: «' + q.slice(0, 120) + '».\n\nСейчас демо-режим (без ключа). Отвечаю шаблоном. Для нормального ИИ: ⚙ → OpenRouter → бесплатный ключ. Твой полный бэкенд с агентами: Workers astra-vpn.';
}

async function callAI(userText) {
  if (settings.provider === 'demo') {
    await new Promise((r) => setTimeout(r, 400));
    return demoReply(userText);
  }
  const provider = PROVIDERS[settings.provider] || PROVIDERS.openrouter;
  let url = provider.url;
  if (settings.provider === 'custom') {
    url = (settings.customUrl || '').trim();
    if (!url) throw new Error('Укажи Base URL');
  }
  if (!settings.apiKey) throw new Error('Вставь API-ключ или выбери режим «Демо»');

  const messages = [
    { role: 'system', content: settings.sysPrompt || DEFAULT_PROMPT },
    ...history.slice(-12),
    { role: 'user', content: userText }
  ];
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + settings.apiKey
  };
  if (settings.provider === 'openrouter') {
    headers['HTTP-Referer'] = location.origin;
    headers['X-Title'] = 'ASTRA AI Assistant';
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: settings.model, messages, temperature: 0.7, max_tokens: 1024 })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error?.message || data?.message || 'HTTP ' + res.status;
    if (res.status === 401) throw new Error('Неверный API-ключ');
    throw new Error(err);
  }
  const answer = data?.choices?.[0]?.message?.content || '';
  if (!answer) throw new Error('Пустой ответ');
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
    setStatus(settings.provider === 'demo' ? 'демо' : 'на связи', true);
  } catch (e) {
    thinking.remove();
    addMsg('bot', String(e.message || e), 'error');
    setStatus('ошибка', false);
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

form.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });
document.querySelectorAll('#tools [data-prompt]').forEach((btn) => {
  btn.addEventListener('click', () => { input.value = btn.dataset.prompt; input.focus(); });
});
$('#settingsBtn').addEventListener('click', openSettings);
$('#navSettings')?.addEventListener('click', openSettings);
$('#navProfile')?.addEventListener('click', openSettings);
$('#navAgents')?.addEventListener('click', () => {
  sendMessage('Расскажи про агентов 24/7 и как их запустить');
});
$('#closeSettings').addEventListener('click', closeSettings);
$('#settingsModal').addEventListener('click', (e) => {
  if (e.target.id === 'settingsModal') closeSettings();
});
function openSettings() {
  $('#provider').value = settings.provider;
  $('#apiKey').value = settings.apiKey || '';
  $('#customUrl').value = settings.customUrl || '';
  $('#sysPrompt').value = settings.sysPrompt || DEFAULT_PROMPT;
  fillModels();
  $('#settingsMsg').textContent = '';
  $('#settingsModal').hidden = false;
}
function closeSettings() { $('#settingsModal').hidden = true; }
$('#provider').addEventListener('change', () => {
  settings.provider = $('#provider').value;
  settings.model = PROVIDERS[settings.provider]?.models?.[0]?.id || 'local';
  fillModels();
});
$('#saveSettings').addEventListener('click', () => {
  saveSettingsObj({
    provider: $('#provider').value,
    model: $('#model').value,
    apiKey: $('#apiKey').value.trim(),
    customUrl: $('#customUrl').value.trim(),
    sysPrompt: $('#sysPrompt').value.trim() || DEFAULT_PROMPT
  });
  $('#settingsMsg').textContent = 'Сохранено ✓';
  setStatus(settings.provider === 'demo' ? 'демо' : 'на связи', true);
  setTimeout(closeSettings, 400);
});
$('#testSettings').addEventListener('click', async () => {
  saveSettingsObj({
    provider: $('#provider').value,
    model: $('#model').value,
    apiKey: $('#apiKey').value.trim(),
    customUrl: $('#customUrl').value.trim(),
    sysPrompt: $('#sysPrompt').value.trim() || DEFAULT_PROMPT
  });
  $('#settingsMsg').textContent = 'Проверяю…';
  try {
    const a = await callAI('Скажи одно слово: ок');
    $('#settingsMsg').textContent = 'Работает ✓ ' + a.slice(0, 60);
  } catch (e) {
    $('#settingsMsg').textContent = String(e.message || e);
  }
});

fillModels();
setStatus(settings.provider === 'demo' ? 'демо' : 'на связи', true);
addMsg('bot', 'Привет! Я ASTRA, рядом Mia.\n\nСейчас можно писать сразу — демо без ключа.\nДля умного ИИ (ChatGPT-уровень): ⚙ → OpenRouter.\nАгенты 24/7 — на твоём Workers (astra-vpn), не на статическом GitHub Pages.');
