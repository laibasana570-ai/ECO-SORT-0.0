import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './components/Icons';
import { Button } from './components/Button';
import { ResultCard } from './components/ResultCard';
import { analyzeImage } from './services/geminiService';
import { AnalysisState, WasteCategory } from './types';

const App: React.FC = () => {
  const [state, setState] = useState<AnalysisState>({
    isLoading: false,
    result: null,
    error: null,
    imagePreview: null,
  });

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      stopTracks();
    };
  }, []);

  // Critical fix: Attach stream to video element when the camera view opens (mounts)
  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      // Ensure video plays even if autoPlay fails
      videoRef.current.play().catch(e => console.log("Play error:", e));
    }
  }, [isCameraOpen]);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    setIsTorchOn(false);
  };

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    // Stop existing tracks but don't close the UI state yet (prevents flicker)
    stopTracks();

    try {
      let stream: MediaStream | null = null;
      
      // Attempt 1: Request specific facing mode with High Res
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: mode, // 'ideal' constraint
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          } 
        });
        setFacingMode(mode);
      } catch (err) {
        console.log(`High res camera init failed for ${mode}, trying fallback logic.`);
      }

      // Attempt 2: Request specific facing mode (No resolution constraints)
      // This is crucial for mobile devices that might not support 1080p but have the correct camera
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: mode 
            } 
          });
          setFacingMode(mode);
        } catch (err) {
           console.log(`Specific mode ${mode} failed, trying generic fallback.`);
        }
      }

      // Attempt 3: Generic fallback (Any camera)
      // Fixes issues on laptops/devices where 'environment' doesn't exist
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true 
        });
        // If we fell back, it's likely a webcam or default camera. 
        // We set to 'user' to ensure mirroring is handled correctly for webcams.
        setFacingMode('user'); 
      }
      
      streamRef.current = stream;
      
      // If video element is already mounted (switching cameras), attach immediately
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }

      setIsCameraOpen(true);
      setState(prev => ({ ...prev, error: null }));

      // Check for torch capability
      const track = stream.getVideoTracks()[0];
      const capabilities = (track.getCapabilities && track.getCapabilities()) || {};
      // @ts-ignore - TypeScript doesn't always know about 'torch' in capabilities
      setHasTorch(!!capabilities.torch);

    } catch (err) {
      console.error("Camera error:", err);
      setState(prev => ({ 
        ...prev, 
        error: "Unable to access camera. Please ensure permissions are granted and a camera is available." 
      }));
      // Close UI if we failed completely
      setIsCameraOpen(false);
    }
  };

  const handleCloseCamera = () => {
    stopTracks();
    setIsCameraOpen(false);
  };

  const toggleTorch = async () => {
    if (streamRef.current && hasTorch) {
      const track = streamRef.current.getVideoTracks()[0];
      const newStatus = !isTorchOn;
      try {
        await track.applyConstraints({
          advanced: [{ torch: newStatus } as any]
        });
        setIsTorchOn(newStatus);
      } catch (e) {
        console.error("Error toggling torch", e);
      }
    }
  };

  const toggleCamera = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(newMode);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      
      // Set canvas dimensions to match video stream
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Note: We do NOT mirror the capture context here.
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9); // High quality
        
        handleCloseCamera();
        processBase64(dataUrl);
      }
    }
  };

  const processBase64 = async (base64String: string) => {
    setState(prev => ({ 
      ...prev, 
      imagePreview: base64String,
      isLoading: true,
      error: null 
    }));

    try {
      const result = await analyzeImage(base64String);
      setState(prev => ({ ...prev, result, isLoading: false }));
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        error: err.message || "Something went wrong. Please try again.",
        isLoading: false 
      }));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setState(prev => ({ ...prev, error: "Please upload a valid image file." }));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          processBase64(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const resetApp = () => {
    handleCloseCamera();
    setState({
      isLoading: false,
      result: null,
      error: null,
      imagePreview: null
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Dynamic Background based on result
  const getAmbientStyles = () => {
    if (state.isLoading) return 'from-slate-50 to-emerald-50';
    if (!state.result) return 'from-slate-50 via-white to-emerald-50/30';
    
    switch (state.result.category) {
      case WasteCategory.RECYCLE: return 'from-emerald-50 via-teal-50 to-emerald-100/50';
      case WasteCategory.COMPOST: return 'from-amber-50 via-yellow-50 to-orange-100/50';
      // Dramatic Dark/Red for Hazard
      case WasteCategory.HAZARD: return 'from-slate-900 via-rose-950 to-red-900'; 
      case WasteCategory.TRASH: return 'from-slate-100 via-gray-50 to-zinc-200/50';
      default: return 'from-slate-50 to-slate-100';
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-1000 ease-in-out bg-gradient-to-br ${getAmbientStyles()} flex flex-col relative overflow-hidden font-sans`}>
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#0f172a 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-sm transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={resetApp}>
              <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-emerald-500/20 shadow-lg transform group-hover:rotate-6 transition-all duration-300">
                <Icons.Recycle className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xl tracking-tight text-slate-800 leading-none">ECO SORT</span>
                <span className="text-xs font-semibold text-emerald-600 tracking-wider">AI WASTE TRIAGE</span>
              </div>
            </div>
            {state.result && (
              <Button variant="ghost" onClick={resetApp} className="hidden sm:flex">
                <Icons.Scan className="w-4 h-4 mr-2" />
                New Scan
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Camera Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline
            muted 
            onLoadedMetadata={() => videoRef.current?.play()}
            className={`absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-500 ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
          
          {/* Overlay Graphics */}
          <div className="absolute inset-0 pointer-events-none">
             {/* Reticle */}
             <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-64 h-64 border-2 border-white/30 rounded-3xl relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 -mt-1 -ml-1 rounded-tl-xl"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 -mt-1 -mr-1 rounded-tr-xl"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 -mb-1 -ml-1 rounded-bl-xl"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 -mb-1 -mr-1 rounded-br-xl"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icons.Scan className="w-8 h-8 text-white/50 animate-pulse" />
                  </div>
               </div>
             </div>
             
             {/* Text Hint */}
             <div className="absolute bottom-32 left-0 right-0 text-center">
               <p className="text-white/80 font-medium text-sm bg-black/40 inline-block px-4 py-2 rounded-full backdrop-blur-sm">
                 Align waste item within the frame
               </p>
             </div>
          </div>

          {/* Top Controls */}
          <div className="absolute top-6 right-6 flex flex-col gap-4 z-20">
             {hasTorch && (
               <button
                 onClick={toggleTorch}
                 className={`p-3 rounded-full backdrop-blur-md transition-colors ${isTorchOn ? 'bg-yellow-400 text-black' : 'bg-black/30 text-white'}`}
               >
                 {isTorchOn ? <Icons.Zap className="w-6 h-6 fill-current" /> : <Icons.ZapOff className="w-6 h-6" />}
               </button>
             )}
             <button
               onClick={toggleCamera}
               className="p-3 rounded-full bg-black/30 backdrop-blur-md text-white hover:bg-black/50 transition-colors"
             >
               <Icons.SwitchCamera className="w-6 h-6" />
             </button>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-10 left-0 right-0 flex items-center justify-center gap-12 z-10">
            <button 
              onClick={handleCloseCamera}
              className="p-4 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition-colors"
            >
              <Icons.X className="w-6 h-6" />
            </button>
            
            <button 
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 transition-transform bg-transparent active:scale-95"
            >
              <div className="w-16 h-16 rounded-full bg-white"></div>
            </button>
            
            <div className="w-14"></div> {/* Spacer for symmetry */}
          </div>
        </div>
      )}

      <main className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 py-12 relative z-10">
        <div className="w-full max-w-5xl mx-auto space-y-12">
          
          {/* Hero Section (Hidden when result is shown) */}
          {!state.result && !state.isLoading && (
            <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-emerald-100 shadow-sm text-sm font-semibold text-emerald-800 mb-4 animate-bounce-slow">
                <Icons.Sparkles className="w-4 h-4 text-emerald-500" />
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Powered by Gemini 3 Pro
                </span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-tight">
                Don't guess.<br />
                <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">Just Sort.</span>
              </h1>
              
              <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                The intelligent visual classifier that helps you separate <strong className="text-emerald-600">Recycle</strong>, <strong className="text-amber-500">Compost</strong>, <strong className="text-rose-600">Hazard</strong>, and <strong className="text-slate-500">Trash</strong> instantly.
              </p>
            </div>
          )}

          {/* Action Area */}
          {!state.result && (
            <div className={`relative w-full max-w-xl mx-auto transition-all duration-500 ${state.isLoading ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
              />
              
              <div className="bg-white/80 backdrop-blur-sm border-2 border-dashed border-slate-300 rounded-[2.5rem] p-10 text-center shadow-lg shadow-slate-200/50">
                <div className="flex flex-col items-center gap-8">
                   <div className="w-20 h-20 bg-gradient-to-tr from-emerald-100 to-teal-50 rounded-full flex items-center justify-center text-emerald-600 shadow-sm">
                      <Icons.Scan className="w-10 h-10" />
                   </div>
                   
                   <div>
                     <h3 className="text-2xl font-bold text-slate-800">Identify Waste</h3>
                     <p className="text-slate-500 mt-2 font-medium">Take a photo or upload to classify</p>
                   </div>

                   <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                      <Button onClick={() => startCamera('environment')} variant="primary" className="flex-1 py-4 text-base">
                        <Icons.Camera className="w-5 h-5 mr-2" />
                        Open Camera
                      </Button>
                      <Button onClick={triggerFileUpload} variant="secondary" className="flex-1 py-4 text-base">
                        <Icons.Upload className="w-5 h-5 mr-2" />
                        Upload File
                      </Button>
                   </div>
                </div>
              </div>

              {/* Categories Strip */}
              <div className="mt-12 flex justify-center gap-8 md:gap-16 opacity-80 hover:opacity-100 transition-opacity">
                 {[
                   { label: 'Recycle', color: 'bg-emerald-500' },
                   { label: 'Compost', color: 'bg-amber-400' },
                   { label: 'Hazard', color: 'bg-red-600 animate-pulse' },
                   { label: 'Trash', color: 'bg-slate-500' }
                 ].map((cat) => (
                   <div key={cat.label} className="flex flex-col items-center gap-3 group/cat cursor-default">
                     <div className={`w-3 h-3 rounded-full ${cat.color} ring-4 ring-white shadow-md group-hover/cat:scale-125 transition-transform`} />
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover/cat:text-slate-600">{cat.label}</span>
                   </div>
                 ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {state.isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 animate-in fade-in zoom-in duration-500">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 border-t-4 border-emerald-500 rounded-full animate-spin"></div>
                <div className="absolute inset-3 border-r-4 border-teal-400 rounded-full animate-spin animation-delay-200"></div>
                <div className="absolute inset-6 border-b-4 border-emerald-300 rounded-full animate-spin animation-delay-500"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icons.Scan className="w-10 h-10 text-emerald-600 animate-pulse" />
                </div>
              </div>
              <h2 className="mt-8 text-2xl font-black text-slate-800 tracking-tight">Processing Image</h2>
              <p className="text-slate-500 mt-2 font-medium animate-pulse">Consulting expert rules...</p>
            </div>
          )}

          {/* Error State */}
          {state.error && (
            <div className="max-w-md mx-auto bg-white border border-rose-100 rounded-2xl p-8 text-center shadow-xl shadow-rose-100 animate-in fade-in slide-in-from-bottom-4">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icons.Hazard className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Analysis Failed</h3>
              <p className="text-slate-600 mb-8">{state.error}</p>
              <Button onClick={resetApp} variant="outline" className="w-full">
                Try Again
              </Button>
            </div>
          )}

          {/* Result Card */}
          {state.result && (
            <ResultCard 
              result={state.result} 
              imagePreview={state.imagePreview}
              onReset={resetApp} 
            />
          )}

        </div>
      </main>

      <footer className={`relative z-10 py-8 text-center ${state.result?.category === WasteCategory.HAZARD ? 'text-slate-400' : 'text-slate-400'}`}>
         <p className="text-sm font-medium">
           ECO SORT &copy; {new Date().getFullYear()} • Powered by Google Gemini
         </p>
      </footer>
    </div>
  );
};

export default App;