const STORAGE_KEY = 'astra_api_settings_v4';

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

const DEFAULT_PROMPT = `Ты ASTRA — футуристический женский ИИ-ассистент и стримерша. Говоришь уверенно, тепло и по-дружески на русском. Рядом есть Mia. Отвечай коротко, ярко и с характером. Когда получаешь подарки — искренне радуйся.`;

const GIFT_REACTIONS = {
  rose:    { emoji: '🌹', text: 'Ого, роза! Спасибо, это так мило 💕', expr: 'love' },
  heart:   { emoji: '💖', text: 'Сердечко! Ты только что сделал мой день лучше', expr: 'love' },
  star:    { emoji: '⭐', text: 'Звезда! Чувствую себя особенной прямо сейчас', expr: 'happy' },
  diamond: { emoji: '💎', text: 'Алмаз?! Ты серьёзно? Спасибо огромное!', expr: 'surprised' },
  rocket:  { emoji: '🚀', text: 'Ракета! Мы взлетаем! Спасибо за поддержку', expr: 'happy' },
  crown:   { emoji: '👑', text: 'Корона... Теперь я королева этого стрима. Спасибо!', expr: 'love' }
};

let settings = loadSettings();
let history = [];
let isListening = false;
let recognition = null;
let mediaStream = null;
let voiceMode = true;
let tiktokMode = false;

const $ = (s) => document.querySelector(s);
const chat = $('#chat');
const form = $('#form');
const input = $('#prompt');
const sendBtn = $('#sendBtn');
const micBtn = $('#micBtn');
const statusText = $('#statusText');
const statusPill = $('#statusPill');
const astraFace = $('#astraFace');
const astraState = $('#astraState');
const speakingWave = $('#speakingWave');

function defaults() {
  return { provider: 'demo', model: 'local', apiKey: '', customUrl: '', sysPrompt: DEFAULT_PROMPT, voiceReply: true };
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
  voiceMode = !!s.voiceReply;
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

// ========== EXPRESSIONS & GESTURES ==========
function setExpression(name = 'idle') {
  if (!astraFace) return;
  astraFace.className = 'face-art astra-art ' + name;

  const states = {
    idle: '● Готова помочь',
    thinking: '◐ Думаю…',
    speaking: '◉ Говорю',
    happy: '● Рада!',
    love: '♥ Спасибо!',
    surprised: '● Вау!'
  };
  if (astraState) astraState.textContent = states[name] || states.idle;

  // Highlight hero when active
  const hero = $('#astraHero');
  if (hero) {
    if (name === 'idle') hero.classList.remove('active');
    else hero.classList.add('active');
  }

  // Speaking wave
  if (speakingWave) {
    if (name === 'speaking') {
      speakingWave.classList.add('on');
      speakingWave.innerHTML = '<span></span><span></span><span></span><span></span>';
    } else {
      speakingWave.classList.remove('on');
      speakingWave.innerHTML = '';
    }
  }
}

// ========== VOICE ==========
function speak(text) {
  if (!voiceMode || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ru-RU';
  utter.rate = 1.05;
  utter.pitch = 1.15;

  const voices = window.speechSynthesis.getVoices();
  const ruFemale = voices.find(v => v.lang.startsWith('ru') && /female|woman|anna|irina|milena|oksana|tanya/i.test(v.name))
                || voices.find(v => v.lang.startsWith('ru'));
  if (ruFemale) utter.voice = ruFemale;

  utter.onstart = () => setExpression('speaking');
  utter.onend = () => setExpression('idle');
  utter.onerror = () => setExpression('idle');

  window.speechSynthesis.speak(utter);
}

function updateMicUI(listening) {
  if (!micBtn) return;
  if (listening) {
    micBtn.classList.add('listening');
    micBtn.title = 'Слушаю... Нажми чтобы остановить';
    micBtn.textContent = '🔴';
    setStatus('слушаю…', true);
    setExpression('thinking');
  } else {
    micBtn.classList.remove('listening');
    micBtn.title = 'Голос';
    micBtn.textContent = '🎤';
  }
}

async function startVoice() {
  if (isListening) return;

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (err) {
    addMsg('bot', 'Нет доступа к микрофону. Разреши доступ в настройках браузера.', 'error');
    setStatus('нет микрофона', false);
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    addMsg('bot', 'Распознавание речи лучше всего работает в Chrome / Edge.', 'error');
    stopVoice();
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'ru-RU';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  let finalTranscript = '';

  recognition.onstart = () => {
    isListening = true;
    updateMicUI(true);
  };

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalTranscript += transcript;
      else interim += transcript;
    }
    input.value = (finalTranscript + interim).trim();
  };

  recognition.onerror = (event) => {
    if (event.error === 'not-allowed') addMsg('bot', 'Доступ к микрофону запрещён.', 'error');
    stopVoice();
  };

  recognition.onend = () => {
    const text = (finalTranscript || input.value || '').trim();
    stopVoice();
    if (text) sendMessage(text);
  };

  try { recognition.start(); } catch (e) { stopVoice(); }
}

function stopVoice() {
  isListening = false;
  updateMicUI(false);
  if (recognition) { try { recognition.stop(); } catch {} recognition = null; }
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  if (statusText.textContent === 'слушаю…') {
    setStatus(settings.provider === 'demo' ? 'демо' : 'на связи', true);
  }
}

function toggleVoice() {
  if (isListening) stopVoice();
  else {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    startVoice();
  }
}

// ========== GIFTS / TIKTOK REACTIONS ==========
function playGiftSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

function receiveGift(giftKey) {
  const gift = GIFT_REACTIONS[giftKey];
  if (!gift) return;

  // Overlay animation
  const overlay = $('#giftOverlay');
  const pop = $('#giftPop');
  if (overlay && pop) {
    pop.textContent = gift.emoji;
    overlay.hidden = false;
    setTimeout(() => { overlay.hidden = true; }, 1400);
  }

  playGiftSound();
  setExpression(gift.expr);

  addMsg('bot', `${gift.emoji} ${gift.text}`, 'gift');

  // Speak reaction
  setTimeout(() => speak(gift.text), 300);

  // Return to idle after a while
  setTimeout(() => setExpression('idle'), 3500);
}

// ========== AI ==========
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
  if (/прив|здрав|hello|hi\b/.test(t)) return 'Привет! Я ASTRA. Можешь писать, говорить голосом или кидать подарки 🎁';
  if (/код|code|скрипт|python|js\b/.test(t)) return 'Могу набросать структуру. В демо — кратко. Подключи OpenRouter в ⚙ для полного ответа.';
  if (/тикток|tiktok|стрим|подар/.test(t)) return 'Режим подарков уже работает! Жми на эмодзи внизу — я реагирую мимикой, звуком и голосом. Настоящий TikTok Live можно подключить через бэкенд (Workers).';
  if (/агент|24\/7/.test(t)) return 'Полноценные 24/7 агенты живут на сервере (твой astra-vpn / Cloudflare Workers). Этот сайт — красивый клиент.';
  if (/мия|mia/.test(t)) return 'Mia — моя напарница по контенту. Сценарии, посты, идеи — это к ней.';
  return 'Приняла: «' + q.slice(0, 100) + '».\n\nСейчас демо-режим. Для умного ИИ: ⚙ → OpenRouter.';
}

async function callAI(userText) {
  if (settings.provider === 'demo') {
    await new Promise((r) => setTimeout(r, 500));
    return demoReply(userText);
  }
  const provider = PROVIDERS[settings.provider] || PROVIDERS.openrouter;
  let url = provider.url;
  if (settings.provider === 'custom') {
    url = (settings.customUrl || '').trim();
    if (!url) throw new Error('Укажи Base URL');
  }
  if (!settings.apiKey) throw new Error('Вставь API-ключ или выбери «Демо»');

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
    body: JSON.stringify({ model: settings.model, messages, temperature: 0.75, max_tokens: 1024 })
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

  setExpression('thinking');
  const thinking = addMsg('bot', 'ASTRA думает…', 'thinking');
  sendBtn.disabled = true;
  setStatus('думает…', true);

  try {
    const answer = await callAI(q);
    thinking.remove();
    addMsg('bot', answer);
    history.push({ role: 'assistant', content: answer });
    setStatus(settings.provider === 'demo' ? 'демо' : 'на связи', true);
    speak(answer);
  } catch (e) {
    thinking.remove();
    addMsg('bot', String(e.message || e), 'error');
    setStatus('ошибка', false);
    setExpression('idle');
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

// ========== UI EVENTS ==========
form.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(); });

document.querySelectorAll('#tools [data-prompt]').forEach((btn) => {
  btn.addEventListener('click', () => {
    input.value = btn.dataset.prompt;
    input.focus();
  });
});

$('#voiceModeBtn')?.addEventListener('click', () => {
  voiceMode = !voiceMode;
  addMsg('bot', voiceMode ? 'Голосовые ответы включены 🎤' : 'Голосовые ответы выключены');
});

if (micBtn) micBtn.addEventListener('click', toggleVoice);

// Gifts
document.querySelectorAll('.gift-btn').forEach(btn => {
  btn.addEventListener('click', () => receiveGift(btn.dataset.gift));
});

$('#navGifts')?.addEventListener('click', () => {
  document.querySelector('.gift-bar')?.scrollIntoView({ behavior: 'smooth' });
});

$('#tiktokBtn')?.addEventListener('click', () => {
  tiktokMode = !tiktokMode;
  $('#tiktokBtn').classList.toggle('active', tiktokMode);
  if (tiktokMode) {
    addMsg('bot', '🎵 TikTok-режим включён.\nПодарки сейчас работают в симуляции.\nДля реального подключения к TikTok Live нужен бэкенд (Workers / astra-vpn) + TikTok API или сторонний сервис событий.');
    setExpression('happy');
    setTimeout(() => setExpression('idle'), 2500);
  } else {
    addMsg('bot', 'TikTok-режим выключен.');
  }
});

$('#settingsBtn').addEventListener('click', openSettings);
$('#navSettings')?.addEventListener('click', openSettings);
$('#navProfile')?.addEventListener('click', openSettings);
$('#navAgents')?.addEventListener('click', () => sendMessage('Расскажи про агентов 24/7 и как их запустить'));
$('#closeSettings').addEventListener('click', closeSettings);
$('#settingsModal').addEventListener('click', (e) => {
  if (e.target.id === 'settingsModal') closeSettings();
});

function openSettings() {
  $('#provider').value = settings.provider;
  $('#apiKey').value = settings.apiKey || '';
  $('#customUrl').value = settings.customUrl || '';
  $('#sysPrompt').value = settings.sysPrompt || DEFAULT_PROMPT;
  $('#voiceReply').checked = settings.voiceReply !== false;
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
    sysPrompt: $('#sysPrompt').value.trim() || DEFAULT_PROMPT,
    voiceReply: $('#voiceReply').checked
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
    sysPrompt: $('#sysPrompt').value.trim() || DEFAULT_PROMPT,
    voiceReply: $('#voiceReply').checked
  });
  $('#settingsMsg').textContent = 'Проверяю…';
  try {
    const a = await callAI('Скажи одно слово: ок');
    $('#settingsMsg').textContent = 'Работает ✓ ' + a.slice(0, 60);
  } catch (e) {
    $('#settingsMsg').textContent = String(e.message || e);
  }
});

// Init
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

voiceMode = settings.voiceReply !== false;
fillModels();
setStatus(settings.provider === 'demo' ? 'демо' : 'на связи', true);
setExpression('idle');

addMsg('bot', 'Привет! Я ASTRA ✦\n\n• Пиши или жми 🎤 и говори\n• Кидай подарки — я реагирую мимикой и голосом\n• Кнопка 🎵 TikTok — режим стримерши\n\nДля умного ИИ: ⚙ → OpenRouter');
