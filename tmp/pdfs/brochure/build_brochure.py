from pathlib import Path
from os import environ
from PIL import Image, ImageOps
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT

ROOT=Path('/Users/mclein/Documents/Developer/Personal_Projects/AdvanCare')
OUT=ROOT/'output/pdf'; TMP=ROOT/'tmp/pdfs/brochure'
# Set ADVANCARE_FONT_DIR to the directory containing the four font files below.
FONTS=Path(environ.get('ADVANCARE_FONT_DIR', str(TMP/'fonts')))
for name,file in [('Body','InstrumentSans-Regular.ttf'),('Bold','InstrumentSans-Bold.ttf'),('Display','BricolageGrotesque-Bold.ttf'),('Serif','Lora-Italic.ttf')]:
 pdfmetrics.registerFont(TTFont(name,str(FONTS/file)))
OUT.mkdir(exist_ok=True,parents=True)
(OUT/'AdvanCare-brochure-design-notes.md').write_text('''# Care, Connected

Human dignity sets the scale. Portraits occupy generous, carefully framed spaces, while small captions preserve the context of each image. The patient's journey gives the composition its emotional center; no visual element treats people as decoration.

Blue conveys trust and green conveys continuity. Warm white creates breathing room between them. The palette is meticulously crafted around the existing identity, with a restrained golden accent reserved for the subscription hierarchy.

A steady three-column rhythm makes the folded object legible. Each panel has one clear purpose. Painstaking attention to alignment, line lengths, and the intervals between sections keeps the reader moving naturally from experience to problem to response.

Large, warm display lettering and quiet body text balance confidence with accessibility. This master-level execution depends on restraint: concise copy, authentic source imagery, and exact spacing rather than ornament. The continuous care loop becomes a subtle connecting thread.

## Production and source notes
- Source: supplied AdvanCare.pdf, especially slides 2, 3, 5, 6 and 8.
- Patient-experience illustrations are the same four pictures from slide 2. They are identified as an illustrative persona, matching the source caption; no invented patient testimonial is used.
- Two-sided A4 landscape, six equal panels. Page 1: outside, with front cover at right. Page 2: inside, read left to right.
- 3 mm bleed is included; PDF TrimBox identifies the A4 finished size. Fold at one-third and two-thirds of the trimmed sheet. Tiny fold ticks sit outside the trim.
- Print two-sided at 100%, landscape, flip on the short edge. Commercial printers should use the trim box; request a paper folding proof before a full print run.
- Full plan prices: Silver PHP 1,800/year; Gold PHP 3,000/year; Platinum PHP 4,200/year. Monthly figures are annual equivalents, not an added fee. Proposed household shares assume 50% LGU subsidy and LGU participation.
- Services are presented as the proposed product ecosystem, consistent with the presentation. Subscription membership is distinct from individual caregiver shift charges.
- Contact panel: Fernando M. Jaminola Jr., Program Leader, from slide 18; Cagayan State University - Carig Campus, requested by the user. CSU logo supplied by the user in images.png; university and campus details retained; college name removed at user request. Corporate address supplied by the user: Springleaf, 57 Zone 2, Maharlika Highway, Alimannao, Penablanca PH 3502. Phone/email supplied by the user: fjaminola@gmail.com; 09566699710.
- Statistical claims are attributed to the supplied presentation, not independently re-verified or presented as current-year statistics.
''')
W,H=841.8898,595.2756; B=8.50394; P=W/3; M=22
NAVY='#083B69'; BLUE='#087BB7'; GREEN='#008D69'; INK='#163F48'; MUTED='#536E73'; MINT='#E8F5EE'; PALE='#EAF5FB'; PAPER='#FAFCF9'; GOLD='#BA8532'
source=Image.open(TMP/'original-2-0.png')
csu=Image.open('/Users/mclein/Downloads/images.png')
csu.crop(csu.getbbox()).save(TMP/'csu-logo.png')
boxes=[(25,130,373,373),(386,130,731,373),(25,380,373,611),(386,380,731,611)]
photos=[]
for i,box in enumerate(boxes):
 f=TMP/f'patient-{i+1}.png';source.crop(box).save(f);photos.append(f)
# Landscape illustration from source: no headline or slide text.
source.crop((0,838,1671,941)).save(TMP/'landscape.png')
source.crop((88,130,373,373)).save(TMP/'cover-patient.png')
sol=Image.open(TMP/'original-5-0.png');sol.crop((845,550,1200,786)).save(TMP/'follow-up.png')
c=canvas.Canvas(str(OUT/'AdvanCare-brochure.pdf'),pagesize=(W+2*B,H+2*B))
c.setTitle('AdvanCare | Care closer to every community');c.setAuthor('AdvanCare');c.setSubject('Patient experience, problem statement, proposed solution and subscription plans')
def rect(x,y,w,h,color,r=0,stroke=None):
 c.setFillColor(HexColor(color));c.setStrokeColor(HexColor(stroke or color))
 if r:c.roundRect(x,H-y-h,w,h,r,fill=1,stroke=bool(stroke))
 else:c.rect(x,H-y-h,w,h,fill=1,stroke=bool(stroke))
def text(t,x,y,size=10,font='Body',color=INK):
 c.setFillColor(HexColor(color));c.setFont(font,size);c.drawString(x,H-y-size*.82,t)
def para(t,x,y,w,size=10,color=INK,font='Body',leading=None):
 style=ParagraphStyle('p',fontName=font,fontSize=size,leading=leading or size*1.32,textColor=HexColor(color),spaceAfter=0)
 p=Paragraph(t,style);aw,ah=p.wrap(w,1000);p.drawOn(c,x,H-y-ah);return y+ah

def image(file,x,y,w,h):
 im=Image.open(file).convert('RGB');im=ImageOps.fit(im,(int(w*3),int(h*3)),method=Image.Resampling.LANCZOS,centering=(0,0))
 c.drawImage(ImageReader(im),x,H-y-h,w,h,mask='auto')
def brand(x,y,scale=1,white=False):
 c.drawImage(str(ROOT/'frontend/src/assets/logo-emblem.png'),x,H-y-34*scale,34*scale,34*scale,mask='auto',preserveAspectRatio=True)
 text('Advan',x+40*scale,y+5*scale,21*scale,'Display','#FFFFFF' if white else NAVY)
 a=pdfmetrics.stringWidth('Advan','Display',21*scale)
 text('Care',x+40*scale+a,y+5*scale,21*scale,'Display','#FFFFFF' if white else GREEN)
def eyebrow(t,x,y,color=GREEN):text(t.upper(),x,y,8.2,'Bold',color)
def footer(n,x,color=MUTED):text(f'ADVANCARE  /  {n}',x,566,7,'Bold',color)
def newpage():
 c.setTrimBox((B,B,W+B,H+B));c.setBleedBox((0,0,W+2*B,H+2*B));c.saveState();c.translate(B,B)
 rect(-B,-B,W+2*B,H+2*B,PAPER)
def finish():
 c.setStrokeColor(HexColor('#93A6A5'));c.setLineWidth(.35)
 for x in [P,2*P]:
  c.line(x,-6,x,-2);c.line(x,H+2,x,H+6)
 c.restoreState();c.showPage()

# OUTSIDE: rear flap / back panel / front cover.
newpage()
# Left flap: plans.
x=M; width=P-2*M
eyebrow('Subscription plans',x,26)
para('A plan for<br/>every family.',x,45,width,25,NAVY,'Display',27)
para('Accessible care. Healthier communities.',x,108,width,10,MUTED)
plans=[('SILVER','1,800','150','75',BLUE,PALE),('GOLD','3,000','250','125',GOLD,'#FBF3E4'),('PLATINUM','4,200','350','175',GREEN,MINT)]
for i,(name,annual,monthly,share,col,bg) in enumerate(plans):
 y=140+i*96
 rect(x,y,width,85,bg,9)
 rect(x,y,4,85,col,2)
 text(name,x+13,y+10,8.5,'Bold',col)
 text('PHP '+annual,x+13,y+27,22,'Display',NAVY)
 text('/ year',x+145,y+34,9,'Body',MUTED)
 text('PHP '+monthly+' / month equivalent',x+13,y+54,8.6,'Body')
 text('Household share: PHP '+share+' / month*',x+13,y+68,8,'Bold',col)
para('Across all plans',x,441,width,10,GREEN,'Bold')
para('Care Assistant • TeleHealth services<br/>MediBox • Discounts on vitamins and medical supplies',x,458,width,9.3,INK,leading=13)
para('*Proposed 50% LGU subsidy. Household shares depend on LGU participation. Individual services may carry separate charges.',x,514,width,7.6,MUTED,leading=10)
footer('PLANS',x)
# Center back: mission and care ecosystem.
x=P+M
rect(P+8,15,P-16,H-30,MINT,12)
brand(x,27,.8)
eyebrow('The proposed care ecosystem',x,88)
para('One closed<br/>care loop.',x,107,width,29,NAVY,'Display',31)
para('Community-driven. Technology-enabled.<br/>People-centered.',x,182,width,10,GREEN,'Bold',14)
items=[('01','Local care','RHU and barangay teams connect residents to care.'),('02','Reliable transport','Scheduled, non-emergency rides connect home and health facilities.'),('03','MediBox & TeleHealth','Out-of-hospital assessment and remote consultation support continuity.')]
y=218
for num,title,body in items:
 rect(x,y,26,26,'#FFFFFF',13);text(num,x+7,y+7,9,'Bold',GREEN)
 text(title,x+36,y+1,12,'Bold',NAVY)
 para(body,x+36,y+20,width-36,9.5,INK,leading=13)
 y+=54
rect(x,394,width,163,'#FFFFFF',8)
c.drawImage(str(TMP/'csu-logo.png'),x+11,H-401-45,44,45,mask='auto',preserveAspectRatio=True)
eyebrow('Contact person',x+65,405)
para('Cagayan State University<br/>Carig Campus',x+65,419,width-76,10,NAVY,'Bold',12)
text('Fernando M. Jaminola Jr.',x+12,452,11,'Bold',NAVY)
text('fjaminola@gmail.com',x+12,472,9,'Bold',GREEN)
text('09566699710',x+12,488,9,'Bold',GREEN)
eyebrow('Corporate address',x+12,510)
para('Springleaf, 57 Zone 2, Maharlika Highway,<br/>Alimannao, Penablanca PH 3502',x+12,525,width-24,8.5,INK,leading=11)
c.linkURL('mailto:fjaminola@gmail.com',(x+12,H-483,x+132,H-470),relative=0,thickness=0)
c.linkURL('tel:+639566699710',(x+12,H-499,x+112,H-486),relative=0,thickness=0)
footer('CAGAYAN PROVINCE',x)
# Front cover.
x=2*P+M
brand(x,32,.72)
c.drawImage(str(TMP/'cagayan-seal.png'),x+147,H-25-37,37,37,mask='auto',preserveAspectRatio=True)
c.drawImage(str(TMP/'additional-seal.png'),x+197,H-25-37,37,37,mask='auto',preserveAspectRatio=True)
eyebrow('AI-enabled healthcare management',x,88)
para('Care closer<br/>to every<br/>community.',x,112,width,35,NAVY,'Display',36)
para('Connecting families to accessible,<br/>affordable, coordinated care in Cagayan.',x,237,width,10.4,MUTED,leading=14)
image(TMP/'cover-patient.png',x,287,width,164)
rect(x,451,width,70,NAVY)
para('From lived experience<br/>to connected care.',x+13,464,width-26,17,'#FFFFFF','Display',20)
text('FOR FAMILIES. WITH COMMUNITIES.',x,544,8,'Bold',GREEN)
footer('PROPOSED SERVICE MODEL',x)
finish()

# INSIDE: experience / problem / solution.
newpage()
for i in [1,2]:rect(i*P,20,.6,H-40,'#DCE8E3')
# Experience.
x=M
eyebrow('01 / Our lived patient experience',x,26)
para('A journey<br/>we witnessed.',x,46,width,27,NAVY,'Display',29)
para('An aging farmer’s route to care can mean more than one difficult trip.',x,117,width,10.3,MUTED,leading=14)
gap=7;pw=(width-gap)/2;ph=95
for i,f in enumerate(photos): image(f,x+(i%2)*(pw+gap),167+(i//2)*102,pw,ph)
para('Patient → Tricycle / kuliglig → RHU → Medicines',x,376,width,9.5,GREEN,'Bold',13)
para('Distance, travel costs, waiting, and another stop for medicines can turn a routine visit into a demanding journey.',x,415,width,10.5,INK,leading=14.5)
rect(x,480,width,58,PALE,8)
para('“Access, affordability, and follow-up<br/>must work together.”',x+12,491,width-24,11,NAVY,'Serif',15)
para('Source-slide illustrations show a typical rural persona; they are not photographs of an identified patient.',x,548,width,7,MUTED,leading=9)
# Problem.
x=P+M
eyebrow('02 / The problem',x,26)
para('Care exists.<br/>Access still<br/>falls short.',x,46,width,27,NAVY,'Display',29)
para('In Cagayan, care can be hard to access, afford, and coordinate.',x,145,width,10.3,MUTED,leading=14)
problems=[('Trusted care is hard to find.','Families struggle to find and match screened caregivers.'),('Care is costly and far away.','Transport and out-of-hospital expenses strain rural households.'),('Support is fragmented.','Bookings, records, updates, and payments are scattered. Follow-up can break after discharge.')]
y=198
for i,(title,body) in enumerate(problems):
 text('0'+str(i+1),x,y+1,10,'Bold',GREEN)
 end=para(title,x+28,y,width-28,11.8,NAVY,'Bold',14)
 end=para(body,x+28,end+7,width-28,9.5,INK,leading=13)
 y=end+19
cw=(width-7)/2
rect(x,392,cw,51,PALE,7);rect(x+cw+7,392,cw,51,MINT,7)
text('57 years',x+10,400,16,'Display',NAVY)
para('Median age of<br/>Filipino farmers',x+10,420,cw-20,7.6,INK,leading=9)
text('31%',x+cw+17,400,16,'Display',GREEN)
para('Farmers in poverty<br/>in 2018',x+cw+17,420,cw-20,7.6,INK,leading=9)
rect(x,454,width,78,NAVY,9)
text('56%',x+13,467,34,'Display','#FFFFFF')
para('of Cagayan deaths in 2020 had no medical attendant.',x+97,468,width-111,10,'#FFFFFF',leading=13)
para('Historical figures from the presentation.<br/>Sources cited there: PSA (2020; 2018), and<br/>DA via PCO (farmer median age).',x,543,width,7.3,MUTED,leading=10)
# Solution.
x=2*P+M
eyebrow('03 / The proposed solution',x,26)
para('Connect.<br/>Coordinate.<br/>Continue care.',x,46,width,27,NAVY,'Display',29)
para('An integrated, community-based ecosystem linking people, services, and communities across Cagayan.',x,146,width,10.2,MUTED,leading=14)
steps=[('1','Connect in local language','Link residents to trusted local healthcare and caregiving support.'),('2','Match & track','Match needs with caregivers or health professionals. Keep appointments, records, and payments connected.'),('3','Follow up','Use reminders, updates, and post-visit coordination to support continuity.'),('4','Improve community care','Use health trends to help anticipate community needs and strengthen local services.')]
y=215
for num,title,body in steps:
 rect(x,y,25,25,GREEN,12.5);text(num,x+9,y+6,11,'Bold','#FFFFFF')
 end=para(title,x+36,y,width-36,11.4,NAVY,'Bold',14)
 end=para(body,x+36,end+6,width-36,9.3,INK,leading=12.6)
 y=end+18
rect(x,529,width,32,MINT,6)
para('One coordinated journey. Care that continues.',x+10,538,width-20,9.1,GREEN,'Bold',12)
finish()
c.save()
print(OUT/'AdvanCare-brochure.pdf')
