/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, RefreshCw, Download, Zap, Sliders, Image as ImageIcon, Lock, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [isGlitching, setIsGlitching] = useState(false);
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
  });
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
      }, 150); // Increased debounce for better performance on rapid changes
      return () => clearTimeout(timer);
    }
  }, [image, glitchLevel, saturation, drift, mosh, jitter, skew, chromaticAberration, droop, colorShift, corruptionLevel, sharpness]);

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
        setDrift(0);
        setMosh(0);
        setJitter(0);
        setSkew(0);
        setChromaticAberration(0);
        setDroop(0);
        setColorShift(0);
        setCorruptionLevel(0);
        setSharpness(100);

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
  };

  const applyGlitch = () => {
    if (!image || !canvasRef.current || !sourceImageRef.current || isGlitching) return;

    setIsGlitching(true);
    
    // Use a small timeout to allow the UI to update to "Processing" state before blocking the main thread
    setTimeout(() => {
      try {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const img = sourceImageRef.current!;
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

        // Apply Sharpening if sharpness > 100 (using overlay blend mode trick)
        if (sharpness > 100) {
          const sharpenIntensity = (sharpness - 100) / 100;
          ctx.globalCompositeOperation = 'overlay';
          ctx.globalAlpha = sharpenIntensity;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          ctx.globalCompositeOperation = 'source-over';
          ctx.globalAlpha = 1.0;
        }
        
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

        // 1.5 Chromatic Aberration
        if (chromaticAberration > 0) {
          const offset = Math.floor((chromaticAberration / 100) * 25);
          const tempImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const newData = new Uint8ClampedArray(tempImageData.data);
          
          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              const idx = (y * canvas.width + x) * 4;
              
              // Shift Red channel to the right
              const rX = Math.min(canvas.width - 1, Math.max(0, x + offset));
              const rIdx = (y * canvas.width + rX) * 4;
              newData[idx] = tempImageData.data[rIdx];
              
              // Keep Green channel as is
              newData[idx + 1] = tempImageData.data[idx + 1];
              
              // Shift Blue channel to the left
              const bX = Math.min(canvas.width - 1, Math.max(0, x - offset));
              const bIdx = (y * canvas.width + bX) * 4;
              newData[idx + 2] = tempImageData.data[bIdx + 2];
              
              // Keep Alpha
              newData[idx + 3] = tempImageData.data[idx + 3];
            }
          }
          ctx.putImageData(new ImageData(newData, canvas.width, canvas.height), 0, 0);
        }

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

        // 3. Jitter (Interlace Jitter)
        if (jitter > 0) {
          const jitterAmount = Math.floor((jitter / 100) * 20);
          const tempImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const newData = new Uint8ClampedArray(tempImageData.data);
          for (let y = 0; y < canvas.height; y++) {
            const offset = (y % 2 === 0 ? 1 : -1) * jitterAmount;
            for (let x = 0; x < canvas.width; x++) {
              const sourceX = (x + offset + canvas.width) % canvas.width;
              const targetIdx = (y * canvas.width + x) * 4;
              const sourceIdx = (y * canvas.width + sourceX) * 4;
              newData[targetIdx] = tempImageData.data[sourceIdx];
              newData[targetIdx + 1] = tempImageData.data[sourceIdx + 1];
              newData[targetIdx + 2] = tempImageData.data[sourceIdx + 2];
              newData[targetIdx + 3] = tempImageData.data[sourceIdx + 3];
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

        // 6. Skew (VHS Tracking Error)
        if (skew > 0) {
          const skewIntensity = skew / 100;
          const maxSkew = skewIntensity * 100;
          const tempImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const newData = new Uint8ClampedArray(tempImageData.data);
          
          let currentSkew = 0;
          for (let y = 0; y < canvas.height; y++) {
            // Occasional tearing/reset
            if (Math.random() < 0.02 * skewIntensity) {
              currentSkew = (Math.random() - 0.5) * maxSkew * 2;
            }
            
            const rowSkew = currentSkew + (y / canvas.height) * (skewIntensity * 40);
            
            for (let x = 0; x < canvas.width; x++) {
              const sourceX = Math.floor(x + rowSkew);
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

        // 6.5 Drift (Pixel Drift)
        if (drift > 0) {
          const driftIntensity = drift / 100;
          const tempImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const newData = new Uint8ClampedArray(tempImageData.data);
          
          for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
              const idx = (y * canvas.width + x) * 4;
              const r = tempImageData.data[idx];
              const g = tempImageData.data[idx + 1];
              const b = tempImageData.data[idx + 2];
              const brightness = (r + g + b) / 3;
              
              if (brightness > 255 * (1 - driftIntensity)) {
                const driftLen = Math.floor(Math.random() * 20 * driftIntensity);
                for (let d = 1; d <= driftLen; d++) {
                  const targetX = x + d;
                  if (targetX < canvas.width) {
                    const tIdx = (y * canvas.width + targetX) * 4;
                    newData[tIdx] = r;
                    newData[tIdx + 1] = g;
                    newData[tIdx + 2] = b;
                  }
                }
              }
            }
          }
          ctx.putImageData(new ImageData(newData, canvas.width, canvas.height), 0, 0);
        }

        // 6.8 Mosh (Block Displacement)
        if (mosh > 0) {
          const moshIntensity = mosh / 100;
          const blockSize = 16;
          const cols = Math.floor(canvas.width / blockSize);
          const rows = Math.floor(canvas.height / blockSize);
          
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              if (Math.random() < 0.1 * moshIntensity) {
                const x = c * blockSize;
                const y = r * blockSize;
                const offsetX = (Math.random() - 0.5) * 40 * moshIntensity;
                const offsetY = (Math.random() - 0.5) * 40 * moshIntensity;
                
                try {
                  const block = ctx.getImageData(x, y, blockSize, blockSize);
                  ctx.putImageData(block, x + offsetX, y + offsetY);
                } catch (e) {}
              }
            }
          }
        }

        // 7. Error & Corruption Artifacts
        if (corruptionLevel > 0) {
          const artifactCount = Math.floor((corruptionLevel / 100) * 15);
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

        // 8. JPEG Corruption (moved from Quality)
        if (corruptionLevel > 20) {
          // Lower quality as corruption increases
          const q = Math.max(0.01, 1 - (corruptionLevel / 100));
          const jpegDataUrl = canvas.toDataURL('image/jpeg', q);
          
          // If corruption is high, we also corrupt the bytes
          if (corruptionLevel > 60) {
            const base64 = jpegDataUrl.split(',')[1];
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            
            // Corrupt bytes based on intensity
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
      } catch (err) {
        console.error("Glitch processing error:", err);
      } finally {
        setIsGlitching(false);
      }
    }, 10);
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
          className="order-1 md:order-2 md:col-span-2 space-y-4"
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
