require('dotenv').config();
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// المتغيرات
const STREAMER = process.env.STREAMER_USERNAME;
const SESSION_ID = process.env.SESSION_ID;
const WELCOME_MSG = process.env.WELCOME_MESSAGE || 'مرحباً بكم! 🌟';
const SPAM_INTERVAL = parseInt(process.env.SPAM_INTERVAL) || 60;

let botStatus = 'stopped';
let botProcess = null;

// صفحة الحالة
app.get('/', (req, res) => {
    res.send(`
        <html dir="rtl">
        <head>
            <title>بوت تيك توك</title>
            <style>
                body { font-family: Arial; background: #111; color: #fff; padding: 20px; text-align: center; }
                .card { background: #222; padding: 20px; border-radius: 10px; margin: 10px; }
                .online { color: #0f0; }
                .offline { color: #f00; }
                button { padding: 10px 20px; margin: 5px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; }
                .start { background: #0a0; color: #fff; }
                .stop { background: #a00; color: #fff; }
                .log { background: #000; color: #0f0; padding: 10px; margin: 10px; text-align: left; max-height: 300px; overflow-y: auto; font-family: monospace; font-size: 12px; }
            </style>
        </head>
        <body>
            <h1>🤖 بوت تيك توك موديراتور</h1>
            <div class="card">
                <p>📡 البث: <strong>${STREAMER}</strong></p>
                <p>الحالة: <span class="${botStatus === 'running' ? 'online' : 'offline'}">${botStatus}</span></p>
                <button class="start" onclick="fetch('/start')">▶️ تشغيل</button>
                <button class="stop" onclick="fetch('/stop')">⏹️ إيقاف</button>
            </div>
            <div class="log" id="log">جاري التحميل...</div>
            <script>
                setInterval(() => {
                    fetch('/status').then(r => r.json()).then(d => {
                        document.querySelector('.card span').textContent = d.status;
                        document.querySelector('.card span').className = d.status === 'running' ? 'online' : 'offline';
                    });
                    fetch('/logs').then(r => r.text()).then(t => {
                        document.getElementById('log').innerHTML = t;
                    });
                }, 3000);
            </script>
        </body>
        </html>
    `);
});

// تشغيل البوت
app.get('/start', (req, res) => {
    if (botStatus === 'running') {
        return res.json({ msg: 'البوت شغال بالفعل' });
    }
    
    console.log('🚀 تشغيل البوت...');
    
    botProcess = exec('node bot.js', {
        env: { ...process.env }
    });
    
    botProcess.stdout.on('data', (data) => {
        console.log(data);
        fs.appendFileSync('logs.txt', data);
    });
    
    botProcess.stderr.on('data', (data) => {
        console.error(data);
        fs.appendFileSync('logs.txt', data);
    });
    
    botStatus = 'running';
    res.json({ msg: 'تم التشغيل' });
});

// إيقاف البوت
app.get('/stop', (req, res) => {
    if (botProcess) {
        botProcess.kill();
        botProcess = null;
    }
    botStatus = 'stopped';
    res.json({ msg: 'تم الإيقاف' });
});

// حالة البوت
app.get('/status', (req, res) => {
    res.json({ status: botStatus });
});

// السجلات
app.get('/logs', (req, res) => {
    try {
        const logs = fs.readFileSync('logs.txt', 'utf8');
        const lines = logs.split('\n').slice(-30).join('<br>');
        res.send(lines || 'لا توجد سجلات');
    } catch (e) {
        res.send('لا توجد سجلات');
    }
});

// فحص الصحة
app.get('/health', (req, res) => {
    res.json({ status: 'ok', bot: botStatus });
});

app.listen(PORT, () => {
    console.log(`🌐 لوحة التحكم: http://localhost:${PORT}`);
    console.log(`📡 البث المستهدف: ${STREAMER}`);
    
    // تشغيل البوت تلقائياً
    setTimeout(() => {
        console.log('🚀 تشغيل تلقائي للبوت...');
        botProcess = exec('node bot.js', {
            env: { ...process.env }
        });
        botStatus = 'running';
        
        botProcess.stdout.on('data', (data) => {
            console.log(data.toString());
            fs.appendFileSync('logs.txt', data.toString());
        });
        
        botProcess.stderr.on('data', (data) => {
            console.error(data.toString());
            fs.appendFileSync('logs.txt', data.toString());
        });
        
        botProcess.on('exit', () => {
            botStatus = 'stopped';
        });
    }, 3000);
});
