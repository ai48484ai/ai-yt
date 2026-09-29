// ERFAN-MD
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';
import { cmd } from '../command.js';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════
// 🎵 TIKTOK SCRAPERS (LINK + SEARCH SCRAPER)
// ═══════════════════════════════════════════════════════════

const isTikTokUrl = (str) => {
    return /(tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com)/i.test(str);
};

// 1. Aapka direct link downloader (Xemoz)
async function downloadXemoz(url) {
    try {
        const res = await axios.get(`https://api-xemoz-official.my.id/api/donwloader/tiktok.php?url=${encodeURIComponent(url)}`, {
            timeout: 25000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const data = res.data;
        if (data?.status === true && data?.result?.result?.video?.length > 0) {
            return {
                videoUrl: data.result.result.video[0],
                username: data.result.result.username || "Unknown",
                title: data.result.result.type || "TikTok Video",
                duration: data.result.result.duration || "0:00",
                stats: data.result.result.stats || { views: "0", likes: "0", comments: "0", shares: "0" }
            };
        }
        return null;
    } catch {
        return null;
    }
}

// 2. Direct TikTok Search Scraper (TikWM Native Backend)
async function searchTikTokScraper(keyword) {
    try {
        const formData = new URLSearchParams();
        formData.append('keywords', keyword);
        formData.append('count', '10');
        formData.append('cursor', '0');
        formData.append('web', '1');
        formData.append('hd', '1');

        const res = await axios.post('https://www.tikwm.com/api/feed/search', formData.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Origin': 'https://www.tikwm.com',
                'Referer': 'https://www.tikwm.com/'
            },
            timeout: 25000
        });

        const data = res.data;
        if (data?.code === 0 && data?.data?.videos?.length > 0) {
            // Pehli working video select karega
            const video = data.data.videos[0];
            const cleanUrl = video.play.startsWith('http') ? video.play : `https://www.tikwm.com${video.play}`;

            return {
                videoUrl: cleanUrl,
                username: video.author?.unique_id || video.author?.nickname || "TikTok User",
                title: video.title || keyword,
                duration: `${video.duration || 0}s`,
                stats: {
                    views: video.play_count || "0",
                    likes: video.digg_count || "0",
                    comments: video.comment_count || "0",
                    shares: video.share_count || "0"
                }
            };
        }
        return null;
    } catch {
        return null;
    }
}

// ═══════════════════════════════════════════════════════════
// 🎵 COMMAND EXECUTION
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "ttvid",
    alias: ["tt", "ttdl", "tts"],
    desc: "Direct TikTok link downloader and live keyword search",
    category: "download",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, userConfig }) => {
    try {
        if (!q) {
            return await reply("🎯 *Input required!*\n\n• Link se: `.tt https://vt.tiktok.com/xxxx/`\n• Search se: `.tt imran khan speech`");
        }

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        let result = null;

        // Condition Check: Link hai ya search query?
        if (isTikTokUrl(q)) {
            result = await downloadXemoz(q);
        } else {
            result = await searchTikTokScraper(q);
        }

        if (!result || !result.videoUrl) {
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
            return await reply("❌ *Video nahi mil saki!* Dobara try karein ya keywords change karein.");
        }

        const BOT_NAME = userConfig?.BOT_NAME || config.BOT_NAME || "ERFAN-MD";

        await conn.sendMessage(from, {
            video: { url: result.videoUrl },
            mimetype: 'video/mp4',
            caption: `🎵 *TikTok Player*\n\n` +
                     `📝 *Title:* ${result.title}\n` +
                     `👤 *Username:* ${result.username}\n` +
                     `⏱️ *Duration:* ${result.duration}\n` +
                     `📊 *Stats:*\n` +
                     `   👁️ Views: ${result.stats.views}\n` +
                     `   ❤️ Likes: ${result.stats.likes}\n` +
                     `   💬 Comments: ${result.stats.comments}\n` +
                     `   🔄 Shares: ${result.stats.shares}\n\n` +
                     `*Powered by ${BOT_NAME} ✅*`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("❌ Error in TikTok command:", e);
        await reply("⚠️ *Error:* " + (e.message || "Failed to process video"));
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});
