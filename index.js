const { WebcastPushConnection } = require('tiktok-live-connector');
const axios = require('axios');

// تم تصحيح الخطأ: وضع القيم داخل علامات تنصيص ' '
const TIKTOK_USERNAME = 'usrnani1'; // حساب التيك توك الذي يفتح البث
const SESSION_ID = '24efea21ae204661382b31e612f67ae3'; // الـ Session ID الخاص بحساب الموديراتور

// 🛑 قائمة الكلمات الممنوعة (الدارجة المغربية)
const BAD_WORDS = [
    'كلمة_سيئة_1', 
    'كلمة_سيئة_2', 
    'كلمة_سيئة_3'
];

// إعداد الاتصال بالبث المباشر
const tiktokLiveConnection = new WebcastPushConnection(TIKTOK_USERNAME);

// الاتصال بالبث
tiktokLiveConnection.connect().then(state => {
    console.log(`✅ البوت متصل بنجاح ببث: ${state.roomId}`);
    
    // بدء إرسال رسالة السپام كل 60 ثانية بمجرد الاتصال
    setInterval(async () => {
        const spamMessage = "مرحبا بكم المرجو المتابعة فضلا وليس امرا";
        await sendChat(spamMessage, state.roomId);
    }, 60000); // 60000 مللي ثانية = 60 ثانية

}).catch(err => {
    console.error('❌ فشل الاتصال بالبث:', err);
});

// مراقبة التعليقات بشكل حي
tiktokLiveConnection.on('chat', async (data) => {
    const comment = data.comment.toLowerCase();
    const userId = data.userId;
    const username = data.uniqueId;

    // التحقق مما إذا كان التعليق يحتوي على أي كلمة من القائمة السوداء
    const isBadWord = BAD_WORDS.some(word => comment.includes(word));

    if (isBadWord) {
        console.log(`🚨 تم رصد كلام مسيء من ${username}: ${comment}`);
        // استدعاء دالة الكتم (Mute)
        await muteUser(userId, tiktokLiveConnection.getState().roomId); 
    }
});

// ==========================================
// دوال التحكم (تتطلب Session ID للعمل)
// ==========================================

// دالة كتم المستخدم
async function muteUser(userId, roomId) {
    try {
        await axios.post('https://www.tiktok.com/api/room/manage/user/mute/', null, {
            params: {
                room_id: roomId,
                user_id: userId
            },
            headers: {
                'Cookie': `sessionid=${SESSION_ID}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        console.log(`🔇 تم كتم المستخدم بنجاح.`);
    } catch (error) {
        console.error('❌ فشل في كتم المستخدم (قد تحتاج لتحديث الـ Session ID).');
    }
}

// دالة إرسال الرسائل التلقائية في الشات
async function sendChat(text, roomId) {
    try {
        await axios.post('https://www.tiktok.com/api/room/manage/comment/', {
            text: text,
            room_id: roomId
        }, {
            headers: {
                'Cookie': `sessionid=${SESSION_ID}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        console.log(`💬 تم إرسال: ${text}`);
    } catch (error) {
        console.error('❌ فشل إرسال رسالة الترحيب.');
    }
}
