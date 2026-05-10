export const mapViewStyles = {
  container: (isExpanded: boolean) =>
    `map-view-container bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-lg transition-all duration-300 ${
      isExpanded ? 'fixed inset-4 z-50' : 'relative'
    }`,

  header: 'map-header flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-slate-50 border-b border-slate-200',
  headerIcon: 'w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center',
  headerTitle: 'font-black text-slate-900',
  headerSubtitle: 'text-xs text-slate-500 font-medium',

  sidebarToggleBtn: (isOpen: boolean) =>
    `p-2 rounded-xl transition-colors ${isOpen ? 'bg-teal-100 text-teal-700' : 'hover:bg-white text-slate-600'}`,
  expandBtn: 'p-2 hover:bg-white rounded-xl transition-colors',

  mapWrapper: (isExpanded: boolean) =>
    `map-wrapper flex ${isExpanded ? 'h-[calc(100%-4rem)]' : 'h-[850px]'}`,
  mapArea: 'relative flex-1 h-full',

  noApiKeyWrap: 'w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50',
  noApiKeyInner: 'text-center p-8 max-w-md',
  noApiKeyTitle: 'text-slate-900 font-bold text-lg mb-2',
  noApiKeySubtitle: 'text-sm text-slate-500 mb-4',
  noApiKeyLink: 'inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg',
} as const;

export const mapSidebarStyles = {
  wrapper: (isOpen: boolean) =>
    `relative flex-shrink-0 h-full transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-0'}`,
  inner: (isOpen: boolean) =>
    `absolute inset-0 w-64 h-full flex flex-col border-r border-slate-200 bg-white overflow-hidden transition-all duration-300 ${
      isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`,
  header: 'flex-shrink-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-2',
  headerTitle: 'text-sm font-black text-slate-900',
  headerCount: 'ml-auto text-xs text-slate-400 font-medium',
  scrollable: 'flex-1 overflow-y-auto',

  layerBorder: 'border-b border-slate-100 last:border-b-0',
  layerRow: 'group flex items-center hover:bg-slate-50 transition-colors',
  layerBtn: 'flex-1 min-w-0 flex items-center gap-2 px-4 py-2.5 text-left',
  layerName: 'text-xs font-black text-slate-700 truncate flex-1',
  layerCount: 'text-[10px] text-slate-400 flex-shrink-0',
  layerActionBtn: 'p-1.5 rounded-md text-slate-400 hover:text-teal-600 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0',
  layerDeleteBtn: 'p-1.5 mr-2 rounded-md text-slate-400 hover:text-red-600 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0',
  layerNameInput: 'flex-1 min-w-0 px-2 py-1 text-xs font-black text-slate-900 border border-teal-400 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 mx-2 my-1',
  newLayerWrap: 'flex-shrink-0 border-t border-slate-200 p-2 bg-slate-50',
  newLayerBtn: 'w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-teal-700 hover:text-teal-800 bg-white hover:bg-teal-50 border border-dashed border-teal-300 hover:border-teal-400 rounded-lg transition-colors',
  newLayerInputRow: 'flex items-center gap-1.5',
  newLayerInput: 'flex-1 min-w-0 px-2 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500',
  newLayerConfirmBtn: 'p-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md disabled:opacity-50',
  newLayerCancelBtn: 'p-1.5 text-slate-500 hover:bg-white rounded-md',
  layerEmpty: 'pl-8 pr-4 py-2 text-[11px] text-slate-400 italic',

  placeBtn: (isActive: boolean) =>
    `w-full flex items-center gap-2.5 pl-8 pr-4 py-2 text-left transition-colors ${
      isActive ? 'bg-teal-50' : 'hover:bg-slate-50'
    }`,
  placeName: (isActive: boolean) =>
    `text-xs truncate ${isActive ? 'font-bold text-teal-700' : 'text-slate-700'}`,

  collapseTab: (isOpen: boolean) =>
    `absolute top-1/2 -translate-y-1/2 -right-5 z-20 flex items-center justify-end pr-0.5 rounded-r-xl shadow-md border border-slate-200 bg-white hover:bg-slate-50 transition-all duration-200 ${
      isOpen ? 'w-5 h-12' : 'w-8 h-20'
    }`,
} as const;

export const mapInfoWindowStyles = {
  wrapper: 'p-2 max-w-sm -mt-1',
  iconBtn: 'mb-1 self-start hover:scale-110 transition-transform',
  iconImg: 'w-6 h-6',
  title: 'font-bold text-sm text-slate-900 mb-1',
  description: 'text-xs text-slate-600 mb-2',
  ratingRow: 'flex items-center gap-1 mb-2',
  ratingText: 'text-xs font-bold',
  removeBtn: 'flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5',
  addBtn: 'flex-1 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5',
  mapsLink: 'text-xs text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1',

  clickedWrapper: 'p-3 max-w-sm',
  clickedLabel: 'block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1',
  clickedInput: 'flex-1 px-2 py-1 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500',
  clickedConfirmBtn: 'p-1 bg-green-600 text-white rounded-lg hover:bg-green-700',
  clickedEditBtn: 'p-1 text-slate-600 hover:bg-slate-100 rounded-lg',
  clickedTitle: 'flex-1 font-bold text-sm text-slate-900',
  clickedCoords: 'text-xs text-slate-600 mb-3',
  clickedAddBtn: 'w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2',
  clickedMapsLink: 'text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 justify-center mt-2',
  clickedLayerSelect: 'w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white',
  clickedLayerNewInput: 'w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500',
} as const;
