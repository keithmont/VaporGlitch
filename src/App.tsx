/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, RefreshCw, Download, Zap, Sliders, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [glitchLevel, setGlitchLevel] = useState(40);
  const [saturation, setSaturation] = useState(180);
  const [distortion, setDistortion] = useState(30);
  const [droop, setDroop] = useState(25);
  const [colorShift, setColorShift] = useState(15);
  const [isGlitching, setIsGlitching] = useState(false);
  const [glitchedImage, setGlitchedImage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setGlitchedImage(null);
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
  };

  const applyGlitch = () => {
    if (!image || !canvasRef.current) return;

    setIsGlitching(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxWidth = 1200;
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let data = imageData.data;

      // 1. Color Saturation & Color Shift (Hue/Channel Swapping)
      const satFactor = saturation / 100;
      const shiftVal = colorShift / 100;
      
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Color Shift (Channel mixing/rotation)
        if (colorShift > 0) {
          const rOrig = r;
          const gOrig = g;
          const bOrig = b;
          
          // Simple rotation based on shiftVal
          r = rOrig * (1 - shiftVal) + gOrig * shiftVal;
          g = gOrig * (1 - shiftVal) + bOrig * shiftVal;
          b = bOrig * (1 - shiftVal) + rOrig * shiftVal;
        }

        // Saturation
        const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
        data[i] = Math.min(255, Math.max(0, gray + (r - gray) * satFactor));
        data[i + 1] = Math.min(255, Math.max(0, gray + (g - gray) * satFactor));
        data[i + 2] = Math.min(255, Math.max(0, gray + (b - gray) * satFactor));
      }
      ctx.putImageData(imageData, 0, 0);

      // 2. Droop (Vertical Smearing/Melting)
      if (droop > 0) {
        const droopIntensity = (droop / 100) * 0.4; // Scale it
        const columnCount = Math.floor(canvas.width * droopIntensity);
        
        for (let i = 0; i < columnCount; i++) {
          const x = Math.floor(Math.random() * canvas.width);
          const yStart = Math.floor(Math.random() * canvas.height);
          const droopLen = Math.floor(Math.random() * (canvas.height - yStart) * (droop / 100));
          
          if (droopLen > 0) {
            const columnData = ctx.getImageData(x, yStart, 1, 1);
            for (let y = yStart; y < yStart + droopLen; y++) {
              if (y < canvas.height) {
                // Blend or overwrite
                ctx.putImageData(columnData, x, y);
              }
            }
          }
        }
      }

      // 3. RGB Split (Enhanced Chromatic Aberration)
      if (distortion > 0) {
        const offset = Math.floor((distortion / 100) * 30); // Increased intensity
        const tempImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const newData = new Uint8ClampedArray(tempImageData.data);
        
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            
            // Red channel shift
            const rX = Math.min(canvas.width - 1, Math.max(0, x + offset));
            const rIdx = (y * canvas.width + rX) * 4;
            newData[idx] = tempImageData.data[rIdx];

            // Blue channel shift
            const bX = Math.min(canvas.width - 1, Math.max(0, x - offset));
            const bIdx = (y * canvas.width + bX) * 4;
            newData[idx + 2] = tempImageData.data[bIdx + 2];
          }
        }
        ctx.putImageData(new ImageData(newData, canvas.width, canvas.height), 0, 0);
      }

      // 4. Scanline Glitch (Horizontal Shifts - More Intense)
      const glitchCount = Math.floor((glitchLevel / 100) * 40); // Doubled count
      for (let i = 0; i < glitchCount; i++) {
        const y = Math.floor(Math.random() * canvas.height);
        const h = Math.floor(Math.random() * (canvas.height / 8)) + 2;
        const xOffset = (Math.random() - 0.5) * (glitchLevel / 100) * canvas.width * 0.4;
        
        try {
          const slice = ctx.getImageData(0, y, canvas.width, h);
          ctx.putImageData(slice, xOffset, y);
        } catch (e) { /* ignore out of bounds */ }
      }

      // 5. Random Color Blocks (Circuit Bending feel - More Intense)
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
          
          // Add a "wire" line
          ctx.strokeStyle = `rgba(${g}, ${b}, ${r}, 0.8)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + w, y + h);
          ctx.stroke();
        }
      }

      // 6. Sine Wave Distortion (Enhanced)
      if (distortion > 40) {
        const waveAmp = (distortion / 100) * 40;
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

      setGlitchedImage(canvas.toDataURL('image/png'));
      setIsGlitching(false);
    };
    img.src = image;
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
          VaporGlitch
        </h1>
        <p className="font-mono text-vapor-cyan text-sm tracking-widest uppercase">
          // Circuit Bending Simulator //
        </p>
      </header>

      <main className="w-full grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Controls */}
        <motion.section 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8 bg-vapor-dark/80 p-6 rounded-xl vapor-border backdrop-blur-sm"
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
                max="300" 
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
          <div className="relative aspect-video w-full bg-black/40 rounded-xl vapor-border overflow-hidden flex items-center justify-center group">
            {!image ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-4 cursor-pointer hover:scale-105 transition-transform"
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
                  className="w-full h-full object-contain"
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
