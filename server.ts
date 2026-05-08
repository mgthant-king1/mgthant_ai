import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Telegraf } from "telegraf";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";

interface BotConfig {
  telegramToken: string;
  geminiKey: string;
}

const CONFIG_PATH = path.join(process.cwd(), "bot-config.json");

function loadConfig(): BotConfig {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    } catch (e) {
      console.error("Failed to read bot-config.json", e);
    }
  }
  return { telegramToken: "", geminiKey: "" };
}

function saveConfig(config: BotConfig) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  let config = loadConfig();
  let bot: Telegraf | null = null;

  const initBot = async (token: string, geminiKey: string) => {
    if (bot) {
      try {
        await bot.stop("RESTARTING");
      } catch (err) {
        console.warn("Attempted to stop bot but it was not running:", err);
      }
    }

    if (!token) return null;

    try {
      const newBot = new Telegraf(token);
      const apiKey = (geminiKey || process.env.GEMINI_API_KEY || "").trim();
      
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        console.error("No valid API Key available for Telegram Bot. Please set GEMINI_API_KEY or provide a custom key in settings.");
        return null;
      }

      console.log(`Initializing bot with API key (first 4 chars): ${apiKey.substring(0, 4)}...`);

      const ai = new GoogleGenAI({ apiKey });

      newBot.start((ctx) => {
        ctx.reply("မင်္ဂလာပါ! ကျွန်တော်က MG THANT AI Telegram Bot ပါ။ ဘာတွေကို ကူညီပေးရမလဲခင်ဗျာ။");
      });

      newBot.on("text", async (ctx) => {
        const text = ctx.message.text;
        try {
          await ctx.sendChatAction("typing");
          
          const result = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [
              { role: 'user', parts: [{ text: text }] }
            ],
            config: {
              systemInstruction: "You are MG THANT AI, a Telegram bot. Respond professionally and concisely in Burmese.",
              temperature: 0.7,
              maxOutputTokens: 800
            }
          });
          
          const replyText = result.text || "တောင်းပန်ပါတယ်။ စာပြန်ဖို့ အခက်အခဲရှိနေပါတယ်။";
          await ctx.reply(replyText);
        } catch (err: any) {
          console.error("Gemini Telegram Error:", err);
          const errStr = JSON.stringify(err);
          if (errStr.includes("API_KEY_INVALID") || errStr.includes("key not valid") || errStr.includes("INVALID_ARGUMENT")) {
             await ctx.reply("တောင်းပန်ပါတယ်။ API Key မမှန်ကန်ပါ။ ကျေးဇူးပြု၍ Web App ရှိ Settings တွင် API Key ကို ပြန်လည်စစ်ဆေးပေးပြီး Sync Bot ကို ပြန်နှိပ်ပေးပါ။ (Invalid API Key)");
          } else if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("quota")) {
             await ctx.reply("တောင်းပန်ပါတယ်။ အသုံးပြုခွင့် Quota ပြည့်သွားပါပြီ။ ပိုမိုမြန်ဆန်စွာ အသုံးပြုနိုင်ရန် Web App Settings တွင် လူကြီးမင်း၏ ကိုယ်ပိုင် API Key ထည့်သွင်းအသုံးပြုပေးပါရန် အကြံပြုအပ်ပါသည်။ (Quota Exceeded)");
          } else {
             await ctx.reply("တောင်းပန်ပါတယ်။ အခုလောလောဆယ် စနစ်အတွင်း အနည်းငယ်အခက်အခဲရှိနေပါတယ်။ ခဏနေမှ ထပ်မံကြိုးစားကြည့်ပေးပါ။");
          }
        }
      });

      // Clear any existing webhooks before launching polling
      try {
        await newBot.telegram.deleteWebhook();
        newBot.launch().then(() => {
          console.log("Telegram Bot started successfully with dynamic token");
        }).catch(err => {
          console.error("Telegraf launch internal error:", err);
        });
      } catch (err) {
        console.error("Telegraf webhook deletion error:", err);
      }

      return newBot;
    } catch (e) {
      console.error("Bot initialization failed:", e);
      return null;
    }
  };

  // Initial boot
  if (config.telegramToken) {
    initBot(config.telegramToken, config.geminiKey).then(newBot => {
      bot = newBot;
    });
  }

  // API regions
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/bot/config", async (req, res) => {
    const { token, geminiKey } = req.body;
    config = { telegramToken: token, geminiKey };
    saveConfig(config);
    bot = await initBot(token, geminiKey);
    res.json({ status: "success", message: "Bot configuration updated and restarted" });
  });

  app.get("/api/bot/config", (req, res) => {
    res.json(config);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Graceful stop
  process.once('SIGINT', () => {
    try { bot?.stop('SIGINT'); } catch (e) {}
  });
  process.once('SIGTERM', () => {
    try { bot?.stop('SIGTERM'); } catch (e) {}
  });
}

startServer();
