require('dotenv').config();
const WebSocket = require('ws');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// ========== الإعدادات ==========
const STREAMER = process.env.STREAMER_USERNAME;
const SESSION_ID = process.env.SESSION_ID;
const WELCOME_MSG = process.env.WELCOME_MESSAGE || 'مرحباً بكم! 🌟';
const SPAM_INTERVAL = parseInt(process.env.SPAM_INTERVAL) || 60;

// ========== المتغيرات العامة ==========
let roomId = null;
let wsConnection = null;
let spamTimer = null;
let isConnected = false;
let viewerCount = 0;

// ========== إحصائيات ==========
const stats = {
    comments: 0,
    violations: 0,
    mutes: 0,
    bans: 0,
    startTime: Date.now()
};

// ========== قائمة الكلمات الممنوعة ==========
const BANNED_WORDS = [
    'كس', 'طيز', 'زب', 'شرموط', 'قحبة', 'عاهرة', 'منيوك',
    'خنزير', 'كلب', 'حمار', 'زامل', 'لوطي', 'ديوث',
    'زبالة', 'وسخ', 'قذر', 'حقير', 'خسيس', 'لئيم',
    '9wd', '9wad', '9ahba', '9hba', 'zamel', 'zaml',
    'fuck', 'shit', 'bitch', 'pute', 'salope', 'connard',
    '7mar', '5nzir', 'klb', 'l9rd', 'l3ahra',
    'يلعن', 'ينعل', 'الله ياخدك', 'سير تقود', 'برا تقود'
];

const violations = {};
const mutedUsers = {};
const bannedUsers = new Set();

// ========== تحميل البيانات ==========
function loadData() {
    try {
        const filePath = path.join(__dirname, 'data', 'violations.json');
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            if (data.bannedUsers) {
                data.bannedUsers.forEach(u => bannedUsers.add(u));
            }
        }
    } catch (e) {}
}

function saveData() {
    try {
        const dir = path.join(__dirname, 'data');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'violations.json'), JSON.stringify({
            violations,
            mutedUsers,
            bannedUsers: Array.from(bannedUsers)
        }, null, 2));
    } catch (e) {}
}

// ========== الحصول على room_id ==========
async function getRoomId() {
    console.log(`🔍 البحث عن بث: ${STREAMER}...`);
    
    try {
        const response = await fetch(`https://www.tiktok.com/@${STREAMER}/live`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Cookie': `sessionid=${SESSION_ID}`
            }
        });
        
        const html = await response.text();
        
        // استخراج room_id من الصفحة
        const match = html.match(/"roomId":"(\d+)"/);
        if (match) {
            roomId = match[1];
            console.log(`✅ وجدنا البث! Room ID: ${roomId}`);
            return true;
        }
        
        // طريقة أخرى
        const match2 = html.match(/"room_id":"(\d+)"/);
        if (match2) {
            roomId = match2[1];
            console.log(`✅ وجدنا البث! Room ID: ${roomId}`);
            return true;
        }
        
        console.log('⚠️ البث غير موجود أو منتهي');
        return false;
        
    } catch (err) {
        console.log(`❌ خطأ: ${err.message}`);
        return false;
    }
}

// ========== الاتصال بـ WebSocket ==========
function connectWebSocket() {
    if (!roomId) return;
    
    console.log('🔌 جاري الاتصال بـ WebSocket...');
    
    const wsUrl = `wss://webcast.tiktok.com/webcast/im/push/v2/?room_id=${roomId}&app_language=ar&webcast_sdk_version=1.0.0`;
    
    wsConnection = new WebSocket(wsUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': `sessionid=${SESSION_ID}`,
            'Origin': 'https://www.tiktok.com',
            'Referer': 'https://www.tiktok.com/'
        }
    });
    
    wsConnection.on('open', () => {
        console.log('✅ WebSocket متصل!');
        isConnected = true;
        
        // بدء السبام
        startSpam();
    });
    
    wsConnection.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            handleMessage(message);
        } catch (e) {
            // تجاهل الرسائل غير JSON
        }
    });
    
    wsConnection.on('close', () => {
        console.log('❌ WebSocket انقطع');
        isConnected = false;
        stopSpam();
        setTimeout(() => connectWebSocket(), 5000);
    });
    
    wsConnection.on('error', (err) => {
        console.log(`⚠️ خطأ WebSocket: ${err.message}`);
    });
}

// ========== معالجة الرسائل ==========
function handleMessage(msg) {
    if (msg.type === 'chat' && msg.data) {
        const { comment, user } = msg.data;
        
        if (!comment || !user) return;
        if (user.uniqueId === STREAMER) return;
        
        stats.comments++;
        
        // فحص الكلمات الممنوعة
        const isOffensive = checkBadWords(comment);
        
        if (isOffensive) {
            stats.violations++;
            console.log(`⚠️ ${user.uniqueId}: "${comment.substring(0, 50)}"`);
            handleViolation(user.uniqueId, user.userId);
        }
    }
    
    if (msg.type === 'room_user_seq' && msg.data) {
        viewerCount = msg.data.total || viewerCount;
    }
}

// ========== فحص الكلمات ==========
function checkBadWords(comment) {
    const lower = comment.toLowerCase();
    return BANNED_WORDS.some(word => lower.includes(word.toLowerCase()));
}

// ========== معالجة المخالفة ==========
function handleViolation(username, userId) {
    if (!violations[username]) {
        violations[username] = { count: 0, userId };
    }
    
    violations[username].count++;
    const count = violations[username].count;
    
    if (count >= 3) {
        // حظر
        bannedUsers.add(username);
        delete violations[username];
        stats.bans++;
        console.log(`🚫 حظر: ${username}`);
        sendModAction('ban', userId);
    } else {
        // كتم
        mutedUsers[username] = Date.now();
        stats.mutes++;
        console.log(`🔇 كتم #${count}: ${username}`);
        sendModAction('mute', userId);
    }
    
    saveData();
}

// ========== إرسال إجراء الموديراتور ==========
async function sendModAction(action, userId) {
    try {
        const endpoint = action === 'ban' 
            ? 'https://www.tiktok.com/api/live/moderator/ban/'
            : 'https://www.tiktok.com/api/live/moderator/mute/';
        
        const body = action === 'ban'
            ? { room_id: roomId, user_id: userId, ban_type: 'permanent', scene: 'live_comment' }
            : { room_id: roomId, user_id: userId, mute_duration: 2592000, scene: 'live_comment' };
        
        await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Cookie': `sessionid=${SESSION_ID}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: JSON.stringify(body)
        });
    } catch (err) {
        console.log(`⚠️ فشل ${action}: ${err.message}`);
    }
}

// ========== سبام ==========
function startSpam() {
    console.log(`📢 بدء السبام كل ${SPAM_INTERVAL} ثانية`);
    sendSpam();
    spamTimer = setInterval(sendSpam, SPAM_INTERVAL * 1000);
}

async function sendSpam() {
    if (!isConnected || !roomId) return;
    
    try {
        await fetch('https://www.tiktok.com/api/live/message/send/', {
            method: 'POST',
            headers: {
                'Cookie': `sessionid=${SESSION_ID}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: JSON.stringify({
                room_id: roomId,
                content: WELCOME_MSG,
                message_type: 'text'
            })
        });
        console.log(`📤 ${WELCOME_MSG}`);
    } catch (err) {
        // تجاهل
    }
}

function stopSpam() {
    if (spamTimer) {
        clearInterval(spamTimer);
        spamTimer = null;
    }
}

// ========== إحصائيات ==========
setInterval(() => {
    if (!isConnected) return;
    const uptime = Math.floor((Date.now() - stats.startTime) / 1000);
    const h = Math.floor(uptime / 3600);
    const m = Math.floor((uptime % 3600) / 60);
    console.log('═'.repeat(40));
    console.log(`⏱️ ${h}h ${m}m | 👥 ${viewerCount} | 💬 ${stats.comments}`);
    console.log(`⚠️ ${stats.violations} | 🔇 ${stats.mutes} | 🚫 ${stats.bans}`);
    console.log('═'.repeat(40));
}, 300000);

// ========== بدء التشغيل ==========
async function main() {
    console.log('🚀 تشغيل البوت...');
    console.log(`📡 المستهدف: ${STREAMER}`);
    console.log('═'.repeat(40));
    
    loadData();
    
    const found = await getRoomId();
    
    if (found) {
        connectWebSocket();
    } else {
        console.log('🔄 البث غير موجود، إعادة المحاولة...');
        setTimeout(main, 30000);
    }
}

main();

// إبقاء العملية نشطة
process.on('SIGTERM', () => {
    stopSpam();
    saveData();
    console.log('👋 إيقاف البوت');
    process.exit(0);
});
