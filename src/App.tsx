/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, RefreshCw, Download, Zap, Sliders, Image as ImageIcon, Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PRESETS = [
  {
    name: 'Deep Fried',
    params: { glitchLevel: 40, saturation: 400, drift: 20, mosh: 0, jitter: 10, skew: 0, chromaticAberration: 30, droop: 50, colorShift: 80, corruptionLevel: 60, sharpness: 200, pixelSorting: 0, channelXor: 0 }
  },
  {
    name: 'Broken VCR',
    params: { glitchLevel: 10, saturation: 80, drift: 5, mosh: 0, jitter: 40, skew: 85, chromaticAberration: 20, droop: 10, colorShift: 30, corruptionLevel: 20, sharpness: 70, pixelSorting: 0, channelXor: 0 }
  },
  {
    name: 'Cyberpunk',
    params: { glitchLevel: 20, saturation: 150, drift: 40, mosh: 30, jitter: 0, skew: 10, chromaticAberration: 60, droop: 0, colorShift: 100, corruptionLevel: 10, sharpness: 120, pixelSorting: 80, channelXor: 40 }
  },
  {
    name: 'Data Decay',
    params: { glitchLevel: 80, saturation: 120, drift: 10, mosh: 90, jitter: 10, skew: 20, chromaticAberration: 10, droop: 30, colorShift: 20, corruptionLevel: 90, sharpness: 100, pixelSorting: 95, channelXor: 70 }
  }
];

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [glitchLevel, setGlitchLevel] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [drift, setDrift] = useState(0);
  const [mosh, setMosh] = useState(0);
  const [jitter, setJitter] = useState(0);
  const [skew, setSkew] = useState(0);
  const [chromaticAberration, setChromaticAberration] = useState(0);
  const [droop, setDroop] = useState(0);
  const [colorShift, setColorShift] = useState(0);
  const [corruptionLevel, setCorruptionLevel] = useState(0);
  const [sharpness, setSharpness] = useState(100);
  const [pixelSorting, setPixelSorting] = useState(0);
  const [channelXor, setChannelXor] = useState(0);

  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [isGlitching, setIsGlitching] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  const [locked, setLocked] = useState({
    glitchLevel: false,
    saturation: false,
    drift: false,
    mosh: false,
    jitter: false,
    skew: false,
    chromaticAberration: false,
    droop: false,
    colorShift: false,
    corruptionLevel: false,
    sharpness: false,
    pixelSorting: false,
    channelXor: false,
  });
  const [glitchedImage, setGlitchedImage] = useState<string | null>(null);
  const [controlsHeight, setControlsHeight] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<HTMLElement>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Initialize Worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('./glitchWorker.ts', import.meta.url), { type: 'module' });
    
    workerRef.current.onmessage = (e) => {
      const { imageData } = e.data;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.putImageData(imageData, 0, 0);
          
          // Apply JPEG corruption if needed (this part is hard to do in worker without canvas)
          if (corruptionLevel > 20) {
            const q = Math.max(0.01, 1 - (corruptionLevel / 100));
            const jpegDataUrl = canvas.toDataURL('image/jpeg', q);
            
            if (corruptionLevel > 60) {
              const base64 = jpegDataUrl.split(',')[1];
              const binary = atob(base64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              
              const corruptionIntensity = Math.floor((corruptionLevel - 60) / 2);
              for (let i = 0; i < corruptionIntensity; i++) {
                const pos = Math.floor(Math.random() * (bytes.length - 1000)) + 500;
                bytes[pos] = Math.floor(Math.random() * 256);
              }

              let binaryString = '';
              for (let i = 0; i < bytes.length; i++) {
                binaryString += String.fromCharCode(bytes[i]);
              }
              const corruptedBase64 = btoa(binaryString);
              setGlitchedImage(`data:image/jpeg;base64,${corruptedBase64}`);
            } else {
              setGlitchedImage(jpegDataUrl);
            }
          } else {
            setGlitchedImage(canvas.toDataURL('image/png'));
          }
        }
      }
      setIsGlitching(false);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [corruptionLevel]);

  // Real-time update effect
  useEffect(() => {
    if (image) {
      const timer = setTimeout(() => {
        applyGlitch();
      }, 50); // Lower debounce thanks to worker
      return () => clearTimeout(timer);
    }
  }, [image, glitchLevel, saturation, drift, mosh, jitter, skew, chromaticAberration, droop, colorShift, corruptionLevel, sharpness, pixelSorting, channelXor]);

  // Sync preview height with controls height
  useEffect(() => {
    if (!controlsRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setControlsHeight(entry.contentRect.height);
      }
    });
    
    observer.observe(controlsRef.current);
    return () => observer.disconnect();
  }, []);

  const toggleLock = (key: keyof typeof locked) => {
    setLocked(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const resetSliders = () => {
    setGlitchLevel(0);
    setSaturation(100);
    setDrift(0);
    setMosh(0);
    setJitter(0);
    setSkew(0);
    setChromaticAberration(0);
    setDroop(0);
    setColorShift(0);
    setCorruptionLevel(0);
    setSharpness(100);
    setPixelSorting(0);
    setChannelXor(0);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    const p = preset.params;
    if (!locked.glitchLevel) setGlitchLevel(p.glitchLevel);
    if (!locked.saturation) setSaturation(p.saturation);
    if (!locked.drift) setDrift(p.drift);
    if (!locked.mosh) setMosh(p.mosh);
    if (!locked.jitter) setJitter(p.jitter);
    if (!locked.skew) setSkew(p.skew);
    if (!locked.chromaticAberration) setChromaticAberration(p.chromaticAberration);
    if (!locked.droop) setDroop(p.droop);
    if (!locked.colorShift) setColorShift(p.colorShift);
    if (!locked.corruptionLevel) setCorruptionLevel(p.corruptionLevel);
    if (!locked.sharpness) setSharpness(p.sharpness);
    if (!locked.pixelSorting) setPixelSorting(p.pixelSorting);
    if (!locked.channelXor) setChannelXor(p.channelXor);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImage(result);
        setGlitchedImage(null);
        
        // Reset sliders as requested
        resetSliders();

        const img = new Image();
        img.onload = () => {
          sourceImageRef.current = img;
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  const randomize = () => {
    if (!locked.glitchLevel) setGlitchLevel(Math.floor(Math.random() * 100));
    if (!locked.saturation) setSaturation(Math.floor(Math.random() * 300));
    if (!locked.drift) setDrift(Math.floor(Math.random() * 100));
    if (!locked.mosh) setMosh(Math.floor(Math.random() * 100));
    if (!locked.jitter) setJitter(Math.floor(Math.random() * 100));
    if (!locked.skew) setSkew(Math.floor(Math.random() * 100));
    if (!locked.chromaticAberration) setChromaticAberration(Math.floor(Math.random() * 100));
    if (!locked.droop) setDroop(Math.floor(Math.random() * 100));
    if (!locked.colorShift) setColorShift(Math.floor(Math.random() * 100));
    if (!locked.corruptionLevel) setCorruptionLevel(Math.floor(Math.random() * 100));
    if (!locked.sharpness) setSharpness(Math.floor(Math.random() * 200));
    if (!locked.pixelSorting) setPixelSorting(Math.floor(Math.random() * 100));
    if (!locked.channelXor) setChannelXor(Math.floor(Math.random() * 100));
  };

  const applyGlitch = () => {
    if (!image || !canvasRef.current || !sourceImageRef.current || !workerRef.current) return;

    setIsGlitching(true);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = sourceImageRef.current;
    const maxWidth = 1200;
    const scale = Math.min(1, maxWidth / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    // Apply Blur if sharpness < 100
    if (sharpness < 100) {
      const blurAmount = (100 - sharpness) / 10;
      ctx.filter = `blur(${blurAmount}px)`;
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';

    // Apply Sharpening if sharpness > 100
    if (sharpness > 100) {
      const sharpenIntensity = (sharpness - 100) / 100;
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = sharpenIntensity;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
    }
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    workerRef.current.postMessage({
      imageData,
      glitchLevel,
      saturation,
      drift,
      mosh,
      jitter,
      skew,
      chromaticAberration,
      droop,
      colorShift,
      corruptionLevel,
      sharpness,
      pixelSorting,
      channelXor
    }, [imageData.data.buffer]);
  };

  const downloadImage = () => {
    if (!glitchedImage) return;
    const link = document.createElement('a');
    link.download = `glitched-${Date.now()}.png`;
    link.href = glitchedImage;
    link.click();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 flex flex-col items-center gap-8">
      <header className="text-center space-y-2 mt-8">
        <h1 className="text-6xl font-black italic uppercase tracking-tighter vapor-gradient-text drop-shadow-[0_0_15px_rgba(255,113,206,0.5)]">
          VaporGlittttch
        </h1>
        <p className="font-mono text-vapor-cyan text-sm tracking-widest uppercase">
          // Circuit Bending Simulator //
        </p>
      </header>

      <main className="w-full grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Controls */}
        <motion.section 
          ref={controlsRef}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="order-2 md:order-1 space-y-8 bg-vapor-dark/80 p-6 rounded-xl vapor-border backdrop-blur-sm h-fit"
        >
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center gap-2 text-vapor-pink">
              <Sliders size={20} />
              <h2 className="font-bold uppercase tracking-wider">Parameters</h2>
            </div>
            
            <div className="flex items-center justify-between w-full gap-4">
              <div className="flex items-center p-1 bg-black/40 rounded-lg w-fit border border-vapor-purple/30">
                <button 
                  onClick={() => setIsAdvancedMode(false)}
                  className={`px-3 py-1 text-[10px] font-mono uppercase tracking-tighter rounded transition-all ${!isAdvancedMode ? 'bg-vapor-purple text-white shadow-[0_0_10px_rgba(191,100,255,0.5)]' : 'text-vapor-blue/50 hover:text-vapor-blue'}`}
                >
                  Casual
                </button>
                <button 
                  onClick={() => setIsAdvancedMode(true)}
                  className={`px-3 py-1 text-[10px] font-mono uppercase tracking-tighter rounded transition-all ${isAdvancedMode ? 'bg-vapor-pink text-white shadow-[0_0_10px_rgba(255,113,206,0.5)]' : 'text-vapor-blue/50 hover:text-vapor-blue'}`}
                >
                  Haxxor
                </button>
              </div>

              <button 
                onClick={resetSliders}
                className="text-[10px] font-mono uppercase tracking-tighter text-vapor-blue/60 hover:text-vapor-pink transition-colors flex items-center gap-1 sm:ml-4"
              >
                <RefreshCw size={10} />
                Reset
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono text-vapor-blue uppercase">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleLock('glitchLevel')}
                    className={`p-1 rounded hover:bg-vapor-purple/20 transition-colors ${locked.glitchLevel ? 'text-vapor-pink' : 'text-vapor-blue/40'}`}
                    title={locked.glitchLevel ? "Unlock from Randomization" : "Lock from Randomization"}
                  >
                    {locked.glitchLevel ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                  <span>Glitch Level</span>
                </div>
                <span>{glitchLevel}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={glitchLevel} 
                onChange={(e) => setGlitchLevel(parseInt(e.target.value))}
                className="vapor-slider"
              />
            </div>

            {isAdvancedMode && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-vapor-blue uppercase">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleLock('saturation')}
                      className={`p-1 rounded hover:bg-vapor-purple/20 transition-colors ${locked.saturation ? 'text-vapor-pink' : 'text-vapor-blue/40'}`}
                      title={locked.saturation ? "Unlock from Randomization" : "Lock from Randomization"}
                    >
                      {locked.saturation ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                    <span>Saturation</span>
                  </div>
                  <span>{saturation}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="800" 
                  value={saturation} 
                  onChange={(e) => setSaturation(parseInt(e.target.value))}
                  className="vapor-slider"
                />
              </div>
            )}

            {isAdvancedMode && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-vapor-blue uppercase">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleLock('drift')}
                      className={`p-1 rounded hover:bg-vapor-purple/20 transition-colors ${locked.drift ? 'text-vapor-pink' : 'text-vapor-blue/40'}`}
                      title={locked.drift ? "Unlock from Randomization" : "Lock from Randomization"}
                    >
                      {locked.drift ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                    <span>Drift</span>
                  </div>
                  <span>{drift}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={drift} 
                  onChange={(e) => setDrift(parseInt(e.target.value))}
                  className="vapor-slider"
                />
              </div>
            )}

            {isAdvancedMode && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-vapor-blue uppercase">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleLock('mosh')}
                      className={`p-1 rounded hover:bg-vapor-purple/20 transition-colors ${locked.mosh ? 'text-vapor-pink' : 'text-vapor-blue/40'}`}
                      title={locked.mosh ? "Unlock from Randomization" : "Lock from Randomization"}
                    >
                      {locked.mosh ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                    <span>Mosh</span>
                  </div>
                  <span>{mosh}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={mosh} 
                  onChange={(e) => setMosh(parseInt(e.target.value))}
                  className="vapor-slider"
                />
              </div>
            )}

            {isAdvancedMode && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-vapor-blue uppercase">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleLock('jitter')}
                      className={`p-1 rounded hover:bg-vapor-purple/20 transition-colors ${locked.jitter ? 'text-vapor-pink' : 'text-vapor-blue/40'}`}
                      title={locked.jitter ? "Unlock from Randomization" : "Lock from Randomization"}
                    >
                      {locked.jitter ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                    <span>Jitter</span>
                  </div>
                  <span>{jitter}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={jitter} 
                  onChange={(e) => setJitter(parseInt(e.target.value))}
                  className="vapor-slider"
                />
              </div>
            )}

            {isAdvancedMode && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-vapor-blue uppercase">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleLock('skew')}
                      className={`p-1 rounded hover:bg-vapor-purple/20 transition-colors ${locked.skew ? 'text-vapor-pink' : 'text-vapor-blue/40'}`}
                      title={locked.skew ? "Unlock from Randomization" : "Lock from Randomization"}
                    >
                      {locked.skew ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                    <span>Skew</span>
                  </div>
                  <span>{skew}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={skew} 
                  onChange={(e) => setSkew(parseInt(e.target.value))}
                  className="vapor-slider"
                />
              </div>
            )}

            {isAdvancedMode && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-vapor-blue uppercase">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleLock('chromaticAberration')}
                      className={`p-1 rounded hover:bg-vapor-purple/20 transition-colors ${locked.chromaticAberration ? 'text-vapor-pink' : 'text-vapor-blue/40'}`}
                      title={locked.chromaticAberration ? "Unlock from Randomization" : "Lock from Randomization"}
                    >
                      {locked.chromaticAberration ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                    <span>Chromatic Aberration</span>
                  </div>
                  <span>{chromaticAberration}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={chromaticAberration} 
                  onChange={(e) => setChromaticAberration(parseInt(e.target.value))}
                  className="vapor-slider"
                />
              </div>
            )}

            {isAdvancedMode && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-vapor-blue uppercase">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleLock('droop')}
                      className={`p-1 rounded hover:bg-vapor-purple/20 transition-colors ${locked.droop ? 'text-vapor-pink' : 'text-vapor-blue/40'}`}
                      title={locked.droop ? "Unlock from Randomization" : "Lock from Randomization"}
                    >
                      {locked.droop ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                    <span>Droop</span>
                  </div>
                  <span>{droop}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={droop} 
                  onChange={(e) => setDroop(parseInt(e.target.value))}
                  className="vapor-slider"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono text-vapor-blue uppercase">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleLock('colorShift')}
                    className={`p-1 rounded hover:bg-vapor-purple/20 transition-colors ${locked.colorShift ? 'text-vapor-pink' : 'text-vapor-blue/40'}`}
                    title={locked.colorShift ? "Unlock from Randomization" : "Lock from Randomization"}
                  >
                    {locked.colorShift ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                  <span>Color Shift</span>
                </div>
                <span>{colorShift}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={colorShift} 
                onChange={(e) => setColorShift(parseInt(e.target.value))}
                className="vapor-slider"
              />
            </div>

            {isAdvancedMode && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-vapor-blue uppercase">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleLock('pixelSorting')}
                      className={`p-1 rounded hover:bg-vapor-purple/20 transition-colors ${locked.pixelSorting ? 'text-vapor-pink' : 'text-vapor-blue/40'}`}
                      title={locked.pixelSorting ? "Unlock from Randomization" : "Lock from Randomization"}
                    >
                      {locked.pixelSorting ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                    <span>Pixel Sorting</span>
                  </div>
                  <span>{pixelSorting}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={pixelSorting} 
                  onChange={(e) => setPixelSorting(parseInt(e.target.value))}
                  className="vapor-slider"
                />
              </div>
            )}

            {isAdvancedMode && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono text-vapor-blue uppercase">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleLock('channelXor')}
                      className={`p-1 rounded hover:bg-vapor-purple/20 transition-colors ${locked.channelXor ? 'text-vapor-pink' : 'text-vapor-blue/40'}`}
                      title={locked.channelXor ? "Unlock from Randomization" : "Lock from Randomization"}
                    >
                      {locked.channelXor ? <Lock size={12} /> : <Unlock size={12} />}
                    </button>
                    <span>Channel XOR</span>
                  </div>
                  <span>{channelXor}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={channelXor} 
                  onChange={(e) => setChannelXor(parseInt(e.target.value))}
                  className="vapor-slider"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono text-vapor-blue uppercase">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleLock('corruptionLevel')}
                    className={`p-1 rounded hover:bg-vapor-purple/20 transition-colors ${locked.corruptionLevel ? 'text-vapor-pink' : 'text-vapor-blue/40'}`}
                    title={locked.corruptionLevel ? "Unlock from Randomization" : "Lock from Randomization"}
                  >
                    {locked.corruptionLevel ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                  <span>Error / Corruption</span>
                </div>
                <span>{corruptionLevel}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={corruptionLevel} 
                onChange={(e) => setCorruptionLevel(parseInt(e.target.value))}
                className="vapor-slider"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono text-vapor-blue uppercase">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleLock('sharpness')}
                    className={`p-1 rounded hover:bg-vapor-purple/20 transition-colors ${locked.sharpness ? 'text-vapor-pink' : 'text-vapor-blue/40'}`}
                    title={locked.sharpness ? "Unlock from Randomization" : "Lock from Randomization"}
                  >
                    {locked.sharpness ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                  <span>Sharpness</span>
                </div>
                <span>{sharpness}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="200" 
                value={sharpness} 
                onChange={(e) => setSharpness(parseInt(e.target.value))}
                className="vapor-slider"
              />
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-4">
            <button 
              onClick={randomize}
              disabled={isGlitching}
              className="vapor-button py-2 px-4 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} className={isGlitching ? "animate-spin" : ""} />
              Randomize
            </button>
            
            <button 
              onClick={applyGlitch}
              disabled={!image || isGlitching}
              className="vapor-button py-4 px-4 font-black flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap size={20} className={isGlitching ? "animate-pulse" : ""} />
              {isGlitching ? "Processing..." : "Glitch Me Baby, One More Time"}
            </button>
          </div>
        </motion.section>

        {/* Middle/Right Column: Preview */}
        <motion.section 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="order-1 md:order-2 md:col-span-2 space-y-8"
        >
          {/* Presets Section Moved to Top */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-vapor-cyan">
              <Zap size={20} />
              <h2 className="font-bold uppercase tracking-wider">Preset Tapes</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className="group relative overflow-hidden p-4 bg-black/40 border border-vapor-blue/30 rounded-lg hover:border-vapor-cyan transition-all text-left"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-vapor-cyan/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <p className="font-mono text-[10px] text-vapor-blue/60 uppercase mb-1">Tape_0{PRESETS.indexOf(preset) + 1}</p>
                  <p className="font-bold text-vapor-cyan uppercase tracking-tighter group-hover:text-white transition-colors">{preset.name}</p>
                  <div className="mt-2 h-1 w-0 group-hover:w-full bg-vapor-cyan transition-all duration-300" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div 
              style={{ 
                height: !image && controlsHeight ? `${controlsHeight}px` : 'auto', 
                minHeight: !image ? '400px' : '0' 
              }}
              className="relative w-full bg-black/40 rounded-xl vapor-border overflow-hidden flex items-center justify-center group"
            >
              {!image ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-4 cursor-pointer hover:scale-105 transition-transform p-8"
                >
                  <div className="p-6 rounded-full bg-vapor-purple/20 border-2 border-dashed border-vapor-purple">
                    <Upload size={48} className="text-vapor-purple" />
                  </div>
                  <p className="font-mono text-vapor-blue text-sm uppercase">Upload Source Image</p>
                </div>
              ) : (
                <div className="relative w-full flex items-center justify-center">
                  {/* Original Image */}
                  <img 
                    src={image} 
                    alt="Original" 
                    className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${showOriginal ? 'opacity-100' : 'opacity-0'}`}
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Glitched Image */}
                  <div className={`absolute inset-0 flex items-center justify-center overflow-hidden transition-opacity duration-300 ${showOriginal ? 'opacity-0' : 'opacity-100'}`}>
                    <img 
                      src={glitchedImage || image} 
                      alt="Glitched" 
                      className="max-w-full max-h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div className="absolute top-4 right-4 flex gap-2 z-20">
                    <div 
                      onMouseEnter={() => setShowOriginal(true)}
                      onMouseLeave={() => setShowOriginal(false)}
                      className={`p-2 bg-vapor-dark/80 border rounded-full transition-all flex items-center justify-center cursor-help ${showOriginal ? 'border-vapor-blue text-vapor-blue opacity-50' : 'border-vapor-cyan text-vapor-cyan shadow-[0_0_10px_rgba(0,255,255,0.5)]'}`}
                      title="Hover to see original image"
                    >
                      {showOriginal ? <EyeOff size={20} /> : <Eye size={20} />}
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-vapor-dark/80 border border-vapor-blue text-vapor-blue rounded-full hover:bg-vapor-blue hover:text-vapor-dark transition-colors"
                      title="Change Image"
                    >
                      <ImageIcon size={20} />
                    </button>
                    {glitchedImage && (
                      <button 
                        onClick={downloadImage}
                        className="p-2 bg-vapor-dark/80 border border-vapor-cyan text-vapor-cyan rounded-full hover:bg-vapor-cyan hover:text-vapor-dark transition-colors"
                        title="Download Glitch"
                      >
                        <Download size={20} />
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            <div className="flex justify-between items-center px-2">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-vapor-pink animate-pulse" />
                <div className="w-3 h-3 rounded-full bg-vapor-blue animate-pulse [animation-delay:0.2s]" />
                <div className="w-3 h-3 rounded-full bg-vapor-cyan animate-pulse [animation-delay:0.4s]" />
              </div>
              <p className="font-mono text-[10px] text-vapor-purple/60 uppercase">
                System Status: {image ? "Ready to Bend" : "Awaiting Input"}
              </p>
            </div>
          </div>
        </motion.section>
      </main>

      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />

      <footer className="mt-12 text-center space-y-4">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-vapor-purple to-transparent opacity-30" />
        <p className="font-mono text-[10px] text-vapor-blue tracking-[0.3em] uppercase opacity-50">
          Est. 199X // Digital Decay // Aesthetic Overload
        </p>
      </footer>
    </div>
  );
}
