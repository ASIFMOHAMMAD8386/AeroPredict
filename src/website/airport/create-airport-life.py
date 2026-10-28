"""Original Blender airport activity assets, terminal upgrade and editable animation.
Run after opening aeropredict-airport-flight.blend. All input positions use x/y-up/z.
"""
import bpy, math, random, json, bmesh
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parent
base=bpy.data.scenes['AeroPredict Airport Flight']
lib=bpy.data.scenes.new('Airport Life Asset Library')
target=base
random.seed(29)
paint=bpy.data.materials.new('Airport life vertex colours');paint.use_nodes=True
bs=next(n for n in paint.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
bs.inputs['Roughness'].default_value=.48;bs.inputs['Metallic'].default_value=.12
vc=paint.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';paint.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
C={'navy':(.018,.046,.085),'blue':(.025,.22,.46),'cyan':(.015,.54,.65),'white':(.77,.83,.86),'black':(.009,.016,.023),'yellow':(.86,.58,.015),'lime':(.64,.95,.015),'skin':(.40,.21,.11),'steel':(.23,.32,.39),'red':(.7,.035,.017),'glass':(.025,.10,.15),'leaf':(.025,.13,.055),'bark':(.16,.095,.04)}
def v(p):return (p[0],-p[2],p[1])
def empty(name,parent=None,position=(0,0,0)):
 o=bpy.data.objects.new(name,None);target.collection.objects.link(o);o.parent=parent;o.location=v(position);return o
def mesh(name,verts,faces,col,parent=None):
 d=bpy.data.meshes.new(name);d.from_pydata([v(p) for p in verts],[],faces);d.update()
 o=bpy.data.objects.new(name,d);target.collection.objects.link(o);o.parent=parent;d.materials.append(paint)
 a=d.color_attributes.new(name='Color',type='BYTE_COLOR',domain='CORNER')
 for x in a.data:x.color=(*C.get(col,col)[:3],1) if isinstance(col,str) else (*col,1)
 return o
def box(name,p,size,col,parent=None):
 x,y,z=p;dx,dy,dz=[n/2 for n in size]
 vs=[(x+i*dx,y+j*dy,z+k*dz) for i,j,k in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 return mesh(name,vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(1,2,6,5),(0,4,7,3)],col,parent)
def rod(name,a,b,r,col,parent=None,n=10):
 a=Vector(a);b=Vector(b);axis=(b-a).normalized();ref=Vector((1,0,0)) if abs(axis.x)<.8 else Vector((0,1,0));u=axis.cross(ref).normalized();w=axis.cross(u)
 vs=[tuple(p+r*(math.cos(j*math.tau/n)*u+math.sin(j*math.tau/n)*w)) for p in [a,b] for j in range(n)]
 fs=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)]
 return mesh(name,vs,fs,col,parent)
def ball(name,p,r,col,parent=None):
 vs=[];fs=[]
 for i in range(7):
  for j in range(12):vs.append((p[0]+r*math.sin(i*math.pi/6)*math.cos(j*math.tau/12),p[1]+r*math.cos(i*math.pi/6),p[2]+r*math.sin(i*math.pi/6)*math.sin(j*math.tau/12)))
 for i in range(6):
  for j in range(12):fs.append((i*12+j,i*12+(j+1)%12,(i+1)*12+(j+1)%12,(i+1)*12+j))
 return mesh(name,vs,fs,col,parent)
def join(parts,name,parent=None):
 bpy.context.window.scene=target;bpy.ops.object.select_all(action='DESELECT')
 for p in parts:p.select_set(True)
 bpy.context.view_layer.objects.active=parts[0]
 if len(parts)>1:bpy.ops.object.join()
 o=parts[0];o.name=name;o.parent=parent;return o
def descendants(root):
 return [root]+[child for o in root.children for child in descendants(o)]
def export(path,roots):
 bpy.context.window.scene=target;bpy.ops.object.select_all(action='DESELECT')
 for root in roots:
  for o in descendants(root):o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/path),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_animations=False)
def text(content,p,size,parent):
 d=bpy.data.curves.new(content,'FONT');d.body=content;d.size=size;d.align_x='CENTER';d.extrude=.025
 o=bpy.data.objects.new('Terminal sign '+content,d);target.collection.objects.link(o);o.parent=parent;o.location=v(p);o.rotation_euler=(math.pi/2,0,-math.pi/2)
 m=bpy.data.materials.get('Airport White markings');d.materials.append(m);return o

# A darker, more detailed airfield with a second runway for background traffic.
for name,color in [('Airport Meadow',(.055,.105,.045)),('Airport Runway asphalt',(.025,.035,.050)),('Airport Apron concrete',(.25,.29,.31)),('Airport Roof aluminium',(.14,.22,.28)),('Airport Terminal glass',(.018,.08,.13))]:
 m=bpy.data.materials.get(name)
 if m:
  m.diffuse_color=(*color,1);next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color'].default_value=(*color,1)
addon=empty('AirportLifeArchitecture',bpy.data.objects['AirportDeparture']);static=[]
def sb(name,p,size,c):
 o=box(name,p,size,c,addon);static.append(o);return o
sb('Traffic runway 18L',(-240,-.015,0),(46,.2,2800),'navy')
sb('West parallel taxiway',(-120,-.02,-60),(22,.2,2520),'navy')
for zz in [-1080,650]:sb('Traffic runway exit',(-180,-.01,zz),(145,.2,25),'navy')
sb('Cargo apron',(-490,-.03,470),(480,.18,550),'steel')
for z in range(-1300,1301,55):
 sb('Traffic runway centre dash',(-240,.11,z),(.85,.025,24),'white')
 for x in [-265,-215]:sb('Traffic runway edge light',(x,.45,z),(.45,.7,.45),'yellow')
for x in [-262,-218]:sb('Traffic runway edge line',(x,.105,0),(.35,.025,2720),'white')
for z in [-1280,1280]:
 for dx in [-17,-13,-9,-5,5,9,13,17]:sb('Traffic threshold',(-240+dx,.12,z),(2,.025,28),'white')
for z in range(-1260,1260,30):sb('Taxi centreline',(-120,.115,z),(.35,.025,16),'yellow')
for zz in [650,-1080]:
 for x in range(-235,-120,12):sb('Exit taxi stripe',(x,.13,zz),(7,.02,.35),'yellow')
for zz in range(-370,380,20):
 sb('Apron service lane',(363,.13,zz),(8,.02,11),'navy')
 sb('Service lane dash',(363,.15,zz),(.22,.02,6),'white')
for z in range(-375,376,110):
 for x in [298,340]:sb('Stand safety boundary',(x,.15,z),(1,.03,54),'yellow')
sb('Cargo terminal',(-690,13,470),(85,26,500),'blue');sb('Cargo roof',(-690,27,470),(95,2,515),'steel')
for z in range(260,700,80):sb('Cargo roller door',(-646,10,z),(1,18,48),'navy')

# Curved roof, structural ribs, solar strips, numbered gates and terminal signage.
for z0 in range(-410,400,27):
 for i in range(12):
  x0=374+i*12;x1=x0+12
  y0=23+11*math.sin((x0-374)/144*math.pi);y1=23+11*math.sin((x1-374)/144*math.pi)
  o=mesh('Curved terminal roof',[(x0,y0,z0),(x1,y1,z0),(x1,y1,z0+26),(x0,y0,z0+26)],[(0,1,2,3)],'steel' if i%3 else 'navy',addon);static.append(o)
  if z0%3==0:
   o=rod('Roof rib',(x0,y0+.2,z0),(x1,y1+.2,z0),.23,'white',addon);static.append(o)
for z in range(-390,390,20):
 for x in [409,433,457,481]:
  y=23+11*math.sin((x-374)/144*math.pi)+.25
  sb('Solar roof panel',(x,y,z),(18,.22,13),'blue')
for i,z in enumerate([-330,-220,-110,0,110,220,330],1):
 sb('Gate glazed lounge',(378,8,z),(20,13,22),'glass');sb('Gate frame',(366,14.7,z),(1,1,23),'cyan')
 sb('Gate number sign',(364.8,10,z),(1,5,12),'navy');text(f'{i:02}',(364.2,8,z),3.5,addon)
text('A E R O P R E D I C T',(385.1,17,15),9,addon)
text('S O U T H   T E R M I N A L',(385.0,7,140),4.5,addon)
sb('Terminal entrance canopy',(530,8,-20),(46,1.5,210),'navy')
for zz in range(-110,101,35):sb('Entrance canopy column',(550,4,zz),(1.2,8,1.2),'white')
for zz in range(-450,451,45):
 x=580+(zz%3)*10
 static.append(rod('Palm tree trunk',(x,0,zz),(x+1.2,10,zz),.32,'bark',addon))
 for j in range(7):
  a=j*math.tau/7;end=(x+math.cos(a)*7,8.5,zz+math.sin(a)*7)
  static.append(mesh('Palm crown',[(x,11,zz),(end[0]-math.sin(a)*1.3,end[1],end[2]+math.cos(a)*1.3),(end[0]+math.sin(a)*1.3,end[1],end[2]-math.cos(a)*1.3)],[(0,1,2)],'leaf',addon))
for zz in [-365,-260,-150,-40,70,180,290,395]:
 sb('Apron equipment bay',(352,.16,zz),(14,.04,12),'navy')
 for k in [-5,5]:sb('Bay safety stripe',(352,.20,zz+k),(14,.02,.3),'yellow')
# Smoothly varying vertex-coloured terrain breaks up the old flat green field.
vs=[];colors=[];fs=[];nx=39;nz=63
for iz in range(nz):
 for ix in range(nx):
  x=-1100+ix*60;z=-1900+iz*65;vs.append((x,-.062,z));n=math.sin(x*.014)*math.sin(z*.011)*.5+.5;colors.append((.044+n*.018,.079+n*.035,.035+n*.014))
for iz in range(nz-1):
 for ix in range(nx-1):
  q=iz*nx+ix;fs.append((q,q+1,q+nx+1,q+nx))
terrain=mesh('Textured airfield meadow',vs,fs,C['leaf'],addon)
for poly in terrain.data.polygons:
 for li in poly.loop_indices:terrain.data.color_attributes['Color'].data[li].color=(*colors[terrain.data.loops[li].vertex_index],1)
static.append(terrain)
# Keep text as font objects; consolidate all painted architecture into one mesh.
join(static,'Airport life architecture',addon)

# Rigged, real-scale worker with safety vest, reflective strips and hand wands.
target=lib;bpy.context.window.scene=lib
crew=empty('CrewPrototype');body=[]
body += [box('Vest',(0,1.2,0),(.44,.57,.30),'lime'),box('Pelvis',(0,.91,0),(.35,.22,.27),'navy')]
for z in [-.157,.157]:
 for y in [1.03,1.27]:body.append(box('Reflective tape',(0,y,z),(.45,.045,.012),'white'))
 for x in [-.12,.12]:body.append(box('Reflective shoulder',(x,1.35,z),(.045,.25,.012),'white'))
body += [rod('Neck',(0,1.48,0),(0,1.57,0),.075,'skin'),ball('Head',(0,1.68,0),.145,'skin'),ball('Safety cap',(0,1.77,-.012),.15,'navy'),box('Cap brim',(0,1.78,.13),(.31,.035,.17),'navy')]
for x in [-.15,.15]:body.append(ball('Ear protection',(x,1.68,0),.065,'yellow'))
for x in [-.045,.045]:body.append(ball('Eye',(x,1.68,.137),.014,'black'))
join(body,'Crew uniform and head',crew)
for side,s in [('L',-1),('R',1)]:
 arm=empty('CrewArm'+side,crew,(s*.26,1.43,0))
 parts=[rod('Sleeve',(0,0,0),(s*.035,-.25,.02),.082,'lime'),rod('Forearm',(s*.035,-.25,.02),(0,-.49,.045),.060,'skin'),ball('Glove',(0,-.53,.045),.066,'white')]
 join(parts,'Crew arm '+side,arm)
 wand=rod('CrewWand'+side,(0,-.54,.045),(0,-.90,.045),.028,'red',arm)
 leg=empty('CrewLeg'+side,crew,(s*.11,.92,0))
 join([rod('Trouser leg',(0,0,0),(0,-.73,0),.082,'navy'),box('Safety boot',(0,-.84,.06),(.19,.15,.32),'black')],'Crew leg '+side,leg)

def vehicle(name,kind):
 root=empty(name);parts=[]
 def b(n,p,s,c):parts.append(box(n,p,s,c))
 def wheels(length,width,r=.45):
  for x in [-width/2,width/2]:
   for z in [-length*.30,length*.30]:parts.append(rod('Rubber wheel',(x-.16,r,z),(x+.16,r,z),r,'black',n=16))
 if kind=='tractor':
  b('Tow tractor chassis',(0,.65,0),(1.9,.6,3.1),'yellow');b('Tractor cab',(0,1.45,.4),(1.65,1.25,1.45),'yellow');b('Cab glass',(0,1.65,1.14),(1.4,.70,.04),'glass');b('Cab roof',(0,2.15,.4),(1.9,.13,1.65),'navy');wheels(3,2)
 elif kind=='cart':
  b('Baggage trolley deck',(0,.62,0),(1.8,.18,2.6),'steel');wheels(2.6,1.8,.26)
  for x,z,c in [(-.43,-.6,'blue'),(.42,-.55,'yellow'),(-.4,.55,'navy'),(.4,.5,'red')]:
   b('Luggage case',(x,1.0,z),(.72,.65,.85),c);b('Bag handle',(x,1.35,z),(.3,.04,.10),'black')
  parts.append(rod('Tow bar',(0,.55,1.3),(0,.48,2.5),.07,'steel'))
 elif kind=='bus':
  b('Apron bus body',(0,1.7,0),(2.8,2.7,9),'white');b('Bus lower stripe',(0,.95,0),(2.83,.48,9.02),'cyan');b('Bus roof',(0,3.15,0),(2.85,.2,9.1),'navy');wheels(9,2.8,.55)
  for x in [-1.42,1.42]:
   for z in [-3,-1.5,0,1.5,3]:b('Bus window',(x,2.25,z),(.03,1.05,1.15),'glass')
  b('Bus windshield',(0,2.2,4.51),(2.5,1.3,.03),'glass')
 elif kind=='car':
  b('Follow me car',(0,.85,0),(1.9,.8,4.1),'yellow');b('Car cabin',(0,1.55,-.15),(1.7,.75,2.2),'glass');b('Car roof',(0,1.95,-.15),(1.7,.12,1.8),'yellow');b('Warning beacon',(0,2.15,0),(.45,.2,.25),'yellow');wheels(4,1.9,.35)
 elif kind=='catering':
  b('Catering truck chassis',(0,.85,0),(2.5,.55,6.8),'white');b('Catering cab',(0,1.8,2.35),(2.45,2.0,1.9),'blue');b('Truck windscreen',(0,2.05,3.32),(2.1,1,.03),'glass');wheels(6.8,2.6,.5)
  parts.append(rod('Lift scissor A',(-.9,1.2,-2.1),(-.9,3.0,.8),.10,'steel'));parts.append(rod('Lift scissor B',(.9,1.2,.8),(.9,3,-2.1),.10,'steel'))
 join(parts,name+' body',root)
 if kind=='catering':
  platform=empty('CateringPlatform',root,(0,2.9,-.75));join([box('Catering lift cabin',(0,.95,0),(2.45,1.9,4.4),'white'),box('Catering cyan stripe',(0,.75,0),(2.48,.45,4.43),'cyan'),box('Service opening',(0,.95,-2.23),(1.7,1.35,.03),'navy')],'Catering lift body',platform)
 return root
tractor=vehicle('TractorPrototype','tractor');cart=vehicle('BaggageCartPrototype','cart');bus=vehicle('BusPrototype','bus');car=vehicle('FollowMePrototype','car');truck=vehicle('CateringPrototype','catering')
belt=empty('BeltLoaderPrototype');parts=[]
parts += [box('Conveyor base',(0,.5,0),(1.8,.45,5),'yellow')]
parts.append(mesh('Inclined conveyor rubber',[(-.72,.55,-4.5),(.72,.55,-4.5),(.72,2.1,4.5),(-.72,2.1,4.5),(-.72,.40,-4.5),(.72,.40,-4.5),(.72,1.95,4.5),(-.72,1.95,4.5)],[(0,1,2,3),(4,7,6,5),(0,4,5,1),(3,2,6,7),(0,3,7,4),(1,5,6,2)],'black'))
for x in [-.82,.82]:parts.append(rod('Conveyor rail',(x,.7,-4.5),(x,2.25,4.5),.06,'yellow'))
# Conveyor geometry tilts as one unit toward the aircraft hold.
join(parts,'Belt loader body',belt)
bag=empty('SuitcasePrototype');join([box('Suitcase',(0,.26,0),(.58,.50,.75),'blue'),box('Suitcase handle',(0,.55,0),(.2,.07,.10),'black')],'Suitcase body',bag)
# Background jet retains the authored airliner shape, with reduced mesh density.
hero=bpy.data.objects['AirportFlightAircraft']
def copy_tree(src,scene,parent=None,unique=False):
 o=src.copy();o.animation_data_clear()
 if src.type=='MESH' and unique:o.data=src.data.copy()
 scene.collection.objects.link(o);o.parent=parent
 for child in src.children:copy_tree(child,scene,o,unique)
 return o
traffic=copy_tree(hero,lib,unique=True);traffic.name='BackgroundJetPrototype';traffic.location=(0,0,0);traffic.rotation_euler=(0,0,0);traffic.scale=(1,1,1)
for o in descendants(traffic):
 if o.type=='MESH' and len(o.data.polygons)>700 and not o.name.startswith(('V2 Ceramic pearl paint','V2 Satin aluminium')):
  bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Traffic mesh optimisation','DECIMATE');mod.ratio=.22
  bpy.ops.object.modifier_apply(modifier=mod.name)
  o.data.validate(clean_customdata=False);o.data.update()
prototypes=[crew,tractor,cart,bus,car,truck,belt,bag,traffic]
export('aeropredict-airport-activity.glb',prototypes)

# Replace the old blocky parked jets with shared, optimised detailed airliners.
target=base;bpy.context.window.scene=base
dep=bpy.data.objects['AirportDeparture']
stands=[(322,z,math.pi/2) for z in [-330,-220,-110,0,110,220,330]]+[(220,z,0) for z in [-500,-420,435,515]]
for o in list(dep.children):
 if o.type!='MESH' or not o.data.materials:continue
 matname=o.data.materials[0].name
 if matname=='Airport Parked aircraft white':bpy.data.objects.remove(o,do_unlink=True);continue
 if matname not in ['Airport Airline navy','Airport Rubber']:continue
 o.data=o.data.copy();bm=bmesh.new();bm.from_mesh(o.data);remove=[]
 for vertex in bm.verts:
  w=o.matrix_world@vertex.co;x,y,z=w.x,w.z,-w.y
  if y<1.3 or y>12:continue
  for sx,sz,yaw in stands:
   if abs(x-sx)<(20 if yaw==0 else 20) and abs(z-sz)<20:remove.append(vertex);break
 bmesh.ops.delete(bm,geom=remove,context='VERTS');bm.to_mesh(o.data);bm.free();o.data.update()
for i,(x,z,yaw) in enumerate(stands):
 o=copy_tree(traffic,base,dep);o.name=f'Detailed gate aircraft {i+1:02}';o.location=v((x,4.1,z));o.rotation_euler=(0,0,yaw)
export('aeropredict-airport-v2.glb',[dep])
target=lib;bpy.context.window.scene=lib

# Editable Blender instances and animation. Website uses the same roles and routes.
target=base;bpy.context.window.scene=base
life=empty('Airport working crew and traffic')
def instance(proto,name,p,yaw=0):
 o=copy_tree(proto,base,life);o.name=name;o.location=v(p);o.rotation_euler=(0,0,yaw);return o
crew_positions=[(329,-206),(335,-205),(324,-202),(339,-211),(320,-199),(331,-199),(344,-211),(317,-210),(322,-245),(331,-246),(350,15),(349,24),(335,113),(342,115),(328,225),(337,228),(351,-324),(342,-320)]
for i,(x,z) in enumerate(crew_positions):
 o=instance(crew,f'Ground crew {i+1:02}',(x,.12,z),i*.8)
 for side,s in [('L',-1),('R',1)]:
  arm=next(c for c in o.children if c.name.startswith('CrewArm'+side));leg=next(c for c in o.children if c.name.startswith('CrewLeg'+side))
  for obj,amp in [(arm,.45),(leg,.32)]:
   for f,a in [(1,0),(10,s*amp),(20,0),(30,-s*amp),(40,0)]:obj.rotation_euler.x=a;obj.keyframe_insert(data_path='rotation_euler',frame=f)
   for layer in obj.animation_data.action.layers:
    for strip in layer.strips:
     for slot in obj.animation_data.action.slots:
      bagdata=strip.channelbag(slot)
      if bagdata:
       for fc in bagdata.fcurves:fc.modifiers.new('CYCLES')
  for wand in arm.children:
   if wand.name.startswith('CrewWand'):wand.hide_render=i not in [8,9]
instance(truck,'Catering truck at gate 02',(345,.1,-210),math.pi)
instance(belt,'Cargo belt at gate 02',(334,.1,-212.5),math.pi)
for i,z in enumerate([-350,-80,180]):
 o=instance(tractor,f'Moving baggage tractor {i}',(363,.1,z))
 for frame,zz in [(1,z),(800,z+210),(1600,z),(2400,z-170),(3700,z)]:o.location=v((363,.1,zz));o.keyframe_insert(data_path='location',frame=frame)
 for j in range(3):instance(cart,f'Baggage cart {i}-{j}',(363,.1,z-4-j*4))
instance(bus,'Terminal shuttle',(535,.12,-120));instance(car,'Airfield follow me',(350,.12,-310))
arriving=instance(traffic,'Background landing flight',(-240,115,-2220))
departing=instance(traffic,'Background departing flight',(-120,4.1,-700))
for obj,keys in [(arriving,[(1,(-240,115,-2220)),(220,(-240,4.1,-700)),(520,(-240,4.1,600)),(700,(-120,4.1,650)),(1000,(-120,4.1,300)),(3700,(-120,4.1,300))]),(departing,[(1,(-120,4.1,-700)),(500,(-120,4.1,-1080)),(700,(-240,4.1,-1080)),(1000,(-240,4.1,650)),(1300,(-240,250,3000)),(3700,(-240,1000,12000))])]:
 for frame,p in keys:obj.location=v(p);obj.keyframe_insert(data_path='location',frame=frame)
camera_data=bpy.data.cameras.new('Ground crew camera');camera_data.lens=37;camera_data.clip_end=20000
cam=bpy.data.objects.new('Ground crew camera',camera_data);base.collection.objects.link(cam);cam.location=v((341,5,-188));cam.rotation_euler=(Vector(v((330,1.1,-206)))-cam.location).to_track_quat('-Z','Y').to_euler();base.camera=cam
base.frame_set(1);base.render.resolution_x=1500;base.render.resolution_y=1000;base.render.resolution_percentage=80;base.render.filepath=str(OUT/'airport-life-crew.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'aeropredict-airport-living.blend'))
bpy.ops.render.render(write_still=True)
metadata={'crew_members':len(crew_positions),'background_runway_x':-240,'background_runway_metres':2800,'prototype_names':[p.name for p in prototypes],'style':'Original illustrative airport; all traffic and activity are simulated.'}
(OUT/'airport-life-metadata.json').write_text(json.dumps(metadata,indent=2))
print(json.dumps(metadata))
