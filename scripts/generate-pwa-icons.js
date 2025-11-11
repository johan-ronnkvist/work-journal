import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const publicDir = path.resolve(__dirname, '../public')

// Generate SVG icon with Lucide quote icon
function generateSVGIcon(size) {
  const iconSize = Math.floor(size * 0.5)
  const iconOffset = (size - iconSize) / 2

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#292524" rx="${size * 0.1}"/>
  <g transform="translate(${iconOffset}, ${iconOffset})">
    <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>
      <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>
    </svg>
  </g>
</svg>`
}

// Generate Apple Touch Icon
function generateAppleTouchIcon() {
  const size = 180
  const iconSize = 90
  const iconOffset = (size - iconSize) / 2

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#292524" rx="40"/>
  <g transform="translate(${iconOffset}, ${iconOffset})">
    <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>
      <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>
    </svg>
  </g>
</svg>`
}

// Generate Masked Icon (for Safari pinned tabs - monochrome)
function generateMaskedIcon() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path fill="black" d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>
  <path fill="black" d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>
</svg>`
}

// Generate Favicon (32x32 SVG)
function generateFavicon() {
  const size = 32
  const iconSize = 20
  const iconOffset = (size - iconSize) / 2

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#292524" rx="6"/>
  <g transform="translate(${iconOffset}, ${iconOffset})">
    <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>
      <path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>
    </svg>
  </g>
</svg>`
}

async function generateIcons() {
  console.log('Generating PWA icons...')

  try {
    // Create public directory if it doesn't exist
    await fs.mkdir(publicDir, { recursive: true })

    // Generate 192x192 icon
    const icon192 = generateSVGIcon(192)
    await fs.writeFile(path.join(publicDir, 'pwa-192x192.svg'), icon192)
    console.log('✓ Created pwa-192x192.svg')

    // Generate 512x512 icon
    const icon512 = generateSVGIcon(512)
    await fs.writeFile(path.join(publicDir, 'pwa-512x512.svg'), icon512)
    console.log('✓ Created pwa-512x512.svg')

    // Generate Apple Touch Icon
    const appleIcon = generateAppleTouchIcon()
    await fs.writeFile(path.join(publicDir, 'apple-touch-icon.svg'), appleIcon)
    console.log('✓ Created apple-touch-icon.svg')

    // Generate Masked Icon
    const maskedIcon = generateMaskedIcon()
    await fs.writeFile(path.join(publicDir, 'masked-icon.svg'), maskedIcon)
    console.log('✓ Created masked-icon.svg')

    // Generate Favicon
    const favicon = generateFavicon()
    await fs.writeFile(path.join(publicDir, 'favicon.svg'), favicon)
    console.log('✓ Created favicon.svg')

    console.log('\n✓ All PWA icons generated successfully!')
    console.log('\nNote: These are SVG icons. For production, consider:')
    console.log('  1. Creating proper PNG/ICO versions for broader browser support')
    console.log('  2. Using tools like https://realfavicongenerator.net/')
    console.log('  3. Ensuring maskable icons follow safe zones')
  } catch (error) {
    console.error('Error generating icons:', error)
    process.exit(1)
  }
}

generateIcons()
