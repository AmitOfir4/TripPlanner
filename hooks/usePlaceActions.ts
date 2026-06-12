import { TripRecommendation, TripLayer } from '../types';

interface UsePlaceActionsDeps {
  savedLayers: TripLayer[];
  setSavedLayers: React.Dispatch<React.SetStateAction<TripLayer[]>>;
}

interface UsePlaceActionsReturn {
  /** Remove a place (found by its title) from the layer it lives in. */
  removePlaceFromMap: (place: TripRecommendation) => void;
  /** Replace a place in-place wherever its title matches. */
  updatePlaceFromMap: (updated: TripRecommendation) => void;
  /** Move a place between/within layers via drag-and-drop. */
  reorderPlace: (fromLayer: string, fromIndex: number, toLayer: string, toIndex: number) => void;
}

export const usePlaceActions = (deps: UsePlaceActionsDeps): UsePlaceActionsReturn => {
  const { savedLayers, setSavedLayers } = deps;

  const removePlace = (layerName: string, placeTitle: string) => {
    // Keep empty layers — the user can delete them explicitly from the sidebar.
    setSavedLayers((prev) =>
      prev.map((layer) =>
        layer.name === layerName
          ? { ...layer, places: layer.places.filter((p) => p.title !== placeTitle) }
          : layer
      )
    );
  };

  const removePlaceFromMap = (place: TripRecommendation) => {
    const layer = savedLayers.find((l) => l.places.some((p) => p.title === place.title));
    if (layer) removePlace(layer.name, place.title);
  };

  const updatePlaceFromMap = (updated: TripRecommendation) => {
    setSavedLayers((prev) =>
      prev.map((layer) => ({
        ...layer,
        places: layer.places.map((p) => (p.title === updated.title ? updated : p)),
      }))
    );
  };

  const reorderPlace = (fromLayer: string, fromIndex: number, toLayer: string, toIndex: number) => {
    setSavedLayers((prev) => {
      const layers = prev.map((l) => ({ ...l, places: [...l.places] }));
      const srcLayer = layers.find((l) => l.name === fromLayer);
      const dstLayer = layers.find((l) => l.name === toLayer);
      if (!srcLayer || !dstLayer) return prev;
      const [moved] = srcLayer.places.splice(fromIndex, 1);
      dstLayer.places.splice(toIndex, 0, moved);
      // Preserve empty layers — they may have been intentionally created.
      return layers;
    });
  };

  return { removePlaceFromMap, updatePlaceFromMap, reorderPlace };
};
