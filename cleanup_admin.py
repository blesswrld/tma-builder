import re

with open('src/pages/AdminPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace any slate occurrences
content = re.sub(r'slate-200', 'zinc-200', content)
content = re.sub(r'slate-800', 'zinc-800', content)
content = re.sub(r'slate-900', 'zinc-900', content)
content = re.sub(r'slate-950', 'zinc-950', content)

# Replace indigo banner
content = content.replace('bg-indigo-50/70 border border-indigo-100', 'bg-zinc-50 border border-zinc-200')
content = content.replace('text-indigo-950', 'text-zinc-900')
content = content.replace('text-indigo-800', 'text-zinc-600')

# Replace amber elements
content = re.sub(r'bg-amber-50/70 border border-amber-200/80', 'bg-zinc-50 border border-zinc-200', content)
content = re.sub(r'text-amber-950', 'text-zinc-900', content)
content = re.sub(r'text-amber-500 fill-amber-500', 'text-zinc-900', content)
content = re.sub(r'bg-amber-200 text-amber-900', 'bg-black text-white', content)
content = re.sub(r'text-amber-800', 'text-zinc-600', content)
content = re.sub(r'accent-amber-600', 'accent-black', content)
content = re.sub(r'bg-amber-500 text-white', 'bg-black text-white border border-zinc-800 shadow-lg', content)
content = re.sub(r'text-amber-400', 'text-white', content)

# Replace emerald status badges
content = re.sub(r'bg-emerald-100 text-emerald-800', 'bg-zinc-900 text-white', content)
content = re.sub(r'text-emerald-400', 'text-zinc-200', content)
content = re.sub(r'peer-checked:bg-emerald-600', 'peer-checked:bg-black', content)

# Replace focus rings and borders
content = re.sub(r'focus:border-slate-900', 'focus:border-zinc-400', content)
content = re.sub(r'focus:ring-slate-900/10', 'focus:ring-zinc-400/20', content)
content = re.sub(r'rounded-md', 'rounded-lg', content)

with open('src/pages/AdminPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

