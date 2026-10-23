import json, math
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from pypdf import PdfReader
from pathlib import Path
root=Path('/Users/mclein/Documents/Developer/Personal_Projects/AdvanCare')
pdfmetrics.registerFont(TTFont('Main','/System/Library/Fonts/Supplemental/Arial.ttf'))
pdfmetrics.registerFont(TTFont('Bold','/System/Library/Fonts/Supplemental/Arial Bold.ttf'))
out=root/'output/pdf/AdvanCare-TAM-SAM-SOM.pdf'
c=canvas.Canvas(str(out),pagesize=(1280,800))
c.setTitle('advanCARE | Cagayan Market Opportunity')
def text(x,y,s,size=14,color='#183F40',bold=False):
 c.setFillColor(HexColor(color));c.setFont('Bold' if bold else 'Main',size);c.drawString(x,y,s)
def box(x,y,w,h,color,r=18):
 c.setFillColor(HexColor(color));c.roundRect(x,y,w,h,r,fill=1,stroke=0)
box(0,0,1280,800,'#F6F8F5',0)
text(52,748,'advanCARE',23,bold=True)
text(1040,752,'MARKET OPPORTUNITY',11,bold=True)
text(52,686,'Care within reach. A market with scale.',36,bold=True)
text(52,650,'Cagayan Province, Philippines  |  1.2 million people  |  ₱1,800 per person / year',16)
box(52,182,410,432,'#E5EFEB')
text(78,580,'CAGAYAN PROVINCE',15,bold=True)
text(78,556,'Geographic focus',12,'#54746B')
f=next(f for f in json.load(open(root/'tmp/pdfs/provinces.geojson'))['features'] if f['properties']['province']=='Cagayan')
polys=f['geometry']['coordinates']; polys=polys if f['geometry']['type']=='MultiPolygon' else [polys]
pts=[p for poly in polys for ring in poly for p in ring]
cos=math.cos(math.radians(18.5)); xs=[p[0]*cos for p in pts];ys=[p[1] for p in pts]
scale=min(290/(max(xs)-min(xs)),280/(max(ys)-min(ys)))
ox=257-(max(xs)+min(xs))/2*scale;oy=378-(max(ys)+min(ys))/2*scale
c.setFillColor(HexColor('#267563'));c.setStrokeColor(HexColor('#F6F8F5'));c.setLineWidth(.5)
for poly in polys:
 path=c.beginPath()
 for ring in poly:
  path.moveTo(ring[0][0]*cos*scale+ox,ring[0][1]*scale+oy)
  for lon,lat,*_ in ring[1:]:path.lineTo(lon*cos*scale+ox,lat*scale+oy)
  path.close()
 c.drawPath(path,fill=1,stroke=1)
text(410,526,'N',11,bold=True)
c.setStrokeColor(HexColor('#183F40'));c.line(414,491,414,518);c.line(414,518,410,510);c.line(414,518,418,510)
text(78,218,'Province boundary, including offshore islands',11,'#54746B')
rows=[('TAM','Total Addressable Market','360,000','30% × 1,200,000 people','₱54M','₱648M','#E8EFEC','#183F40'),('SAM','Serviceable Available Market','180,000','50% × TAM (360,000 people)','₱27M','₱324M','#D9E9E2','#183F40'),('SOM','Serviceable Obtainable Market','120,000','10% × 1,200,000 people','₱18M','₱216M','#18594B','#FFFFFF')]
for i,(a,title,num,formula,mo,yr,bg,fg) in enumerate(rows):
 y=482-i*150
 box(486,y,742,132,bg)
 text(510,y+99,a,22,fg,True);text(580,y+102,title,13,fg)
 text(510,y+49,num,35,fg,True);text(510,y+23,'people  |  '+formula,12,fg)
 text(891,y+58,yr+' / year',26,fg,True)
c.showPage();c.save()
doc=PdfReader(out)
assert len(doc.pages)==1
s=doc.pages[0].extract_text()
for v in ['360,000','180,000','120,000','648M','324M','216M','₱1,800 per person / year']:assert v in s,v
assert 'month' not in s
assert 'ASSUMPTIONS' not in s
print(out)
