// ===== ASTRA AI Assistant =====

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('msgInput');
    const sendBtn = document.getElementById('sendBtn');
    const micBtn = document.getElementById('micBtn');
    const bubbleTitle = document.getElementById('bubbleTitle');
    const bubbleSub = document.getElementById('bubbleSub');
    const liveTime = document.getElementById('liveTime');
    const liveDate = document.getElementById('liveDate');

    // --- Live clock ---
    function updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const mo = String(now.getMonth() + 1).padStart(2, '0');
        const y = now.getFullYear();
        if (liveTime) liveTime.textContent = `${h}:${m}`;
        if (liveDate) liveDate.textContent = `${d}.${mo}.${y}`;
    }
    updateClock();
    setInterval(updateClock, 10000);

    // --- Bubble helper ---
    function setBubble(title, sub, thinking = false) {
        if (!bubbleTitle || !bubbleSub) return;
        bubbleTitle.textContent = title;
        bubbleSub.textContent = sub;
        const bubble = document.getElementById('chatBubble');
        if (thinking) {
            bubble.style.borderColor = 'rgba(168, 85, 247, 0.5)';
        } else {
            bubble.style.borderColor = 'rgba(0, 229, 255, 0.35)';
        }
    }

    // --- Responses ---
    const replies = {
        default: [
            { t: 'Конечно! Чем могу помочь?', s: 'Спроси что угодно ✨' },
            { t: 'Я уже здесь, брат 💫', s: 'Готова к любому заданию' },
            { t: 'Отличный вопрос!', s: 'Давай разберёмся вместе' },
            { t: 'Mia тоже на связи ❤️', s: 'Мы обе готовы помочь' },
            { t: 'Обработано ⚡', s: 'Что ещё нужно?' }
        ],
        chat: { t: 'Чат ИИ активирован', s: 'Пиши что угодно — я отвечу' },
        code: { t: 'Модуль Код и IT', s: 'Готова писать, дебажить и объяснять код' },
        image: { t: 'Генерация изображений', s: 'Опиши картинку — создам' },
        search: { t: 'Поиск фото', s: 'Что ищем?' },
        translate: { t: 'Переводчик готов', s: 'Любой язык → любой язык' },
        weather: { t: 'Погода: Берлин +12°C ☀️', s: 'Ясно, лёгкий ветер' },
        alarm: { t: 'Напоминания', s: 'Скажи время и что напомнить' },
        agents: { t: 'Агенты и проекты', s: 'Создаём автономных помощников' },
        more: { t: 'Ещё инструменты', s: 'Скоро будет ещё больше модулей' },
        video: { t: 'Видео и анимация', s: 'Генерация и монтаж на подходе' },
        voice: { t: 'Голосовой режим', s: 'Говори — я слушаю' }
    };

    function randomReply() {
        const list = replies.default;
        return list[Math.floor(Math.random() * list.length)];
    }

    // --- Send message ---
    function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        setBubble('ASTRA думает...', 'Обрабатываю запрос ✨', true);
        input.value = '';

        setTimeout(() => {
            const r = randomReply();
            setBubble('✦ ' + r.t, r.s);
        }, 900 + Math.random() * 600);
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') sendMessage();
    });

    // --- Tools ---
    document.querySelectorAll('.tool').forEach(btn => {
        btn.addEventListener('click', () => {
            const tool = btn.dataset.tool;
            const r = replies[tool] || { t: 'Модуль активирован', s: 'Готово ⚡' };
            setBubble(r.t, r.s);

            // press effect
            btn.style.transform = 'scale(0.94)';
            setTimeout(() => btn.style.transform = '', 160);
        });
    });

    // --- Mic ---
    micBtn.addEventListener('click', () => {
        micBtn.classList.toggle('active');
        if (micBtn.classList.contains('active')) {
            setBubble('Слушаю...', 'Говори, я записываю 🎤');
        } else {
            setBubble('Привет! Я ASTRA ✨', 'Чем займёмся сегодня?');
        }
    });

    // --- Bottom nav ---
    document.querySelectorAll('.nav').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav').forEach(n => n.classList.remove('active'));
            btn.classList.add('active');

            const page = btn.dataset.page;
            const titles = {
                home: ['Главная', 'Ты на главном экране'],
                agents: ['Агенты', 'Управляй своими ИИ-агентами'],
                projects: ['Проекты', 'Все твои активные проекты'],
                features: ['Возможности', 'Полный список функций ASTRA'],
                profile: ['Профиль', 'Настройки и подписка']
            };
            const t = titles[page] || ['ASTRA', ''];
            setBubble(t[0], t[1]);
        });
    });

    // --- Subtle float animation for avatars ---
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

    // Welcome message after short delay
    setTimeout(() => {
        setBubble('Привет! Я ASTRA ✨', 'Чем займёмся сегодня?');
    }, 300);
});
