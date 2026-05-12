from pathlib import Path

path = Path('/home/ubuntu/colorlines-game/client/src/pages/Home.tsx')
text = path.read_text()
replacements = {
    'className="relative min-h-screen bg-cover bg-center px-4 py-5 sm:px-6 lg:px-8"': 'className="fit-section relative min-h-screen bg-cover bg-center px-4 py-5 sm:px-6 lg:px-8"',
    'className="relative mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-7xl grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]"': 'className="fit-layout relative mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-7xl grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]"',
    'className="flex flex-col justify-between gap-5"': 'className="fit-left flex flex-col justify-between gap-5"',
    'className="grid gap-4 pt-2 lg:grid-cols-[1fr_auto] lg:items-end"': 'className="fit-header grid gap-4 pt-2 lg:grid-cols-[1fr_auto] lg:items-end"',
    'className="mb-2 inline-flex border border-amber-200/25 bg-black/50 px-3 py-1 font-[\'IBM_Plex_Sans\'] text-[0.68rem] uppercase tracking-[0.38em] text-amber-100 shadow-[6px_6px_0_rgba(255,196,97,.12)] backdrop-blur"': 'className="fit-kicker mb-2 inline-flex border border-amber-200/25 bg-black/50 px-3 py-1 font-[\'IBM_Plex_Sans\'] text-[0.68rem] uppercase tracking-[0.38em] text-amber-100 shadow-[6px_6px_0_rgba(255,196,97,.12)] backdrop-blur"',
    'className="font-[\'Bebas_Neue\'] text-6xl leading-[0.86] tracking-[0.055em] text-stone-50 sm:text-7xl lg:text-8xl"': 'className="fit-title font-[\'Bebas_Neue\'] text-6xl leading-[0.86] tracking-[0.055em] text-stone-50 sm:text-7xl lg:text-8xl"',
    'className="max-w-xl border-l-4 border-amber-300/60 bg-black/45 p-4 font-[\'IBM_Plex_Sans\'] text-sm leading-6 text-stone-200 shadow-[10px_10px_0_rgba(0,0,0,.35)] backdrop-blur-md"': 'className="fit-intro max-w-xl border-l-4 border-amber-300/60 bg-black/45 p-4 font-[\'IBM_Plex_Sans\'] text-sm leading-6 text-stone-200 shadow-[10px_10px_0_rgba(0,0,0,.35)] backdrop-blur-md"',
    'className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_210px]"': 'className="fit-play-area grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_180px]"',
    'className="arcade-slab board-shell p-3 sm:p-4"': 'className="arcade-slab board-shell fit-board-shell p-3 sm:p-4"',
    'className="mb-3 flex items-center justify-between gap-3 px-1"': 'className="fit-board-head mb-3 flex items-center justify-between gap-3 px-1"',
    'className="grid grid-cols-9 gap-1.5 rounded-none border border-amber-200/20 bg-black/55 p-2 shadow-inner sm:gap-2 sm:p-3"': 'className="board-grid grid grid-cols-9 gap-1.5 rounded-none border border-amber-200/20 bg-black/55 p-2 shadow-inner sm:gap-2 sm:p-3"',
    'className="grid gap-4"': 'className="fit-status-rail grid gap-4"',
    'className="arcade-slab px-4 py-5"': 'className="arcade-slab fit-side-card px-4 py-5"',
    'className="font-[\'Bebas_Neue\'] text-7xl leading-none tracking-[0.06em] text-amber-100 tabular-nums"': 'className="fit-score font-[\'Bebas_Neue\'] text-7xl leading-none tracking-[0.06em] text-amber-100 tabular-nums"',
    'className="control-rail arcade-slab flex flex-col justify-between gap-5 p-4 sm:p-5"': 'className="control-rail arcade-slab flex flex-col justify-between gap-5 p-4 sm:p-5"',
    'className="space-y-5"': 'className="fit-rail-content space-y-5"',
    'className="h-28 w-full object-cover"': 'className="fit-strip h-28 w-full object-cover"',
    'className={`border bg-black/45 p-4 shadow-[8px_8px_0_rgba(0,0,0,.35)] ${messageToneClass}`}': 'className={`fit-message border bg-black/45 p-4 shadow-[8px_8px_0_rgba(0,0,0,.35)] ${messageToneClass}`}',
    'className="mb-1 flex items-center gap-2 font-[\'Bebas_Neue\'] text-3xl tracking-[0.08em]"': 'className="fit-message-title mb-1 flex items-center gap-2 font-[\'Bebas_Neue\'] text-3xl tracking-[0.08em]"',
    'className="font-[\'IBM_Plex_Sans\'] text-sm leading-6 text-stone-200"': 'className="fit-message-body font-[\'IBM_Plex_Sans\'] text-sm leading-6 text-stone-200"',
    'className="mb-3 font-[\'Bebas_Neue\'] text-4xl tracking-[0.08em] text-stone-50"': 'className="fit-records-title mb-3 font-[\'Bebas_Neue\'] text-4xl tracking-[0.08em] text-stone-50"',
    'className="grid gap-3"': 'className="fit-controls grid gap-3"',
}
for old, new in replacements.items():
    if old not in text:
        print(f'Missing pattern: {old[:90]}')
    text = text.replace(old, new, 1)
path.write_text(text)
