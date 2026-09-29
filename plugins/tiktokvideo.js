// ERFAN-MD
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import axios from 'axios';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import yts from 'yt-search';

const __filename = fileURLToPath(import.meta.url);
const API_BASE = "https://xjawadtechyt.vercel.app";

const toSmallCaps = (text) => {
    const map = {
        'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ғ', 'g': 'ɢ', 'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ',
        'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ', 'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 's', 't': 'ᴛ',
        'u': 'ᴜ', 'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ'
    };
    return text.split('').map(c => map[c.toLowerCase()] || c).join('');
};

// ============================================
// AUDIO & VIDEO APIS (Aapki Working File Se)
// ============================================
const getAudioAPIs = (url) => [
    { url: `\({API_BASE}/yta8?url=\){encodeURIComponent(url)}`, timeout: 25000 },
    { url: `\({API_BASE}/yta9?url=\){encodeURIComponent(url)}`, timeout: 25000 },
    { url: `\({API_BASE}/yta7?url=\){encodeURIComponent(url)}`, timeout: 25000 },
    { url: `\({API_BASE}/yta6?url=\){encodeURIComponent(url)}`, timeout: 25000 },
    { url: `\({API_BASE}/yta1?url=\){encodeURIComponent(url)}`, timeout: 25000 },
    { url: `\({API_BASE}/yta2?url=\){encodeURIComponent(url)}`, timeout: 25000 },
    { url: `\({API_BASE}/yta3?url=\){encodeURIComponent(url)}`, timeout: 25000 },
    { url: `\({API_BASE}/yta4?url=\){encodeURIComponent(url)}`, timeout: 25000 },
    { url: `\({API_BASE}/yta5?url=\){encodeURIComponent(url)}`, timeout: 25000 }
];

const getNormalVideoAPIs = (url) => [
    `\({API_BASE}/ytv3?url=\){encodeURIComponent(url)}`,
    `\({API_BASE}/ytv1?url=\){encodeURIComponent(url)}`,
    `\({API_BASE}/ytv2?url=\){encodeURIComponent(url)}`
];

const getFallbackVideoAPI = (url) => `\({API_BASE}/ytdl?url=\){encodeURIComponent(url)}`;

// ============================================
// DOWNLOAD PIPELINES
// ============================================
async function sendAudio(conn, from, mek, vid) {
    const audioAPIs = getAudioAPIs(vid.url);
    for (const api of audioAPIs) {
        try {
            const response = await axios.get(api.url, { timeout: api.timeout });
            const audioUrl = response.data?.status && response.data?.download?.url ? response.data.download.url : null;
            if (audioUrl) {
                await conn.sendMessage(from, {
                    audio: { url: audioUrl },
                    mimetype: "audio/mpeg",
                    fileName: `${vid.title}.mp3`,
                    ptt: false
                }, { quoted: mek });
                return true;
            }
        } catch {
            continue;
        }
    }
    return false;
}

async function sendVideo(conn, from, mek, vid) {
    const normalVideoAPIs = getNormalVideoAPIs(vid.url);
    for (const apiUrl of normalVideoAPIs) {
        try {
            const response = await axios.get(apiUrl, { timeout: 25000 });
            const videoUrl = response.data?.status && response.data?.download?.url ? response.data.download.url : null;
            if (videoUrl) {
                await conn.sendMessage(from, {
                    video: { url: videoUrl },
                    mimetype: 'video/mp4',
                    caption: `🎬 *${vid.title}*\n\n> Powered by ERFAN-MD`
                }, { quoted: mek });
                return true;
            }
        } catch {
            continue;
        }
    }

    // Phase 2: Disk Stream Fallback
    let tempFile = null;
    try {
        const fallbackUrl = getFallbackVideoAPI(vid.url);
        const response = await axios.get(fallbackUrl, { timeout: 25000 });
        if (response.data?.status && response.data?.download?.urlx) {
            const downloadURL = response.data.download.urlx;
            const title = response.data.download.title || vid.title;
            tempFile = path.join(os.tmpdir(), `yt_${Date.now()}.mp4`);

            const fileRes = await axios({ method: 'GET', url: downloadURL, responseType: 'stream' });
            const writer = fs.createWriteStream(tempFile);
            fileRes.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            await conn.sendMessage(from, {
                video: { url: tempFile },
                mimetype: "video/mp4",
                caption: `🎬 *${title}*\n\n> Powered by ERFAN-MD`
            }, { quoted: mek });

            try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch {}
            return true;
        }
    } catch {
        try { if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch {}
    }
    return false;
}

// Robust Random Search Logic (Multiple Fallback Queries)
async function handleAutoSearchVideo(conn, mek, m, from, queryPool, userText) {
    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        // User ka text ho toh wo prefer karega, warna queryPool se random query
        const baseQuery = queryPool[Math.floor(Math.random() * queryPool.length)];
        const searchQuery = userText && userText.trim().length > 0 ? `\({userText.trim()}\){baseQuery}` : baseQuery;

        const search = await yts(searchQuery);
        
        let videos = search?.videos || [];
        
        // Agar pehli search mein na mile toh direct generic keyword search
        if (!videos.length) {
            const fallbackSearch = await yts(queryPool[0]);
            videos = fallbackSearch?.videos || [];
        }

        if (!videos.length) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return await conn.sendMessage(from, { text: "❌ YouTube par koi video nahi mili! Dobara try karein." }, { quoted: mek });
        }

        // Top 10 results me se koi ek random video uthayega
        const pickLimit = Math.min(10, videos.length);
        const vid = videos[Math.floor(Math.random() * pickLimit)];

        const success = await sendVideo(conn, from, mek, vid);
        if (success) {
            await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
        } else {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            await conn.sendMessage(from, { text: "❌ Download API fail ho gayi! Baad me try karein." }, { quoted: mek });
        }
    } catch (e) {
        console.error("Auto Search Error:", e);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        await conn.sendMessage(from, { text: `❌ Error: ${e.message}` }, { quoted: mek });
    }
}

// ============================================
// 1. RANDOM DIRECT VIDEO COMMANDS
// ============================================

cmd({
    pattern: "bts",
    alias: ["btsarmy", "btsvideo"],
    desc: "Download random BTS video",
    category: "download",
    react: "💜",
    filename: __filename
}, async (conn, mek, m, { from, text }) => {
    const queries = ["bts army status video", "bts shorts edit", "bts viral video", "bts edits"];
    await handleAutoSearchVideo(conn, mek, m, from, queries, text);
});

cmd({
    pattern: "girl",
    alias: ["girlvideo", "girls"],
    desc: "Download random girl aesthetic video",
    category: "download",
    react: "👧",
    filename: __filename
}, async (conn, mek, m, { from, text }) => {
    const queries = ["aesthetic girl status video", "cute girl attitude edit", "girls reels video"];
    await handleAutoSearchVideo(conn, mek, m, from, queries, text);
});

cmd({
    pattern: "status",
    alias: ["ytstatus", "statusvideo"],
    desc: "Download random status video",
    category: "download",
    react: "✨",
    filename: __filename
}, async (conn, mek, m, { from, text }) => {
    const queries = ["whatsapp status video shorts", "sad status video", "attitude status video"];
    await handleAutoSearchVideo(conn, mek, m, from, queries, text);
});

cmd({
    pattern: "sigmaboy",
    alias: ["sigma", "sigmarule"],
    desc: "Download random sigma boy video",
    category: "download",
    react: "🗿",
    filename: __filename
}, async (conn, mek, m, { from, text }) => {
    const queries = ["sigma boy attitude video", "sigma male rule status", "patrick bateman edit"];
    await handleAutoSearchVideo(conn, mek, m, from, queries, text);
});

cmd({
    pattern: "sigmagirl",
    alias: ["sigmagirlvideo"],
    desc: "Download random sigma girl video",
    category: "download",
    react: "🔥",
    filename: __filename
}, async (conn, mek, m, { from, text }) => {
    const queries = ["sigma girl attitude video", "sigma female edit status", "badass girl edit"];
    await handleAutoSearchVideo(conn, mek, m, from, queries, text);
});

cmd({
    pattern: "romantic",
    alias: ["lovevideo", "romanticstatus"],
    desc: "Download random romantic video",
    category: "download",
    react: "❤️",
    filename: __filename
}, async (conn, mek, m, { from, text }) => {
    const queries = ["romantic love status video", "couple cute romantic shorts", "love shayari status video"];
    await handleAutoSearchVideo(conn, mek, m, from, queries, text);
});

// ============================================
// 2. NAAT COMMAND (1 for Audio, 2 for Video)
// ============================================

cmd({
    pattern: "naat",
    alias: ["naatsharif"],
    desc: "Search Naat and choose format",
    category: "download",
    react: "🕌",
    filename: __filename
}, async (conn, mek, m, { from, text, reply }) => {
    try {
        if (!text) return reply("🕌 *Naat ka naam likhein!*\n\n*Example:* `.naat faslon ko takalluf`");

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        const search = await yts(`${text} naat sharif`);
        const videos = search?.videos || [];

        if (!videos.length) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return reply("❌ Koi Naat nahi mili!");
        }

        const vid = videos[0];

        const caption = `*╭┈───〔 ${toSmallCaps('Naat Sharif')} 〕┈───⊷*
*├▢ 🕌 Title:* ${vid.title}
*├▢ 📺 Channel:* ${vid.author?.name || 'Unknown'}
*├▢ ⏰ Duration:* ${vid.timestamp}
*╰───────────────────⊷*
*╭───⬡ ${toSmallCaps('Select Format')} ⬡───*
*┋ ⬡ 1* 🎧 ${toSmallCaps('Audio (MP3)')}
*┋ ⬡ 2* 📹 ${toSmallCaps('Video (MP4)')}
*╰───────────────────⊷*

_Reply with *1* for Audio or *2* for Video!_
> Powered by ERFAN-MD`;

        const sent = await conn.sendMessage(from, {
            image: { url: vid.thumbnail },
            caption
        }, { quoted: mek });

        const msgId = sent.key.id;

        const naatListener = async (msgData) => {
            const received = msgData.messages[0];
            if (!received?.message) return;

            const selected = received.message.conversation || received.message.extendedTextMessage?.text;
            const replyToBot = received.message.extendedTextMessage?.contextInfo?.stanzaId === msgId;

            if (replyToBot) {
                conn.ev.off("messages.upsert", naatListener);
                await conn.sendMessage(from, { react: { text: '⬇️', key: received.key } });

                const choice = selected?.trim();
                let isDone = false;

                if (choice === "1") {
                    isDone = await sendAudio(conn, from, received, vid);
                } else if (choice === "2") {
                    isDone = await sendVideo(conn, from, received, vid);
                } else {
                    return await conn.sendMessage(from, { text: "❌ Invalid choice! Sirf 1 ya 2 reply karein." }, { quoted: received });
                }

                if (isDone) {
                    await conn.sendMessage(from, { react: { text: '✅', key: received.key } });
                } else {
                    await conn.sendMessage(from, { text: "❌ Download fail ho gaya! Dobara koshish karein." }, { quoted: received });
                }
            }
        };

        conn.ev.on("messages.upsert", naatListener);
        setTimeout(() => { conn.ev.off("messages.upsert", naatListener); }, 30000);

    } catch (e) {
        console.error("Naat error:", e);
        reply("❌ Error: " + e.message);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});
