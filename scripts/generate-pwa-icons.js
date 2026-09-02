import fs from "fs"
import path from "path"
import zlib from "zlib"

function createPng(width, height, drawFn) {
  // Width and height bytes
  const w = width
  const h = height

  // Raw RGBA pixel buffer with 1 filter byte per scanline
  const rowSize = 1 + w * 4
  const rawBuffer = Buffer.alloc(rowSize * h)

  for (let y = 0; y < h; y++) {
    const rowOffset = y * rowSize
    rawBuffer[rowOffset] = 0 // Filter type 0 (None)

    for (let x = 0; x < w; x++) {
      const pixelOffset = rowOffset + 1 + x * 4
      const [r, g, b, a] = drawFn(x, y, w, h)
      rawBuffer[pixelOffset] = r
      rawBuffer[pixelOffset + 1] = g
      rawBuffer[pixelOffset + 2] = b
      rawBuffer[pixelOffset + 3] = a
    }
  }

  // Compress with deflate
  const compressed = zlib.deflateSync(rawBuffer)

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace
  const ihdrChunk = createChunk("IHDR", ihdr)

  // IDAT chunk
  const idatChunk = createChunk("IDAT", compressed)

  // IEND chunk
  const iendChunk = createChunk("IEND", Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

function createChunk(type, data) {
  const len = data.length
  const buf = Buffer.alloc(8 + len + 4)
  buf.writeUInt32BE(len, 0)
  buf.write(type, 4, 4, "ascii")
  data.copy(buf, 8)

  const crc = crc32(buf.subarray(4, 8 + len))
  buf.writeUInt32BE(crc, 8 + len)
  return buf
}

// CRC32 implementation
const crcTable = []
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  crcTable[n] = c
}

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

// Shader / Drawing function for SARWS Connect icon
function drawSarwsIcon(x, y, w, h, isMaskable = false) {
  // Normalize coordinates to 0..1
  const nx = x / w
  const ny = y / h

  // Background color: Deep dark stone #0c0a09 (12, 10, 9)
  // Maskable icons use full bleed without rounded corners
  const cornerRadius = isMaskable ? 0 : 0.22
  let inBackground = true

  if (!isMaskable) {
    const cx = nx < 0.5 ? nx - cornerRadius : nx - (1 - cornerRadius)
    const cy = ny < 0.5 ? ny - cornerRadius : ny - (1 - cornerRadius)
    if (nx < cornerRadius || nx > 1 - cornerRadius || ny < cornerRadius || ny > 1 - cornerRadius) {
      if ((nx < cornerRadius || nx > 1 - cornerRadius) && (ny < cornerRadius || ny > 1 - cornerRadius)) {
        const dist = Math.sqrt(cx * cx + cy * cy)
        if (dist > cornerRadius) {
          inBackground = false
        }
      }
    }
  }

  if (!inBackground) {
    return [0, 0, 0, 0] // Transparent
  }

  // Gradient background from #1c1917 (28, 25, 23) to #0c0a09 (12, 10, 9)
  const bgR = Math.round(28 - ny * 16)
  const bgG = Math.round(25 - ny * 15)
  const bgB = Math.round(23 - ny * 14)

  // Building geometry centered (scale 0.5..0.85)
  const scale = isMaskable ? 0.75 : 0.85
  const gx = (nx - 0.5) / scale + 0.5
  const gy = (ny - 0.5) / scale + 0.5

  // Check if inside central emblem
  const leftX = 0.26
  const rightX = 0.74
  const midX = 0.5
  const topY = 0.20
  const roofY = 0.38
  const baseY = 0.80

  let inBuilding = false
  let isEmerald = false
  let isLightEmerald = false
  let isWindow = false
  let isDoor = false

  if (gy >= topY && gy <= baseY && gx >= leftX && gx <= rightX) {
    // Check roof triangle
    if (gy < roofY) {
      const roofProgress = (gy - topY) / (roofY - topY)
      const curLeft = midX - roofProgress * (midX - leftX)
      const curRight = midX + roofProgress * (rightX - midX)
      if (gx >= curLeft && gx <= curRight) {
        inBuilding = true
      }
    } else {
      inBuilding = true
    }

    if (inBuilding) {
      // Left vs Right half shading
      if (gx < midX) {
        isLightEmerald = true
      } else {
        isEmerald = true
      }

      // Door cutout
      if (gy >= 0.68 && gy <= baseY && gx >= 0.44 && gx <= 0.56) {
        isDoor = true
      }

      // Windows
      const winCols = [
        [0.32, 0.38],
        [0.40, 0.46],
        [0.54, 0.60],
        [0.62, 0.68],
      ]
      const winRows = [
        [0.42, 0.48],
        [0.51, 0.57],
        [0.60, 0.66],
      ]

      for (const col of winCols) {
        if (gx >= col[0] && gx <= col[1]) {
          for (const row of winRows) {
            if (gy >= row[0] && gy <= row[1]) {
              isWindow = true
            }
          }
        }
      }
    }
  }

  // Apex circle
  const apexDist = Math.sqrt((gx - 0.5) ** 2 + (gy - topY) ** 2)
  if (apexDist < 0.035) {
    return [236, 253, 245, 255] // #ecfdf5
  }

  if (isDoor || isWindow) {
    return [12, 10, 9, 230] // Dark cutout
  }

  if (isLightEmerald) {
    // #10b981 (16, 185, 129) to #34d399 (52, 211, 153)
    const factor = (gy - topY) / (baseY - topY)
    return [
      Math.round(52 - factor * 36),
      Math.round(211 - factor * 26),
      Math.round(153 - factor * 24),
      255,
    ]
  }

  if (isEmerald) {
    // #059669 (5, 150, 105) to #047857 (4, 120, 87)
    const factor = (gy - topY) / (baseY - topY)
    return [
      Math.round(16 - factor * 11),
      Math.round(185 - factor * 35),
      Math.round(129 - factor * 24),
      255,
    ]
  }

  return [bgR, bgG, bgB, 255]
}

const iconsDir = path.join(process.cwd(), "public", "icons")
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

console.log("Generating PWA icons...")

const sizes = [
  { name: "icon-192x192.png", size: 192, maskable: false },
  { name: "icon-512x512.png", size: 512, maskable: false },
  { name: "icon-maskable-192x192.png", size: 192, maskable: true },
  { name: "icon-maskable-512x512.png", size: 512, maskable: true },
  { name: "apple-touch-icon.png", size: 180, maskable: false },
]

for (const s of sizes) {
  const buf = createPng(s.size, s.size, (x, y, w, h) => drawSarwsIcon(x, y, w, h, s.maskable))
  const outPath = path.join(iconsDir, s.name)
  fs.writeFileSync(outPath, buf)
  console.log(`Created ${s.name} (${s.size}x${s.size})`)
}

console.log("All PWA icons generated successfully.")
