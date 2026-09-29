// ERFAN-MD
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import axios from 'axios';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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
// AUDIO & VIDEO APIS
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
// DISPATCH HELPERS
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

    // Disk stream fallback
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

// Random video finder and direct downloader
async function handleRandomVideo(conn, mek, m, from, defaultQuery, userQuery, tagTitle) {
    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });
        const { default: yts } = await import('yt-search');
        const finalQuery = userQuery ? `\({userQuery}\){defaultQuery}` : defaultQuery;

        const search = await yts(finalQuery);
        if (!search || !search.videos || !search.videos.length) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return await conn.sendMessage(from, { text: `❌ Video nahi mili!` }, { quoted: mek });
        }

        // Random pick from top 15 results
        const pool = search.videos.slice(0, Math.min(15, search.videos.length));
        const vid = pool[Math.floor(Math.random() * pool.length)];

        const success = await sendVideo(conn, from, mek, vid);
        if (success) {
            await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
        } else {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            await conn.sendMessage(from, { text: "❌ Video download fail ho gayi! Dobara try karein." }, { quoted: mek });
        }
    } catch (e) {
        console.error(`Error in ${tagTitle}:`, e);
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
}

// ============================================
// 1. RANDOM DIRECT VIDEO COMMANDS
// ============================================

cmd({
    pattern: "bts",
    alias: ["btsvideo", "btsarmy"],
    desc: "Download random BTS video",
    category: "download",
    react: "💜",
    filename: __filename
}, async (conn, mek, m, { from, text }) => {
    await handleRandomVideo(conn, mek, m, from, "BTS army shorts video edit", text, "BTS");
});

cmd({
    pattern: "girl",
    alias: ["girlvideo", "girls"],
    desc: "Download random girl video/status",
    category: "download",
    react: "👧",
    filename: __filename
}, async (conn, mek, m, { from, text }) => {
    await handleRandomVideo(conn, mek, m, from, "girl aesthetic status video", text, "Girl");
});

cmd({
    pattern: "status",
    alias: ["statusvideo", "ytstatus"],
    desc: "Download random status video",
    category: "download",
    react: "✨",
    filename: __filename
}, async (conn, mek, m, { from, text }) => {
    await handleRandomVideo(conn, mek, m, from, "whatsapp status video shorts", text, "Status");
});

cmd({
    pattern: "sigmaboy",
    alias: ["sigma", "sigmarule"],
    desc: "Download random sigma boy edit video",
    category: "download",
    react: "🗿",
    filename: __filename
}, async (conn, mek, m, { from, text }) => {
    await handleRandomVideo(conn, mek, m, from, "sigma boy attitude video edit", text, "SigmaBoy");
});

cmd({
    pattern: "sigmagirl",
    alias: ["sigmagirlvideo"],
    desc: "Download random sigma girl edit video",
    category: "download",
    react: "🔥",
    filename: __filename
}, async (conn, mek, m, { from, text }) => {
    await handleRandomVideo(conn, mek, m, from, "sigma girl attitude rule video", text, "SigmaGirl");
});

cmd({
    pattern: "romantic",
    alias: ["lovevideo", "romanticstatus"],
    desc: "Download random romantic video",
    category: "download",
    react: "❤️",
    filename: __filename
}, async (conn, mek, m, { from, text }) => {
    await handleRandomVideo(conn, mek, m, from, "romantic love status video shorts", text, "Romantic");
});

// ============================================
// 2. NAAT COMMAND (1 for Audio, 2 for Video)
// ============================================

cmd({
    pattern: "naat",
    alias: ["naatsharif", "naats"],
    desc: "Search Naat and choose between Audio or Video",
    category: "download",
    react: "🕌",
    filename: __filename
}, async (conn, mek, m, { from, text, reply }) => {
    try {
        if (!text) return reply("🕌 Naat ka naam likhein!\n\n*Example:* `.naat faslon ko takalluf`");

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });
        const { default: yts } = await import('yt-search');

        const search = await yts(`${text} naat`);
        if (!search || !search.videos || !search.videos.length) {
            return reply("❌ Koi Naat nahi mili!");
        }

        const vid = search.videos[0];

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
            if (!received.message) return;

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
                    return await conn.sendMessage(from, { text: "❌ Invalid option! Sirf 1 ya 2 reply karein." }, { quoted: received });
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
