#!/bin/bash

# Create Google Slides version with green accent (Google colors)

create_png() {
    size=$1
    output=$2
    
    cat > temp_$size.svg << SVGEOF
<svg width="$size" height="$size" xmlns="http://www.w3.org/2000/svg">
  <rect width="$size" height="$size" rx="$((size/6))" fill="#4285f4"/>
  <rect x="$((size/6))" y="$((size/5))" width="$((size*2/3))" height="$((size/2))" rx="$((size/30))" fill="white" opacity="0.95"/>
  <circle cx="$((size*3/4))" cy="$((size*2/5))" r="$((size/8))" fill="#34a853"/>
  <circle cx="$((size*3/4))" cy="$((size*2/5))" r="$((size/16))" fill="white"/>
</svg>
SVGEOF
    
    qlmanage -t -s $size -o . temp_$size.svg 2>/dev/null
    mv temp_$size.svg.png $output 2>/dev/null || echo "Could not create $output"
    rm temp_$size.svg
}

create_png 16 icon16.png
create_png 48 icon48.png  
create_png 128 icon128.png

ls -lh icon*.png
