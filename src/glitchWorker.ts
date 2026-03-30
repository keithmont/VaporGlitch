/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

self.onmessage = function(e) {
  const { 
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
  } = e.data;

  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

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

  // 1.2 Channel XOR
  if (channelXor > 0) {
    const xorIntensity = Math.floor((channelXor / 100) * 255);
    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() < (channelXor / 200)) {
        data[i] ^= xorIntensity;
        data[i + 1] ^= xorIntensity;
        data[i + 2] ^= xorIntensity;
      }
    }
  }

  // 1.5 Chromatic Aberration
  if (chromaticAberration > 0) {
    const offset = Math.floor((chromaticAberration / 100) * 25);
    const tempData = new Uint8ClampedArray(data);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const rX = Math.min(width - 1, Math.max(0, x + offset));
        const rIdx = (y * width + rX) * 4;
        data[idx] = tempData[rIdx];
        const bX = Math.min(width - 1, Math.max(0, x - offset));
        const bIdx = (y * width + bX) * 4;
        data[idx + 2] = tempData[bIdx + 2];
      }
    }
  }

  // 2. Droop
  if (droop > 0) {
    const droopIntensity = (droop / 100);
    const droopCount = Math.floor(width * 0.15 * droopIntensity);
    for (let i = 0; i < droopCount; i++) {
      const x = Math.floor(Math.random() * width);
      const yStart = Math.floor(Math.random() * height);
      const droopLen = Math.floor(Math.random() * (height - yStart) * (droop / 100));
      if (droopLen > 0) {
        for (let y = yStart + 1; y < yStart + droopLen; y++) {
          if (y < height) {
            const targetIdx = (y * width + x) * 4;
            const sourceIdx = (yStart * width + x) * 4;
            data[targetIdx] = data[sourceIdx];
            data[targetIdx + 1] = data[sourceIdx + 1];
            data[targetIdx + 2] = data[sourceIdx + 2];
          }
        }
      }
    }
  }

  // 3. Jitter (Interlace Jitter)
  if (jitter > 0) {
    const jitterAmount = Math.floor((jitter / 100) * 20);
    const tempData = new Uint8ClampedArray(data);
    for (let y = 0; y < height; y++) {
      const offset = (y % 2 === 0 ? 1 : -1) * jitterAmount;
      for (let x = 0; x < width; x++) {
        const sourceX = (x + offset + width) % width;
        const targetIdx = (y * width + x) * 4;
        const sourceIdx = (y * width + sourceX) * 4;
        data[targetIdx] = tempData[sourceIdx];
        data[targetIdx + 1] = tempData[sourceIdx + 1];
        data[targetIdx + 2] = tempData[sourceIdx + 2];
      }
    }
  }

  // 4. Pixel Sorting
  if (pixelSorting > 0) {
    const sortIntensity = pixelSorting / 100;
    for (let y = 0; y < height; y++) {
      // Increased probability from 0.2 to 0.6 for more intensity
      if (Math.random() < sortIntensity * 0.6) {
        const rowStart = y * width * 4;
        const rowEnd = rowStart + width * 4;
        const rowData = [];
        for (let i = rowStart; i < rowEnd; i += 4) {
          rowData.push({
            r: data[i],
            g: data[i + 1],
            b: data[i + 2],
            a: data[i + 3],
            brightness: (data[i] + data[i + 1] + data[i + 2]) / 3
          });
        }
        
        // Sort segments of the row - increased segment size potential
        const segmentSize = Math.floor(width * (0.1 + sortIntensity * 0.9));
        const startX = Math.floor(Math.random() * (width - segmentSize));
        const segment = rowData.slice(startX, startX + segmentSize);
        segment.sort((a, b) => a.brightness - b.brightness);
        
        for (let i = 0; i < segmentSize; i++) {
          const idx = rowStart + (startX + i) * 4;
          data[idx] = segment[i].r;
          data[idx + 1] = segment[i].g;
          data[idx + 2] = segment[i].b;
        }
      }
    }
  }

  // 5. Skew (VHS Tracking Error / Bending)
  if (skew > 0) {
    const skewIntensity = skew / 100;
    const tempData = new Uint8ClampedArray(data);
    const amp1 = skewIntensity * 50;
    const freq1 = 0.002 + skewIntensity * 0.008;
    const amp2 = skewIntensity * 15;
    const freq2 = 0.02 + skewIntensity * 0.05;
    const jitterAmp = skewIntensity * 4;
    
    for (let y = 0; y < height; y++) {
      const bend = Math.sin(y * freq1) * amp1 + Math.sin(y * freq2) * amp2;
      const jitterVal = (Math.random() - 0.5) * jitterAmp;
      const rowSkew = bend + jitterVal;
      const isSkewed = Math.abs(rowSkew) > 5;
      
      for (let x = 0; x < width; x++) {
        const sourceX = (Math.floor(x + rowSkew) + width) % width;
        const targetIdx = (y * width + x) * 4;
        const sourceIdx = (y * width + sourceX) * 4;
        
        let r = tempData[sourceIdx];
        let g = tempData[sourceIdx + 1];
        let b = tempData[sourceIdx + 2];

        if (isSkewed && skew > 30) {
          r = (r + 40 * skewIntensity) % 256;
          b = (b + 20 * skewIntensity) % 256;
        }

        if (skew > 50 && Math.random() < 0.15 * skewIntensity) {
          const noise = (Math.random() - 0.5) * 130 * skewIntensity;
          r = Math.min(255, Math.max(0, r + noise));
          g = Math.min(255, Math.max(0, g + noise));
          b = Math.min(255, Math.max(0, b + noise));
        }
        
        if (skew > 60 && y % 2 === 0) {
          const darken = 0.85 + (1 - skewIntensity) * 0.1;
          r *= darken; g *= darken; b *= darken;
        }

        data[targetIdx] = r;
        data[targetIdx + 1] = g;
        data[targetIdx + 2] = b;
      }
    }
  }

  // 6. Drift (Pixel Drift)
  if (drift > 0) {
    const driftIntensity = drift / 100;
    const tempData = new Uint8ClampedArray(data);
    const threshold = 255 * (1 - (driftIntensity * 0.8));
    const driftProb = 0.02 + (driftIntensity * 0.08);
    const maxDriftLen = Math.floor(20 + (driftIntensity * 180));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = tempData[idx];
        const g = tempData[idx + 1];
        const b = tempData[idx + 2];
        const brightness = (r + g + b) / 3;
        
        if (brightness > threshold && Math.random() < driftProb) {
          const driftLen = Math.floor(Math.random() * maxDriftLen);
          for (let d = 1; d <= driftLen; d++) {
            const targetX = x + d;
            if (targetX < width) {
              const tIdx = (y * width + targetX) * 4;
              data[tIdx] = r;
              data[tIdx + 1] = g;
              data[tIdx + 2] = b;
            }
          }
          x += Math.floor(driftLen * 0.5);
        }
      }
    }
  }

  // 7. Mosh (Block Displacement)
  if (mosh > 0) {
    const moshIntensity = mosh / 100;
    const blockSize = Math.floor(16 + (moshIntensity * 48));
    const cols = Math.floor(width / blockSize);
    const rows = Math.floor(height / blockSize);
    const moveProb = 0.05 + (moshIntensity * 0.3);
    
    const tempData = new Uint8ClampedArray(data);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < moveProb) {
          const x = c * blockSize;
          const y = r * blockSize;
          const offsetX = Math.floor((Math.random() - 0.5) * 120 * moshIntensity);
          const offsetY = Math.floor((Math.random() - 0.5) * 60 * moshIntensity);
          
          for (let by = 0; by < blockSize; by++) {
            for (let bx = 0; bx < blockSize; bx++) {
              const tx = x + bx + offsetX;
              const ty = y + by + offsetY;
              if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
                const targetIdx = (ty * width + tx) * 4;
                const sourceIdx = ((y + by) * width + (x + bx)) * 4;
                data[targetIdx] = tempData[sourceIdx];
                data[targetIdx + 1] = tempData[sourceIdx + 1];
                data[targetIdx + 2] = tempData[sourceIdx + 2];
              }
            }
          }
        }
      }
    }
  }

  // 8. Corruption Artifacts
  if (corruptionLevel > 0) {
    const artifactCount = Math.floor((corruptionLevel / 100) * 15);
    for (let i = 0; i < artifactCount; i++) {
      const type = Math.random();
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      const w = Math.floor(Math.random() * 120);
      const h = Math.floor(Math.random() * 80);
      
      if (type < 0.4) {
        for (let ay = y; ay < y + h && ay < height; ay++) {
          for (let ax = x; ax < x + w && ax < width; ax++) {
            const idx = (ay * width + ax) * 4;
            data[idx] = 0; data[idx+1] = 255; data[idx+2] = 0;
          }
        }
      } else if (type < 0.7) {
        for (let ay = y; ay < y + h && ay < height; ay++) {
          for (let ax = x; ax < x + w && ax < width; ax++) {
            const idx = (ay * width + ax) * 4;
            data[idx] = 0; data[idx+1] = 0; data[idx+2] = 0;
          }
        }
      }
    }
  }

  (self as any).postMessage({ imageData }, [imageData.data.buffer]);
};
