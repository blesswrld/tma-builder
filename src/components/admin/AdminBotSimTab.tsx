import React, { useRef, useEffect } from "react";
import { Send, Bot, ExternalLink, Sparkles } from "lucide-react";
import { Shop } from "../../types";

interface AdminBotSimTabProps {
  selectedShop: Shop;
  botSimMessages: Array<{
    sender: "bot" | "user";
    text: string;
    button?: string;
    time: string;
  }>;
  botSimInput: string;
  setBotSimInput: (val: string) => void;
  handleSendBotSimMessage: (text: string) => void;
}

export function AdminBotSimTab({
  selectedShop,
  botSimMessages,
  botSimInput,
  setBotSimInput,
  handleSendBotSimMessage,
}: AdminBotSimTabProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [botSimMessages]);

  const quickCommands = ["/start", "/help", "Каталог", "Акции", "Где заказ?"];

  return (
    <div className="w-full max-w-lg mx-auto p-4 sm:p-5 rounded-3xl bg-app-surface border border-app-border shadow-xl space-y-4 font-sans">
      {/* Bot Header */}
      <div className="flex items-center justify-between border-b border-app-border pb-3 px-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-app-card border border-app-border flex items-center justify-center text-app-primary">
              <Bot size={16} />
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-app-surface absolute -bottom-0.5 -right-0.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-app-primary font-mono truncate">
              {selectedShop.name} Бот
            </p>
            <p className="text-[10px] text-app-muted font-mono truncate">@bot_simulator • Онлайн</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <a
            href={`/${selectedShop.slug}`}
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1 text-[11px] font-mono text-app-secondary hover:text-app-primary bg-app-card border border-app-border rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title="Открыть реальную витрину"
          >
            <ExternalLink size={11} />
            <span className="hidden sm:inline">Витрина</span>
          </a>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="h-72 sm:h-96 overflow-y-auto space-y-3 p-1 sm:p-2 custom-scrollbar overscroll-contain">
        {botSimMessages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              msg.sender === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`p-3 rounded-2xl max-w-[88%] sm:max-w-[80%] text-xs leading-relaxed ${
                msg.sender === "user"
                  ? "bg-app-accent text-app-accent-fg rounded-br-xs font-medium"
                  : "bg-app-card text-app-primary border border-app-border rounded-bl-xs"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
              {msg.button && (
                <a
                  href={`/${selectedShop.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2.5 block w-full py-2 px-3 bg-app-surface hover:bg-app-hover border border-app-border text-app-primary text-center rounded-xl font-mono text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  {msg.button} ↗
                </a>
              )}
            </div>
            <span className="text-[9px] text-app-muted font-mono mt-1 px-1">
              {msg.time}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggested Commands */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 touch-scroll-x scrollbar-none text-[11px] font-mono">
        <Sparkles size={12} className="text-app-muted shrink-0 ml-1" />
        {quickCommands.map((cmd) => (
          <button
            key={cmd}
            type="button"
            onClick={() => handleSendBotSimMessage(cmd)}
            className="px-2.5 py-1 bg-app-card hover:bg-app-hover border border-app-border rounded-lg text-app-secondary hover:text-app-primary whitespace-nowrap transition-colors cursor-pointer shrink-0"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="flex gap-2 border-t border-app-border pt-3">
        <input
          type="text"
          value={botSimInput}
          onChange={(e) => setBotSimInput(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && botSimInput.trim() && handleSendBotSimMessage(botSimInput)
          }
          placeholder="Введите команду или вопрос..."
          className="flex-1 bg-app-card border border-app-border rounded-xl px-3.5 py-2.5 text-xs text-app-primary placeholder:text-app-muted focus:outline-none focus:border-app-border transition-colors font-sans"
        />
        <button
          onClick={() => botSimInput.trim() && handleSendBotSimMessage(botSimInput)}
          disabled={!botSimInput.trim()}
          className="px-3.5 py-2.5 bg-app-accent text-app-accent-fg rounded-xl font-mono text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shadow-xs"
        >
          <Send size={13} />
          <span className="hidden sm:inline">Отправить</span>
        </button>
      </div>
    </div>
  );
}
