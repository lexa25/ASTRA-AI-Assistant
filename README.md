# ASTRA + Mia — AI Assistant

Футуристический интерфейс с двумя ассистентами (ASTRA и Mia), чатом и подключением реального ИИ.

## Ссылка

После включения GitHub Pages:
**https://lexa25.github.io/ASTRA-AI-Assistant/**

Settings → Pages → Deploy from branch `main` / folder `/ (root)`.

## Голос (WebRTC)

- Кнопка 🎤 запрашивает микрофон через `getUserMedia` (WebRTC)
- Распознавание речи — Web Speech API (лучше всего работает в Chrome / Edge)
- Ответы Астры озвучиваются через SpeechSynthesis
- Кнопка пульсирует красным, пока слушает

Просто нажми на микрофон и говори. После паузы текст уходит в чат, Астра отвечает голосом.

## Как подключить ИИ

1. Открой приложение → кнопка **⚙**
2. Провайдер: **OpenRouter** (лучше всего работает из браузера)
3. Зарегистрируйся на [openrouter.ai](https://openrouter.ai) → создай API key (`sk-or-v1-...`)
4. Вставь ключ → модель `openrouter/free` (бесплатно) или GPT/Claude через OpenRouter
5. **Сохранить** → **Проверить ключ**

### ChatGPT (OpenAI)

- Либо выбери провайдер **OpenAI** и ключ `sk-proj-...` (иногда CORS блокирует из браузера)
- Либо через OpenRouter: модель `openai/gpt-4o-mini` / `openai/gpt-4o` — так надёжнее

### Свой сервер

Провайдер **Custom** → Base URL вида `https://.../v1/chat/completions` + ключ.

Ключ хранится только в `localStorage` браузера.

## Файлы

- `index.html` — разметка
- `styles.css` — интерфейс + анимация микрофона
- `script.js` — чат + API + голос (WebRTC / SpeechRecognition / TTS)
