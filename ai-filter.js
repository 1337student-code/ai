/**
 * نظام الذكاء الاصطناعي المتقدم لكشف السب والشتم
 * يدعم: العربية، الدارجة، الفرنسية، الإنجليزية، الإسبانية، الرموز المموهة
 * مع كشف الكلمات المستبدلة بالأرقام مثل 9wd = قwd = قود
 */

class AIFilter {
    constructor(strictness = 8) {
        this.strictness = strictness;
        this.initializeAIModels();
    }

    initializeAIModels() {
        // ========== جدول تحويل الأرقام إلى أحرف ==========
        this.leetMap = {
            '0': ['o', '0', 'و', 'ؤ'],
            '1': ['i', 'l', '1', '!', '|'],
            '2': ['z', '2', 'ز'],
            '3': ['e', '3', 'ع', 'غ'],
            '4': ['a', '4', 'أ', 'إ', 'آ'],
            '5': ['s', '5', 'س', 'ص'],
            '6': ['b', '6', 'ب'],
            '7': ['t', '7', 'ت', 'ط'],
            '8': ['b', '8', 'ب', 'ق'],
            '9': ['g', 'q', '9', 'ق', 'ك', 'ڭ'],
            '@': ['a', '@', 'أ'],
            '$': ['s', '$', 'س'],
            '+': ['t', '+', 'ت'],
            '×': ['x', '×'],
            '✓': ['v', '✓']
        };

        // ========== قاعدة بيانات الكلمات المسيئة الموسعة ==========
        this.offensivePatterns = {
            // ===== الألفاظ الصريحة بجميع اللغات =====
            explicit_global: [
                // عربية فصحى
                'كس', 'طيز', 'زب', 'شرموط', 'قحبة', 'عاهرة', 'منيوك',
                'خنزير', 'كلب', 'حمار', 'بغل', 'زامل', 'لوطي', 'ديوث',
                'زبالة', 'وسخ', 'قذر', 'نجس', 'حقير', 'خسيس', 'لئيم',
                'سافل', 'واطي', 'منحط', 'بائس', 'تافه', 'ساقط', 'فاجر',
                'فاسق', 'زاني', 'داعر', 'ماجن', 'خليع', 'منحل', 'منحرف',
                
                // فرنسية
                'pute', 'putain', 'salope', 'connard', 'connasse',
                'enculé', 'enculer', 'bâtard', 'salaud', 'salopard',
                'merde', 'chier', 'foutre', 'bite', 'couilles',
                'branleur', 'branleuse', 'suceur', 'suceuse', 'pd',
                'tarlouze', 'gouine', 'nique', 'niquer', 'baise',
                'baiser', 'cul', 'chatte', 'queue', 'fils de pute',
                'fdp', 'ntm', 'tg', 'ferme ta gueule', 'ta gueule',
                'va te faire', 'vas te faire', 'mange tes morts',
                
                // إنجليزية
                'fuck', 'fucking', 'fucker', 'motherfucker', 'mf',
                'shit', 'bullshit', 'bitch', 'son of a bitch', 'soab',
                'ass', 'asshole', 'dick', 'dickhead', 'cock',
                'cunt', 'whore', 'slut', 'bastard', 'pussy',
                'douchebag', 'douche', 'retard', 'retarded', 'idiot',
                'stupid', 'dumbass', 'dumb', 'moron', 'imbecile',
                'jerk', 'loser', 'scum', 'trash', 'garbage',
                'kill yourself', 'kys', 'go die', 'drop dead',
                'piece of shit', 'pos', 'wtf', 'stfu',
                
                // إسبانية
                'puta', 'puto', 'mierda', 'joder', 'coño',
                'cabrón', 'cabrona', 'pendejo', 'pendeja', 'gilipollas',
                'imbécil', 'idiota', 'estúpido', 'estúpida', 'maricón',
                'marica', 'zorra', 'perra', 'malparido', 'hijo de puta',
                'hdp', 'chinga', 'chingar', 'verga', 'carajo',
                'vete a la mierda', 'que te jodan', 'come mierda',
                
                // إيطالية
                'stronzo', 'stronza', 'cazzo', 'merda', 'puttana',
                'vaffanculo', 'fanculo', 'coglione', 'cretino', 'idiota',
                'deficiente', 'imbecille', 'scemo', 'sfigato', 'cornuto'
            ],

            // ===== الدارجة المغربية (الألفاظ الصريحة) =====
            darija_explicit: [
                // الألفاظ الأساسية
                'زامل', 'قحاب', 'شرامط', 'عواهر', 'منيوكين',
                'ولاد لقحاب', 'ولاد الحرام', 'ولاد الزانية',
                'بنت لقحبة', 'ولد لقحبة', 'قواد', 'قادة',
                'شرموطة', 'شراميط', 'قحبة', 'قحبات',
                
                // الأوامر المهينة
                'سير تقود', 'سير تزامل', 'سير تشوف', 'سير تنعل',
                'سير تخرا', 'سير تبحبح', 'سير تخمم', 'سير تفرج',
                'برا تقود', 'برا تزامل', 'غبر تقود', 'غبر تزامل',
                
                // اللعن والدعاء
                'الله ينعل', 'لعن الله', 'يلعن', 'منعول',
                'الله لا يردك', 'الله ياخدك', 'الله يلعنك',
                'يلعن جدك', 'يلعن والديك', 'يلعن راسك',
                'في ستين نعل', 'في ستين ألف نعل',
                'نعل الدين', 'نعل الرب', 'نعل الإيمان',
                
                // الحيوانات كشتائم
                'الخنز', 'لكلب', 'لبغل', 'الحمار', 'الزامل',
                'الحلوف', 'البهايم', 'الأنعام', 'السباع', 'الكلاب',
                'ولاد الكلاب', 'بنات الكلاب', 'الخنازير', 'القرود',
                'ولاد القرود', 'وجه القرد', 'وجه الخنزير', 'وجه الكلب',
                'الكلبة', 'الخنزيرة', 'البغلة', 'الحمارة',
                
                // الشتائم المركبة
                'خايبة', 'خيييب', 'خايبة واعر', 'خايبة بزاف',
                'خايب الساس', 'خايب الأصل', 'خايبة الفعلة',
                'مخنث', 'مشوه', 'مسخ', 'خنفوش', 'خنونة',
                'بومبة', 'شكارة', 'صرماية', 'كريسة',
                
                // الإهانات الاجتماعية
                'مسكين', 'فقير', 'معدم', 'محتاج', 'متسول',
                'شحاد', 'حرامي', 'سارق', 'نصاب', 'غشاش',
                'كداب', 'كذوب', 'بلياتي', 'شقاوة', 'مشهج',
                
                // الشتائم الجنسية
                'نايك', 'متناك', 'نييييك', 'تنايك', 'نايكين',
                'كسك', 'كسمك', 'كس أمك', 'كس اختك', 'كس ختك',
                'طبون', 'طيز', 'طيزك', 'طيز اختك', 'طيز ختك',
                'زبي', 'زوبري', 'زوبريك', 'ديك', 'قضيب',
                
                // الألفاظ بالفرنسية المغربية
                'fuck', 'fucker', 'nike', 'niker', 'baise',
                'baiser', 'bite', 'couille', 'couillon', 'connard',
                'salope', 'salaud', 'enculer', 'encule', 'enculé',
                'merde', 'merder', 'fait chier', 'ta gueule', 'tg',
                
                // التهديدات بالدارجة
                'غادي نقتلك', 'غادي نذبحك', 'غادي نضربك',
                'غادي نسلخك', 'غادي نعورك', 'غادي نهرسك',
                'غادي نكسرك', 'غادي ندمرك', 'غادي نخربك',
                'غادي نفشخك', 'غادي نفضحك', 'غادي نحرقك',
                'نشوفك فالشوماج', 'نشوفك برا', 'نتلاقاو برا',
                'راه غادي نجي ليك', 'راه غادي نوقع ليك',
                'غادي نحرق ليك الدار', 'غادي نخليك تتمنى الموت',
                
                // الكلمات المستبدلة بالأرقام (Leet Speak)
                '9wd', '9wad', '9weda', '9awad', '9wwd',
                '9hb', '9hab', '9ahba', '9hba', '9ahbat',
                'chrmo9a', 'charmo9a', 'charmo9', 'chrmo9',
                'zaml', 'zamel', 'zmala', 'zamala',
                'mnok', 'manok', 'mniok', 'mnio9', 'mni9',
                'lbghl', 'lbghal', 'l7mar', 'l7mor', 'l9lob',
                'l9rd', 'l9rod', 'l5nzir', 'l5nazr', 'l5nz',
                'l3ahra', 'l3ahr', 'l3ahrat', '3ahra', '3hr',
                'srb', 'srbk', 'srbha', 'srbo', 'srabo',
                '9ssk', '9ss', '9ssk', '9ssha', '9sso',
                'tzbk', 'tzbi', 'tzbo', 'tzba', 'tzobrk',
                '7mar', '7mor', '7mara', '7mir', '7mirat',
                '5nz', '5nzir', '5nazr', '5nzira', '5nzirat',
                'klb', 'klab', 'klba', 'klbat', 'kalb',
                
                // الرموز المموهة الشائعة
                '9*wd', '9*w*d', '9 w d', '9-w-d', '9.w.d',
                'q*wd', 'q*w*d', 'q w d', 'q-w-d', 'q.w.d',
                '9*hb', '9*h*b', '9 h b', '9-h-b', '9.h.b',
                'q*hb', 'q*h*b', 'q h b', 'q-h-b', 'q.h.b',
                '7*m*r', '7*m*a*r', '7 m r', '7-m-r', '7.m.r',
                '5*n*z', '5*n*z*r', '5 n z', '5-n-z', '5.n.z',
                'k*l*b', 'k*l*b', 'k l b', 'k-l-b', 'k.l.b',
                'n*k', 'n*k', 'n y k', 'n-y-k', 'n.y.k',
                'm*t*n*k', 'm*t*n*k', 'm t n k', 'm-t-n-k',
                't*z', 't*z', 't y z', 't-y-z', 't.y.z',
                's*r*b', 's*r*b', 's r b', 's-r-b', 's.r.b',
                
                // الكلمات المستبدلة بالأحرف المقلوبة
                '9w3d', '9w3d', 'qw3d', 'gw3d', '9ou3d',
                '9ahb3', '9ahb3t', 'qahb3', 'qahb3t',
                'charmo93', 'charmo93a', 'charmo93at',
                'z3ml', 'z3aml', 'z3amla', 'z3aml',
                'm3nok', 'm3niok', 'm3nok', 'm3ni9',
                'l3hr', 'l3hra', 'l3ahra', 'l3ahrat',
                'l93d', 'l9wad', 'l9weda', 'l9awad',
                's3rb', 's3rab', 's3rbo', 's3rabi',
                '7m3r', '7m3ra', '7m3rat', '7m3r',
                '5n3z', '5n3zr', '5n3zra', '5n3zrat',
                'kl3b', 'kl3b', 'kl3ba', 'kl3bat'
            ],

            // ===== الشتائم المركبة بالسياق =====
            compound_global: [
                // هجاء الأم
                'أمك قحبة', 'أمك زانية', 'أمك عاهرة', 'أمك شرموطة',
                'أمك فاجرة', 'أمك ساقطة', 'أمك منحلة', 'أمك فاسدة',
                'أمك فالزنقة', 'أمك فالشارع', 'أمك معروفة',
                'your mom', 'your mother', 'yo mama', 'ur mom',
                'ta mère', 'ta daronne', 'ta reum', 'ta maman',
                'tu madre', 'su madre', 'la puta de tu madre',
                
                // هجاء الأب
                'أبوك خنزير', 'أبوك حمار', 'أبوك كلب', 'أبوك ديوث',
                'أبوك زامل', 'أبوك قواد', 'أبوك فاسد', 'أبوك سافل',
                'your dad', 'your father', 'ur dad', 'ton père',
                
                // هجاء الأخت
                'أختك قحبة', 'أختك عاهرة', 'أختك شرموطة', 'أختك زانية',
                'your sister', 'ur sister', 'ta soeur', 'ta frangine',
                
                // هجاء العائلة كاملة
                'عائلتك كلها', 'عائلتك فاسدة', 'أصلك فاسد', 'أصلك وسخ',
                'عائلتك وسخة', 'أصلك خايب', 'أصلك مشوه',
                'your whole family', 'your entire family',
                'toute ta famille', 'toute ta race',
                
                // الشتائم الدينية والعرقية
                'كافر', 'ملحد', 'زنديق', 'مرتد', 'منافق',
                'يهودي', 'نصراني', 'بوذي', 'هندوسي',
                'عبد', 'خادم', 'خديم', 'خديمة', 'وصيف',
                'زنجي', 'عزي', 'كحل', 'قمبري', 'صنهاجي',
                'روفي', 'فاسي', 'مراكشي', 'سوسي', 'جبلي',
                'عروبي', 'شلح', 'بربري', 'رامي', 'قروي',
                'nigger', 'nigga', 'negro', 'chink', 'spic',
                'kike', 'gook', 'wetback', 'sand nigger',
                'sale arabe', 'sale noir', 'sale juif', 'sale blanc'
            ],

            // ===== التهديدات بجميع اللغات =====
            threats_global: [
                // عربية
                'نقتلك', 'نذبحك', 'نسلخك', 'نعورك', 'نضربك',
                'نهرسك', 'نكسرك', 'ندمرك', 'نخربك', 'نفشخك',
                'نفضحك', 'نحرقك', 'نعدمك', 'نقضي عليك',
                'سوف أقتلك', 'سأذبحك', 'سأنتقم منك', 'سأدمرك',
                
                // إنجليزية
                'i will kill you', 'gonna kill you', 'kill u',
                'i will murder you', 'i will destroy you',
                'i will end you', 'i will hurt you', 'watch your back',
                'you are dead', 'youre dead', 'ur dead', 'you dead',
                'sleep with one eye open', 'im coming for you',
                
                // فرنسية
                'je vais te tuer', 'je vais te buter', 'je vais te niquer',
                'je vais te détruire', 'je vais te faire la peau',
                'je vais te crever', 'je vais te défoncer',
                'tu vas mourir', 'tu es mort', 't mort', 't es mort'
            ],

            // ===== التحرش والمضايقات =====
            harassment: [
                'تعالي خاص', 'تعالي نديرو شي حاجة', 'بغيتك', 'بغيت نكلمك',
                'عطيني نمرتك', 'عطيني واتساب', 'عطيني فيسبوك',
                'فين ساكنة', 'فين كاينة', 'شنو كاتديري', 'شنو كاتسناي',
                'واش مزال', 'واش باقي', 'زعمة خاص', 'زعمة كاتعرف',
                'come private', 'dm me', 'send me', 'show me',
                'viens privé', 'vien pv', 'montre moi', 'envoie moi'
            ]
        };

        // ========== أنماط التعرف على السياق ==========
        this.contextPatterns = [
            // تحليل النبرة العدائية
            { pattern: /(يا|أيها|ياك|ياك)\s*(حيوان|بهيمة|مجرم|سافل|حقير|خسيس)/gi, weight: 0.8 },
            { pattern: /(سير|روح|امش|برا|غبر|دبر|طير|تقلع)\s*(تقود|تشوف|تزامل|تنعل|تخرا|تبحبح)/gi, weight: 0.9 },
            
            // أسئلة استفزازية بالدارجة
            { pattern: /(واش|هل|كاتضن|كاتحسب|زعمة)\s*(نتا|نتي|نتما|نتوما)\s*(قحبة|شرموط|زامل|قواد|خايب)/gi, weight: 0.95 },
            { pattern: /(واش|هل)\s*(كاتشوف|كاتضن)\s*(راسك|نفسك)\s*(شي|شحال|قداش)/gi, weight: 0.7 },
            
            // صيغ الأمر المهينة بجميع اللغات
            { pattern: /(اخرس|اسكت|سكت|بلع|سد)\s*(يا|أيها)\s*(كلب|حمار|خنزير|قرد)/gi, weight: 0.85 },
            { pattern: /(shut|stfu|shut up|shut the fuck|ferme|ferme ta|ta gueule)\s*(you|u|ur|your|toi)/gi, weight: 0.85 },
            
            // الدعاء السلبي
            { pattern: /(الله|ربي|الرب|الإله)\s*(يلعن|ينعل|ياخد|لا يرد|يلعن)\s*(ك|كم|كِ|ها|ها|هم)/gi, weight: 0.9 },
            { pattern: /يلعن\s*(رب|الله|الدين|الإيمان|جد|والدين)\s*(ك|كم|كِ)/gi, weight: 0.95 },
            
            // التهديد بالعنف بجميع اللغات
            { pattern: /(غادي|راه|باش|حاشاك|هادي|هادا)\s*(نقتل|نذبح|نضرب|نعور|نهرس|نكسر)/gi, weight: 0.95 },
            { pattern: /(i|i will|im gonna|im going to|gonna)\s*(kill|murder|hurt|destroy|end|fuck)\s*(you|u)/gi, weight: 0.95 },
            { pattern: /(je|j')\s*(vais|va)\s*(te|t'|vous)\s*(tuer|buter|niquer|détruire|crever|défoncer)/gi, weight: 0.95 },
            
            // الإهانات المركبة
            { pattern: /(وجه|راس|شكل|هيئة|خلقة)\s*(الكلب|الحمار|الخنزير|القرد|البغل|الحلوف)/gi, weight: 0.8 },
            { pattern: /(you|u|ur|you're|youre)\s*(are|r)\s*(a|an|such a)\s*(bitch|asshole|dick|cunt|bastard|idiot|moron|loser)/gi, weight: 0.9 },
            { pattern: /(t'es|tu es|vous êtes)\s*(un|une|qu'un|qu'une)\s*(con|connard|connasse|salope|salaud|bâtard|enculé)/gi, weight: 0.9 },
            
            // التمني بالسوء
            { pattern: /(الله|ربي)\s*(يرد|يجيب|يعطي|يهدي)\s*(ك|ها|هم)\s*(الموت|المرض|الفقر|العار|البلا|المصيبة)/gi, weight: 0.8 },
            { pattern: /(i hope|hope|wish)\s*(you|u)\s*(die|suffer|get|have)\s*(cancer|aids|dead|hurt)/gi, weight: 0.9 },
            { pattern: /(j'espère|je souhaite)\s*(que|qu')\s*(tu|vous)\s*(meurs|crève|souffre)/gi, weight: 0.9 },
            
            // النبذ والإقصاء
            { pattern: /(اخرج|اطلع|برا|غبر|دبر|روح)\s*(من|من|مل)\s*(البث|اللايف|الغرفة|هنا|هاد)/gi, weight: 0.7 },
            { pattern: /(get|go|get out|leave|fuck off|piss off)\s*(of|from|out of)\s*(here|this|the|our)\s*(stream|live|room|chat)/gi, weight: 0.8 },
            { pattern: /(sors|sort|dégage|casse toi|barre toi|tire toi)\s*(de|du|d')\s*(ici|ce live|ce stream|ce chat)/gi, weight: 0.8 },
            
            // الإهانات العنصرية
            { pattern: /(يا|أيها|هاد|هذا|هذه)\s*(العبد|الخادم|الخديم|الزنجي|العزي|الكحل)/gi, weight: 0.95 },
            { pattern: /(you|u)\s*(fucking|fuckin|fuck|dirty|stupid)\s*(nigger|nigga|negro|chink|spic|kike|gook|wetback)/gi, weight: 1.0 },
            { pattern: /(sale|sales|foutu|foutus|putain de|putain d')\s*(arabe|noir|blanc|juif|chinois|nègre|bicot|bougnoule|négro)/gi, weight: 1.0 },
            
            // التحرش الإلكتروني
            { pattern: /(عطيني|هات|مدلي|صيفطلي|ابعثلي)\s*(نمرتك|رقمك|وتسابك|انستا|سناب|فايسبوك|ديسكورد)/gi, weight: 0.6 },
            { pattern: /(تعالي|اجي|سيري|روحي)\s*(خاص|برايفي|برايفيت|خاصك|بغيتك|بغيت)/gi, weight: 0.7 },
            { pattern: /(send|give|show|tell)\s*(me|us)\s*(your|ur|the)\s*(number|snap|insta|discord|address|location)/gi, weight: 0.7 }
        ];

        // ========== قائمة الاستثناءات ==========
        this.whitelist = [
            // كلمات عربية عادية قد تشبه السب
            'كسوف', 'كسول', 'كسوة', 'كسب', 'كسرة', 'كسكسي',
            'حمار الوحش', 'حمار القبان', 'كلب البحر', 'كلب الصيد',
            'بنات', 'أخت', 'أم', 'أب', 'خال', 'عم',
            'وجهة نظر', 'وجهة', 'رسالة', 'كسوة العيد',
            
            // كلمات أجنبية عادية
            'assassin', 'assassinate', 'assassination', 'associate',
            'assistant', 'assistance', 'assemble', 'assembly',
            'cocker spaniel', 'cocker', 'cocktail', 'cockroach',
            'dickens', 'dickinson', 'dictionary', 'dictate',
            
            // سياقات عادية بالفرنسية
            'baiser' // بمعنى قبلة في سياقات معينة
        ];
    }

    /**
     * تحليل الرسالة بالذكاء الاصطناعي المتقدم
     * @param {string} message - الرسالة المراد تحليلها
     * @returns {Object} نتيجة التحليل المفصل
     */
    analyze(message) {
        const result = {
            isOffensive: false,
            severity: 0,
            category: null,
            categories: [],
            matchedWords: [],
            action: 'allow',
            confidence: 0,
            language: 'unknown',
            details: {}
        };

        if (!message || typeof message !== 'string') {
            return result;
        }

        // تنظيف وتحضير النص
        const cleanedMessage = this.cleanMessage(message);
        const originalMessage = message.toLowerCase();
        const decodedMessage = this.decodeLeetSpeak(originalMessage);
        
        // تحديد اللغة
        result.language = this.detectLanguage(originalMessage);

        // 1. فحص الكلمات الصريحة
        this.checkExplicitWords(originalMessage, cleanedMessage, decodedMessage, result);

        // 2. فحص الأنماط المركبة
        this.checkCompoundPatterns(originalMessage, cleanedMessage, decodedMessage, result);

        // 3. فحص الكلمات المموهة والمستبدلة
        this.checkCamouflagedWords(originalMessage, cleanedMessage, decodedMessage, result);

        // 4. تحليل السياق والنبرة
        this.analyzeContext(originalMessage, cleanedMessage, result);

        // 5. تحليل المشاعر والعدوانية
        this.analyzeSentiment(originalMessage, result);

        // 6. حساب الشدة النهائية مع مراعاة كل العوامل
        this.calculateFinalSeverity(result);

        // 7. تحديد الإجراء المناسب
        this.determineAction(result);

        return result;
    }

    /**
     * فك تشفير Leet Speak
     */
    decodeLeetSpeak(text) {
        let decoded = text.toLowerCase();
        
        // استبدال الأرقام والرموز بالأحرف المقابلة
        for (const [leet, letters] of Object.entries(this.leetMap)) {
            for (const letter of letters) {
                const regex = new RegExp(`\\${leet}`, 'gi');
                decoded = decoded.replace(regex, letter);
            }
        }
        
        return decoded;
    }

    /**
     * تحديد لغة النص
     */
    detectLanguage(text) {
        const patterns = {
            arabic: /[\u0600-\u06FF]/,
            french: /[àâçéèêëîïôûùüÿœæ]/i,
            english: /^[a-z\s]+$/i,
            mixed: /[\u0600-\u06FF].*[a-z]|[a-z].*[\u0600-\u06FF]/i
        };

        if (patterns.arabic.test(text) && patterns.mixed.test(text)) {
            return 'mixed_arabic_latin';
        } else if (patterns.arabic.test(text)) {
            return 'arabic';
        } else if (patterns.french.test(text)) {
            return 'french';
        } else if (patterns.english.test(text)) {
            return 'english';
        }
        
        return 'unknown';
    }

    /**
     * تنظيف النص من الرموز والزخارف
     */
    cleanMessage(message) {
        let cleaned = message
            // إزالة الزخارف العربية
            .replace(/[\u{0600}-\u{06FF}]{0,}[\u{064B}-\u{065F}]/gu, '')
            // توحيد المسافات
            .replace(/\s+/g, ' ')
            // إزالة التكرار المبالغ فيه للأحرف
            .replace(/(.)\1{4,}/g, '$1$1$1')
            // إزالة الرموز الخاصة والزخارف
            .replace(/[★☆✦✧✩✪✫✬✭✮✯✰✨🌟💫⭐]/g, '')
            // إزالة الرموز التعبيرية
            .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
            // إزالة المسافات المتعددة
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        
        // فك التشفير
        cleaned = this.decodeLeetSpeak(cleaned);
        
        return cleaned;
    }

    /**
     * فحص الكلمات الصريحة في النصوص المتعددة
     */
    checkExplicitWords(original, cleaned, decoded, result) {
        const textsToCheck = [
            { text: original, weight: 1.0, source: 'original' },
            { text: cleaned, weight: 0.9, source: 'cleaned' },
            { text: decoded, weight: 0.8, source: 'decoded' }
        ];

        const allCategories = [
            'explicit_global', 'darija_explicit', 'compound_global',
            'threats_global', 'harassment'
        ];

        for (const { text, weight, source } of textsToCheck) {
            for (const category of allCategories) {
                if (!this.offensivePatterns[category]) continue;
                
                for (const word of this.offensivePatterns[category]) {
                    // فحص الكلمة في النص
                    if (text.includes(word.toLowerCase())) {
                        // التأكد من أنها ليست في القائمة البيضاء
                        if (!this.isWhitelisted(original, word)) {
                            result.isOffensive = true;
                            
                            // إضافة الكلمة مع مصدر اكتشافها
                            const wordEntry = `${word} [${source}]`;
                            if (!result.matchedWords.includes(wordEntry)) {
                                result.matchedWords.push(wordEntry);
                            }
                            
                            // إضافة الفئة
                            if (!result.categories.includes(category)) {
                                result.categories.push(category);
                            }
                            
                            // تحديد الفئة الرئيسية
                            if (!result.category || 
                                this.getSeverityForCategory(category) > this.getSeverityForCategory(result.category)) {
                                result.category = category;
                            }
                            
                            // إضافة الشدة
                            result.severity += this.getSeverityForCategory(category) * weight;
                            result.confidence += 0.9 * weight;
                        }
                    }
                    
                    // فحص الكلمة كجزء من كلمة أخرى (للتعبيرات المركبة)
                    const wordParts = text.split(/\s+/);
                    for (const part of wordParts) {
                        if (part.length >= word.length - 1 && 
                            this.calculateSimilarity(part, word.toLowerCase()) > 0.9) {
                            if (!this.isWhitelisted(original, word)) {
                                result.isOffensive = true;
                                const wordEntry = `${word} ≈ ${part} [${source}]`;
                                if (!result.matchedWords.includes(wordEntry)) {
                                    result.matchedWords.push(wordEntry);
                                }
                                result.severity += this.getSeverityForCategory(category) * weight * 0.8;
                                result.confidence += 0.7 * weight;
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * فحص الأنماط المركبة مع دعم Leet Speak
     */
    checkCompoundPatterns(original, cleaned, decoded, result) {
        const textsToCheck = [original, cleaned, decoded];
        
        for (const text of textsToCheck) {
            for (const { pattern, weight } of this.contextPatterns) {
                const matches = text.match(pattern);
                if (matches) {
                    result.isOffensive = true;
                    if (!result.matchedWords.includes(matches[0])) {
                        result.matchedWords.push(matches[0]);
                    }
                    result.severity += weight * 8;
                    result.confidence += weight;
                    if (!result.category || weight > 0.9) {
                        result.category = 'compound';
                    }
                    if (!result.categories.includes('compound')) {
                        result.categories.push('compound');
                    }
                }
            }
        }
    }

    /**
     * فحص الكلمات المموهة - نسخة متطورة
     */
    checkCamouflagedWords(original, cleaned, decoded, result) {
        // 1. كشف التمويه بالرموز
        const camouflageDetected = this.detectCamouflage(original) || 
                                  this.detectCamouflage(cleaned) ||
                                  this.detectCamouflage(decoded);
        
        if (camouflageDetected) {
            result.isOffensive = true;
            result.matchedWords.push('*** كلمة مموهة بالرموز ***');
            result.severity += 7;
            result.confidence += 0.7;
            if (!result.categories.includes('camouflaged')) {
                result.categories.push('camouflaged');
            }
            if (!result.category) {
                result.category = 'camouflaged';
            }
        }

        // 2. فحص Leet Speak بشكل خاص
        if (this.detectLeetSpeak(original)) {
            result.isOffensive = true;
            result.matchedWords.push('*** Leet Speak مكتشف ***');
            result.severity += 8;
            result.confidence += 0.8;
            if (!result.categories.includes('leet_speak')) {
                result.categories.push('leet_speak');
            }
        }

        // 3. فحص تشابه الكلمات مع القائمة السوداء
        const words = cleaned.split(/\s+/);
        for (const word of words) {
            if (word.length < 3) continue;
            
            for (const category of Object.keys(this.offensivePatterns)) {
                if (category === 'camouflaged') continue;
                
                for (const badWord of this.offensivePatterns[category]) {
                    if (badWord.length < 3) continue;
                    
                    const similarity = this.calculateSimilarity(word, badWord.toLowerCase());
                    if (similarity > 0.85) {
                        result.isOffensive = true;
                        const wordEntry = `${word} ≈ ${badWord} (تشابه ${(similarity * 100).toFixed(0)}%)`;
                        if (!result.matchedWords.includes(wordEntry)) {
                            result.matchedWords.push(wordEntry);
                        }
                        result.severity += similarity * 6;
                        result.confidence += similarity * 0.7;
                        if (!result.categories.includes(category)) {
                            result.categories.push(category);
                        }
                    }
                }
            }
        }
    }

    /**
     * كشف Leet Speak المتقدم
     */
    detectLeetSpeak(text) {
        // فحص وجود أرقام مختلطة مع أحرف (علامة على Leet Speak)
        const hasMixedChars = /[0-9].*[a-zA-Z]|[a-zA-Z].*[0-9]/.test(text);
        if (!hasMixedChars) return false;
        
        // فك التشفير
        const decoded = this.decodeLeetSpeak(text);
        
        // فحص الكلمات التي تم فك تشفيرها
        const words = decoded.split(/\s+/);
        for (const word of words) {
            if (word.length < 3) continue;
            
            for (const category of Object.keys(this.offensivePatterns)) {
                if (['camouflaged', 'leet_speak'].includes(category)) continue;
                
                for (const badWord of this.offensivePatterns[category]) {
                    if (badWord.length < 3) continue;
                    
                    if (word.includes(badWord.toLowerCase()) ||
                        this.calculateSimilarity(word, badWord.toLowerCase()) > 0.9) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    /**
     * كشف التمويه بالرموز - نسخة شاملة
     */
    detectCamouflage(text) {
        // أنماط التمويه الموسعة
        const camouflagePatterns = [
            // التمويه بالنجوم والنقاط والشرطات
            /[كڭڳڴڬڮڰڱکڪګڭڮڰڱک9qg]{1,3}[*\-.•\s_]{0,4}[سصښڝڞڟڠ5]{1,3}[*\-.•\s_]{0,4}[م]{1,3}/i,
            /[طظڟ7]{1,3}[*\-.•\s_]{0,4}[يىېۍێېۑ]{1,3}[*\-.•\s_]{0,4}[ز]{1,3}/i,
            /[ش]{1,3}[*\-.•\s_]{0,4}[ر]{1,3}[*\-.•\s_]{0,4}[مط]{1,3}[*\-.•\s_]{0,4}[و]{0,3}[*\-.•\s_]{0,4}[ط]{1,3}/i,
            /[قڧڨ9qg]{1,3}[*\-.•\s_]{0,4}[ح]{1,3}[*\-.•\s_]{0,4}[ب]{1,3}/i,
            /[ن]{1,3}[*\-.•\s_]{0,4}[يىېۍێېۑ]{1,3}[*\-.•\s_]{0,4}[کك]{1,3}/i,
            /[ح7]{1,3}[*\-.•\s_]{0,4}[مم]{1,3}[*\-.•\s_]{0,4}[ار]{1,3}/i,
            /[كڭ9qg]{1,3}[*\-.•\s_]{0,4}[ل]{1,3}[*\-.•\s_]{0,4}[ب]{1,3}/i,
            /[خ5]{1,3}[*\-.•\s_]{0,4}[ن]{1,3}[*\-.•\s_]{0,4}[ز]{1,3}[*\-.•\s_]{0,4}[يى]{1,3}[*\-.•\s_]{0,4}[ر]{1,3}/i,
            /[د]{1,3}[*\-.•\s_]{0,4}[يى]{1,3}[*\-.•\s_]{0,4}[و]{1,3}[*\-.•\s_]{0,4}[ث]{1,3}/i,
            /[ز]{1,3}[*\-.•\s_]{0,4}[ا]{0,3}[*\-.•\s_]{0,4}[م]{1,3}[*\-.•\s_]{0,4}[ل]{1,3}/i,
            /[ق9qg]{1,3}[*\-.•\s_]{0,4}[و]{0,3}[*\-.•\s_]{0,4}[د]{1,3}/i,
            /[فf]{1,3}[*\-.•\s_]{0,4}[و]{0,3}[*\-.•\s_]{0,4}[كك]{1,3}/i,
            /[بb6]{1,3}[*\-.•\s_]{0,4}[يى]{1,3}[*\-.•\s_]{0,4}[ت]{1,3}[*\-.•\s_]{0,4}[ش]{1,3}/i,
            /[مm]{1,3}[*\-.•\s_]{0,4}[و]{0,3}[*\-.•\s_]{0,4}[ذ]{1,3}[*\-.•\s_]{0,4}[ر]{1,3}[*\-.•\s_]{0,4}[ف]{1,3}[*\-.•\s_]{0,4}[ك]{1,3}[*\-.•\s_]{0,4}[ر]{1,3}/i,
            /[سs5]{1,3}[*\-.•\s_]{0,4}[ل]{1,3}[*\-.•\s_]{0,4}[و]{0,3}[*\-.•\s_]{0,4}[ت]{1,3}/i,
            /[وw]{1,3}[*\-.•\s_]{0,4}[و]{0,3}[*\-.•\s_]{0,4}[ر]{1,3}[*\-.•\s_]{0,4}[ي]{1,3}[*\-.•\s_]{0,4}[س]{1,3}/i,
            
            // أنماط إنجليزية وفرنسية مموهة
            /[f]{1,3}[*\-.•\s_]{0,4}[u]{1,3}[*\-.•\s_]{0,4}[c]{1,3}[*\-.•\s_]{0,4}[k]{1,3}/i,
            /[s]{1,3}[*\-.•\s_]{0,4}[h]{1,3}[*\-.•\s_]{0,4}[i]{1,3}[*\-.•\s_]{0,4}[t]{1,3}/i,
            /[b]{1,3}[*\-.•\s_]{0,4}[i]{1,3}[*\-.•\s_]{0,4}[t]{1,3}[*\-.•\s_]{0,4}[c]{1,3}[*\-.•\s_]{0,4}[h]{1,3}/i,
            /[d]{1,3}[*\-.•\s_]{0,4}[i]{1,3}[*\-.•\s_]{0,4}[c]{1,3}[*\-.•\s_]{0,4}[k]{1,3}/i,
            /[p]{1,3}[*\-.•\s_]{0,4}[u]{1,3}[*\-.•\s_]{0,4}[t]{1,3}[*\-.•\s_]{0,4}[e]{0,3}[*\-.•\s_]{0,4}[a]{0,3}[*\-.•\s_]{0,4}[i]{0,3}[*\-.•\s_]{0,4}[n]{0,3}/i,
            /[s]{1,3}[*\-.•\s_]{0,4}[a]{1,3}[*\-.•\s_]{0,4}[l]{1,3}[*\-.•\s_]{0,4}[o]{1,3}[*\-.•\s_]{0,4}[p]{1,3}[*\-.•\s_]{0,4}[e]{1,3}/i,
            /[c]{1,3}[*\-.•\s_]{0,4}[o]{1,3}[*\-.•\s_]{0,4}[n]{1,3}[*\-.•\s_]{0,4}[n]{1,3}[*\-.•\s_]{0,4}[a]{1,3}[*\-.•\s_]{0,4}[r]{1,3}[*\-.•\s_]{0,4}[d]{1,3}/i,
            /[e]{1,3}[*\-.•\s_]{0,4}[n]{1,3}[*\-.•\s_]{0,4}[c]{1,3}[*\-.•\s_]{0,4}[u]{1,3}[*\-.•\s_]{0,4}[l]{1,3}[*\-.•\s_]{0,4}[e]{1,3}[*\-.•\s_]{0,4}[r]{0,3}/i,
            /[m]{1,3}[*\-.•\s_]{0,4}[e]{1,3}[*\-.•\s_]{0,4}[r]{1,3}[*\-.•\s_]{0,4}[d]{1,3}[*\-.•\s_]{0,4}[e]{1,3}/i,
            /[b]{1,3}[*\-.•\s_]{0,4}[a]{1,3}[*\-.•\s_]{0,4}[i]{1,3}[*\-.•\s_]{0,4}[s]{1,3}[*\-.•\s_]{0,4}[e]{1,3}[*\-.•\s_]{0,4}[r]{0,3}/i
        ];

        return camouflagePatterns.some(pattern => pattern.test(text));
    }

    /**
     * تحليل السياق والنبرة
     */
    analyzeContext(original, cleaned, result) {
        // تحليل وجود علامات انفعال
        const exclamationCount = (original.match(/[!！¡]/g) || []).length;
        const questionCount = (original.match(/[?？¿]/g) || []).length;
        const capsCount = (original.match(/[A-Z]/g) || []).length;
        const capsRatio = original.length > 0 ? capsCount / original.length : 0;
        
        // علامات الانفعال تزيد من الشدة
        if (exclamationCount > 3) {
            result.severity += 1.5;
            result.details.excessiveExclamation = true;
        }
        if (exclamationCount > 6) {
            result.severity += 2;
            result.details.rageExclamation = true;
        }
        
        // الأحرف الكبيرة (في اللغات اللاتينية)
        if (capsRatio > 0.5 && original.length > 5) {
            result.severity += 1.5;
            result.details.capsRage = true;
        }
        if (capsRatio > 0.8 && original.length > 5) {
            result.severity += 2;
            result.details.extremeCapsRage = true;
        }
        
        // تكرار الحروف (مثل: كسسسسس)
        const repetitionPattern = /(.)\1{4,}/g;
        const repetitions = original.match(repetitionPattern);
        if (repetitions && repetitions.length > 0) {
            result.severity += 1;
            result.details.letterRepetition = true;
        }
        
        // طول الرسالة العدائية
        if (original.length > 100 && result.isOffensive) {
            result.severity += 2;
            result.details.longOffensiveMessage = true;
        }
        if (original.length > 200 && result.isOffensive) {
            result.severity += 3;
            result.details.veryLongOffensiveMessage = true;
        }
        
        // تكرار نفس الكلمة
        const words = original.split(/\s+/);
        const wordFrequency = {};
        words.forEach(w => wordFrequency[w] = (wordFrequency[w] || 0) + 1);
        const hasRepeatedWords = Object.values(wordFrequency).some(count => count > 3);
        if (hasRepeatedWords && result.isOffensive) {
            result.severity += 1.5;
            result.details.wordRepetition = true;
        }
        
        // علامات الاستفهام المتعددة مع كلمات مسيئة
        if (questionCount > 3 && result.isOffensive) {
            result.severity += 1.5;
            result.details.aggressiveQuestioning = true;
        }
        
        // اللغة المختلطة (عربية + إنجليزية/فرنسية) مع كلمات مسيئة
        const hasArabic = /[\u0600-\u06FF]/.test(original);
        const hasLatin = /[a-zA-Z]/.test(original);
        if (hasArabic && hasLatin && result.isOffensive) {
            result.severity += 1;
            result.details.mixedLanguage = true;
        }
    }

    /**
     * تحليل المشاعر والعدوانية
     */
    analyzeSentiment(original, result) {
        // قاموس كلمات الغضب بجميع اللغات
        const angerWords = {
            arabic: ['غاضب', 'عصبي', 'حانق', 'مستاء', 'ثائر', 'هائج', 'غضبان', 'مقهور', 'محبط'],
            english: ['angry', 'mad', 'furious', 'enraged', 'outraged', 'pissed', 'irate', 'livid'],
            french: ['fâché', 'énervé', 'furieux', 'enragé', 'colère', 'rageux', 'irrité', 'vexé']
        };
        
        // قاموس كلمات الكراهية
        const hateWords = {
            arabic: ['أكره', 'أمقت', 'أبغض', 'كاره', 'مقت', 'بغيض', 'مقيت', 'كراهية'],
            english: ['hate', 'hatred', 'despise', 'loathe', 'detest', 'abhor'],
            french: ['déteste', 'hais', 'exècre', 'abhorre', 'méprise', 'dégoûte']
        };
        
        // قاموس كلمات التهديد
        const threatWords = {
            arabic: ['سوف', 'سأقوم', 'استعد', 'انتبه', 'احذر', 'توعد', 'أقسم', 'أحلف'],
            english: ['will', 'gonna', 'going to', 'prepare', 'watch out', 'be careful', 'swear'],
            french: ['vais', 'va', 'aller', 'prépare', 'attention', 'méfie', 'jure', 'promets']
        };
        
        // فحص كلمات الغضب
        for (const [lang, words] of Object.entries(angerWords)) {
            for (const word of words) {
                if (original.includes(word)) {
                    result.severity += 2;
                    result.confidence += 0.2;
                    result.details.angerDetected = true;
                    break;
                }
            }
        }
        
        // فحص كلمات الكراهية
        for (const [lang, words] of Object.entries(hateWords)) {
            for (const word of words) {
                if (original.includes(word)) {
                    result.severity += 2.5;
                    result.confidence += 0.25;
                    result.details.hatredDetected = true;
                    break;
                }
            }
        }
        
        // فحص كلمات التهديد
        for (const [lang, words] of Object.entries(threatWords)) {
            for (const word of words) {
                if (original.includes(word)) {
                    result.severity += 3;
                    result.confidence += 0.3;
                    result.details.threatIntentDetected = true;
                    break;
                }
            }
        }
    }

    /**
     * حساب الشدة النهائية مع مراعاة كل العوامل
     */
    calculateFinalSeverity(result) {
        // تطبيق معامل الصرامة
        result.severity = result.severity * (this.strictness / 8);
        
        // تعزيز الشدة إذا كانت هناك عدة فئات
        if (result.categories.length > 1) {
            result.severity *= (1 + (result.categories.length - 1) * 0.2);
        }
        
        // تعزيز الشدة إذا كانت هناك علامات انفعال
        if (result.details.excessiveExclamation || result.details.capsRage) {
            result.severity *= 1.1;
        }
        
        // تعزيز الشدة إذا كان تهديداً
        if (result.categories.includes('threats_global')) {
            result.severity *= 1.3;
        }
        
        // تعزيز الشدة إذا كان سباً عائلياً
        if (result.categories.includes('compound_global')) {
            result.severity *= 1.2;
        }
        
        // تقليل الشدة إذا كانت الثقة منخفضة
        if (result.confidence < 0.5) {
            result.severity *= 0.7;
        }
        if (result.confidence < 0.3) {
            result.severity *= 0.5;
        }
        
        // تحديد الحد الأقصى
        result.severity = Math.min(10, result.severity);
        
        // تقريب النتيجة
        result.severity = Math.round(result.severity * 10) / 10;
        
        // ضمان الحد الأدنى للشدة
        if (result.severity > 0 && result.severity < 1) {
            result.severity = 1;
        }
    }

    /**
     * تحديد الإجراء المناسب مع الكتم الدائم
     */
    determineAction(result) {
        if (!result.isOffensive || result.severity < 1) {
            result.action = 'allow';
        } else if (result.severity < 3) {
            result.action = 'warn';
        } else if (result.severity < 5) {
            result.action = 'mute_short'; // كتم قصير
        } else if (result.severity < 7) {
            result.action = 'mute_permanent'; // كتم دائم
        } else {
            result.action = 'ban'; // حظر فوري
        }
        
        // الكتم الدائم لأي إساءة شديدة
        if (result.categories.includes('threats_global') ||
            result.categories.includes('family') ||
            result.categories.includes('discriminatory') ||
            result.severity >= 5) {
            result.action = 'mute_permanent';
        }
        
        // الحظر الفوري للتهديدات الخطيرة
        if (result.categories.includes('threats_global') && result.severity >= 7) {
            result.action = 'ban';
        }
    }

    /**
     * تحديد شدة الإساءة للفئة
     */
    getSeverityForCategory(category) {
        const severityMap = {
            'explicit_global': 9,
            'darija_explicit': 9,
            'compound_global': 9.5,
            'threats_global': 10,
            'harassment': 7,
            'camouflaged': 8,
            'leet_speak': 8.5,
            'compound': 8
        };
        return severityMap[category] || 5;
    }

    /**
     * حساب تشابه بين كلمتين (خوارزمية متطورة)
     */
    calculateSimilarity(str1, str2) {
        if (str1 === str2) return 1.0;
        if (str1.length < 2 || str2.length < 2) return 0;

        // حساب مسافة ليفنشتاين
        const matrix = [];
        for (let i = 0; i <= str1.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str2.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str1.length; i++) {
            for (let j = 1; j <= str2.length; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        
        const distance = matrix[str1.length][str2.length];
        const maxLen = Math.max(str1.length, str2.length);
        return 1 - (distance / maxLen);
    }

    /**
     * التحقق من القائمة البيضاء
     */
    isWhitelisted(text, word) {
        return this.whitelist.some(whiteWord => 
            text.includes(whiteWord) && whiteWord.includes(word)
        );
    }
}

module.exports = AIFilter;