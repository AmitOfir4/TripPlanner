import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AVAILABLE_KML_ICONS } from '../constants';

interface KmlIconSelectorProps {
  currentIconId: string;
  onIconChange: (iconId: string) => void;
}

export const KmlIconSelector: React.FC<KmlIconSelectorProps> = ({
  currentIconId,
  onIconChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const currentIcon = AVAILABLE_KML_ICONS.find(icon => icon.id === currentIconId) || AVAILABLE_KML_ICONS[0];

  return (
    <div className="w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition-all w-full justify-between"
      >
        <div className="flex items-center gap-2">
          <img src={currentIcon.url} alt={currentIcon.name} className="w-4 h-4" />
          <span>Icon: {currentIcon.name}</span>
        </div>
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {isExpanded && (
        <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Select Icon
          </div>
          <div className="grid grid-cols-4 gap-2">
            {AVAILABLE_KML_ICONS.map((icon) => (
              <button
                key={icon.id}
                onClick={() => {
                  onIconChange(icon.id);
                  setIsExpanded(false);
                }}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                  icon.id === currentIconId
                    ? 'bg-teal-100 border-2 border-teal-500'
                    : 'bg-white border-2 border-transparent hover:border-slate-300'
                }`}
                title={icon.name}
              >
                <img src={icon.url} alt={icon.name} className="w-6 h-6" />
                <span className="text-[9px] font-medium text-slate-600 text-center leading-tight">{icon.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
