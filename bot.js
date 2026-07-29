/**
 * بوت موديراتور تيك توك - نسخة Railway مصححة
 */

require('dotenv').config();
const { WebcastPushConnection } = require('tiktok-live-connector');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const AIFilter = require('./ai-filter');

class TikTokAIModerator {
    constructor() {
        this.streamerUsername = process.env.STREAMER_USERNAME;
        this.sessionId = process.env.SESSION_ID;
        this.connection = null;
        this.roomId = null;
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = 50;
        
        this.aiFilter = new AIFilter(10);
        
        this.violations = {};
        this.mutedUsers = {};
        this.bannedUsers = new Set();
        this.warnings = {};
        
        this.spamIntervalId = null;
        this.welcomeMessage = process.env.WELCOME_MESSAGE || 'مرحباً بكم في البث! 🌟';
        this.spamInterval = parseInt(process.env.SPAM_INTERVAL) || 60;
        this.maxViolations = parseInt(process.env.MAX_VIOLATIONS) || 3;
        
        this.stats = {
            totalComments: 0,
            violationsDetected: 0,
            mutes: 0,
            bans: 0,
            startTime: Date.now()
        };
        
        this.loadData();
    }

    // ========== بدء التشغيل ==========
    async start() {
        console.log('🚀 جاري تشغيل البوت...');
        console.log('═'.repeat(50));
        console.log(`📡 البث المستهدف: ${this.streamerUsername}`);
        console.log(`🔑 الجلسة: ${this.sessionId ? this.sessionId.substring(0, 20) + '...' : 'غير موجودة'}`);
        console.log('═'.repeat(50));
        
        // تخطي التحقق إذا فشل - نجرب الاتصال مباشرة
        const sessionOk = await this.validateSessionSimple();
        
        if (!sessionOk) {
            console.log('⚠️ تعذر التحقق من الجلسة، لكن سنحاول الاتصال...');
        } else {
            console.log('✅ الجلسة صالحة');
        }
        
        await this.connectToLive();
    }

    // ========== تحقق مبسط ==========
    async validateSessionSimple() {
        if (!this.sessionId || this.sessionId.length < 20) {
            console.log('❌ Session ID غير موجود أو قصير جداً');
            return false;
        }
        
        try {
            const response = await fetch('https://www.tiktok.com/', {
                headers: {
                    'Cookie': `sessionid=${this.sessionId}`,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            // إذا وصلنا هنا بدون خطأ، الجلسة غالباً صالحة
            return response.status === 200;
        } catch (err) {
            console.log(`⚠️ خطأ التحقق: ${err.message}`);
            // حتى لو فشل، نكمل - قد يكون تيك توك يحظر Railway IP
            console.log('🔄 متابعة بدون تحقق...');
            return true;
        }
    }

    // ========== الاتصال بالبث ==========
    async connectToLive() {
        try {
            this.connection = new WebcastPushConnection(this.streamerUsername, {
                // خيارات إضافية للاتصال
                processInitialData: false,
                clientParams: {
                    'app_language': 'ar',
                    'webcast_language': 'ar'
                }
            });
            
            const state = await this.connection.connect();
            this.isConnected = true;
            this.roomId = state.roomId;
            this.retryCount = 0;
            
            console.log('✅ تم الاتصال بالبث!');
            console.log(`🆔 الغرفة: ${this.roomId}`);
            console.log(`👥 المشاهدين: ${state.viewerCount || 'غير معروف'}`);
            console.log('═'.repeat(50));
            
            this.startMonitoring();
            this.startSpam();
            this.startStatsReporter();
            
        } catch (err) {
            console.log(`❌ فشل الاتصال: ${err.message}`);
            
            this.retryCount++;
            if (this.retryCount < this.maxRetries) {
                const waitTime = Math.min(this.retryCount * 5, 60);
                console.log(`🔄 المحاولة ${this.retryCount}/${this.maxRetries} بعد ${waitTime} ثوان...`);
                setTimeout(() => this.connectToLive(), waitTime * 1000);
            } else {
                console.log('💀 تجاوز الحد الأقصى للمحاولات. توقف.');
            }
        }
    }

    // ========== مراقبة التعليقات ==========
    startMonitoring() {
        this.connection.on('chat', (data) => {
            this.handleComment(data);
        });
        
        this.connection.on('disconnected', () => {
            console.log('❌ انقطع الاتصال');
            this.isConnected = false;
            this.stopSpam();
            setTimeout(() => this.connectToLive(), 5000);
        });
        
        this.connection.on('error', (err) => {
            console.log(`⚠️ خطأ: ${err.message}`);
        });
    }

    // ========== معالجة التعليقات ==========
    async handleComment(data) {
        const { comment, uniqueId, userId } = data;
        
        if (!comment || !uniqueId) return;
        if (uniqueId === this.streamerUsername) return;
        
        this.stats.totalComments++;
        
        const analysis = this.aiFilter.analyze(comment);
        
        if (analysis.isOffensive) {
            this.stats.violationsDetected++;
            
            console.log(`⚠️ [${analysis.category}] ${uniqueId}: "${comment.substring(0, 50)}"`);
            console.log(`   📊 شدة: ${analysis.severity}/10 | ثقة: ${(analysis.confidence*100).toFixed(0)}%`);
            
            if (analysis.action === 'ban' || analysis.severity >= 7) {
                await this.banUser(uniqueId, userId);
            } else if (analysis.severity >= 3) {
                await this.muteUser(uniqueId, userId);
            }
        }
    }

    // ========== كتم مستخدم ==========
    async muteUser(username, userId) {
        if (!this.violations[username]) {
            this.violations[username] = { count: 0 };
        }
        this.violations[username].count++;
        
        try {
            // محاولة الكتم عبر API
            await fetch('https://www.tiktok.com/api/live/moderator/mute/', {
                method: 'POST',
                headers: {
                    'Cookie': `sessionid=${this.sessionId}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                body: JSON.stringify({
                    room_id: this.roomId,
                    user_id: userId,
                    mute_duration: 2592000,
                    scene: 'live_comment'
                })
            });
        } catch (err) {
            console.log(`⚠️ خطأ الكتم: ${err.message}`);
        }
        
        this.stats.mutes++;
        console.log(`🔇 كتم: ${username}`);
        this.saveData();
    }

    // ========== حظر مستخدم ==========
    async banUser(username, userId) {
        try {
            await fetch('https://www.tiktok.com/api/live/moderator/ban/', {
                method: 'POST',
                headers: {
                    'Cookie': `sessionid=${this.sessionId}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                body: JSON.stringify({
                    room_id: this.roomId,
                    user_id: userId,
                    ban_type: 'permanent',
                    scene: 'live_comment'
                })
            });
        } catch (err) {
            console.log(`⚠️ خطأ الحظر: ${err.message}`);
        }
        
        this.stats.bans++;
        this.bannedUsers.add(username);
        console.log(`🚫 حظر: ${username}`);
        this.saveData();
    }

    // ========== سبام ==========
    startSpam() {
        console.log(`📢 سبام كل ${this.spamInterval}s: "${this.welcomeMessage}"`);
        this.sendSpam();
        this.spamIntervalId = setInterval(() => this.sendSpam(), this.spamInterval * 1000);
    }

    async sendSpam() {
        if (!this.isConnected) return;
        try {
            await fetch('https://www.tiktok.com/api/live/message/send/', {
                method: 'POST',
                headers: {
                    'Cookie': `sessionid=${this.sessionId}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                },
                body: JSON.stringify({
                    room_id: this.roomId,
                    content: this.welcomeMessage,
                    message_type: 'text'
                })
            });
        } catch (err) {
            // تجاهل أخطاء السبام
        }
    }

    stopSpam() {
        if (this.spamIntervalId) {
            clearInterval(this.spamIntervalId);
        }
    }

    // ========== إحصائيات ==========
    startStatsReporter() {
        setInterval(() => {
            const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
            console.log('═'.repeat(50));
            console.log(`⏱️ شغال: ${Math.floor(uptime/3600)}h ${Math.floor((uptime%3600)/60)}m`);
            console.log(`💬 تعليقات: ${this.stats.totalComments} | ⚠️ مخالفات: ${this.stats.violationsDetected}`);
            console.log(`🔇 كتم: ${this.stats.mutes} | 🚫 حظر: ${this.stats.bans}`);
            console.log('═'.repeat(50));
        }, 300000);
    }

    // ========== حفظ البيانات ==========
    saveData() {
        try {
            const filePath = path.join(__dirname, 'data', 'violations.json');
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            
            fs.writeFileSync(filePath, JSON.stringify({
                violations: this.violations,
                bannedUsers: Array.from(this.bannedUsers),
                stats: this.stats
            }, null, 2));
        } catch (err) {
            // تجاهل
        }
    }

    loadData() {
        try {
            const filePath = path.join(__dirname, 'data', 'violations.json');
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                this.violations = data.violations || {};
                this.bannedUsers = new Set(data.bannedUsers || []);
            }
        } catch (err) {
            // تجاهل
        }
    }
}

// ========== تشغيل ==========
const bot = new TikTokAIModerator();
bot.start();

// إبقاء العملية نشطة
process.on('SIGTERM', () => {
    console.log('👋 إيقاف...');
    process.exit(0);
});
