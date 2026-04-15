import React, { useState, useRef, useCallback } from 'react';
import { ChevronDown, ChevronRight, Layers, GripVertical } from 'lucide-react';
import { TripLayer, TripRecommendation } from '../../types';
import { AVAILABLE_KML_ICONS } from '../../constants';
import { getDefaultKmlIcon } from '../../helpers/kmlIconHelper';
import { mapSidebarStyles as s } from '../../styles/map';

interface MapSidebarProps {
  savedLayers: TripLayer[];
  isSidebarOpen: boolean;
  selectedPlace: TripRecommendation | null;
  onToggleSidebar: () => void;
  onSelectPlace: (place: TripRecommendation) => void;
  onReorderPlace?: (fromLayer: string, fromIndex: number, toLayer: string, toIndex: number) => void;
}

export const MapSidebar: React.FC<MapSidebarProps> = ({
  savedLayers,
  isSidebarOpen,
  selectedPlace,
  onToggleSidebar,
  onSelectPlace,
  onReorderPlace,
}) => {
  const [collapsedLayers, setCollapsedLayers] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState<{ layerName: string; index: number } | null>(null);
  const dragItem = useRef<{ layerName: string; index: number } | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, layerName: string, index: number) => {
    dragItem.current = { layerName, index };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    (e.currentTarget as HTMLElement).style.opacity = '0.4';
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1';
    dragItem.current = null;
    setDragOver(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, layerName: string, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver({ layerName, index });
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toLayer: string, toIndex: number) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragItem.current || !onReorderPlace) return;
    const { layerName: fromLayer, index: fromIndex } = dragItem.current;
    if (fromLayer === toLayer && fromIndex === toIndex) return;
    onReorderPlace(fromLayer, fromIndex, toLayer, toIndex);
    dragItem.current = null;
  }, [onReorderPlace]);

  const toggleLayer = (name: string) =>
    setCollapsedLayers((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  return (
    <div className={s.wrapper(isSidebarOpen)}>
      <div className={s.inner(isSidebarOpen)}>
        {/* Header */}
        <div className={s.header}>
          <Layers className="w-4 h-4 text-teal-600" />
          <span className={s.headerTitle}>Trip Summary</span>
          <span className={s.headerCount}>
            {savedLayers.reduce((n, l) => n + l.places.length, 0)} places
          </span>
        </div>

        {/* Layers */}
        <div className={s.scrollable}>
          {savedLayers.map((layer) => {
            const isCollapsed = collapsedLayers.has(layer.name);
            return (
              <div key={layer.name} className={s.layerBorder}>
                <button onClick={() => toggleLayer(layer.name)} className={s.layerBtn}>
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  )}
                  <span className={s.layerName}>{layer.name}</span>
                  <span className={s.layerCount}>{layer.places.length}</span>
                </button>

                {!isCollapsed && (
                  <ul>
                    {layer.places.map((place, idx) => {
                      const iconStyle = place.customKmlIcon || getDefaultKmlIcon(place);
                      const iconUrl =
                        AVAILABLE_KML_ICONS.find((i) => i.id === iconStyle)?.url ||
                        AVAILABLE_KML_ICONS[0].url;
                      const isActive = selectedPlace?.title === place.title;
                      const isDragTarget = dragOver?.layerName === layer.name && dragOver?.index === idx;
                      return (
                        <li
                          key={idx}
                          draggable={!!onReorderPlace}
                          onDragStart={(e) => handleDragStart(e, layer.name, idx)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleDragOver(e, layer.name, idx)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, layer.name, idx)}
                          className={`transition-all duration-150 ${isDragTarget ? 'border-t-2 border-teal-400' : ''}`}
                        >
                          <button onClick={() => onSelectPlace(place)} className={s.placeBtn(isActive)}>
                            {onReorderPlace && (
                              <GripVertical className="w-3 h-3 text-slate-300 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                            )}
                            <img src={iconUrl} alt={place.category} className="w-4 h-4 flex-shrink-0" />
                            <span className={s.placeName(isActive)}>{place.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Collapse / expand tab */}
      <button
        onClick={onToggleSidebar}
        title={isSidebarOpen ? 'Collapse sidebar' : 'Show trip summary'}
        className={s.collapseTab(isSidebarOpen)}
      >
        <ChevronRight
          className={isSidebarOpen ? 'w-3 h-3 text-slate-400' : 'w-5 h-5 text-teal-600'}
          strokeWidth={isSidebarOpen ? undefined : 3}
        />
      </button>
    </div>
  );
};
