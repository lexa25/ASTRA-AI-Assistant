/* ASTRA Frontend → Cloudflare Worker (astra-vpn) */

const STORAGE_KEY = 'astra_settings_v5';

// ========== CONFIG ==========
// Поставь сюда адрес своего Worker (без слэша в конце)
// Пример: https://astra-vpn.твой-сабдомен.workers.dev
const DEFAULT_WORKER_URL = 'https://astra-vpn.lexa25.workers.dev';

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
  return {
    workerUrl: DEFAULT_WORKER_URL,
    voiceReply: true
  };
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

function workerBase() {
  return (settings.workerUrl || DEFAULT_WORKER_URL).replace(/\/$/, '');
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

// ========== EXPRESSIONS ==========
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

  const hero = $('#astraHero');
  if (hero) {
    if (name === 'idle') hero.classList.remove('active');
    else hero.classList.add('active');
  }

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
    addMsg('bot', 'Нет доступа к микрофону.', 'error');
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

  recognition.onerror = () => stopVoice();
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
  if (statusText.textContent === 'слушаю…') setStatus('на связи', true);
}

function toggleVoice() {
  if (isListening) stopVoice();
  else {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    startVoice();
  }
}

// ========== GIFTS ==========
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
  setTimeout(() => speak(gift.text), 300);
  setTimeout(() => setExpression('idle'), 3500);
}

// ========== AI CALL (Worker) ==========
async function callWorkerChat(userText) {
  const url = workerBase() + '/api/chat';

  const messages = [
    ...history.slice(-10),
    { role: 'user', content: userText }
  ];

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = data?.error || data?.message || ('HTTP ' + res.status);
    throw new Error(err);
  }

  // Поддерживаем разные форматы ответа Worker
  const answer = data.answer || data.reply || data.content || data?.choices?.[0]?.message?.content || data?.message;
  if (!answer || typeof answer !== 'string') {
    throw new Error('Пустой или неизвестный формат ответа от Worker');
  }
  return answer.trim();
}

// Запуск агентной задачи по требованию
async function runAgentTask(taskText) {
  const url = workerBase() + '/api/agents/workflow';

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal: taskText,
      mode: 'on_demand'   // сразу выполнять
    })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || data?.message || 'Не удалось запустить агентов');
  }

  return data;
}

async function sendMessage(text) {
  const q = (text || input.value || '').trim();
  if (!q) return;
  input.value = '';
  addMsg('user', q);
  history.push({ role: 'user', content: q });

  // Если сообщение похоже на задачу для агентов
  const isAgentTask = /сделай|напиши код|реализуй|исправь|добавь|создай агента|запусти агентов|выполни задачу/i.test(q);

  setExpression('thinking');
  const thinking = addMsg('bot', isAgentTask ? 'Запускаю команду агентов…' : 'ASTRA думает…', 'thinking');
  sendBtn.disabled = true;
  setStatus(isAgentTask ? 'агенты работают…' : 'думает…', true);

  try {
    let answer;

    if (isAgentTask) {
      // Пробуем запустить workflow агентов
      try {
        const result = await runAgentTask(q);
        const id = result.id || result.workflowId || result.instanceId;
        answer = result.summary || result.result || result.message ||
          (id ? `Задача принята агентами. ID: ${id}\nОни выполняют её сейчас. Можешь спросить статус позже.` :
           'Агенты приняли задачу и начали выполнение.');
      } catch (agentErr) {
        // Если workflow не сработал — обычный чат
        console.warn('Agent workflow failed, falling back to chat', agentErr);
        answer = await callWorkerChat(q);
      }
    } else {
      answer = await callWorkerChat(q);
    }

    thinking.remove();
    addMsg('bot', answer);
    history.push({ role: 'assistant', content: answer });
    setStatus('на связи', true);
    speak(answer);
  } catch (e) {
    thinking.remove();
    addMsg('bot', 'Ошибка: ' + String(e.message || e), 'error');
    setStatus('ошибка', false);
    setExpression('idle');
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

// ========== UI ==========
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

document.querySelectorAll('.gift-btn').forEach(btn => {
  btn.addEventListener('click', () => receiveGift(btn.dataset.gift));
});

$('#navGifts')?.addEventListener('click', () => {
  document.querySelector('.gift-bar')?.scrollIntoView({ behavior: 'smooth' });
});

$('#tiktokBtn')?.addEventListener('click', () => {
  tiktokMode = !tiktokMode;
  $('#tiktokBtn').classList.toggle('active', tiktokMode);
  addMsg('bot', tiktokMode ? '🎵 TikTok-режим включён' : 'TikTok-режим выключен');
  if (tiktokMode) {
    setExpression('happy');
    setTimeout(() => setExpression('idle'), 2000);
  }
});

$('#settingsBtn').addEventListener('click', openSettings);
$('#navSettings')?.addEventListener('click', openSettings);
$('#navProfile')?.addEventListener('click', openSettings);
$('#navAgents')?.addEventListener('click', () => {
  sendMessage('Запусти команду агентов: проверь текущее состояние системы и предложи следующий полезный шаг');
});
$('#closeSettings').addEventListener('click', closeSettings);
$('#settingsModal').addEventListener('click', (e) => {
  if (e.target.id === 'settingsModal') closeSettings();
});

function openSettings() {
  $('#workerUrl').value = settings.workerUrl || DEFAULT_WORKER_URL;
  $('#voiceReply').checked = settings.voiceReply !== false;
  $('#settingsMsg').textContent = '';
  $('#settingsModal').hidden = false;
}

function closeSettings() {
  $('#settingsModal').hidden = true;
}

$('#saveSettings')?.addEventListener('click', () => {
  saveSettingsObj({
    workerUrl: $('#workerUrl').value.trim() || DEFAULT_WORKER_URL,
    voiceReply: $('#voiceReply').checked
  });
  $('#settingsMsg').textContent = 'Сохранено ✓';
  setStatus('на связи', true);
  setTimeout(closeSettings, 400);
});

$('#testSettings')?.addEventListener('click', async () => {
  $('#settingsMsg').textContent = 'Проверяю Worker…';
  try {
    const res = await fetch(workerBase() + '/api/status');
    const data = await res.json();
    if (res.ok) {
      $('#settingsMsg').textContent = 'Worker доступен ✓';
    } else {
      $('#settingsMsg').textContent = 'Ошибка: ' + (data.error || res.status);
    }
  } catch (e) {
    $('#settingsMsg').textContent = 'Не удалось подключиться: ' + e.message;
  }
});

// Init
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

voiceMode = settings.voiceReply !== false;
setStatus('на связи', true);
setExpression('idle');

addMsg('bot', 'Привет! Я ASTRA ✦\n\nСейчас подключена к Worker.\n• Просто пиши — отвечаю\n• Напиши задачу («сделай…», «напиши код…») — запущу агентов\n• 🎤 — голос\n• Подарки работают\n\nЕсли Worker URL другой — открой ⚙ и укажи его.');
