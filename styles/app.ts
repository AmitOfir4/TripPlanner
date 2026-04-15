export const appStyles = {
  container: 'app-container min-h-screen flex flex-col antialiased',
  main: 'app-main-content flex-1 flex flex-col overflow-hidden',
  scrollArea: 'flex-1 overflow-y-auto px-5 py-6 lg:px-10 lg:py-8',
  contentWrap: 'w-full space-y-8 max-w-[1600px] mx-auto',

  errorBanner: 'bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm',
  errorInner: 'flex items-start gap-3',
  errorIconWrap: 'flex-shrink-0 w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-lg',
  errorTitle: 'text-sm font-bold text-amber-900 mb-1',
  errorText: 'text-xs text-amber-800',
  errorBtn: 'mt-2 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors',
  errorClose: 'text-amber-400 hover:text-amber-600 text-xl leading-none',

  chatMapLayout: 'flex flex-col lg:flex-row gap-5',
  chatColumn: 'lg:w-[45%] shrink-0 h-[880px]',
  mapColumn: 'flex-1',

  actionRow: 'flex gap-3',
  downloadBtn: 'flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md shadow-teal-200/60 active:scale-[0.98] text-sm',
  uploadBtn: 'flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md shadow-emerald-200/60 active:scale-[0.98] text-sm',
} as const;
