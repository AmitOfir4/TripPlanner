export const headerStyles = {
  wrapper: 'sticky top-0 z-50 glass border-b border-teal-100/60 shadow-sm shadow-teal-900/5',
  accentBar: 'h-0.5 bg-gradient-to-r from-teal-500 via-sky-400 to-teal-500',
  inner: 'px-5 lg:px-10 h-16 flex items-center justify-between gap-4',

  brand: 'flex items-center gap-3',
  brandIcon: 'relative w-9 h-9 shrink-0',
  brandIconBg: 'absolute inset-0 bg-gradient-to-br from-teal-500 to-sky-500 rounded-xl shadow-lg shadow-teal-400/30',
  brandIconInner: 'absolute inset-0 flex items-center justify-center',
  brandIconSvg: 'text-white w-5 h-5',
  brandTitle: 'text-lg font-extrabold tracking-tight text-slate-900',
  brandSubtitle: 'text-[10px] font-semibold text-teal-600 uppercase tracking-widest hidden sm:block',

  actions: 'flex items-center gap-2',
  divider: 'w-px h-5 bg-slate-200',

  langBtn: 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all bg-slate-50 text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200',

  apiKeyBtnActive: 'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-teal-50 text-teal-700 hover:bg-teal-100 ring-1 ring-teal-200',
  apiKeyBtnInactive: 'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-amber-50 text-amber-700 hover:bg-amber-100 ring-1 ring-amber-200',
  apiKeyDropdown: 'absolute top-full right-0 mt-2.5 w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 z-50',
  apiKeyArrow: 'absolute -top-2 right-4 w-4 h-4 bg-white rotate-45 border-l border-t border-slate-100',
  apiKeyTitle: 'font-bold text-slate-900 text-sm',
  apiKeySubtitle: 'text-xs text-slate-500 mt-0.5',
  apiKeyLink: 'text-teal-600 hover:underline font-semibold',
  apiKeyCloseBtn: 'p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors',
  apiKeyActiveBox: 'flex items-center gap-2 p-3 bg-teal-50 border border-teal-200 rounded-xl',
  apiKeyMasked: 'text-xs text-slate-400 font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200 truncate',
  apiKeyRemoveBtn: 'w-full py-2 bg-red-50 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors',
  apiKeyInput: 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none font-mono text-sm input-glow transition-all',
  apiKeySaveBtn: 'w-full py-2.5 bg-gradient-to-r from-teal-600 to-sky-600 text-white rounded-xl text-sm font-semibold hover:from-teal-700 hover:to-sky-700 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 transition-all shadow-md shadow-teal-200',
  apiKeyHint: 'text-[11px] text-slate-400',

  profileImg: 'w-7 h-7 rounded-full ring-2 ring-teal-200',
  profileFallback: 'w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center ring-2 ring-teal-200',
  profileName: 'text-xs font-medium text-slate-700 hidden md:inline max-w-[100px] truncate',
  signOutBtn: 'text-[11px] text-slate-400 hover:text-red-500 font-medium transition-colors',

  importBtn: 'flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-xs font-semibold hover:bg-teal-100 ring-1 ring-teal-200 transition-all',
  resetBtn: 'flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold hover:bg-red-50 hover:text-red-600 ring-1 ring-slate-200 transition-all',
} as const;
