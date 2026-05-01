export const modalOverlay = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4';

export const myTripsModalStyles = {
  overlay: modalOverlay,
  panel: 'bg-white rounded-[2rem] p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl',

  headerRow: 'flex items-center justify-between mb-6',
  headerTitle: 'text-2xl font-black text-slate-900',
  headerCloseBtn: 'p-2 hover:bg-slate-100 rounded-xl transition-colors',

  loadingWrap: 'flex items-center justify-center py-16',

  emptyWrap: 'py-16 text-center space-y-4',
  emptyText: 'text-slate-500 font-medium',
  emptySubtext: 'text-xs text-slate-400',

  errorBox: 'bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 mb-4',

  list: 'space-y-3',
  tripItem: 'group w-full p-5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-500 rounded-2xl transition-all text-left flex items-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed',
  tripIconWrap: 'w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0',
  tripBody: 'flex-1 min-w-0',
  tripTitle: 'font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate',
  tripMeta: 'text-xs text-slate-500 mt-1',
  tripDeleteBtn: 'p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0',

  loadMoreWrap: 'flex justify-center mt-4',
  loadMoreBtn: 'px-5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-sm',

  fileUploadWrap: 'mt-6 pt-6 border-t border-slate-200',
  fileUploadBtn: 'w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all cursor-pointer text-sm',
  fileUploadHint: 'text-xs text-slate-400 text-center mt-3',
} as const;

export const saveTripModalStyles = {
  overlay: modalOverlay,
  panel: 'bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl',

  headerRow: 'flex items-center justify-between mb-5',
  headerTitle: 'text-xl font-black text-slate-900',
  headerCloseBtn: 'p-2 hover:bg-slate-100 rounded-xl transition-colors',

  label: 'block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2',
  input: 'w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
  hint: 'text-xs text-slate-400 mt-2',

  errorText: 'text-xs text-red-600 mt-2',

  buttonRow: 'flex gap-3 mt-6',
  cancelBtn: 'flex-1 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm',
  saveBtn: 'flex-1 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-sm',
} as const;

export const uploadModalStyles = {
  overlay: modalOverlay,
  panel: 'bg-white rounded-[2rem] p-8 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl',

  headerIcon: 'w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center',
  headerTitle: 'text-xl font-black text-slate-900',
  headerSubtitle: 'text-xs text-slate-500',
  headerCloseBtn: 'p-2 hover:bg-slate-100 rounded-xl transition-colors',

  successBox: 'bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-3',
  successTitle: 'font-bold text-emerald-800',
  successSubtitle: 'text-sm text-emerald-600 mt-1',
  instructionBox: 'bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3',
  instructionTitle: 'text-sm font-bold text-slate-700',
  instructionStep: 'w-5 h-5 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
  openMapsBtn: 'flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm',
  doneBtn: 'px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm',

  modeBtn: (active: boolean) =>
    `flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
      active ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`,
  fileNameLabel: 'block text-xs font-bold text-slate-500 uppercase tracking-wider',
  fileNameInput: 'w-full px-4 py-3 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500',
  fileNameHint: 'text-xs text-slate-400',

  refreshBtn: 'text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1',
  fileItem: (selected: boolean) =>
    `w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
      selected
        ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-500'
        : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'
    }`,
  uploadBtn: 'w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md shadow-emerald-200/60 active:scale-[0.98] text-sm',
} as const;

export const kmlIconSelectorStyles = {
  triggerBtn: 'flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition-all w-full justify-between',
  dropdown: 'mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl',
  dropdownLabel: 'text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2',
  grid: 'grid grid-cols-4 gap-2',
  iconBtn: (isSelected: boolean) =>
    `flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
      isSelected
        ? 'bg-teal-100 border-2 border-teal-500'
        : 'bg-white border-2 border-transparent hover:border-slate-300'
    }`,
  iconImg: 'w-6 h-6',
  iconName: 'text-[9px] font-medium text-slate-600 text-center leading-tight',
} as const;
