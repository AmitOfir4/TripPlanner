import React, { memo } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { TripRecommendation } from '../types';
import { getCategoryImage } from '../helpers/imageHelper';
import { placeImageStyles as s } from '../styles/places';

interface PlaceImageProps {
  place: TripRecommendation;
  index?: number;
}

export const PlaceImage = memo<PlaceImageProps>(({ place }) => {
  const imageUrl = getCategoryImage(place.category);

  return (
    <div className={s.wrapper}>
      <img
        src={imageUrl}
        alt={place.title}
        className={s.img}
        onLoad={(e) => (e.currentTarget.style.opacity = '1')}
        style={{ opacity: 0, transition: 'opacity 0.7s ease-out' }}
      />
      <div className={s.overlay}>
        <span className={s.overlayText}>
          <ImageIcon className="w-2.5 h-2.5" />
          category
        </span>
      </div>
    </div>
  );
});

PlaceImage.displayName = 'PlaceImage';
