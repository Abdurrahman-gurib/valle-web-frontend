import io, os
from PIL import Image
src=os.path.join('..','PHOTOS','Icons')
for n in ['jeep','gift','games','water']:
    im=Image.open(os.path.join(src,n+'.png')).convert('RGBA'); im=im.crop(im.getbbox())
    w,h=im.size; side=int(max(w,h)*1.12); c=Image.new('RGBA',(side,side),(0,0,0,0)); c.paste(im,((side-w)//2,(side-h)//2),im)
    c=c.resize((256,256),Image.LANCZOS); c.save(f'public/icons/valle/{n}.png',optimize=True); c.save(f'public/icons/valle/{n}.webp','WEBP',lossless=True)
p='src/components/ui/ValleIcon.tsx'; s=io.open(p,encoding='utf-8').read()
a="  'giant-swing', 'tortoise', 'waterfall',\n]"; assert a in s
s=s.replace(a,"  'giant-swing', 'tortoise', 'waterfall', 'jeep', 'gift', 'games', 'water',\n]",1)
a="  [/butler|guide|\bvip\b|\bteam|private|group expedition/i, 'team-stars'],"; assert a in s
s=s.replace(a,"  [/\bjeep|4x4/i, 'jeep'],\n  [/gift|souvenir/i, 'gift'],\n  [/\bgames?\b|treasure hunt/i, 'games'],\n  [/\bwater\b|bottle/i, 'water'],\n"+a,1)
io.open(p,'w',encoding='utf-8',newline='\n').write(s)
