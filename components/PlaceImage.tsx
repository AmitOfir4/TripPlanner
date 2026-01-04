import React, { memo } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { TripRecommendation } from '../types';
import { getCategoryImage } from '../helpers/imageHelper';

interface PlaceImageProps {
  place: TripRecommendation;
  index?: number;
}

export const PlaceImage = memo<PlaceImageProps>(({ place }) => {
  const imageUrl = getCategoryImage(place.category);

  return (
    <div className="w-full h-full relative overflow-hidden group bg-slate-100">
      <img 
        src={imageUrl} 
        alt={place.title} 
        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-1000 ease-out brightness-[0.95]"
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

PlaceImage.displayName = 'PlaceImage';
