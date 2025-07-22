import { smsg } from './lib/simple.js'
import { format } from 'util'
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'
import fetch from 'node-fetch'

const { proto } = (await import('@whiskeysockets/baileys')).default
const isNumber = x => typeof x === 'number' && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(function () {
    clearTimeout(this)
    resolve()
}, ms))

export async function handler(chatUpdate) {
    this.msgqueque = this.msgqueque || []
    if (!chatUpdate) return
    this.pushMessage(chatUpdate.messages).catch(console.error)
    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    if (!m) return
    if (!this.user || !this.user.jid) return
    if (global.db.data == null) await global.loadDatabase()
    try {
        m = smsg(this, m) || m
        if (!m) return
        m.exp = 0
        m.limit = false
        let _user = global.db.data?.users?.[m.sender] || {}

        const sendNum = m?.sender?.replace(/[^0-9]/g, '')
        const isROwner = [this.decodeJid(this.user?.jid), ...global.owner?.map(([number]) => number)]
            .map(v => (v || '').replace(/[^0-9]/g, '')).includes(sendNum)
        const dbsubsprems = global.db.data.settings[this.user.jid] || {}
        const subsactivos = dbsubsprems.actives || []
        const botIds = [this?.user?.id, this?.user?.lid, ...(global.owner?.map(([n]) => n) || [])]
            .map(jid => jid?.replace(/[^0-9]/g, '')).filter(Boolean)
        const isPremSubs = subsactivos.some(jid => jid.replace(/[^0-9]/g, '') === sendNum) ||
            botIds.includes(sendNum) ||
            (global.conns || []).some(conn => conn?.user?.jid?.replace(/[^0-9]/g, '') === sendNum && conn?.ws?.socket?.readyState !== 3)
        const isOwner = isROwner || m.fromMe
        const isMods = isOwner || global.mods.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender)
        const isPrems = isROwner || global.prems.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender) || _user.prem == true

        if (opts['queque'] && m.text && !(isMods || isPrems)) {
            let queque = this.msgqueque, time = 1000 * 5
            const previousID = queque[queque.length - 1]
            queque.push(m.id || m.key.id)
            setInterval(async function () {
                if (queque.indexOf(previousID) === -1) clearInterval(this)
                await delay(time)
            }, time)
        }

        if (m.isBaileys) return
        m.exp += Math.ceil(Math.random() * 10)

        let usedPrefix

        const groupMetadata = (m.isGroup ? ((this.chats[m.chat] || {}).metadata || await this.groupMetadata(m.chat).catch(_ => null)) : {}) || {}
        const participants = (m.isGroup ? groupMetadata.participants : []) || []

        const normalizeJid = jid => jid?.replace(/[^0-9]/g, '')
        const cleanJid = jid => jid?.split(':')[0] || ''
        const senderNum = normalizeJid(m.sender)
        const botNums = [this.user?.jid, this.user?.lid].map(j => normalizeJid(cleanJid(j)))
        const user = m.isGroup
            ? participants.find(u => normalizeJid(u.id) === senderNum)
            : {}
        const bot = m.isGroup
            ? participants.find(u => botNums.includes(normalizeJid(u.id)))
            : {}

        const isRAdmin = user?.admin === 'superadmin'
        const isAdmin = isRAdmin || user?.admin === 'admin'
        const isBotAdmin = !!bot?.admin || bot?.admin === 'admin'

    } catch (e) {
        console.error('Error en handler:', e)
    } finally {
        if (opts['queque'] && m.text) {
            const quequeIndex = this.msgqueque.indexOf(m.id || m.key.id)
            if (quequeIndex !== -1) this.msgqueque.splice(quequeIndex, 1)
        }
    }
}

global.dfail = (type, m, conn, usedPrefix) => {
    let msg = {
        rowner: '*¡Este comando es exclusivo para mi desarrollador!*',
        owner: '*¡Esta función solo puede ser usada por mis propietarios!*',
        mods: '*¡Solo mis moderadores pueden hacer uso de este comando!*',
        premium: '*¡Solo usuarios premium pueden usar esta funcion!*',
        group: '*¡Este comando solo se puede usar en grupos!*',
        private: '*¡Esta función solo se puede utilizar en chat privado!*',
        admin: '*¡Este comando solo puede ser utilizado por admins!*',
        botAdmin: '*¡Para realizar la función debo ser admin!*',
        unreg: '*¡𝑃𝑎𝑟𝑎 𝑐𝑜𝑛𝑡𝑖𝑛𝑢𝑎𝑟 𝑐𝑜𝑛 𝑒𝑠𝑡𝑎 𝑓𝑢𝑛𝑐𝑖𝑜𝑛 𝑑𝑒𝑏𝑒𝑟𝑎 𝑟𝑒𝑔𝑖𝑠𝑡𝑟𝑎𝑟𝑠𝑒!*\n\n!reg nombre.edad\n\n*Uso correcto* : !reg FN.20',
        restrict: '*¡Esta característica esta desactivada!*'
    }[type]
    if (msg) return conn.reply(m.chat, msg, m).then(_ => m.react('✖️'))
}

let file = global.__filename(import.meta.url, true)
watchFile(file, async () => {
    unwatchFile(file)
    console.log(chalk.magenta("Se actualizó 'handler.js'"))
    if (global.reloadHandler) console.log(await global.reloadHandler())
})