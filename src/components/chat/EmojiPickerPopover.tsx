import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Smile, Flame, Sparkles, Heart, Search, X } from "lucide-react";

interface EmojiPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
}

const EMOJI_CATEGORIES = [
  {
    id: "popular",
    name: "Популярные",
    icon: Flame,
    emojis: ["👍", "❤️", "🔥", "🚀", "🎉", "😊", "🙏", "👌", "💡", "💯", "👋", "🙌", "✨", "💪", "✅", "⚡"]
  },
  {
    id: "faces",
    name: "Смайлы",
    icon: Smile,
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥹", "☺️", "😊", "😇",
      "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😋", "😛", "😜", "🤪",
      "🤨", "🧐", "🤓", "😎", "🥸", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟",
      "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😮‍💨", "😤",
      "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓",
      "🤗", "🤔", "🫣", "🤭", "🫢", "🫡", "🤫", "🫠", "🤥", "😶", "😐", "😑"
    ]
  },
  {
    id: "hands",
    name: "Жесты",
    icon: Heart,
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "🫱", "🫲", "🫳", "🫴", "👌", "🤌", "🤏",
      "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️",
      "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🤝",
      "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃"
    ]
  },
  {
    id: "tech_objects",
    name: "IT и Бизнес",
    icon: Sparkles,
    emojis: [
      "💻", "🖥️", "📱", "📲", "☎️", "📟", "📠", "🔋", "🔌", "⚙️", "🛠️", "🔧",
      "🔨", "📦", "📫", "📨", "✉️", "📊", "📈", "📉", "🗂️", "📁", "📂", "💳",
      "💰", "🪙", "💵", "💎", "🔒", "🔑", "🛡️", "🔔", "📣", "📢", "🎯", "🏷️"
    ]
  },
  {
    id: "symbols",
    name: "Символы",
    icon: Sparkles,
    emojis: [
      "✅", "❌", "⚠️", "⛔", "🚫", "💡", "⚡", "⭐", "🌟", "✨", "🔥", "💥",
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕",
      "❓", "❗", "💬", "💭", "🗨️", "📢", "📌", "📍", "🔗", "🔍", "🔎", "🚀"
    ]
  }
];

export const QUICK_EMOJIS = ["👍", "❤️", "🔥", "🚀", "💡", "🙏", "✅", "😊", "👋", "🎉"];

export default function EmojiPickerPopover({
  isOpen,
  onClose,
  onSelectEmoji
}: EmojiPickerPopoverProps) {
  const [activeCategory, setActiveCategory] = useState("popular");
  const [search, setSearch] = useState("");

  const filteredEmojis = useMemo(() => {
    if (!search.trim()) {
      const cat = EMOJI_CATEGORIES.find((c) => c.id === activeCategory);
      return cat ? cat.emojis : EMOJI_CATEGORIES[0].emojis;
    }
    // Search across all
    const all = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
    return Array.from(new Set(all));
  }, [activeCategory, search]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="absolute bottom-full mb-2 right-0 sm:right-4 z-40 w-80 sm:w-96 bg-app-card border border-app-border rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header with search */}
        <div className="p-2.5 border-b border-app-border flex items-center gap-2 bg-app-bg/50">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-app-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск эмодзи..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-app-card border border-app-border rounded-xl text-app-primary placeholder:text-app-muted focus:outline-none focus:border-app-accent"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-app-muted hover:text-app-primary"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-app-muted hover:text-app-primary hover:bg-app-hover rounded-lg transition"
          >
            <X size={14} />
          </button>
        </div>

        {/* Category Tabs */}
        {!search && (
          <div className="flex items-center gap-1 px-2.5 py-1.5 border-b border-app-border overflow-x-auto no-scrollbar">
            {EMOJI_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? "bg-app-accent text-app-accent-fg font-semibold shadow-xs"
                      : "text-app-muted hover:text-app-primary hover:bg-app-hover"
                  }`}
                >
                  <Icon size={12} />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Emoji Grid */}
        <div className="p-2.5 grid grid-cols-8 gap-1.5 max-h-56 overflow-y-auto custom-scrollbar">
          {filteredEmojis.map((emoji, idx) => (
            <button
              key={`${emoji}-${idx}`}
              onClick={() => {
                onSelectEmoji(emoji);
              }}
              className="w-8 h-8 flex items-center justify-center text-lg hover:scale-125 hover:bg-app-hover active:scale-95 rounded-lg transition-transform cursor-pointer select-none"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Quick Footer */}
        <div className="px-2.5 py-1.5 border-t border-app-border bg-app-bg/30 flex items-center justify-between text-[11px] text-app-muted">
          <span>Нажмите на эмодзи для вставки</span>
          <button
            onClick={onClose}
            className="hover:text-app-primary font-medium cursor-pointer"
          >
            Готово
          </button>
        </div>
      </div>
    </AnimatePresence>
  );
}
