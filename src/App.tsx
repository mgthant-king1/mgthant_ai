/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { GoogleGenAI } from "@google/genai";
import { 
  Send, 
  Image as ImageIcon, 
  Paperclip, 
  MoreVertical, 
  User, 
  Bot, 
  Loader2, 
  X,
  Edit2,
  Download,
  Info,
  Menu,
  Plus,
  History,
  Sparkles,
  MessageSquare,
  Search,
  Settings,
  HelpCircle,
  Lightbulb,
  Zap,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";

// --- Constants & Types ---

const MODEL_CHAT = "gemini-3-flash-preview";
const MODEL_IMAGE = "gemini-2.5-flash-image";

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  type: "text" | "image";
  timestamp: Date;
  imageData?: string; // base64
}

type AspectRatio = "1:1" | "4:3" | "16:9";
type ImageStyle = "None" | "Realistic" | "Cinematic" | "Anime" | "Oil Painting" | "Digital Art" | "Sketch" | "3D Render" | "Cyberpunk" | "Minimalist";

// --- Initialization ---

const DEFAULT_API_KEY = process.env.GEMINI_API_KEY;

if (!DEFAULT_API_KEY || DEFAULT_API_KEY === "MY_GEMINI_API_KEY") {
  console.warn("GEMINI_API_KEY is missing or using placeholder. Please set it in your environment variables.");
}

const defaultAI = new GoogleGenAI({ apiKey: DEFAULT_API_KEY || "" });

const getAI = (customKey?: string) => {
  const apiKey = customKey || DEFAULT_API_KEY || "";
  return new GoogleGenAI({ apiKey });
};

const BOT_NAME = "MG THANT AI";
const SYSTEM_INSTRUCTION = `You are MG THANT AI, a top-tier, modern, and professional AI assistant.
Your goal is to provide intelligent, sophisticated, and highly accurate assistance to Myanmar users.
Always respond in Burmese (Myanmar) language with a professional yet contemporary and polite tone.
Use modern Burmese terminology where appropriate. Avoid outdated or overly formal robotic speech; instead, be intellectually articulate and helpful.
If the user's request is complex, break it down logically.
You have a deep memory of the current conversation; use it to provide context-aware answers.
If the user asks for image generation or editing, acknowledge it professionally and wait for the system to process.
Your persona is: Intellectual, Reliable, Modern, and Culturally Aware.`;

// --- Utilities ---

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const applyWatermark = (base64: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(base64);
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // 2. Bottom Right Signature Plate with Logo
      const padding = canvas.width * 0.02;
      const fontSize = Math.floor(canvas.width / 42);
      const iconSize = fontSize * 1.4;
      const spacing = fontSize / 2;

      ctx.font = `bold ${fontSize}px sans-serif`;
      const text = "MG THANT AI";
      const textMetrics = ctx.measureText(text);
      
      const contentWidth = iconSize + spacing + textMetrics.width;
      const rectWidth = contentWidth + padding * 2;
      const rectHeight = Math.max(fontSize, iconSize) + padding;
      
      const rectX = canvas.width - rectWidth - padding;
      const rectY = canvas.height - rectHeight - padding;

      // Draw background glass effect
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.fillStyle = "rgba(10, 10, 10, 0.6)";
      ctx.beginPath();
      ctx.roundRect(rectX, rectY, rectWidth, rectHeight, 10);
      ctx.fill();
      ctx.restore();

      // Draw Stylized AI Logo Icon
      const iconCenterX = rectX + padding + iconSize / 2;
      const iconCenterY = rectY + rectHeight / 2;
      
      ctx.save();
      ctx.translate(iconCenterX, iconCenterY);
      
      // Main icon shape (Diamond)
      ctx.fillStyle = "#3b82f6"; // Brand Primary Blue
      ctx.beginPath();
      ctx.moveTo(0, -iconSize / 2);
      ctx.lineTo(iconSize / 2, 0);
      ctx.lineTo(0, iconSize / 2);
      ctx.lineTo(-iconSize / 2, 0);
      ctx.closePath();
      ctx.fill();
      
      // Inner Detail (Core)
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(0, 0, iconSize / 5, 0, Math.PI * 2);
      ctx.fill();
      
      // Small sparks/dots
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.arc(iconSize/3, -iconSize/3, iconSize/10, 0, Math.PI*2);
      ctx.fill();
      
      ctx.restore();

      // Draw text signature
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.letterSpacing = "1px";
      ctx.fillText(text, rectX + padding + iconSize + spacing, rectY + rectHeight / 2);

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(base64);
  });
};

// --- Components ---

const MessageBubble = ({ message }: { message: Message, key?: string }) => {
  const isBot = message.role === "bot";
  
  const handleDownload = () => {
    if (!message.imageData) return;
    const link = document.createElement("a");
    link.href = message.imageData;
    link.download = `mgthant_ai_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex w-full mb-8 px-4",
        isBot ? "justify-start" : "justify-end"
      )}
    >
      <div className={cn(
        "flex max-w-[92%] md:max-w-[85%] gap-4",
        isBot ? "flex-row" : "flex-row-reverse"
      )}>
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110",
          isBot ? "bg-brand/10 text-brand" : "bg-neutral-800 text-neutral-400"
        )}>
          {isBot ? <Sparkles size={18} /> : <User size={18} />}
        </div>
        
        <div className="flex-1 space-y-2">
          <div className={cn(
            "p-0 transition-all relative group/msg",
            isBot 
              ? "text-neutral-200" 
              : "bg-[#1e1f20] px-5 py-3 rounded-2xl border border-neutral-800 text-white shadow-sm"
          )}>
            {message.type === "image" && message.imageData ? (
              <div className="space-y-3 relative mt-2">
                <div className="relative group/img overflow-hidden rounded-2xl border border-neutral-800 shadow-2xl max-w-sm">
                  <img 
                    src={message.imageData} 
                    alt="Generated" 
                    className="max-w-full rounded-2xl"
                    referrerPolicy="no-referrer"
                  />
                  
                  <button 
                    onClick={handleDownload}
                    className="absolute top-3 right-3 p-2.5 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-md shadow-xl"
                  >
                    <Download size={16} />
                  </button>
                </div>
                {message.content && <p className="text-sm font-medium text-neutral-400">{message.content}</p>}
              </div>
            ) : (
              <p className={cn(
                "whitespace-pre-wrap break-words leading-relaxed text-[15px] md:text-[16px]",
                isBot ? "font-normal" : "font-medium"
              )}>
                {message.content}
              </p>
            )}
          </div>
          
          <div className={cn(
            "text-[10px] opacity-40 font-mono flex items-center gap-2",
            isBot ? "justify-start" : "justify-end"
          )}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const SUGGESTIONS = [
  { text: "လှပတဲ့ မြန်မာပြည် အလှအပ ပုံလေး ဆွဲပေးပါ", icon: <ImageIcon size={14} /> },
  { text: "Artificial Intelligence အကြောင်း ရှင်းပြပေးပါ", icon: <Lightbulb size={14} /> },
  { text: "Email တစ်စောင် ရေးပေးပါ", icon: <MessageSquare size={14} /> },
  { text: "ကုဒ်ရေးနည်း အခြေခံကို သင်ပေးပါ", icon: <Zap size={14} /> },
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("MG THANT AI is thinking...");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [imageStyle, setImageStyle] = useState<ImageStyle>("None");
  const [customApiKey, setCustomApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("mgthant_api_key");
    if (savedKey) setCustomApiKey(savedKey);

    // Global error handler to catch "Uncaught" errors
    const handleError = (event: ErrorEvent) => {
      console.error("Global error caught:", event.error);
      // We don't want to spam the user, but logging it helps
    };
    window.addEventListener("error", handleError);

    const saved = localStorage.getItem("mgthant_messages");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed.map((m: any) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
          })));
        } else {
          throw new Error("Parsed data is not an array");
        }
      } catch (e) {
        console.error("Failed to load history", e);
        localStorage.removeItem("mgthant_messages"); // Clear corrupt data
        setInitialMessages();
      }
    } else {
      setInitialMessages();
    }
  }, []);

  const setInitialMessages = () => {
    setMessages([
      {
        id: "initial",
        role: "bot",
        content: "မင်္ဂလာပါ! ကျွန်တော်က MG THANT AI ပါ။\nခင်မင်ရင်းနှီးစွာနဲ့ အကောင်းဆုံး ကူညီပေးသွားမှာပါ။ ကျွန်တော်က စာတွေရေးပေးနိုင်သလို၊ ပုံတွေလည်း ဖန်တီးပေးနိုင်ပါတယ်။\n\nဘာများ ကူညီပေးရမလဲခင်ဗျာ?",
        type: "text",
        timestamp: new Date()
      }
    ]);
  };

  const clearChat = () => {
    if (window.confirm("Chat history ကို ဖျက်မှာ သေချာပါသလား?")) {
      localStorage.removeItem("mgthant_messages");
      setInitialMessages();
    }
  };

  // Save to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        // Keep only last 30 messages
        // STRIP imageData to avoid QuotaExceededError as base64 images are very large
        const toSave = messages.slice(-30).map(m => {
          const { imageData, ...rest } = m;
          return {
            ...rest,
            timestamp: m.timestamp.toISOString()
          };
        });
        localStorage.setItem("mgthant_messages", JSON.stringify(toSave));
      } catch (e) {
        console.error("Failed to save history", e);
        // If it still fails, it might be other data in localStorage
      }
    }
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if ((!input.trim() && !selectedImages.length) || isLoading) return;

    const userText = input.trim();
    const currentImages = [...selectedImages];
    const hasImages = currentImages.length > 0;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText || (hasImages ? `[User sent ${currentImages.length} images]` : ""),
      type: hasImages ? "image" : "text",
      timestamp: new Date(),
      imageData: hasImages ? currentImages[0] : undefined // For legacy UI display in bubbles if needed, though bubble logic should ideally show all
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInput("");
    
    const isImageGenRequest = !hasImages && (
      /draw|generate|create|photo|image|picture|painting|art|illustration|sketch|ပုံဆွဲ|ပုံဖန်တီး|ဓါတ်ပုံ|ပုံလေး|ဆွဲပေး|ဖန်တီးပေး/i.test(userText)
    );
    const isEditRequest = hasImages && /edit|ပြင်|ပြောင်း|modify|change|retouch|ပြုပြင်/i.test(userText);
    const isVisionRequest = hasImages && !isEditRequest;

    if (isEditRequest) {
      setLoadingStatus("ပုံရိပ်များကို အဆင့်မြင့် နည်းပညာဖြင့် ပြုပြင်နေပါသည်...");
    } else if (isImageGenRequest) {
      setLoadingStatus("ပုံရိပ်အသစ်ကို အနုပညာမြောက်စွာ ဖန်တီးနေပါသည်...");
    } else if (isVisionRequest) {
      setLoadingStatus("ပုံရိပ်များကို ဆန်းစစ်လေ့လာနေပါသည်...");
    } else {
      setLoadingStatus("MG THANT AI မှ အသေးစိတ် ဆန်းစစ်နေပါသည်...");
    }

    // Now clear the selection state for the UI
    setSelectedImages([]);
    setIsLoading(true);
    let attempts = 0;
    const maxAttempts = 2;

    const executeRequest = async (): Promise<void> => {
      const ai = getAI(customApiKey);
      try {
        if (isEditRequest && currentImages.length > 0) {
          // Process based on the first image for actual "Editing"
          const primaryImage = currentImages[0];
          const mimeType = primaryImage.split(';')[0].split(':')[1] || "image/png";
          const base64Data = primaryImage.split(',')[1];

          // Additional context images if any
          const contextParts = currentImages.slice(1).map(img => {
            const m = img.split(';')[0].split(':')[1] || "image/png";
            const d = img.split(',')[1];
            return { inlineData: { data: d, mimeType: m } };
          });

          // Handle Image Editing
          const response = await ai.models.generateContent({
            model: MODEL_IMAGE,
            contents: {
              parts: [
                { inlineData: { data: base64Data, mimeType: mimeType } },
                ...contextParts,
                { text: `TASK: EDIT IMAGE. User Instruction: "${userText || "Enhance visual quality"}". Style: ${imageStyle}. Context: User provided ${currentImages.length} images. Use them for reference if needed.` }
              ]
            },
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              imageConfig: {
                aspectRatio: aspectRatio === "1:1" ? "1:1" : aspectRatio === "4:3" ? "4:3" : "16:9"
              }
            }
          });

          const botMsgId = (Date.now() + 1).toString();
          let foundImage = false;
          if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
                const watermarkedData = await applyWatermark(`data:${mimeType};base64,${part.inlineData.data}`);
                setMessages(prev => [...prev, {
                  id: botMsgId,
                  role: "bot",
                  content: `အနုပညာမြောက်စွာ ပြင်ဆင်ပြီးပါပြီ။`,
                  type: "image",
                  timestamp: new Date(),
                  imageData: watermarkedData
                }]);
                foundImage = true;
              }
            }
          }
          if (!foundImage) {
            setMessages(prev => [...prev, {
              id: botMsgId,
              role: "bot",
              content: response.text || "ပုံကို ပြုပြင်ရာတွင် နည်းပညာဆိုင်ရာ အခက်အခဲ ရှိနေပါသည်။",
              type: "text",
              timestamp: new Date()
            }]);
          }
        } else if (isImageGenRequest) {
          // Handle Image Generation
          const promptRes = await ai.models.generateContent({
            model: MODEL_CHAT,
            contents: `Act as a professional art director. Translate and expand this Burmese request into a highly detailed, world-class English image generation prompt.
            Style: ${imageStyle}. 
            Burmese request: "${userText}"
            (Reply ONLY with the expanded English prompt)`
          });
          const englishPrompt = promptRes.text?.trim() || userText;

          const response = await ai.models.generateContent({
            model: MODEL_IMAGE,
            contents: { parts: [{ text: `${englishPrompt}. Artistic Style: ${imageStyle}. Quality: Masterpiece.` }] },
            config: {
              systemInstruction: `You are a world-class image generator. Create a professional image in ${imageStyle} style.`,
              imageConfig: {
                aspectRatio: aspectRatio === "1:1" ? "1:1" : aspectRatio === "4:3" ? "4:3" : "16:9"
              }
            }
          });

          const botMsgId = (Date.now() + 1).toString();
          let foundImage = false;
          if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
                const watermarkedData = await applyWatermark(`data:image/png;base64,${part.inlineData.data}`);
                setMessages(prev => [...prev, {
                  id: botMsgId,
                  role: "bot",
                  content: `အဆင့်မြင့် နည်းပညာဖြင့် ဖန်တီးလိုက်ပါသည်။`,
                  type: "image",
                  timestamp: new Date(),
                  imageData: watermarkedData
                }]);
                foundImage = true;
              }
            }
          }

          if (!foundImage) {
            setMessages(prev => [...prev, {
              id: botMsgId,
              role: "bot",
              content: response.text || "ပုံဖန်တီးခြင်း လုပ်ငန်းစဉ်တွင် အခက်အခဲအချို့ ရှိနေပါသည်။",
              type: "text",
              timestamp: new Date()
            }]);
          }
        } else {
          // Optimized history for Chat and Vision with MULTIPLE images
          const history = messages
            .slice(-10) 
            .map(m => ({
              role: m.role === "bot" ? ("model" as const) : ("user" as const),
              parts: [{ text: m.type === "image" ? `[Image provided]` : m.content }]
            }));

          const currentParts: any[] = [];
          if (currentImages.length > 0) {
            currentImages.forEach(img => {
              const mimeType = img.split(';')[0].split(':')[1] || "image/png";
              const base64Data = img.split(',')[1];
              currentParts.push({ 
                inlineData: { data: base64Data, mimeType: mimeType } 
              });
            });
          }
          currentParts.push({ text: userText || (hasImages ? "ဤပုံရိပ်များကို ရှင်းပြပေးပါ။" : "Hello") });

          const result = await ai.models.generateContent({
            model: MODEL_CHAT,
            contents: [
              ...history,
              { role: 'user', parts: currentParts }
            ],
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              temperature: 0.7
            }
          });

          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: "bot",
            content: result.text || "တောင်းပန်ပါတယ်။ တစ်ခုခုအမှားအယွင်းရှိနေပါတယ်။",
            type: "text",
            timestamp: new Date()
          }]);
        }
      } catch (error: any) {
        attempts++;
        const errorString = JSON.stringify(error);
        const isRetryable = errorString.includes("429") || errorString.includes("500") || errorString.includes("xhr") || errorString.includes("quota");

        if (isRetryable && attempts < 3) { // Increased to 3 attempts
          const backoff = Math.pow(2, attempts) * 1000; // Exponential backoff: 2s, 4s
          setLoadingStatus(`ခဏစောင့်ဆိုင်းပေးပါ... (${attempts}/3)`);
          await sleep(backoff);
          return executeRequest();
        }

        console.error("AI Error:", error);
        let errorMessage = "တောင်းပန်ပါတယ်။ AI နဲ့ ချိတ်ဆက်ရာမှာ အခက်အခဲရှိနေပါတယ်။ ခဏနေပြီးမှ ပြန်ကြိုးစားပေးပါ။";
        
        if (!DEFAULT_API_KEY && !customApiKey) {
          errorMessage = "Error: API Key မရှိသေးပါ။ ကျေးဇူးပြု၍ Settings ထဲမှာ လူကြီးမင်း၏ API Key ကို ထည့်သွင်းပေးပါ။";
        } else if (errorString.includes("Rpc failed") || errorString.includes("500") || errorString.includes("xhr")) {
          errorMessage = "စနစ်အတွင်း အနည်းငယ် ဝန်ပိနေပါသဖြင့် ခဏနေမှ ထပ်မံကြိုးစားပေးပါ။ (Server busy or Large payload)";
        } else if (errorString.includes("429") || errorString.includes("RESOURCE_EXHAUSTED") || errorString.includes("quota")) {
          errorMessage = "ခွင့်ပြုထားသော အသုံးပြုမှု ပမာဏ (Quota) ကျော်လွန်သွားပါပြီ။ အခမဲ့အသုံးပြုခွင့် ကန့်သတ်ချက်ကြောင့် ဖြစ်နိုင်ပါသည်။ ခဏနားပြီးမှ ပြန်လည်အသုံးပြုပေးပါရန် သို့မဟုတ် settings ထဲတွင် လူကြီးမင်း၏ ကိုယ်ပိုင် API Key ကို အသုံးပြုပေးပါ။";
        }

        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: "bot",
          content: errorMessage,
          type: "text",
          timestamp: new Date()
        }]);
      }
    };

    executeRequest().finally(() => {
      setIsLoading(false);
    });
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 4 - selectedImages.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSelectedImages(prev => {
          if (prev.length >= 4) return prev;
          return [...prev, base64];
        });
      };
      reader.readAsDataURL(file);
    });
    
    // Clear input so same file can be re-selected if needed
    e.target.value = '';
  };

  return (
    <div className="flex h-screen bg-[#0e0e10] text-[#e3e3e3] font-sans selection:bg-brand/30 overflow-hidden">
      {/* Sidebar - Gemini Style */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 0, opacity: sidebarOpen ? 1 : 0 }}
        className={cn(
          "bg-[#1e1f20] border-r border-neutral-800/50 flex flex-col transition-all duration-300 relative z-20",
          !sidebarOpen && "pointer-events-none"
        )}
      >
        <div className="p-4 flex flex-col h-full">
          <button 
            onClick={() => {
              setMessages([]);
              setInitialMessages();
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-full bg-[#1a1c1e] border border-neutral-700/50 text-[#8e918f] hover:text-white hover:bg-neutral-800 transition-all mb-8 shadow-sm group"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            <span className="text-sm font-medium tracking-wide">New Chat</span>
          </button>

          <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
            <div className="px-4 py-2 text-[11px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Recent</div>
            {messages.length > 1 ? (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-neutral-800/50 text-[#e3e3e3] text-sm font-medium border border-neutral-700/30 hover:bg-neutral-800 transition-all cursor-pointer">
                <MessageSquare size={16} className="text-neutral-500" />
                <span className="truncate">
                  {messages.find(m => m.role === "user")?.content || "Current Conversation"}
                </span>
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-xs text-neutral-600 italic">No recent history</div>
            )}
          </div>

          <div className="mt-auto pt-4 border-t border-neutral-800/50 space-y-1">
             <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#e3e3e3] hover:bg-neutral-800 transition-colors text-sm">
                <HelpCircle size={18} />
                <span>Help</span>
             </button>
             <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#e3e3e3] hover:bg-neutral-800 transition-colors text-sm">
                <History size={18} />
                <span>Activity</span>
             </button>
             <button 
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#e3e3e3] hover:bg-neutral-800 transition-colors text-sm",
                  showSettings && "bg-neutral-800"
                )}
              >
                <Settings size={18} />
                <span>Settings</span>
             </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative bg-transparent">
        {/* Floating Background Glows */}
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-brand/5 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple-500/5 blur-[120px] pointer-events-none rounded-full" />

        {/* Top Navbar */}
        <header className="flex items-center justify-between px-5 h-16 bg-transparent relative z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 group cursor-default">
               <span className="text-xl font-medium gemini-gradient-text tracking-tight uppercase">{BOT_NAME}</span>
               <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-neutral-800 border border-neutral-700 text-neutral-400 font-bold tracking-tighter">PRO</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2.5 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400">
              <Search size={20} />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-brand to-purple-500 flex items-center justify-center p-[2px] shadow-lg">
               <div className="w-full h-full bg-[#1e1f20] rounded-full flex items-center justify-center overflow-hidden">
                  <User size={18} className="text-neutral-400" />
               </div>
            </div>
          </div>
        </header>

        {/* Chat / Workspace Area */}
        <main 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 md:px-8 pt-4 pb-32 relative custom-scrollbar"
        >
          {messages.length <= 1 && (
            <div className="max-w-2xl mx-auto mt-12 mb-12 flex flex-col items-center">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 className="flex flex-col items-center text-center mb-16"
               >
                 <div className="w-20 h-20 bg-brand/10 rounded-3xl flex items-center justify-center mb-6 relative">
                    <div className="absolute inset-0 bg-brand/20 blur-xl animate-pulse" />
                    <Sparkles size={40} className="text-brand relative" />
                 </div>
                 <h2 className="text-4xl md:text-5xl font-semibold mb-4 tracking-tight gemini-gradient-text">
                   Hello, How can I help?
                 </h2>
                 <p className="text-neutral-400 text-lg max-w-md mx-auto">
                   MG THANT AI is your sophisticated companion for creativity, reasoning, and vision.
                 </p>
               </motion.div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => {
                        setInput(s.text);
                      }}
                      className="group flex items-start gap-4 p-4 rounded-2xl bg-[#1e1f20] border border-neutral-800/50 hover:bg-[#2a2b2d] hover:border-neutral-700 transition-all text-left"
                    >
                      <div className="p-2 rounded-xl bg-neutral-800 group-hover:bg-brand/20 group-hover:text-brand transition-colors">
                        {s.icon}
                      </div>
                      <span className="text-sm font-medium text-neutral-300 leading-tight">
                        {s.text}
                      </span>
                    </motion.button>
                  ))}
               </div>
            </div>
          )}

          <div className="max-w-3xl mx-auto space-y-2 mt-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex px-4 ml-12 gap-2"
              >
                <div className="bg-[#1e1f20] px-5 py-3 rounded-2xl border border-neutral-800 flex items-center gap-3 shadow-xl">
                   <div className="relative">
                      <Loader2 size={18} className="animate-spin text-brand" />
                      <div className="absolute inset-0 bg-brand/20 blur-md" />
                   </div>
                   <span className="text-sm text-neutral-400 font-medium tracking-wide italic">{loadingStatus}</span>
                </div>
              </motion.div>
            )}
          </div>
        </main>

        {/* Action Area (Footer) */}
        <footer className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-[#0e0e10] via-[#0e0e10] to-transparent z-10">
          <div className="max-w-3xl mx-auto">
            <AnimatePresence>
              {showSettings && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: 10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: 10 }}
                  className="mb-4 bg-[#1e1f20] border border-neutral-800/80 rounded-2xl p-5 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Lock size={14} className="text-brand" />
                        <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-[0.2em] block">Custom Gemini API Key</label>
                      </div>
                      <div className="relative">
                        <input 
                          type="password"
                          value={customApiKey}
                          onChange={(e) => {
                            setCustomApiKey(e.target.value);
                            localStorage.setItem("mgthant_api_key", e.target.value);
                          }}
                          placeholder="Paste your API key here..."
                          className="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-xl px-4 py-2.5 text-sm focus:border-brand/50 focus:ring-1 focus:ring-brand/20 outline-none transition-all pr-10"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          {customApiKey && (
                            <button 
                              onClick={() => {
                                setCustomApiKey("");
                                localStorage.removeItem("mgthant_api_key");
                              }}
                              className="text-neutral-600 hover:text-red-400 transition-colors"
                              title="Clear key"
                            >
                              <X size={14} />
                            </button>
                          )}
                          <Settings size={14} className="text-neutral-500" />
                        </div>
                      </div>
                      <p className="mt-2 text-[10px] text-neutral-500 leading-relaxed">
                        လူကြီးမင်း၏ ကိုယ်ပိုင် API Key ကို အသုံးပြုခြင်းဖြင့် ပိုမိုမြန်ဆန်ပြီး ကန့်သတ်ချက်မဲ့ အသုံးပြုနိုင်ပါသည်။ (Saved locally)
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles size={14} className="text-brand" />
                        <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-[0.2em] block">Aspect Ratio</label>
                      </div>
                      <div className="flex gap-2">
                        {(["1:1", "4:3", "16:9"] as AspectRatio[]).map((ratio) => (
                          <button
                            key={ratio}
                            onClick={() => setAspectRatio(ratio)}
                            className={cn(
                              "px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border",
                              aspectRatio === ratio 
                                ? "bg-brand text-white border-brand shadow-lg shadow-brand/10" 
                                : "bg-neutral-800/50 text-neutral-400 border-neutral-700/50 hover:bg-neutral-800 hover:text-white"
                            )}
                          >
                            {ratio}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Zap size={14} className="text-brand" />
                        <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-[0.2em] block">Fine-tune Artistic Style</label>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(["None", "Realistic", "Cinematic", "Anime", "Oil Painting", "Digital Art", "3D Render", "Cyberpunk", "Minimalist"] as ImageStyle[]).map((style) => (
                          <button
                            key={style}
                            onClick={() => setImageStyle(style)}
                            className={cn(
                              "px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-200 border",
                              imageStyle === style 
                                ? "bg-brand/10 text-brand border-brand/50 shadow-sm" 
                                : "bg-neutral-800/50 text-neutral-400 border-neutral-700/50 hover:border-neutral-600 hover:text-white"
                            )}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-[#1e1f20] rounded-[32px] border border-neutral-800 p-2 md:p-3 shadow-[0_8px_30px_rgb(0,0,0,0.3)] transition-all duration-300 focus-within:border-brand/40 group relative ring-offset-0 focus-within:ring-4 focus-within:ring-brand/5">
               {selectedImages.length > 0 && (
                <div className="px-3 py-2 mb-2 flex flex-wrap gap-3 max-h-32 overflow-y-auto custom-scrollbar">
                  {selectedImages.map((img, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group/pic inline-block"
                    >
                      <img 
                        src={img} 
                        alt={`Upload ${idx}`} 
                        className="h-16 w-16 object-cover rounded-xl border border-neutral-700 shadow-xl" 
                      />
                      <button 
                        onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-1.5 -right-1.5 bg-neutral-900 border border-neutral-700 p-1 rounded-full text-neutral-400 hover:text-red-400 shadow-lg"
                      >
                        <X size={10} />
                      </button>
                    </motion.div>
                  ))}
                  {selectedImages.length < 4 && (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="h-16 w-16 flex items-center justify-center rounded-xl border-2 border-dashed border-neutral-800 text-neutral-600 hover:border-neutral-700 hover:text-neutral-500 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                </div>
               )}

               <div className="flex items-end">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => {
                        if (selectedImages.length >= 4) return;
                        fileInputRef.current?.click();
                      }}
                      className={cn(
                        "p-3 rounded-full transition-all",
                        selectedImages.length >= 4 ? "text-neutral-700 cursor-not-allowed" : "text-neutral-400 hover:text-brand hover:bg-brand/10"
                      )}
                      disabled={selectedImages.length >= 4}
                    >
                      <Paperclip size={20} />
                    </button>
                    <button 
                      onClick={() => setShowSettings(!showSettings)}
                      className={cn(
                        "p-3 rounded-full transition-all",
                        showSettings ? "bg-brand/10 text-brand" : "text-neutral-400 hover:text-brand hover:bg-brand/10"
                      )}
                    >
                      <ImageIcon size={20} />
                    </button>
                  </div>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={onFileChange} 
                    className="hidden" 
                    accept="image/*"
                  />

                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Enter a prompt here..."
                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 px-3 text-[16px] min-h-[52px] max-h-40 placeholder-neutral-500 text-white"
                    rows={1}
                  />

                  <button
                    onClick={handleSendMessage}
                    disabled={(!input.trim() && !selectedImages.length) || isLoading}
                    className={cn(
                      "flex items-center justify-center h-12 w-12 rounded-2xl transition-all duration-300",
                      (input.trim() || selectedImages.length > 0) && !isLoading
                        ? "bg-brand text-white shadow-lg shadow-brand/20 hover:scale-105 active:scale-95"
                        : "bg-neutral-800 text-neutral-600 grayscale px-3"
                    )}
                  >
                    {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
               </div>
            </div>
            
            <p className="mt-3 text-center text-[10px] text-neutral-600 font-medium uppercase tracking-[0.2em] flex items-center justify-center gap-2">
               MG THANT AI may display inaccurate info, including about people, so double-check its responses.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
