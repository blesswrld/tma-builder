import React from "react";
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
  return (
    <div className="max-w-md mx-auto p-4 rounded-3xl bg-app-surface border border-app-border shadow-2xl space-y-4 font-sans">
      <div className="flex items-center justify-between border-b border-app-border pb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-app-primary font-mono">
            {selectedShop.name} Бот
          </span>
        </div>
        <span className="text-[10px] text-app-muted font-mono">Telegram Симулятор</span>
      </div>

      <div className="h-80 overflow-y-auto space-y-3 p-2 font-sans">
        {botSimMessages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              msg.sender === "user" ? "items-end" : "items-start"
            }`}
          >
            <div
              className={`p-3 rounded-2xl max-w-[80%] text-xs ${
                msg.sender === "user"
                  ? "bg-app-accent text-app-accent-fg"
                  : "bg-app-card text-app-primary border border-app-border"
              }`}
            >
              <p>{msg.text}</p>
              {msg.button && (
                <a
                  href={`/${selectedShop.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block w-full py-2 bg-app-accent text-app-accent-fg text-center rounded-xl font-mono text-xs font-bold hover:opacity-90 transition-colors"
                >
                  {msg.button}
                </a>
              )}
            </div>
            <span className="text-[9px] text-app-muted font-mono mt-1">
              {msg.time}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-t border-app-border pt-3">
        <input
          type="text"
          value={botSimInput}
          onChange={(e) => setBotSimInput(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && handleSendBotSimMessage(botSimInput)
          }
          placeholder="Введите /start или сообщение..."
          className="flex-1 bg-app-card border border-app-border rounded-xl px-3 py-2 text-xs text-app-primary focus:outline-none"
        />
        <button
          onClick={() => handleSendBotSimMessage(botSimInput)}
          className="px-3 py-2 bg-app-accent text-app-accent-fg rounded-xl font-mono text-xs font-bold cursor-pointer"
        >
          Отправить
        </button>
      </div>
    </div>
  );
}
