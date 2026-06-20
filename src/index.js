// src/index.js
// Xroot IT Bot - AI siz versiya
// Faqat BOT_TOKEN kerak!
'use strict';

require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const db = require('./database');

if (!process.env.BOT_TOKEN) throw new Error('BOT_TOKEN .env faylida yo\'q!');

const bot     = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = String(process.env.ADMIN_TELEGRAM_ID);

// Kontakt rejimidagi foydalanuvchilar
const contactMode  = new Set();
const broadcastMode = new Set();

// Audit ariza sessiyalari: telegramId -> { step, data }
const auditSessions = new Map();
// Deep-link orqali "audit" niyati bilan kelganlar (til tanlagandan keyin boshlanadi)
const pendingAudit  = new Set();

// ====================================
// MATNLAR (3 TIL)
// ====================================
const T = {
  uz: {
    welcome:       '👋 *Xroot IT Bot*ga xush kelibsiz!\n\nTilni tanlang:',
    langOk:        '✅ O\'zbek tili tanlandi!',
    menu:          '🏠 *Asosiy menyu*',
    about:         '🏢 *Xroot IT haqida*\n\nXroot IT — Toshkentdagi professional IT kompaniyasi. Biz bizneslar uchun zamonaviy raqamli yechimlar yaratamiz.\n\n🌐 xrootit.com\n📧 info@xrootit.com\n📍 Toshkent, O\'zbekiston',
    services:      '🛠 *Bizning xizmatlar*\n\n• 💻 Dasturiy ta\'minot ishlab chiqish\n• 🌐 Veb-sayt va veb-ilovalar\n• 📱 Mobil ilovalar (iOS & Android)\n• 🎨 UI/UX Dizayn\n• ☁️ Bulut yechimlari\n• 🔧 IT-maslahat\n\n📩 Bepul maslahat uchun bizga yozing!',
    faq:           '❓ *Tez-tez so\'raladigan savollar*\n\n*Qanday texnologiyalar ishlatiladi?*\n▸ Node.js, React, Python, Flutter, PostgreSQL\n\n*Loyiha qancha vaqt oladi?*\n▸ Odatda 4–12 hafta\n\n*Ishga tushirgandan keyin qo\'llab-quvvatlash bormi?*\n▸ Ha, texnik xizmat paketlarimiz mavjud\n\n*Narx qanday?*\n▸ Loyiha hajmiga qarab. Biz bilan bog\'laning!',
    contactPrompt: '📞 Xabaringizni yozing, tez orada javob beramiz:',
    contactSent:   '✅ Xabaringiz adminga yuborildi!\n\n24 soat ichida javob beramiz. 🙏',
    btnAbout:      'ℹ️ Xroot IT haqida',
    btnServices:   '🛠 Xizmatlar',
    btnFaq:        '❓ FAQ',
    btnContact:    '📞 Bog\'lanish',
    btnLanguage:   '🌐 Til',
    btnBack:       '⬅️ Orqaga',
    unknown:       '❓ Menyu tugmalaridan foydalaning yoki /start yozing',
    auditBtn:      '📝 Bepul Audit',
    auditStart:    'Ajoyib! 🎯 Bepul IT audit uchun 3 ta qisqa savol. Bu atigi ~1 daqiqa.\n\n*1/3* — Kompaniyangiz nomi va faoliyat sohasi qanday?',
    auditPhone:    '*2/3* — Bog\'lanish uchun telefon raqamingiz?\n\n👇 Pastdagi tugma orqali yuboring yoki qo\'lda yozing.',
    auditNeed:     '*3/3* — Qanday tizim yoki muammo bor? (masalan: CRM kerak, jarayonlar avtomatlashmagan, mobil ilova kerak...)',
    auditDone:     '✅ Rahmat! Arizangiz qabul qilindi.\n\nMutaxassisimiz 24 soat ichida siz bilan bog\'lanadi. 🙏',
    sharePhone:    '📱 Raqamni yuborish',
  },
  ru: {
    welcome:       '👋 Добро пожаловать в *Xroot IT Bot*!\n\nВыберите язык:',
    langOk:        '✅ Русский язык выбран!',
    menu:          '🏠 *Главное меню*',
    about:         '🏢 *О компании Xroot IT*\n\nXroot IT — профессиональная IT-компания в Ташкенте. Мы создаём современные цифровые решения для бизнеса.\n\n🌐 xrootit.com\n📧 info@xrootit.com\n📍 Ташкент, Узбекистан',
    services:      '🛠 *Наши услуги*\n\n• 💻 Разработка программного обеспечения\n• 🌐 Веб-сайты и веб-приложения\n• 📱 Мобильные приложения (iOS & Android)\n• 🎨 UI/UX Дизайн\n• ☁️ Облачные решения\n• 🔧 IT-консалтинг\n\n📩 Напишите нам для бесплатной консультации!',
    faq:           '❓ *Часто задаваемые вопросы*\n\n*Какие технологии используете?*\n▸ Node.js, React, Python, Flutter, PostgreSQL\n\n*Сколько длится проект?*\n▸ Обычно 4–12 недель\n\n*Есть поддержка после запуска?*\n▸ Да, у нас есть пакеты обслуживания\n\n*Как узнать цену?*\n▸ Зависит от объёма. Свяжитесь с нами!',
    contactPrompt: '📞 Напишите ваше сообщение, мы скоро ответим:',
    contactSent:   '✅ Ваше сообщение отправлено администратору!\n\nОтветим в течение 24 часов. 🙏',
    btnAbout:      'ℹ️ О компании',
    btnServices:   '🛠 Услуги',
    btnFaq:        '❓ FAQ',
    btnContact:    '📞 Связаться',
    btnLanguage:   '🌐 Язык',
    btnBack:       '⬅️ Назад',
    unknown:       '❓ Используйте кнопки меню или введите /start',
    auditBtn:      '📝 Бесплатный аудит',
    auditStart:    'Отлично! 🎯 3 коротких вопроса для бесплатного IT-аудита. Это всего ~1 минута.\n\n*1/3* — Название вашей компании и сфера деятельности?',
    auditPhone:    '*2/3* — Ваш контактный номер телефона?\n\n👇 Отправьте кнопкой ниже или введите вручную.',
    auditNeed:     '*3/3* — Какая система нужна или какая проблема? (например: нужен CRM, процессы не автоматизированы, нужно мобильное приложение...)',
    auditDone:     '✅ Спасибо! Ваша заявка принята.\n\nНаш специалист свяжется с вами в течение 24 часов. 🙏',
    sharePhone:    '📱 Отправить номер',
  },
  en: {
    welcome:       '👋 Welcome to *Xroot IT Bot*!\n\nChoose your language:',
    langOk:        '✅ English selected!',
    menu:          '🏠 *Main Menu*',
    about:         '🏢 *About Xroot IT*\n\nXroot IT is a professional IT company based in Tashkent, Uzbekistan. We build modern digital solutions for businesses worldwide.\n\n🌐 xrootit.com\n📧 info@xrootit.com\n📍 Tashkent, Uzbekistan',
    services:      '🛠 *Our Services*\n\n• 💻 Custom Software Development\n• 🌐 Web Sites & Web Apps\n• 📱 Mobile Apps (iOS & Android)\n• 🎨 UI/UX Design\n• ☁️ Cloud Solutions\n• 🔧 IT Consulting\n\n📩 Contact us for a free consultation!',
    faq:           '❓ *Frequently Asked Questions*\n\n*What technologies do you use?*\n▸ Node.js, React, Python, Flutter, PostgreSQL\n\n*How long does a project take?*\n▸ Usually 4–12 weeks\n\n*Is there support after launch?*\n▸ Yes, we offer maintenance packages\n\n*How much does it cost?*\n▸ Depends on scope. Contact us!',
    contactPrompt: '📞 Type your message and we\'ll get back to you soon:',
    contactSent:   '✅ Your message has been sent to our team!\n\nWe\'ll reply within 24 hours. 🙏',
    btnAbout:      'ℹ️ About Xroot IT',
    btnServices:   '🛠 Services',
    btnFaq:        '❓ FAQ',
    btnContact:    '📞 Contact',
    btnLanguage:   '🌐 Language',
    btnBack:       '⬅️ Back',
    unknown:       '❓ Please use the menu buttons or type /start',
    auditBtn:      '📝 Free Audit',
    auditStart:    'Great! 🎯 3 quick questions for your free IT audit. Takes just ~1 minute.\n\n*1/3* — Your company name and industry?',
    auditPhone:    '*2/3* — Your contact phone number?\n\n👇 Send it with the button below or type it manually.',
    auditNeed:     '*3/3* — What system do you need or what problem are you facing? (e.g. need a CRM, processes not automated, need a mobile app...)',
    auditDone:     '✅ Thank you! Your request has been received.\n\nOur specialist will contact you within 24 hours. 🙏',
    sharePhone:    '📱 Share number',
  },
};

// ====================================
// YORDAMCHI FUNKSIYALAR
// ====================================
function getLang(telegramId) {
  const user = db.getUser(telegramId);
  return user?.language || 'en';
}

function tx(telegramId) {
  return T[getLang(telegramId)] || T.en;
}

function mainKeyboard(telegramId) {
  const t = tx(telegramId);
  return Markup.keyboard([
    [t.auditBtn],
    [t.btnAbout,   t.btnServices],
    [t.btnFaq,     t.btnContact],
    [t.btnLanguage],
  ]).resize();
}

function backKeyboard(telegramId) {
  return Markup.keyboard([[tx(telegramId).btnBack]]).resize();
}

// Telefon so'rash uchun klaviatura (kontakt ulashish tugmasi bilan)
function phoneKeyboard(telegramId) {
  const t = tx(telegramId);
  return Markup.keyboard([
    [Markup.button.contactRequest(t.sharePhone)],
    [t.btnBack],
  ]).resize();
}

function isAdmin(ctx) {
  return String(ctx.from.id) === ADMIN_ID;
}

// ====================================
// AUDIT ARIZA OQIMI
// ====================================
async function startAudit(ctx) {
  const id = ctx.from.id;
  contactMode.delete(id);
  pendingAudit.delete(id);
  auditSessions.set(id, { step: 'company', data: {} });
  const t = tx(id);
  await ctx.reply(t.auditStart, { parse_mode: 'Markdown', ...backKeyboard(id) });
}

async function finalizeAudit(ctx) {
  const { id, username, first_name } = ctx.from;
  const sess = auditSessions.get(id);
  const t = tx(id);
  auditSessions.delete(id);

  db.saveLead({
    telegramId: id,
    firstName:  first_name,
    username,
    company:    sess.data.company,
    phone:      sess.data.phone,
    need:       sess.data.need,
  });

  await ctx.telegram.sendMessage(
    ADMIN_ID,
    `🔥 *YANGI AUDIT ARIZASI*\n\n` +
    `👤 ${first_name || 'Nomsiz'}${username ? ` (@${username})` : ''}\n` +
    `🏢 ${sess.data.company}\n` +
    `📞 ${sess.data.phone}\n` +
    `💬 ${sess.data.need}\n\n` +
    `🆔 \`${id}\` · 🌐 ${getLang(id).toUpperCase()}`,
    { parse_mode: 'Markdown' }
  ).catch(() => {});

  await ctx.reply(t.auditDone, { parse_mode: 'Markdown', ...mainKeyboard(id) });
}

// ====================================
// /start
// ====================================
bot.start(async (ctx) => {
  const { id, username, first_name } = ctx.from;
  db.upsertUser({ telegramId: id, username, firstName: first_name });
  contactMode.delete(id);
  auditSessions.delete(id);

  // Saytdan deep-link bilan kelganlar: t.me/xroot_agency_bot?start=audit
  if (ctx.startPayload === 'audit') {
    pendingAudit.add(id);
    // Agar foydalanuvchi tilni avval tanlagan bo'lsa — to'g'ridan-to'g'ri auditga o'tamiz
    if (db.getUser(id)?.language) {
      return startAudit(ctx);
    }
  }

  await ctx.reply(
    '👋 *Xroot IT Bot*ga xush kelibsiz!\n\nTilni tanlang / Choose language / Выберите язык:',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[
        Markup.button.callback('🇺🇿 O\'zbek', 'lang:uz'),
        Markup.button.callback('🇷🇺 Русский', 'lang:ru'),
        Markup.button.callback('🇬🇧 English', 'lang:en'),
      ]]),
    }
  );
});

// ====================================
// TIL TANLASH
// ====================================
bot.action(/^lang:(uz|ru|en)$/, async (ctx) => {
  const l = ctx.match[1];
  const id = ctx.from.id;
  db.upsertUser({ telegramId: id, username: ctx.from.username, firstName: ctx.from.first_name });
  db.setLanguage(id, l);
  await ctx.answerCbQuery();
  await ctx.editMessageText(T[l].langOk, { parse_mode: 'Markdown' });

  // Deep-link orqali audit niyati bilan kelgan bo'lsa — to'g'ridan-to'g'ri arizaga
  if (pendingAudit.has(id)) {
    return startAudit(ctx);
  }
  await ctx.reply(T[l].menu, { parse_mode: 'Markdown', ...mainKeyboard(id) });
});

// ====================================
// /cancel
// ====================================
bot.command('cancel', async (ctx) => {
  contactMode.delete(ctx.from.id);
  broadcastMode.delete(ctx.from.id);
  const t = tx(ctx.from.id);
  await ctx.reply(t.menu, { parse_mode: 'Markdown', ...mainKeyboard(ctx.from.id) });
});

// ====================================
// ADMIN BUYRUQLARI
// ====================================
bot.command('admin', async (ctx) => {
  if (!isAdmin(ctx)) return ctx.reply('⛔ Ruxsat yo\'q');
  await ctx.reply('🔐 *Admin Panel*', {
    parse_mode: 'Markdown',
    ...Markup.keyboard([
      ['📋 Arizalar',   '📊 Statistika'],
      ['👥 Foydalanuvchilar', '📢 Broadcast'],
      ['🏠 Menyuga qaytish'],
    ]).resize(),
  });
});

// ====================================
// BARCHA MATN XABARLARI
// ====================================
bot.on('text', async (ctx) => {
  const { id, username, first_name } = ctx.from;
  const text = ctx.message.text;
  db.upsertUser({ telegramId: id, username, firstName: first_name });

  const t    = tx(id);
  const all  = Object.values(T); // barcha tillar

  // --- ADMIN: BROADCAST ---
  if (isAdmin(ctx) && broadcastMode.has(id)) {
    broadcastMode.delete(id);
    const users = db.getAllUsers();
    let sent = 0, failed = 0;
    await ctx.reply(`📤 ${users.length} ta foydalanuvchiga yuborilmoqda...`);
    for (const user of users) {
      try {
        await ctx.telegram.sendMessage(user.telegram_id, text, { parse_mode: 'Markdown' });
        sent++;
        await new Promise(r => setTimeout(r, 50));
      } catch { failed++; }
    }
    await ctx.reply(`✅ Yuborildi: ${sent}\n❌ Xato: ${failed}`);
    return;
  }

  // --- ADMIN TUGMALARI ---
  if (isAdmin(ctx)) {
    if (text === '📊 Statistika') {
      const s = db.getStats();
      await ctx.reply(
        `📊 *Statistika*\n\n👥 Foydalanuvchilar: *${s.totalUsers}*\n📝 Audit arizalari: *${s.totalLeads}*\n📩 Kontaktlar: *${s.totalContacts}*\n\n🌐 Tillar:\n🇺🇿 O'zbek: ${s.langUz}\n🇷🇺 Rus: ${s.langRu}\n🇬🇧 Ingliz: ${s.langEn}`,
        { parse_mode: 'Markdown' }
      );
      return;
    }
    if (text === '📋 Arizalar') {
      const leads = db.getAllLeads().slice(-15).reverse();
      if (!leads.length) { await ctx.reply('Hali audit arizasi yo\'q'); return; }
      const list = leads.map((l, i) => {
        const who = `${l.first_name || 'Nomsiz'}${l.username ? ` (@${l.username})` : ''}`;
        return `*${i+1}.* ${who}\n🏢 ${l.company || '—'}\n📞 ${l.phone || '—'}\n💬 ${l.need || '—'}`;
      }).join('\n\n');
      await ctx.reply(`📋 *Oxirgi audit arizalari:*\n\n${list}`, { parse_mode: 'Markdown' });
      return;
    }
    if (text === '👥 Foydalanuvchilar') {
      const users = db.getAllUsers().slice(0, 20);
      if (!users.length) { await ctx.reply('Hali foydalanuvchi yo\'q'); return; }
      const list = users.map((u, i) =>
        `${i+1}. ${u.first_name || 'Nomsiz'} ${u.username ? `(@${u.username})` : ''} — ${(u.language || 'en').toUpperCase()}`
      ).join('\n');
      await ctx.reply(`👥 *Foydalanuvchilar:*\n\n${list}`, { parse_mode: 'Markdown' });
      return;
    }
    if (text === '📢 Broadcast') {
      broadcastMode.add(id);
      await ctx.reply('📢 Xabar matnini yozing:\n\n/cancel — bekor qilish');
      return;
    }
    if (text === '🏠 Menyuga qaytish') {
      await ctx.reply(t.menu, { parse_mode: 'Markdown', ...mainKeyboard(id) });
      return;
    }
  }

  // --- AUDIT ARIZA OQIMI ---
  if (auditSessions.has(id)) {
    // Istalgan bosqichda "Orqaga" bilan bekor qilish
    if (all.some(l => text === l.btnBack)) {
      auditSessions.delete(id);
      await ctx.reply(t.menu, { parse_mode: 'Markdown', ...mainKeyboard(id) });
      return;
    }
    const sess = auditSessions.get(id);
    if (sess.step === 'company') {
      sess.data.company = text;
      sess.step = 'phone';
      await ctx.reply(t.auditPhone, { parse_mode: 'Markdown', ...phoneKeyboard(id) });
      return;
    }
    if (sess.step === 'phone') {
      sess.data.phone = text;
      sess.step = 'need';
      await ctx.reply(t.auditNeed, { parse_mode: 'Markdown', ...backKeyboard(id) });
      return;
    }
    if (sess.step === 'need') {
      sess.data.need = text;
      await finalizeAudit(ctx);
      return;
    }
  }

  // --- KONTAKT REJIMI ---
  if (contactMode.has(id)) {
    if (all.some(l => text === l.btnBack)) {
      contactMode.delete(id);
      await ctx.reply(t.menu, { parse_mode: 'Markdown', ...mainKeyboard(id) });
      return;
    }
    db.saveContact({ telegramId: id, firstName: first_name, username, message: text });
    await ctx.telegram.sendMessage(
      ADMIN_ID,
      `📩 *Yangi xabar*\n\n👤 ${first_name || 'Nomsiz'}${username ? ` (@${username})` : ''}\n🆔 \`${id}\`\n🌐 ${getLang(id).toUpperCase()}\n\n💬 ${text}`,
      { parse_mode: 'Markdown' }
    ).catch(() => {});
    contactMode.delete(id);
    await ctx.reply(t.contactSent, { parse_mode: 'Markdown', ...mainKeyboard(id) });
    return;
  }

  // --- ASOSIY MENYU ---
  if (all.some(l => text === l.auditBtn)) {
    await startAudit(ctx);
    return;
  }
  if (all.some(l => text === l.btnAbout)) {
    await ctx.reply(t.about, { parse_mode: 'Markdown', ...backKeyboard(id) });
    return;
  }
  if (all.some(l => text === l.btnServices)) {
    await ctx.reply(t.services, { parse_mode: 'Markdown', ...backKeyboard(id) });
    return;
  }
  if (all.some(l => text === l.btnFaq)) {
    await ctx.reply(t.faq, { parse_mode: 'Markdown', ...backKeyboard(id) });
    return;
  }
  if (all.some(l => text === l.btnContact)) {
    contactMode.add(id);
    await ctx.reply(t.contactPrompt, { parse_mode: 'Markdown', ...backKeyboard(id) });
    return;
  }
  if (all.some(l => text === l.btnLanguage)) {
    await ctx.reply('🌐 Tilni tanlang:', Markup.inlineKeyboard([[
      Markup.button.callback('🇺🇿 O\'zbek', 'lang:uz'),
      Markup.button.callback('🇷🇺 Русский', 'lang:ru'),
      Markup.button.callback('🇬🇧 English', 'lang:en'),
    ]]));
    return;
  }
  if (all.some(l => text === l.btnBack)) {
    contactMode.delete(id);
    await ctx.reply(t.menu, { parse_mode: 'Markdown', ...mainKeyboard(id) });
    return;
  }

  // --- NOMA'LUM ---
  await ctx.reply(t.unknown);
});

// ====================================
// KONTAKT (telefon ulashish) — audit oqimida
// ====================================
bot.on('contact', async (ctx) => {
  const id = ctx.from.id;
  if (!auditSessions.has(id)) return;
  const sess = auditSessions.get(id);
  if (sess.step !== 'phone') return;
  sess.data.phone = ctx.message.contact.phone_number;
  sess.step = 'need';
  await ctx.reply(tx(id).auditNeed, { parse_mode: 'Markdown', ...backKeyboard(id) });
});

// ====================================
// XATO TUTISH
// ====================================
bot.catch((err) => {
  console.error('❌ Xato:', err.message);
});

// ====================================
// HEALTH SERVER (Render bepul Web Service uchun)
// Polling bot HTTP ochmaydi; Render esa PORT'ni kutadi va trafik bo'lmasa
// servisni "uxlatadi". Kichik server + tashqi uptime-ping bilan tirik turadi.
// ====================================
const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  // /health — uptime-monitor uchun yengil endpoint
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Xroot IT Bot is running ✅');
}).listen(PORT, () => console.log(`🌐 Health server :${PORT}`));

// Self-ping: bepul Render servisi 15 daqiqa trafiksiz uxlaydi. Bot o'zining
// ommaviy URL'iga (Render avtomatik beradigan RENDER_EXTERNAL_URL) har 5
// daqiqada so'rov yuboradi — bitta ping o'tib ketsa ham 15 daqiqalik
// chegaradan oshmaydi. To'liq ishonchlilik uchun TASHQI uptime-monitor
// ham sozlang (UptimeRobot / cron-job.org) — u uxlab qolgan servisni
// uyg'ota oladi, self-ping esa faqat tirik servisni tirik ushlab turadi.
const SELF_URL = process.env.RENDER_EXTERNAL_URL;
if (SELF_URL && typeof fetch === 'function') {
  const ping = () => fetch(SELF_URL)
    .then(() => console.log(`🔄 Self-ping OK: ${new Date().toISOString()}`))
    .catch((e) => console.warn('⚠️ Self-ping xato:', e.message));
  setInterval(ping, 5 * 60 * 1000);
  ping(); // ishga tushganda darhol bir marta
  console.log(`🔄 Self-ping yoqildi (har 5 daqiqada): ${SELF_URL}`);
} else {
  console.warn('⚠️ RENDER_EXTERNAL_URL yo\'q — self-ping o\'chiq. Tashqi monitor sozlang!');
}

// ====================================
// ISHGA TUSHIRISH
// ====================================
bot.launch()
  .then(() => console.log('✅ Xroot IT Bot ishga tushdi!'))
  .catch(err => { console.error('❌ Bot ishga tushmadi:', err.message); process.exit(1); });

process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
