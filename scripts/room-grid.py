"""A gridded view of a room photo, for reading spec polygons off by eye.

    python3 scripts/room-grid.py <photo> [x0 y0 x1 y1 step]   → /tmp/grid.jpg
"""
import sys
from PIL import Image, ImageDraw, ImageFont
n=sys.argv[1]; x0,y0,x1,y1=[float(v) for v in (sys.argv[2:6] if len(sys.argv)>2 else (0,0,1,1))]
step=float(sys.argv[6]) if len(sys.argv)>6 else 0.05
im=Image.open(n).convert('RGB'); W,H=im.size
crop=im.crop((int(x0*W),int(y0*H),int(x1*W),int(y1*H)))
out_w=1400; sc=out_w/crop.size[0]; crop=crop.resize((out_w,int(crop.size[1]*sc)))
d=ImageDraw.Draw(crop); f=ImageFont.load_default()
import math
def frange(a,b,s):
    v=math.ceil(a/s-1e-9)*s
    while v<=b+1e-9: yield round(v,4); v+=s
for gx in frange(x0,x1,step):
    X=(gx-x0)*W*sc; d.line([(X,0),(X,crop.size[1])],fill=(255,0,255),width=1); d.text((X+2,2),f'{gx:.2f}',fill=(255,255,0),font=f)
for gy in frange(y0,y1,step):
    Y=(gy-y0)*H*sc; d.line([(0,Y),(crop.size[0],Y)],fill=(0,255,255),width=1); d.text((2,Y+2),f'{gy:.2f}',fill=(255,255,0),font=f)
crop.save('/tmp/grid.jpg',quality=85)
