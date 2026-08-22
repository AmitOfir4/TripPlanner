import React, { useState } from 'react';
import { MapPin, Edit2, Check, ExternalLink } from 'lucide-react';
import { TripRecommendation, TripLayer } from '../../types';
import { KmlIconSelector } from '../KmlIconSelector';
import { reverseGeocode } from '../../services/geocodeService';
import { mapInfoWindowStyles as iw } from '../../styles/map';

/** A spot picked on the map — bare coords from a click, or a searched place. */
export interface PickedLocation {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
  rating?: number | null;
}

interface NewPlaceFormProps {
  location: PickedLocation;
  savedLayers: TripLayer[];
  onAddPlace?: (place: TripRecommendation, targetLayerName?: string) => void;
  onDone: () => void;
}

const NEW_LAYER_OPTION = '__new__';

/**
 * Add-to-trip form shown in the map's InfoWindow. Like
 * [PlaceDescriptionEditor], it owns its own field state so typing doesn't
 * re-render MapView and make the Maps API steal focus. Mount it with a `key`
 * tied to the location so a new pick resets the fields.
 */
export const NewPlaceForm: React.FC<NewPlaceFormProps> = ({
  location,
  savedLayers,
  onAddPlace,
  onDone,
}) => {
  const [name, setName] = useState(location.name || '');
  // Prefilled with the address (what used to be saved automatically) so the
  // user can tweak it instead of only accepting it.
  const [description, setDescription] = useState(location.address || '');
  const [icon, setIcon] = useState('icon-camera');
  // Default to the first existing layer; falls back to "create new" if there
  // are no layers yet.
  const [layer, setLayer] = useState(savedLayers[0]?.name || NEW_LAYER_OPTION);
  const [newLayerName, setNewLayerName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!onAddPlace) return;
    setIsAdding(true);
    let title = name.trim();
    if (!title) {
      const result = await reverseGeocode(location.lat, location.lng);
      title = result?.place_name || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    }
    const targetLayer = layer === NEW_LAYER_OPTION ? newLayerName.trim() : layer;
    onAddPlace({
      title,
      description: description.trim()
        || `Custom location at ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
      category: 'Other',
      lat: location.lat,
      lng: location.lng,
      customKmlIcon: icon,
      ...(typeof location.rating === 'number' ? { rating: location.rating } : {}),
    }, targetLayer || undefined);
    setIsAdding(false);
    onDone();
  };

  const mapsUrl = location.name
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.name)}&center=${location.lat},${location.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;

  return (
    <div className={iw.clickedWrapper}>
      <div className="mb-3">
        <label className={iw.clickedLabel}>Place Name</label>
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={iw.clickedInput} autoFocus />
              <button onClick={() => setIsEditingName(false)} className={iw.clickedConfirmBtn}><Check className="w-3 h-3" /></button>
            </>
          ) : (
            <>
              <h4 className={iw.clickedTitle}>{name || 'Selected Location'}</h4>
              <button onClick={() => setIsEditingName(true)} className={iw.clickedEditBtn}><Edit2 className="w-3 h-3" /></button>
            </>
          )}
        </div>
      </div>

      {/* With the form shown the address lives in the Description field, so
          this line stays on the raw coordinates instead of repeating it. */}
      <p className={iw.clickedCoords}>
        {!onAddPlace && location.address
          ? location.address
          : `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`}
      </p>

      {onAddPlace && (
        <>
          <div className="mb-3">
            <label className={iw.clickedLabel}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a note about this place…"
              className={iw.descriptionTextarea}
            />
          </div>

          <div className="mb-3">
            <label className={iw.clickedLabel}>Select Icon</label>
            <KmlIconSelector currentIconId={icon} onIconChange={setIcon} />
          </div>

          <div className="mb-3">
            <label className={iw.clickedLabel}>Add to Layer</label>
            <select value={layer} onChange={(e) => setLayer(e.target.value)} className={iw.clickedLayerSelect}>
              {savedLayers.map((l) => (
                <option key={l.name} value={l.name}>{l.name}</option>
              ))}
              <option value={NEW_LAYER_OPTION}>+ New layer…</option>
            </select>
            {layer === NEW_LAYER_OPTION && (
              <input
                type="text"
                value={newLayerName}
                onChange={(e) => setNewLayerName(e.target.value)}
                placeholder="New layer name"
                className={`${iw.clickedLayerNewInput} mt-2`}
              />
            )}
          </div>

          <button
            disabled={isAdding || (layer === NEW_LAYER_OPTION && !newLayerName.trim())}
            onClick={handleAdd}
            className={iw.clickedAddBtn}
          >
            <MapPin className="w-3 h-3" />
            {isAdding ? 'Adding...' : 'Add to Trip'}
          </button>
        </>
      )}

      <a href={mapsUrl} target="_blank" rel="noreferrer" className={iw.clickedMapsLink}>
        <ExternalLink className="w-3 h-3" /> Open in Google Maps
      </a>
    </div>
  );
};
