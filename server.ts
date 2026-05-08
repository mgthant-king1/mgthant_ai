import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Telegraf } from "telegraf";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Telegram Bot Token from user request
  const BOT_TOKEN = "8774798466:AAGogZmMFPPuiHH3swTDXstevpVQmM7C4hU";
  
  // NOTE: We initialize the bot but don't add full logic here yet
  // as Gemini calls should be frontend-side according to guidelines.
  // However, we can run a simple bot that redirects to the Web App or handles basic commands.
  let bot: Telegraf | null = null;
  if (BOT_TOKEN && !BOT_TOKEN.includes("MY_BOT_TOKEN")) {
    try {
      bot = new Telegraf(BOT_TOKEN);
      bot.start((ctx) => {
        ctx.reply("မင်္ဂလာပါ! ကျွန်တော်က MG THANT AI ပါ။\nဒီမှာလည်း ကျွန်တော့်ကို အသုံးပြုနိုင်သလို၊ ပိုမိုကောင်းမွန်တဲ့ အတွေ့အကြုံအတွက် Web App ကိုလည်း သွားရောက်အသုံးပြုနိုင်ပါတယ်။\n\nWeb App link: " + (process.env.APP_URL || "https://ai.studio/build"));
      });
      
      // Delay launch slightly and clear webhook to allow previous instances to clear
      setTimeout(async () => {
        try {
          await bot?.telegram.deleteWebhook();
          await bot?.launch();
          console.log("Telegram Bot started successfully");
        } catch (err: any) {
          if (err.response?.error_code === 409) {
            console.warn("Telegram Bot Conflict (409): Another instance is running. This instance will skip launch.");
          } else {
            console.error("Telegram Bot Launch Error:", err);
          }
        }
      }, 2000);
    } catch (e) {
      console.error("Failed to initialize Telegram bot:", e);
    }
  }

  // API regions
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`App URL: ${process.env.APP_URL || 'Not Set'}`);
  });

  // Graceful stop
  process.once('SIGINT', () => bot?.stop('SIGINT'));
  process.once('SIGTERM', () => bot?.stop('SIGTERM'));
}

startServer();
