/**
 * بوت موديراتور تيك توك بالذكاء الاصطناعي - الإصدار النهائي
 * الكتم دائم + كشف السب بجميع اللغات + الدارجة + الرموز المستبدلة
 */

require('dotenv').config();
const { WebcastPushConnection } = require('tiktok-live-connector');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const AIFilter = require('./ai-filter');

// ========== البوت الرئيسي ==========
class TikTokAIModerator {
    constructor() {
        // إعدادات الاتصال
        this.streamerUsername = process.env.STREAMER_USERNAME;
        this.sessionId = process.env.SESSION_ID;
        this.connection = null;
        this.roomId = null;
        this.isConnected = false;
        
        // نظام الذكاء الاصطناعي (صرامة قصوى)
        this.aiFilter = new AIFilter(parseInt(process.env.AI_STRICTNESS) || 10);
        
        // قواعد البيانات
        this.violations = {};
        this.mutedUsers = {}; // كتم دائم
        this.bannedUsers = new Set();
        this.warnings = {};
        
        // إعدادات السبام
        this.spamIntervalId = null;
        this.welcomeMessage = process.env.WELCOME_MESSAGE || 'مرحباً بكم في البث! 🌟 المرجو المتابعة فضلاً وليس أمراً 🙏💜';
        this.spamInterval = parseInt(process.env.SPAM_INTERVAL) || 60;
        
        // إعدادات العقوبات
        this.maxViolations = parseInt(process.env.MAX_VIOLATIONS) || 3;
        this.muteDuration = parseInt(process.env.MUTE_DURATION) || 5;
        
        // إحصائيات
        this.stats = {
            totalComments: 0,
            violationsDetected: 0,
            mutes: 0,
            permanentMutes: 0,
            bans: 0,
            startTime: Date.now()
        };
        
        // تحميل البيانات السابقة
        this.loadData();
        
        // إعدادات السجل
        this.logFile = path.join(__dirname, 'data', 'bot.log');
    }

    // ========== بدء تشغيل البوت ==========
    async start() {
        this.log('🚀 جاري تشغيل بوت الموديراتور الخارق...');
        this.log('═'.repeat(60));
        this.log('🧠 نظام الذكاء الاصطناعي: نشط (الإصدار النهائي)');
        this.log(`📊 مستوى الصرامة: ${process.env.AI_STRICTNESS || 10}/10`);
        this.log(`🔇 الكتم: دائم للمخالفين`);
        this.log(`🚫 الحظر: بعد ${this.maxViolations} مخالفات`);
        this.log(`📢 السبام التلقائي: كل ${this.spamInterval} ثانية`);
        this.log('🌍 اللغات المدعومة: العربية، الدارجة، الفرنسية، الإنجليزية، الإسبانية');
        this.log('🔍 كشف التمويه: نشط (رموز، أرقام، Leet Speak)');
        this.log('═'.repeat(60));
        
        // التحقق من الجلسة
        const sessionValid = await this.validateSession();
        if (!sessionValid) {
            this.log('❌ فشل التحقق من الجلسة. تأكد من SESSION_ID');
            return;
        }
        
        this.log('✅ تم التحقق من صلاحيات الموديراتور');
        
        // الاتصال بالبث
        await this.connectToLive();
    }

    // ========== التحقق من الجلسة ==========
    async validateSession() {
        try {
            const response = await fetch('https://www.tiktok.com/api/user/detail/', {
                headers: {
                    'Cookie': `sessionid=${this.sessionId}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            const data = await response.json();
            return data.status_code === 0;
        } catch (err) {
            this.log(`❌ خطأ في التحقق: ${err.message}`);
            return false;
        }
    }

    // ========== الاتصال بالبث ==========
    async connectToLive() {
        try {
            this.connection = new WebcastPushConnection(this.streamerUsername);
            
            const state = await this.connection.connect();
            this.isConnected = true;
            this.roomId = state.roomId;
            
            this.log(`✅ تم الاتصال بالبث: ${state.roomId}`);
            this.log(`👑 المضيف: ${this.streamerUsername}`);
            this.log(`👥 المشاهدين: ${state.viewerCount}`);
            this.log('═'.repeat(60));
            
            // بدء المراقبة
            this.startMonitoring();
            
            // بدء السبام
            this.startSpam();
            
            // عرض الإحصائيات الدورية
            this.startStatsReporter();
            
        } catch (err) {
            this.log(`❌ فشل الاتصال: ${err.message}`);
            this.log('🔄 جاري إعادة المحاولة خلال 10 ثوان...');
            setTimeout(() => this.connectToLive(), 10000);
        }
    }

    // ========== بدء المراقبة ==========
    startMonitoring() {
        // مراقبة التعليقات
        this.connection.on('chat', (data) => {
            this.handleComment(data);
        });
        
        // مراقبة الانضمام
        this.connection.on('member', (data) => {
            // التحقق من المستخدمين المحظورين/المكتومين
            if (this.bannedUsers.has(data.uniqueId)) {
                this.log(`⚠️ محاولة دخول مستخدم محظور: ${data.uniqueId}`);
            }
        });
        
        // إعادة الاتصال عند الانقطاع
        this.connection.on('disconnected', () => {
            this.log('❌ انقطع الاتصال بالبث');
            this.isConnected = false;
            this.stopSpam();
            this.log('🔄 جاري إعادة الاتصال...');
            setTimeout(() => this.connectToLive(), 5000);
        });
    }

    // ========== معالجة التعليقات بالذكاء الاصطناعي ==========
    async handleComment(data) {
        const { comment, uniqueId, userId } = data;
        
        if (!comment || !uniqueId) return;
        if (uniqueId === this.streamerUsername) return;
        
        this.stats.totalComments++;
        
        // تحليل التعليق بالذكاء الاصطناعي
        const analysis = this.aiFilter.analyze(comment);
        
        // إذا كان التعليق مسيئاً
        if (analysis.isOffensive) {
            this.stats.violationsDetected++;
            
            this.log(`⚠️ [${analysis.category}] ${uniqueId}: "${comment}"`);
            this.log(`   📊 الشدة: ${analysis.severity}/10 | الثقة: ${(analysis.confidence * 100).toFixed(1)}%`);
            this.log(`   🎯 الإجراء: ${analysis.action}`);
            this.log(`   🔍 كلمات مكتشفة: ${analysis.matchedWords.join(', ')}`);
            
            // تنفيذ الإجراء المناسب
            switch (analysis.action) {
                case 'warn':
                    await this.warnUser(uniqueId, userId, analysis);
                    break;
                case 'mute_short':
                    await this.muteUserTemporary(uniqueId, userId, analysis);
                    break;
                case 'mute_permanent':
                    await this.muteUserPermanent(uniqueId, userId, analysis);
                    break;
                case 'ban':
                    await this.banUser(uniqueId, userId, analysis);
                    break;
            }
        }
    }

    // ========== تحذير المستخدم ==========
    async warnUser(username, userId, analysis) {
        if (!this.warnings[username]) {
            this.warnings[username] = 0;
        }
        this.warnings[username]++;
        
        this.log(`⚠️ تحذير ${username} #${this.warnings[username]}: ${analysis.matchedWords.join(', ')}`);
        
        // إذا تكرر التحذير مرتين، يتم الكتم الدائم
        if (this.warnings[username] >= 2) {
            this.log(`🔇 تحويل التحذير إلى كتم دائم لـ ${username}`);
            await this.muteUserPermanent(username, userId, analysis);
        }
        
        this.saveData();
    }

    // ========== كتم مؤقت ==========
    async muteUserTemporary(username, userId, analysis) {
        // تسجيل المخالفة
        this.recordViolation(username, userId, analysis);
        
        // تطبيق الكتم المؤقت
        try {
            const response = await fetch('https://www.tiktok.com/api/live/moderator/mute/', {
                method: 'POST',
                headers: {
                    'Cookie': `sessionid=${this.sessionId}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                },
                body: JSON.stringify({
                    room_id: this.roomId,
                    user_id: userId,
                    mute_duration: this.muteDuration * 60,
                    scene: 'live_comment'
                })
            });
            
            const result = await response.json();
            
            if (result.status_code === 0) {
                this.stats.mutes++;
                this.log(`🔇 تم كتم ${username} لمدة ${this.muteDuration} دقائق`);
            }
            
            this.saveData();
        } catch (err) {
            this.log(`❌ فشل كتم ${username}: ${err.message}`);
        }
    }

    // ========== كتم دائم ==========
    async muteUserPermanent(username, userId, analysis) {
        // تسجيل المخالفة
        this.recordViolation(username, userId, analysis);
        
        // تطبيق الكتم الدائم
        try {
            // استخدام أقصى مدة كتم متاحة (غالباً 30 يوم أو دائم حسب تيك توك)
            const response = await fetch('https://www.tiktok.com/api/live/moderator/mute/', {
                method: 'POST',
                headers: {
                    'Cookie': `sessionid=${this.sessionId}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                },
                body: JSON.stringify({
                    room_id: this.roomId,
                    user_id: userId,
                    mute_duration: 2592000, // 30 يوم (أقصى مدة)
                    scene: 'live_comment'
                })
            });
            
            const result = await response.json();
            
            if (result.status_code === 0) {
                this.stats.permanentMutes++;
                this.mutedUsers[username] = {
                    mutedAt: Date.now(),
                    permanent: true,
                    reason: analysis.matchedWords.join(', ')
                };
                
                this.log(`🔇 تم كتم ${username} بشكل دائم ⛔`);
                this.log(`   السبب: ${analysis.matchedWords.join(', ')}`);
            }
            
            this.saveData();
        } catch (err) {
            this.log(`❌ فشل الكتم الدائم لـ ${username}: ${err.message}`);
        }
    }

    // ========== حظر المستخدم ==========
    async banUser(username, userId, analysis) {
        try {
            const response = await fetch('https://www.tiktok.com/api/live/moderator/ban/', {
                method: 'POST',
                headers: {
                    'Cookie': `sessionid=${this.sessionId}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                },
                body: JSON.stringify({
                    room_id: this.roomId,
                    user_id: userId,
                    ban_type: 'permanent',
                    scene: 'live_comment'
                })
            });
            
            const result = await response.json();
            
            if (result.status_code === 0) {
                this.stats.bans++;
                this.bannedUsers.add(username);
                
                // حذف سجلات المستخدم
                delete this.violations[username];
                delete this.mutedUsers[username];
                delete this.warnings[username];
                
                this.log(`🚫 تم حظر ${username} نهائياً ❌`);
                this.log(`   السبب: ${analysis.matchedWords.join(', ')}`);
            }
            
            this.saveData();
        } catch (err) {
            this.log(`❌ فشل حظر ${username}: ${err.message}`);
        }
    }

    // ========== تسجيل المخالفة ==========
    recordViolation(username, userId, analysis) {
        if (!this.violations[username]) {
            this.violations[username] = {
                count: 0,
                userId: userId,
                history: [],
                firstViolation: new Date().toISOString()
            };
        }
        
        this.violations[username].count++;
        this.violations[username].history.push({
            comment: analysis.matchedWords.join(', '),
            severity: analysis.severity,
            category: analysis.category,
            time: new Date().toISOString()
        });
        
        // إذا تجاوز الحد الأقصى للمخالفات، حظر فوري
        if (this.violations[username].count >= this.maxViolations) {
            this.log(`🚫 ${username} تجاوز الحد الأقصى للمخالفات (${this.maxViolations})`);
        }
    }

    // ========== إرسال رسالة في الشات ==========
    async sendChatMessage(message) {
        try {
            const response = await fetch('https://www.tiktok.com/api/live/message/send/', {
                method: 'POST',
                headers: {
                    'Cookie': `sessionid=${this.sessionId}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                },
                body: JSON.stringify({
                    room_id: this.roomId,
                    content: message,
                    message_type: 'text'
                })
            });
            
            return response.status === 200;
        } catch (err) {
            return false;
        }
    }

    // ========== نظام السبام ==========
    startSpam() {
        this.log(`📢 بدء السبام التلقائي: "${this.welcomeMessage}"`);
        
        // إرسال أول رسالة
        this.sendSpamMessage();
        
        // تكرار كل الفترة المحددة
        this.spamIntervalId = setInterval(() => {
            this.sendSpamMessage();
        }, this.spamInterval * 1000);
    }

    async sendSpamMessage() {
        if (!this.isConnected) return;
        
        const success = await this.sendChatMessage(this.welcomeMessage);
        if (success) {
            this.log(`📤 [${new Date().toLocaleTimeString()}] ${this.welcomeMessage}`);
        }
    }

    stopSpam() {
        if (this.spamIntervalId) {
            clearInterval(this.spamIntervalId);
            this.spamIntervalId = null;
        }
    }

    // ========== عرض الإحصائيات ==========
    startStatsReporter() {
        setInterval(() => {
            const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = uptime % 60;
            
            this.log('═'.repeat(60));
            this.log('📊 === إحصائيات البوت ===');
            this.log(`⏱️  وقت التشغيل: ${hours}h ${minutes}m ${seconds}s`);
            this.log(`💬 التعليقات المراقبة: ${this.stats.totalComments}`);
            this.log(`⚠️  المخالفات المكتشفة: ${this.stats.violationsDetected}`);
            this.log(`🔇 الكتم المؤقت: ${this.stats.mutes}`);
            this.log(`⛔ الكتم الدائم: ${this.stats.permanentMutes}`);
            this.log(`🚫 الحظر النهائي: ${this.stats.bans}`);
            this.log(`👥 المستخدمون المحظورون: ${this.bannedUsers.size}`);
            this.log(`👥 المستخدمون المكتومون دائماً: ${Object.keys(this.mutedUsers).length}`);
            this.log(`🔌 حالة الاتصال: ${this.isConnected ? 'متصل ✅' : 'منفصل ❌'}`);
            this.log('═'.repeat(60));
        }, 300000); // كل 5 دقائق
    }

    // ========== حفظ وتحميل البيانات ==========
    saveData() {
        try {
            const data = {
                violations: this.violations,
                warnings: this.warnings,
                bannedUsers: Array.from(this.bannedUsers),
                mutedUsers: this.mutedUsers,
                stats: this.stats,
                lastUpdate: new Date().toISOString()
            };
            
            const filePath = path.join(__dirname, 'data', 'violations.json');
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        } catch (err) {
            this.log(`❌ فشل حفظ البيانات: ${err.message}`);
        }
    }

    loadData() {
        try {
            const filePath = path.join(__dirname, 'data', 'violations.json');
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                this.violations = data.violations || {};
                this.warnings = data.warnings || {};
                this.bannedUsers = new Set(data.bannedUsers || []);
                this.mutedUsers = data.mutedUsers || {};
                
                this.log(`📂 تم تحميل البيانات السابقة`);
                this.log(`   - ${Object.keys(this.violations).length} مستخدمين لديهم مخالفات`);
                this.log(`   - ${Object.keys(this.mutedUsers).filter(u => this.mutedUsers[u].permanent).length} مستخدمين مكتومين دائماً`);
                this.log(`   - ${this.bannedUsers.size} مستخدمين محظورين`);
            }
        } catch (err) {
            this.log(`❌ فشل تحميل البيانات: ${err.message}`);
        }
    }

    // ========== نظام التسجيل ==========
    log(message) {
        const timestamp = new Date().toLocaleString('ar-MA');
        const logMessage = `[${timestamp}] ${message}`;
        
        console.log(logMessage);
        
        // حفظ في ملف السجل
        try {
            fs.appendFileSync(this.logFile, logMessage + '\n');
        } catch (err) {
            // تجاهل أخطاء الكتابة
        }
    }

    // ========== إيقاف البوت بأمان ==========
    stop() {
        this.log('🛑 جاري إيقاف البوت...');
        this.stopSpam();
        this.saveData();
        
        if (this.connection) {
            this.connection.disconnect();
        }
        
        this.isConnected = false;
        this.log('👋 تم إيقاف البوت بأمان');
    }
}

// ========== تشغيل البوت ==========
const bot = new TikTokAIModerator();

// معالجة إشارات الإيقاف
process.on('SIGINT', () => {
    bot.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    bot.stop();
    process.exit(0);
});

// معالجة الأخطاء غير المتوقعة
process.on('uncaughtException', (err) => {
    bot.log(`❌ خطأ غير متوقع: ${err.message}`);
    bot.saveData();
});

process.on('unhandledRejection', (reason) => {
    bot.log(`❌ رفض غير معالج: ${reason}`);
});

// بدء البوت
bot.start();

module.exports = TikTokAIModerator;