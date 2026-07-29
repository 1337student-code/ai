require('dotenv').config();
const puppeteer = require('puppeteer');

const STREAMER = process.env.STREAMER_USERNAME;
const SESSION_ID = process.env.SESSION_ID;
const WELCOME_MSG = process.env.WELCOME_MESSAGE || 'مرحباً بكم! 🌟';
const SPAM_INTERVAL = parseInt(process.env.SPAM_INTERVAL) || 60;

const BANNED_WORDS = [
    'كس', 'طيز', 'زب', 'شرموط', 'قحبة', 'عاهرة', 'منيوك',
    'خنزير', 'كلب', 'حمار', 'زامل', 'ديوث', 'قواد',
    '9wd', '9wad', '9ahba', '9hba', 'zamel',
    'fuck', 'shit', 'bitch', 'pute', 'salope', 'connard',
    '7mar', '5nzir', 'klb', 'l9rd',
    'يلعن', 'ينعل', 'سير تقود', 'برا تقود'
];

const violations = {};
let browser = null;
let page = null;

// ========== نوم ==========
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ========== بدء المتصفح ==========
async function startBrowser() {
    console.log('🌐 تشغيل المتصفح...');
    
    browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1280,720'
        ]
    });
    
    page = await browser.newPage();
    
    // إعداد User-Agent حقيقي
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // إضافة الكوكيز
    await page.setCookie({
        name: 'sessionid',
        value: SESSION_ID,
        domain: '.tiktok.com',
        path: '/'
    });
    
    console.log('✅ المتصفح جاهز');
}

// ========== فتح البث ==========
async function openLive() {
    try {
        console.log(`📡 فتح البث: ${STREAMER}`);
        
        const url = `https://www.tiktok.com/@${STREAMER}/live`;
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        await sleep(5000);
        
        // التحقق من وجود الشات
        const chatExists = await page.evaluate(() => {
            return !!document.querySelector('[data-e2e="live-room-chat"]') ||
                   !!document.querySelector('.chat-message-container') ||
                   !!document.querySelector('[class*="chat"]');
        });
        
        if (chatExists) {
            console.log('✅ تم فتح البث بنجاح');
            return true;
        }
        
        console.log('⚠️ لم يتم العثور على الشات');
        return false;
        
    } catch (err) {
        console.log(`❌ خطأ: ${err.message}`);
        return false;
    }
}

// ========== إرسال رسالة ==========
async function sendMessage(text) {
    try {
        // البحث عن حقل الإدخال
        const inputSelector = '[contenteditable="true"], [data-e2e="live-room-chat-input"], input, textarea, [class*="chat"] [contenteditable]';
        
        await page.waitForSelector(inputSelector, { timeout: 5000 });
        await page.click(inputSelector);
        await sleep(500);
        
        // كتابة النص
        await page.keyboard.type(text, { delay: 50 });
        await sleep(500);
        
        // إرسال
        await page.keyboard.press('Enter');
        
        console.log(`📤 ${text}`);
        return true;
    } catch (err) {
        console.log(`⚠️ فشل الإرسال: ${err.message}`);
        return false;
    }
}

// ========== قراءة التعليقات ==========
async function monitorChat() {
    console.log('👀 مراقبة التعليقات...');
    
    let lastComments = [];
    
    while (true) {
        try {
            const comments = await page.evaluate(() => {
                const messages = document.querySelectorAll('[data-e2e="live-room-chat-message"], [class*="chat-message"], [class*="comment"]');
                const result = [];
                messages.forEach(msg => {
                    const text = msg.textContent || msg.innerText || '';
                    if (text.trim()) result.push(text.trim());
                });
                return result;
            });
            
            // فحص التعليقات الجديدة
            for (const comment of comments) {
                if (!lastComments.includes(comment)) {
                    console.log(`💬 ${comment}`);
                    
                    // فحص الكلمات الممنوعة
                    const lower = comment.toLowerCase();
                    const found = BANNED_WORDS.find(word => lower.includes(word.toLowerCase()));
                    
                    if (found) {
                        console.log(`⚠️ مخالفة: "${comment}"`);
                        console.log(`   كلمة ممنوعة: "${found}"`);
                        
                        // استخراج اسم المستخدم
                        const username = extractUsername(comment);
                        if (username) {
                            handleViolation(username);
                        }
                    }
                }
            }
            
            lastComments = [...comments];
            
        } catch (err) {
            // تجاهل
        }
        
        await sleep(2000);
    }
}

// ========== استخراج اسم المستخدم ==========
function extractUsername(comment) {
    const match = comment.match(/@?(\w+):/);
    return match ? match[1] : null;
}

// ========== معالجة المخالفة ==========
function handleViolation(username) {
    if (!violations[username]) {
        violations[username] = 0;
    }
    
    violations[username]++;
    const count = violations[username];
    
    console.log(`🔇 ${username} - مخالفة #${count}`);
    
    // إرسال رسالة تحذير
    if (count === 1) {
        sendMessage(`@${username} ⚠️ تحذير: تجنب الكلمات المسيئة`);
    } else if (count === 2) {
        sendMessage(`@${username} ⚠️ تحذير أخير`);
    } else {
        sendMessage(`@${username} 🚫 تم حظرك`);
    }
}

// ========== سبام ==========
async function startSpam() {
    console.log(`📢 بدء السبام كل ${SPAM_INTERVAL}s`);
    
    while (true) {
        await sendMessage(WELCOME_MSG);
        await sleep(SPAM_INTERVAL * 1000);
    }
}

// ========== التشغيل الرئيسي ==========
async function main() {
    console.log('🚀 بدء البوت...');
    console.log(`📡 المستهدف: ${STREAMER}`);
    console.log('═'.repeat(40));
    
    await startBrowser();
    
    const opened = await openLive();
    
    if (opened) {
        // تشغيل السبام والمراقبة بالتوازي
        Promise.all([
            startSpam(),
            monitorChat()
        ]);
    } else {
        console.log('❌ فشل فتح البث');
        if (browser) await browser.close();
        process.exit(1);
    }
}

// ========== بدء ==========
main().catch(err => {
    console.log(`❌ خطأ: ${err.message}`);
    process.exit(1);
});

// تنظيف عند الإيقاف
process.on('SIGTERM', async () => {
    console.log('👋 إيقاف...');
    if (browser) await browser.close();
    process.exit(0);
});
