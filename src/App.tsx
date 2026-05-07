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
  Info
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
type ImageStyle = "None" | "Realistic" | "Cinematic" | "Anime" | "Oil Painting" | "Digital Art" | "Sketch";

// --- Initialization ---

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY || API_KEY === "MY_GEMINI_API_KEY") {
  console.warn("GEMINI_API_KEY is missing or using placeholder. Please set it in your environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "" });

const BOT_NAME = "MG THANT AI";
const SYSTEM_INSTRUCTION = `You are a helpful assistant named ${BOT_NAME}. 
You must always reply in Burmese language (Myanmar). 
Your style should be professional yet friendly and natural. 
Avoid being overly formal; speak like a helpful friend. 
Keep replies concise and fast. 
If the user asks for image generation or editing, acknowledge it in Burmese and wait for the system to process.`;

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
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "flex w-full mb-4 px-4",
        isBot ? "justify-start" : "justify-end"
      )}
    >
      <div className={cn(
        "flex max-w-[85%] md:max-w-[70%] items-end gap-2",
        isBot ? "flex-row" : "flex-row-reverse"
      )}>
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isBot ? "bg-brand text-white" : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
        )}>
          {isBot ? <Bot size={18} /> : <User size={18} />}
        </div>
        
        <div className={cn(
          "px-4 py-2 rounded-2xl shadow-sm relative group/msg",
          isBot 
            ? "bg-white text-neutral-900 rounded-bl-none dark:bg-neutral-800 dark:text-neutral-100" 
            : "bg-brand text-white rounded-br-none"
        )}>
          {message.type === "image" && message.imageData ? (
            <div className="space-y-2 relative">
              <div className="relative group/img">
                <img 
                  src={message.imageData} 
                  alt="Generated" 
                  className="max-w-full rounded-lg shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={handleDownload}
                  className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-sm"
                  title="Download Image"
                >
                  <Download size={16} />
                </button>
              </div>
              {message.content && <p className="text-sm font-medium">{message.content}</p>}
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words leading-relaxed text-[15px]">
              {message.content}
            </p>
          )}
          <div className={cn(
            "text-[10px] mt-1 text-right opacity-60",
            !isBot && "text-blue-100"
          )}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [imageStyle, setImageStyle] = useState<ImageStyle>("None");
  const [showSettings, setShowSettings] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("mgthant_messages");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    } else {
      setMessages([
        {
          id: "initial",
          role: "bot",
          content: "မင်္ဂလာပါ! ကျွန်တော်က MG THANT AI ပါ။\nခင်မင်ရင်းနှီးစွာနဲ့ အကောင်းဆုံး ကူညီပေးသွားမှာပါ။ ကျွန်တော်က စာတွေရေးပေးနိုင်သလို၊ ပုံတွေလည်း ဖန်တီးပေးနိုင်ပါတယ်။\n\nဘာများ ကူညီပေးရမလဲခင်ဗျာ?",
          type: "text",
          timestamp: new Date()
        }
      ]);
    }
  }, []);

  // Save to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Keep only last 30 messages to prevent quota/storage issues
      localStorage.setItem("mgthant_messages", JSON.stringify(messages.slice(-30)));
    }
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userText = input.trim();
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
      type: selectedImage ? "image" : "text",
      timestamp: new Date(),
      imageData: selectedImage || undefined
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInput("");
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // 1. Intent Detection
      const isImageGenRequest = !selectedImage && (
        /draw|generate|create|photo|image|picture|painting|ပုံဆွဲ|ပုံဖန်တီး|ဓါတ်ပုံ|ပုံလေး|ဆွဲပေး/i.test(userText)
      );

      const isEditRequest = selectedImage && /edit|ပြင်|ပြောင်း/i.test(userText);

      if (isEditRequest) {
        // Handle Image Editing
        const response = await ai.models.generateContent({
          model: MODEL_IMAGE,
          contents: {
            parts: [
              { inlineData: { data: selectedImage.split(',')[1], mimeType: "image/png" } },
              { text: `${userText || "edit this image"}. Maintain aspect ratio ${aspectRatio}.` }
            ]
          },
          config: {
            systemInstruction: SYSTEM_INSTRUCTION
          }
        });

        const botMsgId = (Date.now() + 1).toString();
        let foundImage = false;
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            setMessages(prev => [...prev, {
              id: botMsgId,
              role: "bot",
              content: "ပုံကို ပြင်ဆင်ပြီးပါပြီ။",
              type: "image",
              timestamp: new Date(),
              imageData: `data:image/png;base64,${part.inlineData.data}`
            }]);
            foundImage = true;
          }
        }
        if (!foundImage && response.text) {
          setMessages(prev => [...prev, {
            id: botMsgId,
            role: "bot",
            content: response.text,
            type: "text",
            timestamp: new Date()
          }]);
        }
      } else if (isImageGenRequest) {
        // Handle Image Generation
        const promptRes = await ai.models.generateContent({
          model: MODEL_CHAT,
          contents: `Create a brief English image generation prompt based on this Burmese request. 
          Style preference: ${imageStyle}. 
          Aspect Ratio: ${aspectRatio}.
          Burmese request: ${userText}
          (reply ONLY with the prompt)`
        });
        const englishPrompt = promptRes.text?.trim() || userText;

        const response = await ai.models.generateContent({
          model: MODEL_IMAGE,
          contents: { parts: [{ text: `${englishPrompt}. Style: ${imageStyle}. Aspect ratio: ${aspectRatio}.` }] },
          config: {
            systemInstruction: `You are an expert image generator. Generate the image in ${aspectRatio} aspect ratio and ${imageStyle} style.`
          }
        });

        const botMsgId = (Date.now() + 1).toString();
        let foundImage = false;
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            setMessages(prev => [...prev, {
              id: botMsgId,
              role: "bot",
              content: `ပုံဖန်တီးပြီးပါပြီ။ (Aspect: ${aspectRatio}, Style: ${imageStyle})`,
              type: "image",
              timestamp: new Date(),
              imageData: `data:image/png;base64,${part.inlineData.data}`
            }]);
            foundImage = true;
          }
        }

        if (!foundImage) {
           setMessages(prev => [...prev, {
             id: botMsgId,
             role: "bot",
             content: response.text || "ပုံဖန်တီးရာမှာ အဆင်မပြေဖြစ်သွားပါတယ်။",
             type: "text",
             timestamp: new Date()
           }]);
        }

      } else {
        // Handle Standard Chat
        // We use the chat session to handle history properly
        const history = messages
          .filter(m => m.type === "text")
          .slice(-10)
          .map(m => ({
            role: m.role === "bot" ? ("model" as const) : ("user" as const),
            parts: [{ text: m.content }]
          }));

        const result = await ai.models.generateContent({
           model: MODEL_CHAT,
           contents: [
             ...history,
             { role: 'user', parts: [{ text: userText || "Hello" }] }
           ],
           config: {
             systemInstruction: SYSTEM_INSTRUCTION
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
      console.error("AI Error:", error);
      let errorMessage = "တောင်းပန်ပါတယ်။ AI နဲ့ ချိတ်ဆက်ရာမှာ အခက်အခဲရှိနေပါတယ်။ ခဏနေပြီးမှ ပြန်ကြိုးစားပေးပါ။";
      
      if (!API_KEY || API_KEY === "MY_GEMINI_API_KEY") {
        errorMessage = "Error: GEMINI_API_KEY မရှိသေးပါ။ ကျေးဇူးပြု၍ Settings ထဲမှာ API Key ထည့်ပေးပါ။";
      } else if (error?.message?.includes("Rpc failed") || error?.message?.includes("xhr")) {
        errorMessage = "ကွန်ရက်အမှားအယွင်း ဖြစ်ပေါ်နေပါတယ်။ ကျေးဇူးပြု၍ Internet connection ကို စစ်ဆေးပေးပါ။";
      }

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "bot",
        content: errorMessage,
        type: "text",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f0f0f] text-neutral-100 font-sans selection:bg-brand/30">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-[#1a1a1b] border-b border-neutral-800 z-10 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand rounded-full flex items-center justify-center shadow-lg shadow-brand/20">
            <Bot size={28} className="text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-lg tracking-tight text-white">{BOT_NAME}</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-neutral-400 font-medium lowercase tracking-wide">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white">
            <Info size={20} />
          </button>
          <button className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white">
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto pt-6 pb-24 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent"
      >
        <div className="max-w-4xl mx-auto space-y-2">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex px-4 ml-12 gap-2"
            >
              <div className="bg-neutral-800 px-4 py-3 rounded-2xl rounded-bl-none flex items-center gap-3">
                 <Loader2 size={16} className="animate-spin text-brand" />
                 <span className="text-sm text-neutral-400 font-medium">MG THANT AI is thinking...</span>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f] to-transparent">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence>
            {showSettings && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: 10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: 10 }}
                className="mb-4 bg-[#1a1a1b] border border-neutral-800 rounded-2xl p-4 overflow-hidden shadow-2xl"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest block mb-3">Aspect Ratio</label>
                    <div className="flex gap-2">
                      {(["1:1", "4:3", "16:9"] as AspectRatio[]).map((ratio) => (
                        <button
                          key={ratio}
                          onClick={() => setAspectRatio(ratio)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                            aspectRatio === ratio 
                              ? "bg-brand text-white shadow-lg shadow-brand/20" 
                              : "bg-neutral-800 text-neutral-400 hover:text-white"
                          )}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest block mb-3">Artistic Style</label>
                    <div className="flex flex-wrap gap-2">
                      {(["None", "Realistic", "Cinematic", "Anime", "Oil Painting", "Digital Art"] as ImageStyle[]).map((style) => (
                        <button
                          key={style}
                          onClick={() => setImageStyle(style)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                            imageStyle === style 
                              ? "bg-brand/20 text-brand border border-brand/50" 
                              : "bg-neutral-800 text-neutral-400 border border-transparent hover:border-neutral-700"
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

          {selectedImage && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-3 relative inline-block p-1 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md"
            >
              <img 
                src={selectedImage} 
                alt="Selected" 
                className="h-24 w-auto rounded-lg object-contain shadow-2xl" 
              />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                aria-label="Remove image"
              >
                <X size={12} className="text-white" />
              </button>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40 rounded-lg pointer-events-none">
                <Edit2 size={24} className="text-white/80" />
              </div>
            </motion.div>
          )}

          <div className="relative group">
            <div className="absolute inset-0 bg-brand/5 blur-xl group-focus-within:bg-brand/10 transition-colors pointer-events-none" />
            <div className="relative flex items-end gap-2 bg-[#1a1a1b] p-2 rounded-[28px] border border-neutral-800 shadow-2xl focus-within:border-brand/40 focus-within:ring-1 focus-within:ring-brand/40 transition-all duration-300">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-neutral-400 hover:text-brand hover:bg-brand/10 rounded-full transition-all"
                title="Add Photo"
              >
                <Paperclip size={22} />
              </button>

              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  "p-3 rounded-full transition-all",
                  showSettings ? "bg-brand/10 text-brand" : "text-neutral-400 hover:text-brand hover:bg-brand/10"
                )}
                title="Image Settings"
              >
                <ImageIcon size={22} />
              </button>
              
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
                placeholder="မက်ဆေ့ခ်ျ ရေးပါ..."
                className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 px-2 text-[15px] min-h-[48px] max-h-48 text-white placeholder-neutral-500"
                rows={1}
              />

              <button
                onClick={handleSendMessage}
                disabled={(!input.trim() && !selectedImage) || isLoading}
                className={cn(
                  "p-3 rounded-full transition-all duration-300",
                  (input.trim() || selectedImage) && !isLoading
                    ? "bg-brand text-white shadow-lg shadow-brand/20 scale-100 hover:scale-110 active:scale-95"
                    : "bg-neutral-800 text-neutral-600 scale-95 cursor-not-allowed"
                )}
              >
                {isLoading ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} />}
              </button>
            </div>
          </div>
          <div className="mt-2 text-center">
             <p className="text-[10px] text-neutral-600 uppercase tracking-widest font-medium">
               Powered by Gemini AI • Burmese Assistant
             </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
