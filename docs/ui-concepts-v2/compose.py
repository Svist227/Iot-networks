from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
root=Path('docs/ui-concepts-v2')
files=sorted(root.glob('[0-9][0-9]-*.png'))
titles=['01  Главная · объемная сеть','02  Главная · рабочая станция','03  Галерея проектов','04  Диагностика на схеме','05  Конструктор событий','06  Пульт воспроизведения','07  Лаборатория сравнения','08  Контекстный помощник','09  Живой отчет','10  Режим презентации']
w,h=700,438
sheet=Image.new('RGB',(1424,5*476+24),'#eaf0ec')
draw=ImageDraw.Draw(sheet)
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
for i,file in enumerate(files):
    im=Image.open(file).convert('RGB').resize((w,h),Image.Resampling.LANCZOS)
    x=12+(i%2)*712;y=12+(i//2)*476
    sheet.paste(im,(x,y+28))
    draw.text((x+4,y),titles[i],font=font,fill='#153f48')
sheet.save(root/'overview.png',optimize=True)
for source,target,size,duration in [('motion-home-*.png','home-motion.gif',(684,216),150),('motion-play-*.png','scenario-motion.gif',(700,300),380)]:
    frames=[Image.open(f).convert('RGB').resize(size,Image.Resampling.LANCZOS) for f in sorted(root.glob(source))]
    frames[0].save(root/target,save_all=True,append_images=frames[1:],duration=duration,loop=0,optimize=True)
print('screens',len(files))
for f in ['overview.png','home-motion.gif','scenario-motion.gif']:
    p=root/f;print(f,p.stat().st_size)
