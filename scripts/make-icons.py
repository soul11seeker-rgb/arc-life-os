"""Generate original ARC installation icons; uses Python standard library only."""
import struct, zlib
from pathlib import Path

def inside(x,y,poly):
    c=False;j=len(poly)-1
    for i in range(len(poly)):
        xi,yi=poly[i];xj,yj=poly[j]
        if ((yi>y)!=(yj>y)) and x < (xj-xi)*(y-yi)/(yj-yi)+xi:c=not c
        j=i
    return c

def icon(size,path,maskable=False):
    polygons=[([(11,49),(29,13),(37,13),(21,49)],(255,49,85)), ([(39,23),(53,49),(41,49),(33,34)],(255,49,85)), ([(27,42),(32,33),(37,42)],(116,229,224))]
    data=bytearray()
    for y in range(size):
        data.append(0)
        for x in range(size):
            px=x*64/size;py=y*64/size
            if maskable:px=(px-32)/.76+32;py=(py-32)/.76+32
            rgb=(11,13,18)
            for poly,color in polygons:
                if inside(px,py,poly):rgb=color
            data.extend(rgb)
    def chunk(t,d):return struct.pack('!I',len(d))+t+d+struct.pack('!I',zlib.crc32(t+d)&0xffffffff)
    Path(path).write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(bytes(data)))+chunk(b'IEND',b''))
for n in (192,512):icon(n,f'public/icon-{n}.png')
icon(512,'public/icon-maskable.png',True)
icon(180,'public/apple-touch-icon.png')
print('Created ARC PWA icons.')
