// src/database.js
// JSON fayl bazasi - hech qanday kompilyatsiya shart emas!
// Ma'lumotlar data/db.json faylida saqlanadi
'use strict';

const low      = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path     = require('path');
const fs       = require('fs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const adapter = new FileSync(path.join(dataDir, 'db.json'));
const db      = low(adapter);

db.defaults({ users: [], contacts: [], leads: [] }).write();

function getUser(telegramId) {
  return db.get('users').find({ telegram_id: telegramId }).value();
}

function upsertUser({ telegramId, username, firstName }) {
  const exists = db.get('users').find({ telegram_id: telegramId }).value();
  if (exists) {
    db.get('users').find({ telegram_id: telegramId }).assign({
      username:   username || null,
      first_name: firstName || null,
    }).write();
  } else {
    db.get('users').push({
      id:          Date.now(),
      telegram_id: telegramId,
      username:    username || null,
      first_name:  firstName || null,
      language:    null, // til tanlanmagan; getLang() 'en'ga qaytadi
      created_at:  new Date().toISOString(),
    }).write();
  }
  return getUser(telegramId);
}

function setLanguage(telegramId, language) {
  db.get('users').find({ telegram_id: telegramId }).assign({ language }).write();
}

function getAllUsers() {
  return db.get('users').value();
}

function saveContact({ telegramId, firstName, username, message }) {
  db.get('contacts').push({
    id:          Date.now(),
    telegram_id: telegramId,
    first_name:  firstName || null,
    username:    username || null,
    message,
    created_at:  new Date().toISOString(),
  }).write();
}

function saveLead({ telegramId, firstName, username, company, phone, need, source }) {
  db.get('leads').push({
    id:          Date.now(),
    telegram_id: telegramId,
    first_name:  firstName || null,
    username:    username || null,
    company:     company || null,
    phone:       phone || null,
    need:        need || null,
    source:      source || 'direct', // reklama manbasi (deep-link payload)
    created_at:  new Date().toISOString(),
  }).write();
}

function getAllLeads() {
  return db.get('leads').value();
}

function getStats() {
  const users    = db.get('users').value();
  const contacts = db.get('contacts').value();
  const leads    = db.get('leads').value();
  return {
    totalUsers:    users.length,
    totalContacts: contacts.length,
    totalLeads:    leads.length,
    langUz:        users.filter(u => u.language === 'uz').length,
    langRu:        users.filter(u => u.language === 'ru').length,
    langEn:        users.filter(u => u.language === 'en').length,
  };
}

module.exports = { getUser, upsertUser, setLanguage, getAllUsers, saveContact, saveLead, getAllLeads, getStats };
