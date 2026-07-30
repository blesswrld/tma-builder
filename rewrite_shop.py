import re

with open('src/pages/ShopPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace main wrapper
content = content.replace(
    'bg-[#000000] text-[#EDEDED]',
    'bg-white text-zinc-900'
)

# Colors
content = re.sub(r'bg-\[\#000000\]', 'bg-white', content)
content = re.sub(r'bg-\[\#0a0a0a\]', 'bg-zinc-50', content)
content = re.sub(r'bg-\[\#050505\]', 'bg-zinc-100', content)
content = re.sub(r'bg-\[\#111\]', 'bg-zinc-100', content)
content = re.sub(r'bg-\[\#1a1a1a\]', 'bg-zinc-100', content)
content = re.sub(r'bg-\[\#222222\]', 'bg-zinc-200', content)
content = re.sub(r'bg-\[\#222\]', 'bg-zinc-200', content)
content = re.sub(r'bg-\[\#333\]', 'bg-zinc-200 hover:bg-zinc-300', content)
content = re.sub(r'border-\[\#222222\]', 'border-zinc-200', content)
content = re.sub(r'border-\[\#222\]', 'border-zinc-200', content)
content = re.sub(r'border-\[\#111\]', 'border-zinc-100', content)
content = re.sub(r'border-\[\#333\]', 'border-zinc-300', content)
content = re.sub(r'border-\[\#444\]', 'border-zinc-400', content)
content = re.sub(r'border-\[\#555\]', 'border-zinc-400', content)

content = re.sub(r'text-\[\#EDEDED\]', 'text-zinc-900', content)
content = re.sub(r'text-white', 'text-zinc-900', content)
content = re.sub(r'text-\[\#888888\]', 'text-zinc-500', content)
content = re.sub(r'text-\[\#888\]', 'text-zinc-500', content)
content = re.sub(r'text-\[\#666666\]', 'text-zinc-500', content)
content = re.sub(r'text-\[\#666\]', 'text-zinc-500', content)

content = re.sub(r'bg-white text-black', 'bg-black text-white', content)
content = re.sub(r'hover:bg-\[\#e5e5e5\]', 'hover:bg-zinc-800', content)
content = re.sub(r'bg-black text-white', 'bg-black text-white', content) # keep if changed

# borders & radius
content = re.sub(r'rounded-2xl', 'rounded-xl', content)
content = re.sub(r'rounded-3xl', 'rounded-xl', content)

with open('src/pages/ShopPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

