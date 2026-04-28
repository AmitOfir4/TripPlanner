export const chatStyles = {
  container: 'chat-container flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-900/5 overflow-hidden',

  header: 'chat-header bg-gradient-to-br from-teal-600 via-teal-500 to-sky-500 px-5 py-4',
  headerInner: 'flex items-center gap-3',
  headerIconWrap: 'relative w-11 h-11 shrink-0',
  headerIconBg: 'absolute inset-0 bg-white/20 rounded-xl',
  headerIconInner: 'absolute inset-0 flex items-center justify-center',
  headerTitle: 'text-base font-bold text-white leading-tight',
  headerSubtitle: 'text-xs text-teal-100 font-medium',
  headerStatus: 'flex items-center gap-1.5',
  headerStatusDot: 'w-2 h-2 bg-emerald-400 rounded-full shadow-sm animate-pulse',
  headerStatusText: 'text-[11px] text-teal-100 font-medium',

  messagesArea: 'flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/40',

  emptyState: 'flex flex-col items-center justify-center h-full text-center space-y-5 py-10 px-6',
  emptyIcon: 'relative w-20 h-20',
  emptyIconBg: 'absolute inset-0 bg-gradient-to-br from-teal-400 to-sky-400 rounded-2xl opacity-10',
  emptyIconInner: 'absolute inset-0 flex items-center justify-center',
  emptyTitle: 'text-xl font-bold text-slate-900 mb-1.5',
  emptySubtitle: 'text-sm text-slate-500 max-w-xs leading-relaxed',
  suggestionGrid: 'grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-sm',
  suggestionBtn: 'px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-all text-sm font-medium text-slate-600 text-left shadow-sm',

  messageRow: (isUser: boolean) =>
    `flex gap-3 message-fade-in ${isUser ? 'flex-row-reverse' : 'flex-row'}`,
  avatar: (isUser: boolean) =>
    `flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${
      isUser ? 'bg-teal-600' : 'bg-gradient-to-br from-teal-500 to-sky-500'
    }`,
  avatarIcon: 'w-4 h-4 text-white',
  bubbleWrap: (isUser: boolean) =>
    `flex-1 max-w-[82%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`,
  bubble: (isUser: boolean) =>
    `rounded-2xl px-4 py-3 text-sm leading-relaxed ${
      isUser
        ? 'bg-teal-600 text-white rounded-tr-sm'
        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
    }`,
  bubbleText: 'whitespace-pre-wrap',
  timestamp: 'text-[10px] text-slate-400 mt-1 px-1',

  addAllBtn: 'w-full px-4 py-2.5 bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-md shadow-teal-200',
  addAllBtnLegacy: 'w-full px-4 py-2.5 bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-md shadow-teal-200 mb-1',

  dayHeader: 'bg-gradient-to-r from-teal-600 to-sky-500 px-4 py-2.5 flex items-center justify-between',
  dayHeaderTitle: 'font-bold text-white text-sm',
  dayHeaderCount: 'text-teal-100 text-[11px] font-medium',
  dayText: 'px-4 py-2.5 bg-teal-50/50 border-b border-teal-100',
  dayTextP: 'text-xs text-slate-600 leading-relaxed whitespace-pre-wrap',
  dayPlaces: 'p-3 space-y-2',
  dayCard: 'rounded-xl overflow-hidden border border-teal-200/70 bg-white shadow-sm',

  loadingRow: 'flex gap-3 message-fade-in',
  loadingAvatar: 'flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-teal-500 to-sky-500 shadow-sm',
  loadingBubble: 'bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-sm',
  loadingDots: 'flex items-center gap-1',
  loadingDot: 'typing-dot w-2 h-2 bg-teal-400 rounded-full',

  inputArea: 'border-t border-slate-200 p-4 bg-white',
  inputRow: 'flex gap-2',
  input: 'flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 text-sm text-slate-900 placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed input-glow transition-all font-medium',
  sendBtn: 'px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:cursor-not-allowed shadow-sm shadow-teal-200',
} as const;

export const placeChipStyles = {
  wrapper: 'bg-slate-50 border border-slate-200 rounded-xl p-3 hover:border-teal-200 hover:bg-teal-50/30 transition-all place-card-hover',
  inner: 'flex items-start justify-between gap-3',
  title: 'font-semibold text-slate-900 text-sm truncate',
  description: 'text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed',
  metaRow: 'flex items-center gap-2 mt-1.5 flex-wrap',
  categoryBadge: 'text-[10px] font-semibold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full',
  rating: 'text-[10px] font-semibold text-amber-600',
  mapLink: 'flex items-center gap-0.5 text-[10px] font-medium text-slate-400 hover:text-teal-600 transition-colors',
  showInMapBtn: 'flex items-center gap-0.5 text-[10px] font-medium text-slate-400 hover:text-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  addBtn: 'flex items-center gap-1 px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed',
} as const;
