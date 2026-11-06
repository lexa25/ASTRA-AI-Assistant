// ASTRA AI Assistant - Interactive Logic

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('userInput');
    const sendBtn = document.querySelector('.send-btn');
    const toolBtns = document.querySelectorAll('.tool-btn');
    const navItems = document.querySelectorAll('.nav-item');

    // Update time every minute
    function updateTime() {
        const now = new Date();
        const timeEl = document.querySelector('.time');
        if (timeEl) {
            const hours = String(now.getHours()).padStart(2, '0');
            const mins = String(now.getMinutes()).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            timeEl.innerHTML = `<span>🕐</span> ${hours}:${mins}<br><small>${day}.${month}.${year}</small>`;
        }
    }
    updateTime();
    setInterval(updateTime, 60000);

    // Send message
    function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        // Simple response simulation
        const greeting = document.querySelector('.greeting-text');
        if (greeting) {
            greeting.innerHTML = `
                <div class="greeting-title">ASTRA думает...</div>
                <div class="greeting-sub">Обрабатываю твой запрос ✨</div>
            `;

            setTimeout(() => {
                const responses = [
                    'Конечно! Чем могу помочь?',
                    'Отличный вопрос! Давай разберёмся.',
                    'Я уже работаю над этим 💫',
                    'Готова помочь с чем угодно!',
                    'Mia тоже здесь и готова подключиться ❤️'
                ];
                const random = responses[Math.floor(Math.random() * responses.length)];
                greeting.innerHTML = `
                    <div class="greeting-title">✦ ${random}</div>
                    <div class="greeting-sub">Спроси что-нибудь ещё</div>
                `;
            }, 1200);
        }

        input.value = '';
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Tool buttons
    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const name = btn.querySelector('span:last-child').textContent;
            const greeting = document.querySelector('.greeting-text');
            if (greeting) {
                greeting.innerHTML = `
                    <div class="greeting-title">Открываю: ${name}</div>
                    <div class="greeting-sub">Модуль активирован ⚡</div>
                `;
            }

            // Visual feedback
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => btn.style.transform = '', 150);
        });
    });

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Subtle animation for avatars
    const avatars = document.querySelectorAll('.big-avatar');
    avatars.forEach((av, i) => {
        av.style.animation = `float ${3 + i * 0.5}s ease-in-out infinite`;
    });
});

// Add float keyframes dynamically
const style = document.createElement('style');
style.textContent = `
@keyframes float {
    0%, 100% { transform: translateY(0) translateX(var(--tx, 0)); }
    50% { transform: translateY(-8px) translateX(var(--tx, 0)); }
}
.big-avatar.left { --tx: 30px; }
.big-avatar.right { --tx: -30px; }
`;
document.head.appendChild(style);
