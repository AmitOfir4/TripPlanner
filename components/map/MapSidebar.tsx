import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronRight, Layers, GripVertical, Pencil, Trash2, Plus, Check, X } from 'lucide-react';
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
  onAddLayer?: (name: string) => boolean;
  onRenameLayer?: (from: string, to: string) => boolean;
  onDeleteLayer?: (name: string) => void;
}

export const MapSidebar: React.FC<MapSidebarProps> = ({
  savedLayers,
  isSidebarOpen,
  selectedPlace,
  onToggleSidebar,
  onSelectPlace,
  onReorderPlace,
  onAddLayer,
  onRenameLayer,
  onDeleteLayer,
}) => {
  const [collapsedLayers, setCollapsedLayers] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState<{ layerName: string; index: number } | null>(null);
  const [renamingLayer, setRenamingLayer] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isCreatingLayer, setIsCreatingLayer] = useState(false);
  const [newLayerName, setNewLayerName] = useState('');
  const dragItem = useRef<{ layerName: string; index: number } | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const newLayerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingLayer && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingLayer]);

  useEffect(() => {
    if (isCreatingLayer && newLayerInputRef.current) {
      newLayerInputRef.current.focus();
    }
  }, [isCreatingLayer]);

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

  // index = -1 means "the layer itself" — drop appends to the end of that layer.
  const handleDragOver = useCallback((e: React.DragEvent, layerName: string, index: number) => {
    if (!dragItem.current) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOver({ layerName, index });
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear when leaving the actual element, not when crossing into a child.
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as HTMLElement).contains(related)) return;
    setDragOver(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toLayer: string, toIndex: number, layerLength: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    if (!dragItem.current || !onReorderPlace) return;
    const { layerName: fromLayer, index: fromIndex } = dragItem.current;
    // Sentinel "layer end" → append to the destination layer's tail.
    const finalIndex = toIndex === -1 ? layerLength : toIndex;
    // No-op when the place would land in its current spot.
    const sameLayer = fromLayer === toLayer;
    if (sameLayer && (fromIndex === finalIndex || (toIndex === -1 && fromIndex === layerLength - 1))) return;
    onReorderPlace(fromLayer, fromIndex, toLayer, finalIndex);
    dragItem.current = null;
  }, [onReorderPlace]);

  const toggleLayer = (name: string) =>
    setCollapsedLayers((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const startRename = (name: string) => {
    setRenamingLayer(name);
    setRenameValue(name);
  };

  const commitRename = () => {
    if (!renamingLayer || !onRenameLayer) { setRenamingLayer(null); return; }
    const ok = onRenameLayer(renamingLayer, renameValue);
    if (!ok && renameValue.trim() && renameValue.trim() !== renamingLayer) {
      // Name collided — keep the user in the input so they can fix it.
      return;
    }
    setRenamingLayer(null);
  };

  const cancelRename = () => setRenamingLayer(null);

  const commitNewLayer = () => {
    if (!onAddLayer) { setIsCreatingLayer(false); return; }
    const ok = onAddLayer(newLayerName);
    if (!ok && newLayerName.trim()) return;
    setNewLayerName('');
    setIsCreatingLayer(false);
  };

  const cancelNewLayer = () => {
    setIsCreatingLayer(false);
    setNewLayerName('');
  };

  const confirmDelete = (name: string, count: number) => {
    if (!onDeleteLayer) return;
    const msg = count > 0
      ? `Delete the "${name}" layer and its ${count} place${count === 1 ? '' : 's'}?`
      : `Delete the empty "${name}" layer?`;
    if (confirm(msg)) onDeleteLayer(name);
  };

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
            const isRenaming = renamingLayer === layer.name;
            const isLayerDropTarget =
              !!dragItem.current &&
              dragOver?.layerName === layer.name &&
              dragOver?.index === -1;
            return (
              <div
                key={layer.name}
                className={s.layerBorder}
                onDragOver={(e) => onReorderPlace && handleDragOver(e, layer.name, -1)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, layer.name, -1, layer.places.length)}
              >
                <div className={s.layerRow + (isLayerDropTarget ? ' bg-teal-50 ring-2 ring-teal-400 ring-inset' : '')}>
                  {isRenaming ? (
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        else if (e.key === 'Escape') cancelRename();
                      }}
                      className={s.layerNameInput}
                    />
                  ) : (
                    <>
                      <button onClick={() => toggleLayer(layer.name)} className={s.layerBtn}>
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        )}
                        <span className={s.layerName}>{layer.name}</span>
                        <span className={s.layerCount}>{layer.places.length}</span>
                      </button>
                      {onRenameLayer && (
                        <button
                          onClick={() => startRename(layer.name)}
                          className={s.layerActionBtn}
                          title="Rename layer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                      {onDeleteLayer && (
                        <button
                          onClick={() => confirmDelete(layer.name, layer.places.length)}
                          className={s.layerDeleteBtn}
                          title="Delete layer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {!isCollapsed && (
                  <ul>
                    {layer.places.length === 0 && (
                      <li className={s.layerEmpty}>No places yet — drag a place here or click on the map.</li>
                    )}
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
                          onDrop={(e) => handleDrop(e, layer.name, idx, layer.places.length)}
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

        {/* Create-new-layer row */}
        {onAddLayer && (
          <div className={s.newLayerWrap}>
            {isCreatingLayer ? (
              <div className={s.newLayerInputRow}>
                <input
                  ref={newLayerInputRef}
                  type="text"
                  value={newLayerName}
                  onChange={(e) => setNewLayerName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitNewLayer();
                    else if (e.key === 'Escape') cancelNewLayer();
                  }}
                  placeholder="Layer name"
                  className={s.newLayerInput}
                />
                <button
                  onClick={commitNewLayer}
                  disabled={!newLayerName.trim()}
                  className={s.newLayerConfirmBtn}
                  title="Create layer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={cancelNewLayer} className={s.newLayerCancelBtn} title="Cancel">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button onClick={() => setIsCreatingLayer(true)} className={s.newLayerBtn}>
                <Plus className="w-3.5 h-3.5" /> New layer
              </button>
            )}
          </div>
        )}
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
