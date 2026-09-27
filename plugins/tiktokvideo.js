// ERFAN-MD - Random TikTok Girl Command
import { fileURLToPath } from 'url';
import path from 'path';
import { cmd } from '../command.js';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cmd({
    pattern: "tiktokgirl",
    alias: ["ttgirl", "randomgirl", "tiktokg"],
    desc: "Get a random TikTok girl video",
    category: "download",
    react: "💃",
    filename: __filename
}, async (conn, mek, m, { from, reply, userConfig }) => {
    try {
        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        // ✅ NEW API - JSON response (search based)
        const API_URL = 'https://prexzyapis.com/search/tiktoksearch?q=beautiful%20girl';

        const BOT_NAME = userConfig?.BOT_NAME || config.BOT_NAME || "ERFAN-MD";

        // Fetch JSON response from the API
        const res = await fetch(API_URL);
        const json = await res.json();

        // Check if API returned success
        if (!json.status || json.statusCode !== 200) {
            throw new Error(json.data?.message || "API returned an error");
        }

        // Extract video list from response (adjust field names if needed)
        const results = json.data?.result || json.data?.data || json.data;

        if (!results || !Array.isArray(results) || results.length === 0) {
            throw new Error("No videos found in API response");
        }

        // Pick a random video from results
        const random = results[Math.floor(Math.random() * results.length)];

        // Try common video URL field names used by prexzy APIs
        const videoUrl = random.video || random.video_url || random.play || random.download || random.media;

        if (!videoUrl) {
            throw new Error("No video URL found in API response");
        }

        await conn.sendMessage(from, {
            video: { url: videoUrl },
            mimetype: 'video/mp4',
            caption: `💃 *Random TikTok Girl Video*\n\n> *Powered by ${BOT_NAME} ✅*`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("Error in .tiktokgirl:", e);
        await reply("❌ Failed to fetch random TikTok girl video! Try again later.");
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});
