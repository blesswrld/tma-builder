import re

with open('src/pages/AdminPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace main wrapper
content = content.replace(
    'className="min-h-screen bg-[#090d16] text-slate-100 font-sans flex flex-col selection:bg-amber-500 selection:text-slate-950"',
    'className="min-h-screen bg-white text-zinc-900 font-sans flex flex-col selection:bg-zinc-200"'
)

# Replace Header
content = content.replace(
    'className="bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 sticky top-0 z-40 text-white shadow-2xl"',
    'className="bg-white/80 backdrop-blur-md border-b border-zinc-200 sticky top-0 z-40 text-zinc-900"'
)

# Replace Brand Gradient
content = content.replace(
    'bg-gradient-to-tr from-amber-500 via-amber-400 to-emerald-500 text-slate-950',
    'bg-black text-white'
)
content = content.replace(
    'shadow-md shadow-amber-500/20',
    ''
)
content = content.replace(
    'bg-gradient-to-r from-amber-200 via-slate-100 to-indigo-200 bg-clip-text text-transparent',
    'text-zinc-900'
)

# Replace Slate backgrounds and borders with Zinc for light mode
content = re.sub(r'bg-slate-950\b', 'bg-white', content)
content = re.sub(r'bg-slate-900\b', 'bg-zinc-100 text-zinc-900', content)
content = re.sub(r'bg-slate-800\b', 'bg-zinc-200', content)
content = re.sub(r'bg-slate-50\b', 'bg-zinc-50', content)
content = re.sub(r'bg-slate-100\b', 'bg-zinc-100', content)
content = re.sub(r'border-slate-800\b', 'border-zinc-200', content)
content = re.sub(r'border-slate-700\b', 'border-zinc-300', content)
content = re.sub(r'border-slate-200\b', 'border-zinc-200', content)
content = re.sub(r'border-slate-100\b', 'border-zinc-100', content)
content = re.sub(r'text-slate-400\b', 'text-zinc-500', content)
content = re.sub(r'text-slate-300\b', 'text-zinc-600', content)
content = re.sub(r'text-slate-200\b', 'text-zinc-800', content)
content = re.sub(r'text-slate-100\b', 'text-zinc-900', content)
content = re.sub(r'text-slate-950\b', 'text-white', content)
content = re.sub(r'text-slate-900\b', 'text-zinc-900', content)
content = re.sub(r'text-slate-700\b', 'text-zinc-700', content)
content = re.sub(r'text-slate-600\b', 'text-zinc-600', content)
content = re.sub(r'text-slate-500\b', 'text-zinc-500', content)

# Remove shadows and gradients
content = re.sub(r'shadow-2xl', '', content)
content = re.sub(r'shadow-xl', 'shadow-sm', content)
content = re.sub(r'shadow-lg', 'shadow-sm', content)
content = re.sub(r'shadow-md', '', content)
content = re.sub(r'shadow-sm', '', content)
content = re.sub(r'shadow-2xs', '', content)
content = re.sub(r'bg-gradient-to-r.*? ', 'bg-black text-white hover:bg-zinc-800 ', content)
content = re.sub(r'bg-gradient-to-tr.*? ', 'bg-zinc-100 ', content)

# Flatten borders
content = re.sub(r'rounded-2xl', 'rounded-lg', content)
content = re.sub(r'rounded-3xl', 'rounded-lg', content)
content = re.sub(r'rounded-xl', 'rounded-md', content)

with open('src/pages/AdminPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

