# ASTRA + Mia — AI Assistant

Футуристический ИИ-ассистент с мимикой, голосом и реакциями на подарки.

## Ссылка

**https://lexa25.github.io/ASTRA-AI-Assistant/**

(Settings → Pages → Deploy from branch `main`)

## Возможности

### Мимика и жесты
- Состояния: idle / thinking / speaking / happy / love / surprised
- Рот двигается когда говорит
- Глаза, брови и руки реагируют на эмоции
- Индикатор «говорит»

### Голос (WebRTC)
- Кнопка 🎤 → getUserMedia + SpeechRecognition
- Ответы озвучиваются (SpeechSynthesis)
- Работает лучше всего в Chrome / Edge

### Подарки / TikTok-стиль
- Панель подарков (роза, сердце, звезда, алмаз, ракета, корона)
- При подарке: анимация + звук + смена мимики + голосовая реакция
- Кнопка «🎵 TikTok» включает режим стримерши

> Настоящее подключение к TikTok Live (события подарков в реальном времени) требует бэкенда (Cloudflare Workers / твой astra-vpn) + источник событий TikTok.

### ИИ
- Демо-режим без ключей
- OpenRouter / OpenAI / Groq / свой endpoint
- Настраиваемый характер

## Файлы

- `index.html` — разметка
- `styles.css` — дизайн + анимации мимики
- `script.js` — логика, голос, подарки, ИИ
