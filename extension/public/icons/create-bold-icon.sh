#!/bin/bash

create_png() {
    size=$1
    output=$2
    
    cat > temp_$size.svg << SVGEOF
<svg width="$size" height="$size" xmlns="http://www.w3.org/2000/svg">
  <!-- Solid Google blue background -->
  <rect width="$size" height="$size" rx="$((size/5))" fill="#4285f4"/>
  
  <!-- Large white rectangle (screen) -->
  <rect x="$((size/5))" y="$((size*3/10))" width="$((size*3/5))" height="$((size*2/5))" rx="2" fill="white"/>
  
  <!-- Big green circle badge -->
  <circle cx="$((size*3/4))" cy="$((size*3/4))" r="$((size/5))" fill="#34a853"/>
  <circle cx="$((size*3/4))" cy="$((size*3/4))" r="$((size/10))" fill="white"/>
</svg>
SVGEOF
    
    qlmanage -t -s $size -o . temp_$size.svg 2>/dev/null
    mv temp_$size.svg.png $output 2>/dev/null
    rm temp_$size.svg
}

create_png 16 icon16.png
create_png 48 icon48.png  
create_png 128 icon128.png

echo "Created bold Google Slides icons:"
ls -lh icon*.png
