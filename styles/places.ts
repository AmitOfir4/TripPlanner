export const placeCardStyles = {
  wrapper: 'place-card bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-300 group overflow-hidden',
  inner: 'flex gap-3 p-3',

  imageWrap: 'place-card-image relative w-14 h-14 shrink-0 bg-slate-100 rounded-lg overflow-hidden',
  ratingBadge: 'absolute bottom-0.5 right-0.5 flex items-center gap-0.5 bg-amber-400 text-white px-1 py-0.5 rounded text-[8px] font-bold shadow-sm',

  content: 'place-card-content flex-1 min-w-0 flex flex-col',
  title: 'font-bold text-slate-900 text-sm leading-tight group-hover:text-indigo-600 transition-colors line-clamp-1',
  categoryBadge: 'inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase rounded mt-0.5',
  dismissBtn: 'p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0',
  description: 'text-slate-600 text-[11px] leading-relaxed line-clamp-2 mb-2 flex-1',

  mapBtn: 'flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors',
  addBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-all shadow-sm flex items-center gap-1 text-[10px] font-black uppercase tracking-wider active:scale-95',
} as const;

export const placeImageStyles = {
  wrapper: 'w-full h-full relative overflow-hidden group bg-slate-100',
  img: 'w-full h-full object-contain group-hover:scale-105 transition-transform duration-1000 ease-out brightness-[0.95]',
  overlay: 'absolute bottom-2 left-2 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity',
  overlayText: 'text-[8px] font-bold text-white uppercase tracking-widest flex items-center gap-1',
} as const;

export const placeResultsStyles = {
  loadingWrap: 'flex items-center justify-center py-12',
  loadingInner: 'text-center space-y-4',
  loadingText: 'text-slate-600 font-medium',

  emptyWrap: 'py-24 text-center space-y-8 flex flex-col items-center',
  emptyBg: 'w-32 h-32 bg-indigo-50 rounded-[3rem] rotate-12 absolute -inset-2 opacity-50',
  emptyIconWrap: 'w-32 h-32 bg-white rounded-[3rem] shadow-sm flex items-center justify-center relative border border-slate-100',
  emptyTitle: 'text-slate-900 font-black text-2xl tracking-tight',
  emptySubtitle: 'text-slate-500 max-w-xs mx-auto text-sm font-medium',

  headerRow: 'flex items-center justify-between border-b border-slate-200 pb-4',
  headerTitle: 'text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2',
  headerCount: 'text-xs text-slate-500 font-medium',

  categoryCard: (isLandmark: boolean) =>
    `bg-white rounded-3xl border-2 ${isLandmark ? 'border-indigo-200' : 'border-slate-100'} overflow-hidden transition-all`,
  categoryHeader: (isLandmark: boolean) =>
    `flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50 transition-colors ${isLandmark ? 'bg-indigo-50/50' : ''}`,
  categoryIcon: (isLandmark: boolean) =>
    `w-12 h-12 rounded-2xl flex items-center justify-center ${isLandmark ? 'bg-indigo-100' : 'bg-slate-100'}`,
  categoryIconSvg: (isLandmark: boolean) =>
    `w-6 h-6 ${isLandmark ? 'text-indigo-600' : 'text-slate-600'}`,
  categoryTitle: (isLandmark: boolean) =>
    `font-black text-lg ${isLandmark ? 'text-indigo-900' : 'text-slate-900'}`,
  categoryMustSee: 'ml-2 text-xs bg-indigo-600 text-white px-2 py-1 rounded-full',
  categoryCount: 'text-xs text-slate-500 font-medium mt-0.5',
  addAllBtn: 'flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all',

  categoryContent: 'max-h-[540px] overflow-y-auto px-6 pb-6',
  categoryGrid: 'grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-top-4 duration-300',

  additionalLoadingWrap: 'flex items-center justify-center py-8',
  additionalLoadingInner: 'text-center space-y-4 bg-white rounded-3xl border-2 border-indigo-200 p-8 shadow-lg',
  additionalLoadingText: 'text-slate-600 font-bold',
} as const;

export const savedSidebarStyles = {
  wrapper: 'bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xl shadow-slate-900/5',

  headerStrip: 'bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-5',
  headerIcon: 'w-9 h-9 bg-teal-500/20 rounded-xl flex items-center justify-center',
  headerTitle: 'text-base font-bold text-white tracking-tight',
  headerSubtitle: 'text-xs text-slate-400',
  headerBadge: 'bg-teal-500/20 text-teal-300 text-[11px] font-bold px-3 py-1 rounded-full border border-teal-500/30',

  body: 'p-6 space-y-6',

  tipBanner: 'flex gap-3 bg-sky-50 border border-sky-100 rounded-xl p-3.5',
  tipText: 'text-xs text-sky-700 leading-relaxed',
  downloadBtn: 'w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md shadow-teal-200/60 active:scale-[0.98] text-sm',
  uploadBtn: 'w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md shadow-emerald-200/60 active:scale-[0.98] text-sm',

  emptyWrap: 'flex flex-col items-center justify-center text-center py-16',
  emptyIcon: 'w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100',
  emptyTitle: 'text-sm font-semibold text-slate-400',
  emptySubtitle: 'text-xs text-slate-300 mt-1',

  layerDot: 'w-2 h-2 bg-teal-500 rounded-full shrink-0',
  layerName: 'text-xs font-bold text-teal-700 uppercase tracking-widest',
  layerDivider: 'flex-1 h-px bg-slate-100',
  layerCount: 'text-[10px] font-semibold text-slate-400',

  categorySectionLabel: 'text-[10px] font-bold text-slate-500 uppercase tracking-wider',

  savedCard: 'group flex items-start gap-3 p-3 bg-slate-50/60 rounded-xl border border-slate-100 hover:bg-white hover:border-teal-100 hover:shadow-md hover:shadow-teal-900/5 transition-all place-card-hover',
  savedCardImg: 'w-11 h-11 rounded-xl overflow-hidden shrink-0 ring-1 ring-slate-200',
  savedCardTitle: 'font-semibold text-slate-900 text-sm truncate cursor-pointer hover:text-teal-600 transition-colors leading-tight',
  savedCardCategory: 'text-[10px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-full border border-teal-100',
  savedCardRating: 'flex items-center gap-0.5 text-[10px] font-semibold text-amber-500',
  savedCardDescription: 'text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2',
  savedCardMapLink: 'inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium text-slate-400 hover:text-teal-600 transition-colors',
  savedCardRemoveBtn: 'p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100',
} as const;
