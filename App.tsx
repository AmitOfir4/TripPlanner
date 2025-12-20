
import React, { useState, useEffect, useRef, memo } from 'react';
import { 
  MapPin, Search, Compass, Layers, ExternalLink, Loader2, 
  Sparkles, Map as MapIcon, Download, Info, 
  Plus, Trash2, X, Star, RefreshCw, MessageSquare, Image as ImageIcon,
  Camera, Map as MapIcon2, AlertTriangle
} from 'lucide-react';
import { fetchSuggestions } from './geminiService';
import { TripData, Language, TripRecommendation, TripLayer } from './types';
import { generateKml, downloadFile } from './utils';

declare var google: any;

const translations = {
  en: {
    title: "MapLayer AI",
    builder: "Discovery",
    savedMap: "Trip Summary",
    cityPrompt: "Target City",
    queryPrompt: "Tell AI what to find...",
    queryPlaceholder: "e.g. Hidden gems, best pizza, photo spots...",
    findPlaces: "Find Places",
    loadMore: "Load More Suggestions",
    searching: "Searching...",
    savePlace: "Add to Trip",
    dismiss: "Skip",
    noCity: "Define a city to explore",
    noPlaces: "No spots saved yet",
    saved: "Saved!",
    downloadKml: "Export to My Maps",
    howToImport: "How to use",
    sources: "Map Evidence",
    reset: "Restart",
    layersTip: "Layers are automatically created per city.",
    rating: "Rating",
    topRated: "Top Rated First",
    apiError: "Maps Visuals Disabled (API Key Restricted)"
  },
  he: {
    title: "MapLayer AI",
    builder: "גילוי מקומות",
    savedMap: "סיכום טיול",
    cityPrompt: "עיר יעד",
    queryPrompt: "מה לחפש?",
    queryPlaceholder: "למשל: פנינים נסתרות, הפיצה הכי טובה...",
    findPlaces: "חפש מקומות",
    loadMore: "טען עוד תוצאות",
    searching: "מחפש...",
    savePlace: "הוסף לטיול",
    dismiss: "דלג",
    noCity: "הזן עיר כדי להתחיל",
    noPlaces: "טרם נשמרו מקומות",
    saved: "נשמר!",
    downloadKml: "ייצוא ל-My Maps",
    howToImport: "איך להשתמש?",
    sources: "מקורות מידע",
    reset: "אפס הכל",
    layersTip: "שכבות נוצרות אוטומטית לכל עיר.",
    rating: "דירוג",
    topRated: "הכי מדורגים קודם",
    apiError: "מפות ויזואליות מנוטרלות (מפתח API מוגבל)"
  }
};

// Helper to get reliable fallback images based on category
const getFallbackImage = (category: string) => {
  const lower = (category || '').toLowerCase();
  if (lower.includes('food') || lower.includes('restaurant') || lower.includes('cafe') || lower.includes('dining')) 
    return "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80";
  if (lower.includes('park') || lower.includes('nature') || lower.includes('garden') || lower.includes('hike')) 
    return "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80";
  if (lower.includes('museum') || lower.includes('art') || lower.includes('history') || lower.includes('culture')) 
    return "https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?auto=format&fit=crop&w=800&q=80";
  if (lower.includes('shop') || lower.includes('market') || lower.includes('mall')) 
    return "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80";
  if (lower.includes('beach') || lower.includes('sea')) 
    return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80";
  // Default City/Travel
  return "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=800&q=80";
};

/**
 * GooglePlaceImage: 
 * Handles image loading with awareness of API status.
 */
const GooglePlaceImage = memo(({ place, mapsStatus }: { place: TripRecommendation, mapsStatus: 'loading' | 'loaded' | 'error' }) => {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sourceType, setSourceType] = useState<'official' | 'map' | 'stock'>('official');

  useEffect(() => {
    let isMounted = true;
    
    // Immediate fallback if API is known to be broken
    if (mapsStatus === 'error') {
      setSourceType('stock');
      setImgUrl(getFallbackImage(place.category));
      setLoading(false);
      return;
    }

    // Safety timeout
    const safetyTimeout = setTimeout(() => {
      if (isMounted && loading) {
        useFallback();
      }
    }, 2000);

    const useFallback = () => {
      if (!isMounted) return;
      // If Maps API is broken, Static Maps (photoUrl) usually breaks too. Use Stock.
      // Note: mapsStatus cannot be 'error' here because of the early return above.
      setSourceType(place.photoUrl ? 'map' : 'stock');
      setImgUrl(place.photoUrl || getFallbackImage(place.category));
      setLoading(false);
    };

    const fetchPhoto = () => {
      if (mapsStatus !== 'loaded') return;

      try {
        if (!(window as any).google || !(window as any).google.maps || !(window as any).google.maps.places) {
          useFallback();
          return;
        }

        const dummyElement = document.createElement('div');
        const service = new google.maps.places.PlacesService(dummyElement);

        const handleDetails = (result: any, status: any) => {
          if (!isMounted) return;
          if (status === google.maps.places.PlacesServiceStatus.OK && result.photos && result.photos.length > 0) {
            setImgUrl(result.photos[0].getUrl({ maxWidth: 800, maxHeight: 600 }));
            setSourceType('official');
            setLoading(false);
          } else {
            useFallback();
          }
        };

        if (place.placeId) {
          service.getDetails({ placeId: place.placeId, fields: ['photos'] }, handleDetails);
        } else {
          service.findPlaceFromQuery({
            query: place.title,
            fields: ['photos', 'place_id']
          }, (results: any, status: any) => {
             if (!isMounted) return;
             if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]?.photos) {
               setImgUrl(results[0].photos[0].getUrl({ maxWidth: 800, maxHeight: 600 }));
               setSourceType('official');
               setLoading(false);
             } else {
               useFallback();
             }
          });
        }
      } catch (e) {
        console.warn("Places API error:", e);
        useFallback();
      }
    };

    if (mapsStatus === 'loaded') {
      fetchPhoto();
    }

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
    };
  }, [place.placeId, place.title, place.category, place.photoUrl, mapsStatus]);

  if (loading) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
        <Loader2 className="w-8 h-8 text-slate-300 animate-spin relative z-10" />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden group bg-slate-200">
      <img 
        src={imgUrl || getFallbackImage(place.category)} 
        alt={place.title} 
        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2000ms] ease-out brightness-[0.9] group-hover:brightness-100"
        onLoad={(e) => (e.currentTarget.style.opacity = '1')}
        style={{ opacity: 0, transition: 'opacity 0.5s ease-out' }}
        onError={(e) => {
           const target = e.currentTarget as HTMLImageElement;
           const fallback = getFallbackImage(place.category);
           if (target.src !== fallback) {
              target.src = fallback;
              setSourceType('stock');
           }
        }}
      />
      
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-black/50 backdrop-blur-xl rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
        {sourceType === 'official' && <Camera className="w-3 h-3 text-white" />}
        {sourceType === 'map' && <MapIcon2 className="w-3 h-3 text-white" />}
        {sourceType === 'stock' && <ImageIcon className="w-3 h-3 text-white" />}
        <span className="text-[9px] font-black text-white uppercase tracking-widest">
          {sourceType === 'official' ? "Verified Photo" : (sourceType === 'map' ? "Location Map" : "Illustration")}
        </span>
      </div>
    </div>
  );
});

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];
  const isRtl = lang === 'he';

  const [currentCity, setCurrentCity] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pendingSuggestions, setPendingSuggestions] = useState<TripRecommendation[]>([]);
  const [savedLayers, setSavedLayers] = useState<TripLayer[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | undefined>();
  const [mapsStatus, setMapsStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  const suggestionsEndRef = useRef<HTMLDivElement>(null);

  // Load Google Maps API with handling for InvalidKeyMapError
  useEffect(() => {
    // Prioritize specific Maps key, fall back to general API_KEY
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.API_KEY;
    
    if (!apiKey) {
      setMapsStatus('error');
      return;
    }

    if ((window as any).google && (window as any).google.maps) {
      setMapsStatus('loaded');
      return;
    }

    // Define auth failure handler globaly
    (window as any).gm_authFailure = () => {
      console.warn("MapLayer AI: Google Maps Auth Failed. Switching to Lite Mode.");
      setMapsStatus('error');
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
       // Wait a tick to ensure auth didn't fail immediately
       setTimeout(() => {
         if (mapsStatus !== 'error') setMapsStatus('loaded');
       }, 500);
    };
    
    script.onerror = () => {
      console.warn("Google Maps Script Load Error");
      setMapsStatus('error');
    };

    document.head.appendChild(script);

    return () => {
      // cleanup handled by browser
    };
  }, []); // Run once

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        () => console.log("Location access denied")
      );
    }
  }, []);

  const handleSearch = async (e: React.FormEvent | null, isLoadMore = false) => {
    e && e.preventDefault();
    if (!currentCity || !query) return;

    if (isLoadMore) setLoadingMore(true); else setLoading(true);

    try {
      const excludeTitles = [
        ...pendingSuggestions.map(p => p.title),
        ...savedLayers.flatMap(l => l.places.map(p => p.title))
      ];

      const { suggestions } = await fetchSuggestions(currentCity, query, lang, excludeTitles, userLocation);
      
      if (isLoadMore) {
        setPendingSuggestions(prev => [...prev, ...suggestions]);
        setTimeout(() => suggestionsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
      } else {
        setPendingSuggestions(suggestions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const savePlace = (place: TripRecommendation) => {
    setSavedLayers(prev => {
      const existingLayerIdx = prev.findIndex(l => l.name.toLowerCase() === currentCity.toLowerCase());
      if (existingLayerIdx > -1) {
        const newLayers = [...prev];
        if (!newLayers[existingLayerIdx].places.find(p => p.title === place.title)) {
          newLayers[existingLayerIdx].places = [...newLayers[existingLayerIdx].places, place];
        }
        return newLayers;
      } else {
        return [...prev, { name: currentCity, places: [place] }];
      }
    });
    setPendingSuggestions(prev => prev.filter(p => p.title !== place.title));
  };

  const handleDownload = () => {
    if (savedLayers.length === 0) return;
    const tripData: TripData = {
      city: savedLayers.map(l => l.name).join(', '),
      summary: "Personalized trip map.",
      layers: savedLayers,
      sources: [],
      language: lang
    };
    const kml = generateKml(tripData);
    downloadFile(kml, `Trip_${currentCity || 'Export'}.kml`, "application/vnd.google-earth.kml+xml");
  };

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col ${isRtl ? 'font-sans' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="bg-white border-b border-slate-200 h-16 shrink-0 z-50 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <MapIcon className="text-white w-5 h-5" />
          </div>
          <h1 className="text-xl font-black bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent tracking-tight">
            {t.title}
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          {mapsStatus === 'error' && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold uppercase tracking-wide border border-amber-100">
               <AlertTriangle className="w-3 h-3" />
               {t.apiError}
            </div>
          )}
          <div className="flex items-center bg-slate-100 rounded-xl p-1">
            <button onClick={() => setLang('en')} className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${lang === 'en' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>EN</button>
            <button onClick={() => setLang('he')} className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${lang === 'he' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>עב</button>
          </div>
          <button 
            onClick={() => { setSavedLayers([]); setCurrentCity(''); setPendingSuggestions([]); setQuery(''); }}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors"
          >
            {t.reset}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 bg-white lg:border-r border-slate-200">
          <div className="max-w-3xl mx-auto space-y-10">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                   <Sparkles className="w-6 h-6 text-indigo-600" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t.builder}</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">{t.cityPrompt}</label>
                  <div className="relative group">
                    <MapPin className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-4 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors`} />
                    <input 
                      type="text" 
                      placeholder="e.g. Kyoto"
                      className={`w-full ${isRtl ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all outline-none font-bold text-slate-800 placeholder:text-slate-300`}
                      value={currentCity}
                      onChange={(e) => setCurrentCity(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">{t.queryPrompt}</label>
                  <div className="relative group">
                    <MessageSquare className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-4 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors`} />
                    <input 
                      type="text" 
                      placeholder={t.queryPlaceholder}
                      className={`w-full ${isRtl ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all outline-none font-medium text-slate-800 placeholder:text-slate-300`}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch(null)}
                    />
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleSearch(null)}
                disabled={loading || !currentCity || !query}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black py-4.5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-100 active:scale-[0.98]"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Compass className="w-5 h-5" />}
                <span className="text-lg uppercase tracking-widest">{loading ? t.searching : t.findPlaces}</span>
              </button>
            </div>

            <div className="space-y-6">
              {pendingSuggestions.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                       <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                       {t.topRated}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    {pendingSuggestions.map((place, idx) => (
                      <div key={idx} className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-2xl hover:border-indigo-200 transition-all group flex flex-col">
                        <div className="relative h-56 overflow-hidden bg-slate-100">
                           <GooglePlaceImage place={place} mapsStatus={mapsStatus} />
                           
                           <div className="absolute top-4 left-4 flex flex-col gap-2">
                              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-white/95 px-2.5 py-1 rounded-full shadow-sm">
                                {place.category}
                              </span>
                              {place.rating && (
                                <div className="flex items-center gap-1 bg-amber-400 text-white px-2.5 py-1 rounded-full text-[10px] font-black shadow-sm">
                                  <Star className="w-3 h-3 fill-white" />
                                  {place.rating.toFixed(1)}
                                </div>
                              )}
                           </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                          <h4 className="font-black text-slate-900 text-xl mb-2 group-hover:text-indigo-600 transition-colors">{place.title}</h4>
                          <p className="text-sm text-slate-500 leading-relaxed line-clamp-3 mb-4 flex-1">{place.description}</p>
                          
                          <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                             {place.mapUrl ? (
                               <a href={place.mapUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">
                                 <ExternalLink className="w-3 h-3" />
                                 Google Maps
                               </a>
                             ) : <div></div>}
                             <div className="flex gap-2">
                               <button 
                                 onClick={() => setPendingSuggestions(prev => prev.filter(p => p.title !== place.title))}
                                 className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                 title={t.dismiss}
                               >
                                 <X className="w-5 h-5" />
                               </button>
                               <button 
                                 onClick={() => savePlace(place)}
                                 className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                               >
                                 <Plus className="w-4 h-4" />
                                 {t.savePlace}
                               </button>
                             </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-8 pb-12 flex justify-center" ref={suggestionsEndRef}>
                    <button 
                      onClick={() => handleSearch(null, true)}
                      disabled={loadingMore}
                      className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-95 disabled:opacity-50"
                    >
                      {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      {t.loadMore}
                    </button>
                  </div>
                </>
              )}

              {!loading && pendingSuggestions.length === 0 && (
                <div className="py-24 text-center space-y-6">
                   <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto animate-bounce duration-1000">
                      <Search className="w-10 h-10 text-indigo-300" />
                   </div>
                   <div>
                      <p className="text-slate-400 font-black text-lg uppercase tracking-widest">{currentCity ? "I'm ready to search!" : t.noCity}</p>
                      <p className="text-slate-300 text-sm mt-2">Enter a city and what you're in the mood for.</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:w-[420px] shrink-0 bg-slate-50 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col h-full border-l border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-900 rounded-lg">
                 <Layers className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{t.savedMap}</h3>
            </div>
            {savedLayers.length > 0 && (
              <div className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg shadow-indigo-100">
                {savedLayers.reduce((acc, l) => acc + l.places.length, 0)} PLACES
              </div>
            )}
          </div>

          <div className="flex-1 space-y-10">
            {savedLayers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20">
                <div className="bg-white p-6 rounded-full shadow-sm mb-6 border border-slate-100">
                  <MapPin className="w-10 h-10 text-slate-200" />
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-loose">{t.noPlaces}</p>
              </div>
            ) : (
              savedLayers.map((layer, idx) => (
                <div key={idx} className="space-y-4 animate-in fade-in slide-in-from-right-6 duration-500">
                  <div className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center font-black text-indigo-600 text-[10px]">
                      {idx + 1}
                    </div>
                    <h4 className="text-xs font-black uppercase text-slate-500 tracking-[0.2em]">{layer.name}</h4>
                    <div className="flex-1 h-px bg-slate-200 group-hover:bg-indigo-200 transition-colors" />
                  </div>
                  <div className="space-y-3">
                    {layer.places.map((place, pIdx) => (
                      <div key={pIdx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-slate-900 text-sm truncate">{place.title}</h5>
                            <div className="flex items-center gap-2 mt-1">
                               <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter">{place.category}</span>
                               {place.rating && (
                                 <span className="flex items-center gap-0.5 text-[8px] font-black text-amber-500">
                                   <Star className="w-2 h-2 fill-amber-500" />
                                   {place.rating}
                                 </span>
                               )}
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                               const newLayers = savedLayers.map(l => {
                                  if (l.name === layer.name) {
                                     return { ...l, places: l.places.filter(p => p.title !== place.title) };
                                  }
                                  return l;
                               }).filter(l => l.places.length > 0);
                               setSavedLayers(newLayers);
                            }}
                            className="p-1.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 space-y-4 shrink-0">
            <div className="bg-indigo-900 text-indigo-200 p-5 rounded-2xl shadow-inner flex gap-4">
              <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold leading-relaxed tracking-wide">
                {t.layersTip}
              </p>
            </div>
            <button 
              disabled={savedLayers.length === 0}
              onClick={handleDownload}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-black py-4.5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-2xl shadow-indigo-100 active:scale-[0.98]"
            >
              <Download className="w-5 h-5" />
              <span className="text-sm uppercase tracking-[0.2em]">{t.downloadKml}</span>
            </button>
          </div>
        </div>
      </main>
      
      {/* Global Style for the shimmer effect */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }
      `}</style>
    </div>
  );
};

export default App;
