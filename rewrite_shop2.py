import re

with open('src/pages/ShopPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix remaining black borders that should be zinc
content = content.replace('border-white', 'border-black')
content = content.replace('selection:bg-white/20', 'selection:bg-zinc-200')
content = content.replace('bg-white/80', 'bg-white/80') 
content = content.replace('text-[#666]', 'text-zinc-500')
content = content.replace('border-[#333]', 'border-zinc-200')
content = content.replace('border-[#222]', 'border-zinc-200')
content = content.replace('bg-[#111]', 'bg-zinc-50')
content = content.replace('bg-[#050505]', 'bg-zinc-100')
content = content.replace('bg-[#0a0a0a]', 'bg-white')
content = content.replace('border-[#111]', 'border-zinc-200')
content = content.replace('border-[#444]', 'border-zinc-300')
content = content.replace('hover:border-[#444]', 'hover:border-zinc-300')
content = content.replace('hover:bg-[#333]', 'hover:bg-zinc-200')
content = content.replace('bg-[#000000]', 'bg-white')
content = content.replace('text-[#EDEDED]', 'text-zinc-900')
content = content.replace('hover:text-[#EDEDED]', 'hover:text-zinc-900')
content = content.replace('border-[#555]', 'border-zinc-300')
content = content.replace('bg-[#222]', 'bg-zinc-100')
content = content.replace('bg-[#1a1a1a]', 'bg-zinc-50')
content = content.replace('text-[#888]', 'text-zinc-500')

with open('src/pages/ShopPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

