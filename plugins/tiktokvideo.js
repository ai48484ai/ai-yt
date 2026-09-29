// ERFAN MD 
import { fileURLToPath } from 'url';
import { cmd } from '../command.js';
import axios from 'axios';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const API_BASE = "https://xjawadtechyt.vercel.app";

// ============================================
// NORMAL VIDEO APIS (return download.url → send as VIDEO)
// ============================================
const getNormalVideoAPIs = (url) => [
    `\({API_BASE}/ytv3?url=\){encodeURIComponent(url)}`,
    `\({API_BASE}/ytv1?url=\){encodeURIComponent(url)}`,
    `\({API_BASE}/ytv2?url=\){encodeURIComponent(url)}`
];

// ============================================
// FALLBACK VIDEO API (returns download.urlx → save to disk + send as DOCUMENT)
// ============================================
const getFallbackVideoAPI = (url) => `\({API_BASE}/ytdl?url=\){encodeURIComponent(url)}`;

cmd({
    pattern: "bts",
    alias: ["btsarmy", "btsshorts"],
    desc: "Download random BTS Army short video",
    category: "download",
    react: "💜",
    filename: __filename
}, async (conn, mek, m, { from, text, reply }) => {
    let tempFile = null;
    try {
        const { default: yts } = await import('yt-search');
        
        // Random BTS search keywords agar user ne kuch na likha ho
        const btsQueries = [
            "bts army short video",
            "bts funny shorts",
            "bts edits shorts",
            "bts status video",
            "bts dance short video",
            "bts cute moments shorts",
            "bts army tiktok video"
        ];

        // Agar user ne aage koi naam diya ho to wo, warna list me se random search term
        const searchQuery = text ? `bts ${text} short` : btsQueries[Math.floor(Math.random() * btsQueries.length)];

        const search = await yts(searchQuery);
        if (!search || !search.videos || !search.videos.length) {
            return reply("❌ BTS ki koi video nahi mili! Dobara try karein.");
        }

        // Search results me se top 15 videos me se random video pick karega
        const maxIndex = Math.min(search.videos.length, 15);
        const vid = search.videos[Math.floor(Math.random() * maxIndex)];
        const url = vid.url;

        // Preview message
        await conn.sendMessage(from, {
            image: { url: vid.thumbnail },
            caption: `*💜 BTS ARMY VIDEO 💜*\n\n🎞️ *Title:* \({vid.title}\n📺 *Channel:*\){vid.author?.name || 'BTS Army'}\n🕒 *Duration:* ${vid.timestamp}\n\n*Status:* Video download ho rahi hai...\n\n> Powered by ERFAN-MD`
        }, { quoted: mek });

        let success = false;

        // ---- PHASE 1: Normal APIs (V3 → V1 → V2) ----
        const normalVideoAPIs = getNormalVideoAPIs(url);

        for (const apiUrl of normalVideoAPIs) {
            if (success) break;
            try {
                const response = await axios.get(apiUrl, { timeout: 25000 });
                const videoUrl = response.data?.status && response.data?.download?.url
                    ? response.data.download.url
                    : null;
                if (videoUrl) {
                    try {
                        await conn.sendMessage(from, {
                            video: { url: videoUrl },
                            caption: `💜 *${vid.title}*\n\n> Powered by ERFAN-MD`
                        }, { quoted: mek });
                        success = true;
                        break;
                    } catch (sendErr) {
                        console.error(`⚠️ Send failed (${apiUrl}):`, sendErr.message);
                        continue;
                    }
                }
            } catch (e) {
                console.error(`⚠️ API failed (${apiUrl}):`, e.message);
                continue;
            }
        }

        // ---- PHASE 2: Fallback ytdl → save to disk + send as document ----
        if (!success) {
            try {
                const fallbackUrl = getFallbackVideoAPI(url);
                const response = await axios.get(fallbackUrl, { timeout: 25000 });

                if (response.data?.status && response.data?.download?.urlx) {
                    const downloadURL = response.data.download.urlx;
                    const title = response.data.download.title || vid.title;

                    tempFile = path.join(os.tmpdir(), `bts_${Date.now()}.mp4`);

                    const fileRes = await axios({
                        method: 'GET',
                        url: downloadURL,
                        responseType: 'stream'
                    });

                    const writer = fs.createWriteStream(tempFile);
                    fileRes.data.pipe(writer);

                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });

                    await conn.sendMessage(from, {
                        document: { url: tempFile },
                        mimetype: "video/mp4",
                        fileName: `${title}.mp4`,
                        caption: `💜 *${title}*\n\n> Powered by ERFAN-MD`
                    }, { quoted: mek });

                    try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch {}
                    if (global.gc) global.gc();
                    tempFile = null;
                    success = true;
                }
            } catch (e) {
                try { if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch {}
                if (global.gc) global.gc();
                tempFile = null;
                console.error(`⚠️ ytdl fallback failed:`, e.message);
            }
        }

        if (!success) return reply("❌ Video download nahi ho saki! Kuch dair baad try karein.");
        await conn.sendMessage(from, { react: { text: '💜', key: m.key } });

    } catch (e) {
        try { if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch {}
        if (global.gc) global.gc();
        console.error("Error in .bts command:", e);
        reply("❌ Error aagaya hai, dobara try karein!");
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});
