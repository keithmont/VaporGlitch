/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, RefreshCw, Download, Zap, Sliders, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [glitchLevel, setGlitchLevel] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [distortion, setDistortion] = useState(0);
  const [droop, setDroop] = useState(0);
  const [colorShift, setColorShift] = useState(0);
  const [errorLevel, setErrorLevel] = useState(0);
  const [quality, setQuality] = useState(100);
  const [isGlitching, setIsGlitching] = useState(false);
  const [glitchedImage, setGlitchedImage] = useState<string | null>(null);
  const [controlsHeight, setControlsHeight] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const controlsRef = useRef<HTMLElement>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);

  // Real-time update effect
  useEffect(() => {
    if (image) {
      const timer = setTimeout(() => {
        applyGlitch();
      }, 50); // Small debounce for performance
      return () => clearTimeout(timer);
    }
  }, [image, glitchLevel, saturation, distortion, droop, colorShift, errorLevel, quality]);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImage(result);
        setGlitchedImage(null);
        
        // Reset sliders as requested
        setGlitchLevel(0);
        setSaturation(100);
        setDistortion(0);
        setDroop(0);
        setColorShift(0);
        setErrorLevel(0);
        setQuality(100);

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
    setGlitchLevel(Math.floor(Math.random() * 100));
    setSaturation(Math.floor(Math.random() * 300));
    setDistortion(Math.floor(Math.random() * 100));
    setDroop(Math.floor(Math.random() * 100));
    setColorShift(Math.floor(Math.random() * 100));
    setErrorLevel(Math.floor(Math.random() * 100));
    setQuality(Math.floor(Math.random() * 100));
  };

  const applyGlitch = () => {
    if (!image || !canvasRef.current || !sourceImageRef.current) return;

    setIsGlitching(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = sourceImageRef.current;
    const maxWidth = 1200;
    const scale = Math.min(1, maxWidth / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let data = imageData.data;

    // 1. Color Saturation & Color Shift
    const satFactor = saturation / 100;
    const shiftIntensity = colorShift / 100;
    
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      if (colorShift > 0) {
        const rOrig = r;
        const gOrig = g;
        const bOrig = b;
        r = (rOrig * (1 - shiftIntensity) + bOrig * shiftIntensity) % 256;
        g = (gOrig * (1 - shiftIntensity) + rOrig * shiftIntensity) % 256;
        b = (bOrig * (1 - shiftIntensity) + gOrig * shiftIntensity) % 256;

        if (shiftIntensity > 0.4) {
          if (rOrig > 150 && bOrig > 150) { r = 0; g = 255 * shiftIntensity; b = 0; }
          else if (rOrig > 100 && rOrig < 200) { r = 150 * shiftIntensity; g = 0; b = 0; }
        }
        if (shiftIntensity > 0.7) {
          const brightness = (rOrig + gOrig + bOrig) / 3;
          if (brightness > 200) { r = 255 - r; g = 255 - g; b = 255 - b; }
        }
      }

      const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
      data[i] = Math.min(255, Math.max(0, gray + (r - gray) * satFactor));
      data[i + 1] = Math.min(255, Math.max(0, gray + (g - gray) * satFactor));
      data[i + 2] = Math.min(255, Math.max(0, gray + (b - gray) * satFactor));
    }
    ctx.putImageData(imageData, 0, 0);

    // 2. Droop
    if (droop > 0) {
      const droopIntensity = (droop / 100);
      const droopCount = Math.floor(canvas.width * 0.15 * droopIntensity);
      for (let i = 0; i < droopCount; i++) {
        const x = Math.floor(Math.random() * canvas.width);
        const yStart = Math.floor(Math.random() * canvas.height);
        const droopLen = Math.floor(Math.random() * (canvas.height - yStart) * (droop / 100));
        const droopWidth = Math.floor(Math.random() * (droop / 5)) + 2;
        if (droopLen > 0) {
          try {
            const slice = ctx.getImageData(x, yStart, droopWidth, 1);
            for (let y = yStart; y < yStart + droopLen; y++) {
              if (y < canvas.height) {
                const drift = Math.sin(y * 0.05) * (droop / 40);
                ctx.putImageData(slice, x + drift, y);
              }
            }
          } catch (e) {}
        }
      }
    }

    // 3. RGB Split
    if (distortion > 0) {
      const distortionScale = 0.44;
      const offset = Math.floor((distortion / 100) * 30 * distortionScale);
      const tempImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const newData = new Uint8ClampedArray(tempImageData.data);
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          const rX = Math.min(canvas.width - 1, Math.max(0, x + offset));
          const rIdx = (y * canvas.width + rX) * 4;
          newData[idx] = tempImageData.data[rIdx];
          const bX = Math.min(canvas.width - 1, Math.max(0, x - offset));
          const bIdx = (y * canvas.width + bX) * 4;
          newData[idx + 2] = tempImageData.data[bIdx + 2];
        }
      }
      ctx.putImageData(new ImageData(newData, canvas.width, canvas.height), 0, 0);
    }

    // 4. Scanline Glitch
    if (glitchLevel > 0) {
      const glitchCount = Math.floor((glitchLevel / 100) * 40);
      for (let i = 0; i < glitchCount; i++) {
        const y = Math.floor(Math.random() * canvas.height);
        const h = Math.floor(Math.random() * (canvas.height / 8)) + 2;
        const xOffset = (Math.random() - 0.5) * (glitchLevel / 100) * canvas.width * 0.4;
        try {
          const slice = ctx.getImageData(0, y, canvas.width, h);
          ctx.putImageData(slice, xOffset, y);
        } catch (e) {}
      }
    }

    // 5. Random Color Blocks
    if (glitchLevel > 30) {
      const blockCount = Math.floor((glitchLevel / 100) * 15);
      for (let i = 0; i < blockCount; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const w = Math.random() * canvas.width * 0.4;
        const h = Math.random() * 30;
        const r = Math.random() * 255;
        const g = Math.random() * 255;
        const b = Math.random() * 255;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.4)`;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = `rgba(${g}, ${b}, ${r}, 0.8)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
        ctx.stroke();
      }
    }

    // 6. Sine Wave Distortion
    if (distortion > 40) {
      const distortionScale = 0.44;
      const waveAmp = (distortion / 100) * 40 * distortionScale;
      const waveFreq = 0.02 + (distortion / 100) * 0.1;
      const tempImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const newData = new Uint8ClampedArray(tempImageData.data);
      for (let y = 0; y < canvas.height; y++) {
        const xOffset = Math.sin(y * waveFreq) * waveAmp;
        for (let x = 0; x < canvas.width; x++) {
          const sourceX = Math.floor(x + xOffset);
          if (sourceX >= 0 && sourceX < canvas.width) {
            const targetIdx = (y * canvas.width + x) * 4;
            const sourceIdx = (y * canvas.width + sourceX) * 4;
            newData[targetIdx] = tempImageData.data[sourceIdx];
            newData[targetIdx + 1] = tempImageData.data[sourceIdx + 1];
            newData[targetIdx + 2] = tempImageData.data[sourceIdx + 2];
            newData[targetIdx + 3] = tempImageData.data[sourceIdx + 3];
          }
        }
      }
      ctx.putImageData(new ImageData(newData, canvas.width, canvas.height), 0, 0);
    }

    // 7. Error Artifacts
    if (errorLevel > 0) {
      const artifactCount = Math.floor((errorLevel / 100) * 15);
      for (let i = 0; i < artifactCount; i++) {
        const type = Math.random();
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        if (type < 0.4) {
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(x, y, Math.random() * 120, Math.random() * 80);
        } else if (type < 0.7) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(x, y, Math.random() * 200, Math.random() * 40);
        } else {
          const noiseSize = 50;
          const noiseData = ctx.createImageData(noiseSize, noiseSize);
          for (let j = 0; j < noiseData.data.length; j += 4) {
            const val = Math.random() * 255;
            noiseData.data[j] = val; noiseData.data[j+1] = val; noiseData.data[j+2] = val; noiseData.data[j+3] = 255;
          }
          ctx.putImageData(noiseData, x, y);
        }
      }
    }

    // 8. JPEG Quality Glitch (Snorpey style)
    if (quality < 100) {
      const q = quality / 100;
      const jpegDataUrl = canvas.toDataURL('image/jpeg', q);
      
      // If quality is very low, we can also corrupt the bytes
      if (quality < 50) {
        const base64 = jpegDataUrl.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        
        // Corrupt a few bytes in the middle of the file (avoiding header)
        const corruptionIntensity = Math.floor((50 - quality) / 5);
        for (let i = 0; i < corruptionIntensity; i++) {
          const pos = Math.floor(Math.random() * (bytes.length - 1000)) + 500;
          bytes[pos] = Math.floor(Math.random() * 256);
        }

        const corruptedBase64 = btoa(String.fromCharCode(...bytes));
        setGlitchedImage(`data:image/jpeg;base64,${corruptedBase64}`);
      } else {
        setGlitchedImage(jpegDataUrl);
      }
    } else {
      setGlitchedImage(canvas.toDataURL('image/png'));
    }
    
    setIsGlitching(false);
  };

  const downloadImage = () => {
    if (!glitchedImage) return;
    const link = document.createElement('a');
    link.download = `glitched-${Date.now()}.png`;
    link.href = glitchedImage;
    link.click();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 flex flex-col items-center gap-8">
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
          className="space-y-8 bg-vapor-dark/80 p-6 rounded-xl vapor-border backdrop-blur-sm h-fit"
        >
          <div className="flex items-center gap-2 text-vapor-pink mb-4">
            <Sliders size={20} />
            <h2 className="font-bold uppercase tracking-wider">Parameters</h2>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-vapor-blue uppercase">
                <span>Glitch Level</span>
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

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-vapor-blue uppercase">
                <span>Saturation</span>
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

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-vapor-blue uppercase">
                <span>Distortion</span>
                <span>{distortion}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={distortion} 
                onChange={(e) => setDistortion(parseInt(e.target.value))}
                className="vapor-slider"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-vapor-blue uppercase">
                <span>Droop</span>
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

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-vapor-blue uppercase">
                <span>Color Shift</span>
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

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-vapor-blue uppercase">
                <span>Error</span>
                <span>{errorLevel}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={errorLevel} 
                onChange={(e) => setErrorLevel(parseInt(e.target.value))}
                className="vapor-slider"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-vapor-blue uppercase">
                <span>Quality</span>
                <span>{quality}%</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={quality} 
                onChange={(e) => setQuality(parseInt(e.target.value))}
                className="vapor-slider"
              />
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-4">
            <button 
              onClick={randomize}
              className="vapor-button py-2 px-4 flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw size={16} />
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
          className="md:col-span-2 space-y-4"
        >
          <div 
            style={{ height: controlsHeight ? `${controlsHeight}px` : 'auto', minHeight: '400px' }}
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
              <>
                <img 
                  src={glitchedImage || image} 
                  alt="Preview" 
                  className="max-w-full max-h-full object-contain"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4 flex gap-2">
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
              </>
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
