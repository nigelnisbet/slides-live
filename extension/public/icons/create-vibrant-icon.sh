#!/bin/bash

# Create vibrant Google Slides version with Google colors

create_png() {
    size=$1
    output=$2
    
    cat > temp_$size.svg << SVGEOF
<svg width="$size" height="$size" xmlns="http://www.w3.org/2000/svg">
  <!-- Gradient background with Google colors -->
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4285f4;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#5ea3f7;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="$size" height="$size" rx="$((size/5))" fill="url(#bgGrad)"/>
  
  <!-- White presentation screen -->
  <rect x="$((size/6))" y="$((size/4))" width="$((size*2/3))" height="$((size/3))" rx="$((size/20))" fill="white"/>
  
  <!-- Colorful bars inside screen -->
  <rect x="$((size/5))" y="$((size*7/16))" width="$((size/12))" height="$((size/8))" fill="#ea4335" opacity="0.8"/>
  <rect x="$((size*3/8))" y="$((size*3/8))" width="$((size/12))" height="$((size*5/16))" fill="#34a853" opacity="0.8"/>
  <rect x="$((size*9/16))" y="$((size*5/12))" width="$((size/12))" height="$((size*3/16))" fill="#fbbc04" opacity="0.8"/>
  
  <!-- Large green interactive circle -->
  <circle cx="$((size*3/4))" cy="$((size*3/4))" r="$((size/5))" fill="#34a853"/>
  <circle cx="$((size*3/4))" cy="$((size*3/4))" r="$((size/7))" fill="#5ec16c"/>
  <text x="$((size*3/4))" y="$((size*4/5))" font-size="$((size/5))" text-anchor="middle" fill="white" font-weight="bold">↗</text>
</svg>
SVGEOF
    
    qlmanage -t -s $size -o . temp_$size.svg 2>/dev/null
    mv temp_$size.svg.png $output 2>/dev/null
    rm temp_$size.svg
}

create_png 16 icon16.png
create_png 48 icon48.png  
create_png 128 icon128.png

echo "Created vibrant Google Slides icons:"
ls -lh icon*.png
