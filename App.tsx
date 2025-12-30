
import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { 
  MapPin, Search, Compass, Layers, ExternalLink, Loader2, 
  Sparkles, Map as MapIcon, Download, Info, 
  Plus, Trash2, X, Star, RefreshCw, MessageSquare, Image as ImageIcon,
  Camera, Map as MapIcon2, AlertTriangle, ChevronRight, ChevronLeft, LogIn, Upload
} from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { fetchSuggestions } from './geminiService';
import { TripData, Language, TripRecommendation, TripLayer } from './types';
import { generateKml, downloadFile } from './utils';
import { fetchMyMaps, downloadMyMapAsKML, uploadKMLToDrive, MyMapsFile } from './googleDriveService';
import { parseKMLToTripData } from './kmlParser';
import { GoogleUser } from './googleAuthService';

declare var google: any;
declare var window: any;

const translations = {
  en: {
    title: "TripPlanner",
    builder: "Plan Your Escape",
    savedMap: "Trip Summary",
    cityPrompt: "Destination City",
    queryPrompt: "What are you looking for?",
    queryPlaceholder: "e.g. Hidden gems, best pizza, local art...",
    findPlaces: "Discover Spots",
    loadMore: "Find More",
    searching: "Searching the map...",
    savePlace: "Add to Trip",
    dismiss: "Skip",
    noCity: "Where should we go first?",
    noPlaces: "Your itinerary is empty",
    saved: "Added!",
    downloadKml: "Export to My Maps",
    howToImport: "How to use",
    sources: "Map Evidence",
    reset: "Clear",
    layersTip: "Locations are grouped by city layers for easier navigation.",
    rating: "Rating",
    topRated: "Highly Recommended",
    apiError: "Visuals Restricted"
  },
  he: {
    title: "TripPlanner",
    builder: "תכנן את הטיול שלך",
    savedMap: "סיכום טיול",
    cityPrompt: "עיר יעד",
    queryPrompt: "מה תרצו למצוא?",
    queryPlaceholder: "למשל: מקומות נסתרים, פיצה מעולה...",
    findPlaces: "חפש מקומות",
    loadMore: "טען עוד",
    searching: "מחפש במפה...",
    savePlace: "הוסף לטיול",
    dismiss: "דלג",
    noCity: "לאן נטוס קודם?",
    noPlaces: "סיכום הטיול ריק",
    saved: "נשמר!",
    downloadKml: "ייצוא ל-My Maps",
    howToImport: "איך להשתמש?",
    sources: "מקורות מידע",
    reset: "אפס",
    layersTip: "המקומות מקובצים לפי ערים לניווט קל יותר.",
    rating: "דירוג",
    topRated: "מומלץ במיוחד",
    apiError: "מפות מוגבלות"
  }
};

const getFallbackImage = (category: string) => {
  const lower = (category || '').toLowerCase();
  if (lower.includes('food') || lower.includes('restaurant') || lower.includes('cafe') || lower.includes('dining')) 
    return "https://media.istockphoto.com/id/1417838650/vector/knife-fork-silhouette-icon-vector-icon.jpg?s=612x612&w=0&k=20&c=aEC7Gqh8Fr7KC3bzhBqijGm_rgavKos6ifO1Hsh5U-U="; // Fork and knife
  if (lower.includes('museum') || lower.includes('art') || lower.includes('history') || lower.includes('culture') || lower.includes('attraction') || lower.includes('monument')) 
    return "https://m.media-amazon.com/images/I/714Uj0TkppL.jpg"; // Star symbol
  if (lower.includes('shop') || lower.includes('market') || lower.includes('mall')) 
    return "https://www.creativefabrica.com/wp-content/uploads/2021/03/02/Shopping-bag-Hand-holding-a-shopping-Graphics-9096002-1.png"; // Shopping cart
  if (lower.includes('beach') || lower.includes('sea')) 
    return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80";
  return "https://m.media-amazon.com/images/I/714Uj0TkppL.jpg"; 
};

const GooglePlaceImage = memo(({ place, mapsStatus, index = 0 }: { place: TripRecommendation, mapsStatus: 'loading' | 'loaded' | 'error', index?: number }) => {
  // Use category-based default image only
  const imageUrl = getFallbackImage(place.category);

  return (
    <div className="w-full h-full relative overflow-hidden group">
      <img 
        src={imageUrl} 
        alt={place.title} 
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000 ease-out brightness-[0.95]"
        onLoad={(e) => (e.currentTarget.style.opacity = '1')}
        style={{ opacity: 0, transition: 'opacity 0.7s ease-out' }}
      />
      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[8px] font-bold text-white uppercase tracking-widest flex items-center gap-1">
          <ImageIcon className="w-2.5 h-2.5" />
          category
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
  
  // Google OAuth & Import states
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [myMaps, setMyMaps] = useState<MyMapsFile[]>([]);
  const [loadingMaps, setLoadingMaps] = useState(false);
  const [importingMap, setImportingMap] = useState(false);

  const suggestionsEndRef = useRef<HTMLDivElement>(null);

  // Google Sign-In
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // Fetch user info
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoResponse.json();
        
        setGoogleUser({
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          accessToken: tokenResponse.access_token,
        });
      } catch (error) {
        console.error('Error fetching user info:', error);
      }
    },
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
  });

  const handleImportFromMyMaps = async () => {
    if (!googleUser) {
      login();
      return;
    }
    
    setShowImportModal(true);
    setLoadingMaps(true);
    
    try {
      const maps = await fetchMyMaps(googleUser.accessToken);
      setMyMaps(maps);
    } catch (error) {
      console.error('Error fetching My Maps:', error);
      alert('Failed to load your My Maps. Please try again.');
    } finally {
      setLoadingMaps(false);
    }
  };

  const handleSelectMap = async (mapFile: MyMapsFile) => {
    if (!googleUser) return;
    
    setImportingMap(true);
    try {
      // Try to download and import the map automatically
      const kmlText = await downloadMyMapAsKML(mapFile.id, googleUser.accessToken);
      const { layers, cityName } = parseKMLToTripData(kmlText);
      
      // Merge imported layers with existing ones
      setSavedLayers(prev => [...prev, ...layers]);
      if (!currentCity) {
        setCurrentCity(cityName);
      }
      
      setShowImportModal(false);
    } catch (error) {
      console.error('Error importing map:', error);
      alert('Failed to import map. Please make sure it is publicly shared or use the "Upload KML File" button.');
    } finally {
      setImportingMap(false);
    }
  };

  const handleKMLFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be uploaded again
    event.target.value = '';

    try {
      const kmlText = await file.text();
      const { layers, cityName } = parseKMLToTripData(kmlText);
      
      // Merge imported layers with existing ones
      setSavedLayers(prev => [...prev, ...layers]);
      if (!currentCity) {
        setCurrentCity(cityName);
      }
      
      setShowImportModal(false);
      alert(`Successfully imported "${file.name}" with ${layers.reduce((acc, l) => acc + l.places.length, 0)} places!`);
    } catch (error) {
      console.error('Error parsing KML file:', error);
      alert('Failed to parse KML file. Please make sure it\'s a valid KML file from Google My Maps.');
    }
  };

  const loadMapsScript = useCallback(() => {
    setMapsStatus('loading');
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.API_KEY;
    
    if (!apiKey) {
      setMapsStatus('error');
      return;
    }

    const scriptId = 'google-maps-sdk';
    const existingScript = document.getElementById(scriptId);
    if (existingScript) existingScript.remove();

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setTimeout(() => {
        if (window.google && window.google.maps) {
          setMapsStatus('loaded');
        } else {
          setMapsStatus('error');
        }
      }, 500);
    };
    
    script.onerror = () => setMapsStatus('error');
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    loadMapsScript();
  }, [loadMapsScript]);

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
        setTimeout(() => suggestionsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
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
      summary: "Your AI-powered travel itinerary.",
      layers: savedLayers,
      sources: [],
      language: lang
    };
    const kml = generateKml(tripData);
    downloadFile(kml, `Trip_${currentCity || 'Planner'}.kml`, "application/vnd.google-earth.kml+xml");
  };

  const handleUploadToDrive = async () => {
    if (!googleUser || savedLayers.length === 0) return;
    
    try {
      const tripData: TripData = {
        city: savedLayers.map(l => l.name).join(', '),
        summary: "Your AI-powered travel itinerary.",
        layers: savedLayers,
        sources: [],
        language: lang
      };
      const kml = generateKml(tripData);
      const fileName = `Trip_${currentCity || 'Planner'}_${new Date().toISOString().split('T')[0]}.kml`;
      
      const result = await uploadKMLToDrive(kml, fileName, googleUser.accessToken);
      
      // Open Google My Maps to import the file
      const myMapsUrl = 'https://mymaps.google.com/';
      window.open(myMapsUrl, '_blank');
      
      // Show instructions
      setTimeout(() => {
        alert(
          `✅ KML uploaded successfully!\n\n` +
          `Google My Maps is now opening...\n\n` +
          `To import your map:\n` +
          `1. Click "Create a New Map" (or open an existing map)\n` +
          `2. Click "Import" in the left menu\n` +
          `3. Select "Google Drive"\n` +
          `4. Find and select: "${fileName}"\n` +
          `5. Click "Select" to import\n\n` +
          `Your map layers will be imported!`
        );
      }, 500);
    } catch (error) {
      console.error('Error uploading to Drive:', error);
      alert('Failed to upload to Google Drive. Please try again.');
    }
  };

  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col antialiased ${isRtl ? 'font-sans' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Premium Header */}
      <header className="sticky top-0 z-50 glass h-18 px-6 lg:px-12 flex items-center justify-between border-b border-slate-200/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <MapIcon className="text-white w-5 h-5" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {t.title}
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          {googleUser ? (
            <div className="flex items-center gap-3">
              <img src={googleUser.picture} alt={googleUser.name} className="w-8 h-8 rounded-full" />
              <span className="text-xs font-medium text-slate-600 hidden md:inline">{googleUser.name}</span>
              <button
                onClick={() => setGoogleUser(null)}
                className="text-xs text-slate-400 hover:text-red-600 font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : null}
          
          <button
            onClick={handleImportFromMyMaps}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition-all"
          >
            {googleUser ? <Upload className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {googleUser ? 'Import' : 'Sign In'}
          </button>
          
          <div className="flex bg-slate-100/80 rounded-xl p-1 border border-slate-200/50">
            <button onClick={() => setLang('en')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${lang === 'en' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>EN</button>
            <button onClick={() => setLang('he')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${lang === 'he' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>עב</button>
          </div>
          
          <button 
            onClick={() => { setSavedLayers([]); setCurrentCity(''); setPendingSuggestions([]); setQuery(''); }}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Discovery Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-12">
          <div className="max-w-4xl mx-auto space-y-12">
            <section className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-4xl font-black text-slate-900">{t.builder}</h2>
                <p className="text-slate-500 font-medium">Use AI to curate the perfect local experience.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t.cityPrompt}</label>
                  <div className="relative group">
                    <MapPin className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors`} />
                    <input 
                      type="text" 
                      placeholder="e.g. Amsterdam"
                      className={`w-full ${isRtl ? 'pr-12' : 'pl-12'} py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all outline-none font-bold text-slate-800 shadow-sm`}
                      value={currentCity}
                      onChange={(e) => setCurrentCity(e.target.value)}
                    />
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t.queryPrompt}</label>
                  <div className="relative group">
                    <MessageSquare className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors`} />
                    <input 
                      type="text" 
                      placeholder={t.queryPlaceholder}
                      className={`w-full ${isRtl ? 'pr-12' : 'pl-12'} py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all outline-none font-medium text-slate-800 shadow-sm`}
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
                className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-100 disabled:text-slate-400 text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.99]"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Compass className="w-6 h-6" />}
                <span className="text-lg uppercase tracking-widest">{loading ? t.searching : t.findPlaces}</span>
              </button>
            </section>

            {/* Results Grid */}
            <div className="space-y-8 pb-20">
              {pendingSuggestions.length > 0 && (
                <>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <Sparkles className="w-4 h-4 text-indigo-500" />
                       {t.topRated}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {pendingSuggestions.map((place, idx) => (
                      <div key={idx} className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group">
                        <div className="relative h-64 bg-slate-100">
                           <GooglePlaceImage place={place} mapsStatus={mapsStatus} index={idx} />
                           <div className="absolute top-5 left-5 right-5 flex justify-between items-start">
                              <span className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl text-[10px] font-black uppercase text-indigo-600 shadow-sm">
                                {place.category}
                              </span>
                              {place.rating && (
                                <div className="flex items-center gap-1 bg-amber-400 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-md">
                                  <Star className="w-3.5 h-3.5 fill-white" />
                                  {place.rating.toFixed(1)}
                                </div>
                              )}
                           </div>
                        </div>
                        <div className="p-8 space-y-4">
                          <h4 className="font-extrabold text-slate-900 text-2xl leading-tight group-hover:text-indigo-600 transition-colors">{place.title}</h4>
                          <p className="text-slate-500 text-sm leading-relaxed line-clamp-3 font-medium">{place.description}</p>
                          
                          <div className="pt-4 flex items-center justify-between gap-4">
                             {place.mapUrl ? (
                               <a href={place.mapUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors">
                                 <MapPin className="w-4 h-4" />
                                 View Map
                               </a>
                             ) : <div />}
                             <div className="flex gap-2">
                               <button 
                                 onClick={() => setPendingSuggestions(prev => prev.filter(p => p.title !== place.title))}
                                 className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                 title={t.dismiss}
                               >
                                 <X className="w-5 h-5" />
                               </button>
                               <button 
                                 onClick={() => savePlace(place)}
                                 className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 text-xs font-black uppercase tracking-widest active:scale-95"
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

                  <div className="flex justify-center pt-8" ref={suggestionsEndRef}>
                    <button 
                      onClick={() => handleSearch(null, true)}
                      disabled={loadingMore}
                      className="group flex items-center gap-3 px-10 py-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-600 text-slate-900 font-black text-xs uppercase tracking-widest transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                    >
                      {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />}
                      {t.loadMore}
                    </button>
                  </div>
                </>
              )}

              {!loading && pendingSuggestions.length === 0 && (
                <div className="py-24 text-center space-y-8 flex flex-col items-center">
                   <div className="relative">
                      <div className="w-32 h-32 bg-indigo-50 rounded-[3rem] rotate-12 absolute -inset-2 opacity-50" />
                      <div className="w-32 h-32 bg-white rounded-[3rem] shadow-sm flex items-center justify-center relative border border-slate-100">
                        <MapPin className="w-12 h-12 text-indigo-600" />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <p className="text-slate-900 font-black text-2xl tracking-tight">{currentCity ? "Ready to explore?" : t.noCity}</p>
                      <p className="text-slate-500 max-w-xs mx-auto text-sm font-medium">Tell us your destination and what you love to do there.</p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Itinerary Sidebar */}
        <aside className="lg:w-[440px] shrink-0 bg-white border-l border-slate-200 overflow-y-auto p-8 flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
                 <Layers className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t.savedMap}</h3>
            </div>
            {savedLayers.length > 0 && (
              <div className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full">
                {savedLayers.reduce((acc, l) => acc + l.places.length, 0)} SPOTS
              </div>
            )}
          </div>

          <div className="flex-1 space-y-12">
            {savedLayers.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-24 opacity-40">
                <Search className="w-12 h-12 text-slate-300 mb-6" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{t.noPlaces}</p>
              </div>
            ) : (
              savedLayers.map((layer, idx) => (
                <div key={idx} className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500">
                  <div className="flex items-center gap-3 group">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{layer.name}</span>
                    <div className="flex-1 h-px bg-slate-100" />
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="space-y-3">
                    {layer.places.map((place, pIdx) => (
                      <div key={pIdx} className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 shadow-sm hover:bg-white hover:shadow-lg transition-all group flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0">
                           <GooglePlaceImage place={place} mapsStatus={mapsStatus} index={pIdx} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-slate-900 text-sm truncate">{place.title}</h5>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{place.category}</span>
                             {place.rating && (
                               <span className="flex items-center gap-0.5 text-[9px] font-black text-amber-500">
                                 <Star className="w-2.5 h-2.5 fill-amber-500" />
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
                          className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-12 space-y-4 shrink-0">
            <div className="bg-slate-900 text-slate-400 p-6 rounded-[2rem] shadow-xl flex gap-4">
              <Info className="w-6 h-6 text-indigo-400 shrink-0" />
              <p className="text-[10px] font-bold leading-relaxed tracking-wide text-slate-300">
                {t.layersTip}
              </p>
            </div>
            <button 
              disabled={savedLayers.length === 0}
              onClick={handleDownload}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-200 active:scale-[0.98]"
            >
              <Download className="w-5 h-5" />
              <span className="text-sm uppercase tracking-widest">{t.downloadKml}</span>
            </button>
            {googleUser && (
              <button 
                disabled={savedLayers.length === 0}
                onClick={handleUploadToDrive}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 transition-all shadow-xl shadow-green-200 active:scale-[0.98]"
              >
                <Upload className="w-5 h-5" />
                <span className="text-sm uppercase tracking-widest">Upload to Drive</span>
              </button>
            )}
          </div>
        </aside>
      </main>

      {/* Import from My Maps Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setShowImportModal(false)}>
          <div className="bg-white rounded-[2rem] p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-900">Import from My Maps</h2>
              <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {loadingMaps ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : myMaps.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <MapIcon2 className="w-16 h-16 text-slate-300 mx-auto" />
                <p className="text-slate-500 font-medium">No saved maps found in your Google My Maps</p>
                <p className="text-xs text-slate-400">Create maps at maps.google.com and they'll appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myMaps.map((map) => (
                  <button
                    key={map.id}
                    onClick={() => handleSelectMap(map)}
                    disabled={importingMap}
                    className="w-full p-5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-600 rounded-2xl transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                        <MapIcon className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{map.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Modified: {new Date(map.modifiedTime).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* File Upload Button */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <label className="block">
                <input
                  type="file"
                  accept=".kml,.kmz"
                  onChange={handleKMLFileUpload}
                  className="hidden"
                />
                <div className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg cursor-pointer">
                  <Upload className="w-5 h-5" />
                  <span>Upload KML File</span>
                </div>
              </label>
              <p className="text-xs text-slate-400 text-center mt-3">
                Download your map from Google My Maps, then upload the KML file here
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
