import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AVAILABLE_KML_ICONS } from '../constants';
import { kmlIconSelectorStyles as s } from '../styles/modals';

interface KmlIconSelectorProps {
  currentIconId: string;
  onIconChange: (iconId: string) => void;
}

export const KmlIconSelector: React.FC<KmlIconSelectorProps> = ({
  currentIconId,
  onIconChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const currentIcon = AVAILABLE_KML_ICONS.find((icon) => icon.id === currentIconId) || AVAILABLE_KML_ICONS[0];

  return (
    <div className="w-full">
      <button onClick={() => setIsExpanded(!isExpanded)} className={s.triggerBtn}>
        <div className="flex items-center gap-2">
          <img src={currentIcon.url} alt={currentIcon.name} className="w-4 h-4" />
          <span>Icon: {currentIcon.name}</span>
        </div>
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {isExpanded && (
        <div className={s.dropdown}>
          <div className={s.dropdownLabel}>Select Icon</div>
          <div className={s.grid}>
            {AVAILABLE_KML_ICONS.map((icon) => (
              <button
                key={icon.id}
                onClick={() => {
                  onIconChange(icon.id);
                  setIsExpanded(false);
                }}
                className={s.iconBtn(icon.id === currentIconId)}
                title={icon.name}
              >
                <img src={icon.url} alt={icon.name} className={s.iconImg} />
                <span className={s.iconName}>{icon.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
