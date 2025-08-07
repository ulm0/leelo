import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// SVG content matching the exact component design
const svgContent = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background: rounded-lg bg-primary -->
  <rect width="32" height="32" rx="8" fill="#8D41F9"/>
  
  <!-- White bold "L" letter centered -->
  <text x="16" y="22" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="white">L</text>
</svg>`;

// Larger version for PWA icons
const largeSvgContent = `<svg width="192" height="192" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background: rounded-lg bg-primary -->
  <rect width="192" height="192" rx="48" fill="#8D41F9"/>
  
  <!-- White bold "L" letter centered -->
  <text x="96" y="132" font-family="system-ui, -apple-system, sans-serif" font-size="108" font-weight="bold" text-anchor="middle" fill="white">L</text>
</svg>`;

async function generateFavicons() {
  try {
    console.log('🎨 Generating favicons...');
    
    // Ensure public directory exists
    const publicDir = path.join(process.cwd(), 'public');
    await fs.mkdir(publicDir, { recursive: true });
    
    // Write SVG favicon
    await fs.writeFile(path.join(publicDir, 'favicon.svg'), svgContent);
    console.log('✅ Generated favicon.svg');
    
    // Generate PNG favicon (32x32)
    const pngBuffer = await sharp(Buffer.from(svgContent))
      .resize(32, 32)
      .png()
      .toBuffer();
    
    await fs.writeFile(path.join(publicDir, 'favicon.png'), pngBuffer);
    console.log('✅ Generated favicon.png (32x32)');
    
    // Generate ICO favicon (32x32)
    const icoBuffer = await sharp(Buffer.from(svgContent))
      .resize(32, 32)
      .png()
      .toBuffer();
    
    await fs.writeFile(path.join(publicDir, 'favicon.ico'), icoBuffer);
    console.log('✅ Generated favicon.ico (32x32)');
    
    // Generate PWA icons
    const sizes = [16, 32, 48, 72, 96, 128, 144, 152, 192, 384, 512];
    
    for (const size of sizes) {
      const iconBuffer = await sharp(Buffer.from(largeSvgContent))
        .resize(size, size)
        .png()
        .toBuffer();
      
      await fs.writeFile(path.join(publicDir, `icon-${size}x${size}.png`), iconBuffer);
      console.log(`✅ Generated icon-${size}x${size}.png`);
    }
    
    // Generate Apple touch icon (180x180)
    const appleTouchIcon = await sharp(Buffer.from(largeSvgContent))
      .resize(180, 180)
      .png()
      .toBuffer();
    
    await fs.writeFile(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIcon);
    console.log('✅ Generated apple-touch-icon.png (180x180)');
    
    // Generate mask icon SVG
    const maskIconSvg = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="16" height="16" rx="4" fill="#8D41F9"/>
  <text x="8" y="11" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="bold" text-anchor="middle" fill="white">L</text>
</svg>`;
    
    await fs.writeFile(path.join(publicDir, 'mask-icon.svg'), maskIconSvg);
    console.log('✅ Generated mask-icon.svg');
    
    // Update manifest.webmanifest with icon references
    const manifestPath = path.join(publicDir, 'manifest.webmanifest');
    const manifest = {
      name: "Leelo - Read It Whenever",
      short_name: "Leelo",
      description: "A self-hosted read-it-whenever app",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#8D41F9",
      icons: sizes.map(size => ({
        src: `/icon-${size}x${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png"
      }))
    };
    
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('✅ Updated manifest.webmanifest');
    
    console.log('🎉 All favicons generated successfully!');
    
  } catch (error) {
    console.error('❌ Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons(); 
