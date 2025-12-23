import React from 'react';
import { AnalysisResult, WasteCategory } from '../types';
import { Icons } from './Icons';
import { Button } from './Button';

interface ResultCardProps {
  result: AnalysisResult;
  imagePreview: string | null;
  onReset: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result, imagePreview, onReset }) => {
  const getTheme = (category: WasteCategory) => {
    switch (category) {
      case WasteCategory.RECYCLE:
        return {
          gradient: 'from-emerald-500 to-teal-600',
          bgLight: 'bg-emerald-50',
          text: 'text-emerald-900',
          subText: 'text-emerald-700',
          border: 'border-emerald-200',
          shadow: 'shadow-emerald-300/50',
          icon: Icons.Recycle,
          label: 'Recycle',
          isDark: false
        };
      case WasteCategory.COMPOST:
        return {
          gradient: 'from-amber-400 to-orange-500',
          bgLight: 'bg-amber-50',
          text: 'text-amber-900',
          subText: 'text-amber-700',
          border: 'border-amber-200',
          shadow: 'shadow-amber-300/50',
          icon: Icons.Compost,
          label: 'Compost',
          isDark: false
        };
      case WasteCategory.HAZARD:
        return {
          // Drastic "Dark Mode" for Hazard to make it prominent
          gradient: 'from-red-600 to-rose-700',
          bgLight: 'bg-slate-900', 
          text: 'text-white',
          subText: 'text-rose-200',
          border: 'border-rose-500',
          shadow: 'shadow-rose-900/50',
          icon: Icons.Zap, // Changed icon to Zap for more impact
          label: 'HAZARD ALERT',
          isDark: true
        };
      case WasteCategory.TRASH:
      default:
        return {
          gradient: 'from-slate-500 to-zinc-600',
          bgLight: 'bg-slate-50',
          text: 'text-slate-800',
          subText: 'text-slate-600',
          border: 'border-slate-200',
          shadow: 'shadow-slate-300/50',
          icon: Icons.Trash,
          label: 'Trash',
          isDark: false
        };
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ECO SORT Result',
          text: `I just used ECO SORT to classify my waste! It's a ${result.itemName} and belongs in ${result.category}.`,
          url: window.location.href
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      alert("Sharing is not supported on this device/browser.");
    }
  };

  const theme = getTheme(result.category);
  const Icon = theme.icon;
  const confidencePercent = Math.round(result.confidence * 100);

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className={`
        relative rounded-3xl overflow-hidden shadow-2xl ${theme.shadow} 
        border-2 ${theme.border} flex flex-col md:flex-row
        ${theme.isDark ? 'bg-slate-900 ring-4 ring-rose-500/20' : 'bg-white'}
      `}>
        
        {/* Decorative Hazard Striping if Hazard */}
        {theme.isDark && (
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-rose-500 to-red-500 animate-pulse z-20"></div>
        )}

        {/* Left Side: Visuals */}
        <div className="md:w-5/12 relative min-h-[350px] md:min-h-full bg-slate-100 group overflow-hidden">
          {imagePreview ? (
            <img 
              src={imagePreview} 
              alt="Analyzed waste" 
              className="w-full h-full object-cover absolute inset-0 transition-transform duration-1000 group-hover:scale-110"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              <Icons.Camera className="w-12 h-12" />
            </div>
          )}
          
          {/* Visual Overlays */}
          <div className={`absolute inset-0 bg-gradient-to-t ${theme.gradient} opacity-20 mix-blend-overlay`}></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

          {/* Item Name Badge */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white z-10">
             <div className="flex items-center gap-2 mb-2 opacity-80">
                <div className={`w-2 h-2 rounded-full ${theme.isDark ? 'bg-red-500 animate-ping' : 'bg-white'}`}></div>
                <span className="text-xs font-bold uppercase tracking-widest">Detected Object</span>
             </div>
            <h2 className="text-4xl font-black tracking-tight text-white leading-none shadow-black drop-shadow-lg">
              {result.itemName}
            </h2>
          </div>
        </div>

        {/* Right Side: Data */}
        <div className={`md:w-7/12 p-8 flex flex-col ${theme.isDark ? 'text-white' : ''}`}>
          
          {/* Header Row */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${theme.subText}`}>
                Classification System
              </p>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${theme.gradient} text-white shadow-lg`}>
                  <Icon className="w-8 h-8" />
                </div>
                <div>
                   <h3 className={`text-3xl font-black italic tracking-tighter ${theme.text}`}>
                    {theme.label}
                  </h3>
                </div>
              </div>
            </div>
            
            {/* Confidence Badge */}
            <div className={`text-center px-4 py-2 rounded-xl border ${theme.isDark ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50'}`}>
              <div className={`text-2xl font-black ${theme.text}`}>
                {confidencePercent}%
              </div>
              <div className={`text-[10px] font-bold uppercase tracking-wider ${theme.subText}`}>
                Match
              </div>
            </div>
          </div>

          <div className="space-y-6 flex-grow">
            
            {/* Analysis Box */}
            <div className={`p-5 rounded-2xl border ${theme.isDark ? 'bg-slate-800 border-slate-700' : `${theme.bgLight} border-transparent`}`}>
              <h4 className={`text-xs font-bold uppercase flex items-center gap-2 mb-3 ${theme.subText}`}>
                <Icons.Scan className="w-4 h-4" />
                Visual Analysis
              </h4>
              <p className={`text-base leading-relaxed font-medium ${theme.text}`}>
                {result.reasoning}
              </p>
            </div>

            {/* Disposal Action (The most important part) */}
            <div>
              <h4 className={`text-xs font-bold uppercase flex items-center gap-2 mb-2 ${theme.subText}`}>
                <Icons.Check className={`w-4 h-4 ${theme.isDark ? 'text-green-400' : 'text-emerald-500'}`} />
                Required Action
              </h4>
              <p className={`text-lg font-bold ${theme.text}`}>
                {result.disposalAction}
              </p>
            </div>

            {/* Did You Know? */}
            <div className={`flex items-start gap-3 p-4 rounded-xl ${theme.isDark ? 'bg-rose-900/20 border border-rose-500/30' : 'bg-blue-50 border border-blue-100'}`}>
               <Icons.Sparkles className={`w-5 h-5 flex-shrink-0 ${theme.isDark ? 'text-rose-400' : 'text-blue-500'}`} />
               <div>
                  <span className={`block text-xs font-bold uppercase mb-1 ${theme.isDark ? 'text-rose-400' : 'text-blue-600'}`}>Eco Fact</span>
                  <p className={`text-sm ${theme.isDark ? 'text-rose-200' : 'text-blue-800'}`}>
                    {result.sustainabilityTip || "Proper disposal reduces landfill waste by up to 40%."}
                  </p>
               </div>
            </div>

          </div>

          <div className={`mt-8 pt-6 border-t flex flex-col sm:flex-row gap-3 ${theme.isDark ? 'border-slate-700' : 'border-slate-100'}`}>
             <Button onClick={onReset} variant={theme.isDark ? 'secondary' : 'primary'} className="flex-1 py-4 text-lg shadow-xl">
              <Icons.Refresh className="w-5 h-5 mr-2" />
              Scan Next Item
             </Button>
             
             <Button onClick={handleShare} variant="outline" className={`px-6 ${theme.isDark ? 'text-white border-slate-600 hover:bg-slate-800' : ''}`}>
               <Icons.Share className="w-5 h-5" />
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
};