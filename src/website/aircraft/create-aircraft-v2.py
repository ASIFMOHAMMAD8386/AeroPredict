"""Original AeroPredict passenger jet. Run in Blender. Dimensions are illustrative metres."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector, Matrix
OUT=Path(__file__).resolve().parent
OUT.mkdir(exist_ok=True)
scene=bpy.data.scenes.new('AeroPredict Airliner V2')
bpy.context.window.scene=scene
parts=[]
def mat(name,color,metal=0,rough=.35):
 m=bpy.data.materials.new(name);m.use_nodes=True
 n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 n.inputs['Base Color'].default_value=(*color,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough
 if 'Coat Weight' in n.inputs:n.inputs['Coat Weight'].default_value=.28
 m.diffuse_color=(*color,1)
 return m
white=mat('V2 Ceramic pearl paint',(.83,.87,.92),.16,.28)
belly=mat('V2 Warm grey belly',(.39,.46,.55),.24,.32)
navy=mat('V2 Midnight blue',(.012,.035,.09),.20,.29)
teal=mat('V2 Aviation cyan',(.015,.36,.54),.26,.26)
gold=mat('V2 Brushed champagne',(.69,.45,.17),.7,.28)
glass=mat('V2 Blue black glazing',(.007,.024,.043),.32,.13)
alloy=mat('V2 Satin aluminium',(.53,.61,.68),.83,.23)
dark=mat('V2 Intake graphite',(.012,.018,.024),.38,.36)
rubber=mat('V2 Panel seams',(.09,.13,.19),.12,.48)
red=mat('V2 Port red light',(.75,.008,.012),.08,.18)
green=mat('V2 Starboard green light',(.008,.55,.12),.08,.18)
def mesh(name,vs,fs,material,smooth=False):
 d=bpy.data.meshes.new(name);d.from_pydata(vs,[],fs);d.update()
 o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.data.materials.append(material);parts.append(o)
 for p in d.polygons:p.use_smooth=smooth
 return o
def loft(name,sections,material,cx=0,cz=0,n=64,caps=True):
 vs=[(cx+rx*math.cos(i*math.tau/n),y,cz+rz*math.sin(i*math.tau/n)) for y,rx,rz in sections for i in range(n)]
 fs=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(sections)-1) for i in range(n)]
 if caps:fs +=[tuple(reversed(range(n))),tuple((len(sections)-1)*n+i for i in range(n))]
 return mesh(name,vs,fs,material,True)
profile=[(-18.8,.025,.035),(-18.65,.28,.25),(-18.3,.63,.53),(-17.8,1.05,.86),(-17.1,1.42,1.24),(-16.1,1.78,1.68),(-14.8,1.96,1.98),(-12,1.98,2.02),(8.8,1.98,2.02),(11.5,1.80,1.84),(13.6,1.39,1.48),(15.1,.91,1.0),(16.5,.45,.53),(17.5,.14,.20),(18.1,.02,.04)]
def radius(y):
 def tangent(i,k):
  if i==0:return (profile[1][k]-profile[0][k])/(profile[1][0]-profile[0][0])
  if i==len(profile)-1:return (profile[-1][k]-profile[-2][k])/(profile[-1][0]-profile[-2][0])
  h0=profile[i][0]-profile[i-1][0];h1=profile[i+1][0]-profile[i][0]
  a=(profile[i][k]-profile[i-1][k])/h0;b=(profile[i+1][k]-profile[i][k])/h1
  if a*b<=0:return 0
  w0=2*h1+h0;w1=h1+2*h0
  return (w0+w1)/(w0/a+w1/b)
 for i,((y0,x0,z0),(y1,x1,z1)) in enumerate(zip(profile,profile[1:])):
  if y0<=y<=y1:
   t=(y-y0)/(y1-y0);h=y1-y0
   def component(k):
    return (2*t**3-3*t*t+1)*profile[i][k]+(t**3-2*t*t+t)*h*tangent(i,k)+(-2*t**3+3*t*t)*profile[i+1][k]+(t**3-t*t)*h*tangent(i+1,k)
   return component(1),component(2)
 return .02,.04
sections=[]
for j in range(len(profile)-1):
 for k in range(5):
  y=profile[j][0]+(profile[j+1][0]-profile[j][0])*k/5
  rx,rz=radius(y);sections.append((y,rx,rz))
sections.append(profile[-1])
body=loft('V2 sculpted fuselage',sections,white,n=80)
body.data.materials.append(belly)
for poly in body.data.polygons:
 if poly.center.z<-.65:poly.material_index=1

def hull(y,z,s,offset=.012):
 rx,rz=radius(y)
 return (s*(rx*math.sqrt(max(.001,1-(z/rz)**2))+offset),y,z)
def patch(name,corners,material,s):
 vs=[];steps=8
 # Corners are y,z pairs around a surface patch.
 for i in range(steps+1):
  u=i/steps
  lo=Vector(corners[0]).lerp(Vector(corners[1]),u);hi=Vector(corners[3]).lerp(Vector(corners[2]),u)
  for j in range(steps+1):
   co=lo.lerp(hi,j/steps);vs.append(hull(co.x,co.y,s,.018))
 fs=[(i*(steps+1)+j,(i+1)*(steps+1)+j,(i+1)*(steps+1)+j+1,i*(steps+1)+j+1) for i in range(steps) for j in range(steps)]
 return mesh(name,vs,fs if s>0 else [tuple(reversed(f)) for f in fs],material,True)
def seam(name,points,material=alloy,depth=.012,cyclic=True):
 d=bpy.data.curves.new(name,'CURVE');d.dimensions='3D';d.bevel_depth=depth;d.bevel_resolution=1
 sp=d.splines.new('POLY');sp.points.add(len(points)-1);sp.use_cyclic_u=cyclic
 for p,co in zip(sp.points,points):p.co=(*co,1)
 o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);d.materials.append(material);parts.append(o);return o
def rounded_outline(y,z,wy,hz,s,offset=.017):
 return [hull(y+wy*math.copysign(abs(math.cos(a))**.45,math.cos(a)),z+hz*math.copysign(abs(math.sin(a))**.45,math.sin(a)),s,offset) for a in [i*math.tau/32 for i in range(32)]]
def flat(name,points,thickness,material):
 n=len(points);vs=[(x,y,z+v*thickness/2) for v in [-1,1] for x,y,z in points]
 fs=[tuple(reversed(range(n))),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 o=mesh(name,vs,fs,material);m=o.modifiers.new('Soft manufacturing edges','BEVEL');m.width=.025;m.segments=2
 return o
def wing(name,stations,s,material):
 # NACA-like upper and lower surfaces, reducing thickness along the span.
 n=28;ring=2*n;vs=[]
 for x,lead,chord,z,ratio in stations:
  for i in range(ring):
   u=(1-math.cos(math.pi*(i if i<=n else 2*n-i)/n))/2
   thick=5*ratio*(.2969*math.sqrt(max(u,0))-.126*u-.3516*u*u+.2843*u**3-.1036*u**4)
   vs.append((s*x,lead+u*chord,z+(1 if i<=n else -1)*thick*chord))
 fs=[(j*ring+i,j*ring+(i+1)%ring,(j+1)*ring+(i+1)%ring,(j+1)*ring+i) for j in range(len(stations)-1) for i in range(ring)]
 fs +=[tuple(reversed(range(ring))),tuple((len(stations)-1)*ring+i for i in range(ring))]
 o=mesh(name,vs,fs,material,True)
 if s<0:
  for p in o.data.polygons:p.flip()
 return o
for s in [-1,1]:
 # Double stripe follows the rounded skin instead of floating away from it.
 for z0,z1,m in [(-.28,-.19,navy),(-.38,-.34,gold)]:
  vs=[hull(y,z,s,.015) for y in [-16+i*30/100 for i in range(101)] for z in [z0,z1]]
  mesh('V2 conforming livery stripe',vs,[(2*j,2*j+1,2*j+3,2*j+2) for j in range(100)],m,True)
 for i in range(37):
  y=-12.4+i*.63
  if any(abs(y-d)<.45 for d in [-12.8,11.3,-1.2,.4]):continue
  edge=rounded_outline(y,.67,.113,.172,s)
  centre=hull(y,.67,s,.019);vs=[centre]+edge
  fs=[(0,i+1,(i+1)%len(edge)+1) for i in range(len(edge))]
  mesh('V2 oval cabin glazing',vs,fs,glass)
  seam('V2 window gasket',edge,rubber,.009)
 for y in [-13.25,11.35]:
  outline=rounded_outline(y,.07,.36,.77,s,.025);seam('V2 passenger door outline',outline,rubber,.011)
  seam('V2 door handle',[hull(y-.13,.1,s,.035),hull(y+.13,.1,s,.035)],alloy,.022,False)
  patch('V2 door observation window',[(y-.10,.42),(y+.10,.42),(y+.10,.64),(y-.10,.64)],glass,s)
 for y in [-1.25,.4]:seam('V2 overwing emergency exit',rounded_outline(y,.30,.30,.46,s,.025),rubber,.012)
 # Four-section cockpit windshield hugs the changing nose cross-section.
 patch('V2 forward windscreen',[(-17.75,.38),(-17.05,.45),(-16.95,1.10),(-17.47,.91)],glass,s)
 patch('V2 cockpit side window',[(-16.96,.45),(-16.12,.49),(-16.12,1.13),(-16.84,1.11)],glass,s)
 patch('V2 cockpit rear pane',[(-16.01,.50),(-15.62,.55),(-15.68,1.10),(-16.01,1.13)],glass,s)
 seam('V2 radome seam',[hull(-17.9,z,s,.015) for z in [-.50+i*.94/18 for i in range(19)]],belly,.012,False)
 # Airfoil main wing, winglet and aft stabilizer.
 main=[(1.3,-3.15,7.0,-.72,.115),(3.5,-2.30,5.9,-.50,.105),(7.0,-.95,4.3,-.22,.09),(12,2.10,2.50,.16,.075),(16.9,5.15,1.28,.62,.06),(17.5,5.65,1.0,.75,.055)]
 wing('V2 swept airfoil wing',main,s,white)
 wing('V2 swept horizontal stabilizer',[(.55,11.0,4.2,.7,.09),(3.0,12.15,2.7,.85,.075),(6.6,14.35,1.1,1.05,.06)],s,white)
 flat('V2 blended wingtip',[(s*17.2,5.48,.70),(s*17.55,5.83,1.5),(s*17.85,6.15,2.55),(s*18.1,6.86,2.67),(s*17.62,6.65,.78)],.07,navy)
 flat('V2 wingtip cyan inset',[(s*17.60,6.02,1.12),(s*17.88,6.37,2.37),(s*18.02,6.70,2.40),(s*17.70,6.48,1.13)],.078,teal)
 # Flap and slat lines, with fairings under the trailing edge.
 for x0,x1,y0,y1 in [(2.2,7,-.45,1.0),(7.2,13,1.2,4.0),(13.2,16.7,4.1,5.9)]:
  seam('V2 wing slat seam',[(s*x0,y0,-.35+(x0/17)*.9),(s*x1,y1,-.35+(x1/17)*.9)],alloy,.016,False)
 for x,y,z in [(3.8,3.2,-.55),(6.8,3.6,-.28),(10.0,4.6,-.02)]:
  loft('V2 flap track fairing',[(y-.9,.06,.08),(y-.45,.16,.20),(y+.7,.14,.14),(y+1.4,.015,.02)],belly,s*x,z-.15,n=24)
 # Pylon places the nacelle forward of the wing with a visible structural attachment.
 flat('V2 engine pylon',[(s*5.5,-2.7,-.25),(s*6.1,-.7,-.18),(s*6.1,-.8,-1.18),(s*5.5,-3.8,-1.15)],.20,belly)
 cx=s*5.9;cz=-1.95
 loft('V2 nacelle cowling',[(-5.55,.98,.99),(-5.43,1.09,1.10),(-5.10,1.17,1.19),(-4.55,1.18,1.20),(-3.7,1.13,1.16),(-2.5,.96,1.02),(-1.6,.76,.82)],white,cx,cz,n=72,caps=False)
 loft('V2 rolled intake lip',[(-5.30,1.13,1.14),(-5.48,1.06,1.07),(-5.55,.98,.99),(-5.49,.91,.92),(-5.25,.91,.92)],alloy,cx,cz,n=80,caps=False)
 loft('V2 intake acoustic lining',[(-5.49,.91,.92),(-5.1,.88,.89),(-4.80,.86,.87)],dark,cx,cz,n=72,caps=False)
 loft('V2 fan dark backing',[(-4.81,.86,.87),(-4.77,.86,.87)],dark,cx,cz,n=64)
 for i in range(24):
  angle=i*math.tau/24
  stations=[(.19,0,-4.96),(.45,.10,-5.03),(.73,.20,-5.02),(.86,.28,-4.96)]
  vs=[]
  for rad,tw,y in stations:
   for da in [0,.11]:vs.append((cx+rad*math.cos(angle+tw+da),y,cz+rad*math.sin(angle+tw+da)))
  mesh('V2 swept titanium fan blade',vs,[(0,1,3,2),(2,3,5,4),(4,5,7,6)],alloy,True)
 loft('V2 inlet spinner',[(-5.26,.025,.025),(-5.15,.14,.14),(-4.92,.23,.23),(-4.78,.24,.24)],alloy,cx,cz,n=48)
 loft('V2 core exhaust',[(-1.74,.72,.78),(-1.2,.59,.63),(-.96,.48,.53)],dark,cx,cz,n=56,caps=False)
 loft('V2 exhaust ring',[(-1.60,.72,.78),(-1.44,.68,.74)],alloy,cx,cz,n=56,caps=False)
 loft('V2 exhaust plug',[(-1.40,.33,.34),(-.9,.25,.25),(-.43,.025,.025)],alloy,cx,cz,n=40)
 for yy in [-4.85,-2.25]:
  seam('V2 nacelle panel joint',[(cx+1.15*math.cos(i*math.tau/72),yy,cz+1.17*math.sin(i*math.tau/72)) for i in range(72)],belly,.008)
 # Wing navigation lenses.
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=(s*17.52,6.43,.88))
 o=bpy.context.object;o.name='V2 navigation lens';o.scale=(.09,.19,.08);o.data.materials.append(red if s<0 else green);parts.append(o)
 # Brand text is built as geometry for a self-contained GLB.
 d=bpy.data.curves.new('V2 fuselage wordmark','FONT');d.body='A E R O P R E D I C T';d.size=.43;d.extrude=.001;d.align_x='CENTER'
 o=bpy.data.objects.new('V2 fuselage wordmark',d);scene.collection.objects.link(o);o.location=(s*1.992,-7.3,.05)
 o.rotation_euler=Matrix(((0,s,0),(0,0,1),(s,0,0))).transposed().to_euler();d.materials.append(navy);parts.append(o)

# Swept vertical tail with a tapered cross-section.
vs=[(-.20,9.8,1.15),(-.10,13.18,6.3),(-.055,15.05,6.42),(-.12,16.45,.72),(.20,9.8,1.15),(.10,13.18,6.3),(.055,15.05,6.42),(.12,16.45,.72)]
fin=mesh('V2 swept vertical stabilizer',vs,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],navy)
bev=fin.modifiers.new('V2 tail edge radii','BEVEL');bev.width=.04;bev.segments=2
for s in [-1,1]:
 mesh('V2 tail cyan chevron',[(s*.18,11.55,1.5),(s*.11,13.75,5.52),(s*.075,14.55,5.7),(s*.15,12.8,1.5)],[(0,1,2,3)],teal)
 mesh('V2 tail gold chevron',[(s*.19,12.85,1.50),(s*.095,14.55,5.15),(s*.08,14.85,5.25),(s*.14,13.35,1.5)],[(0,1,2,3)],gold)
 seam('V2 rudder hinge',[(s*.135,15.62,1.2),(s*.065,14.72,6.10)],alloy,.014,False)
 # Dorsal antennas and retracted gear bay seams.
flat('V2 dorsal aerial',[(0,-4.1,1.99),(0,-3.95,2.40),(0,-3.45,2.08),(0,-3.3,2.0)],.09,white)
flat('V2 aft aerial',[(0,5.3,1.98),(0,5.48,2.26),(0,5.9,2.01)],.07,white)
seam('V2 nose gear door seam',[(-.30,-14.3,-1.75),(-.30,-11.4,-1.98),(.30,-11.4,-1.98),(.30,-14.3,-1.75)],belly,.013)

# Apply modifiers and consolidate material groups for browser rendering.
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=body
bpy.ops.object.convert(target='MESH')
for o in list(bpy.context.selected_objects):
 bpy.context.view_layer.objects.active=o
 for modifier in list(o.modifiers):
  bpy.ops.object.modifier_apply(modifier=modifier.name)
for material in [white,belly,navy,teal,gold,glass,alloy,dark,rubber,red,green]:
 group=[o for o in scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==material and o!=body]
 if not group:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in group:o.select_set(True)
 bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();group[0].name=material.name
aircraft=[o for o in scene.objects if o.type=='MESH']
for o in aircraft:
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 # Recalculate outward normals after mirrored procedural construction.
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='DESELECT')
for o in aircraft:o.select_set(True)
bpy.context.view_layer.objects.active=body
root=bpy.data.objects.new('AeroPredict V2 Airliner',None);scene.collection.objects.link(root)
for o in aircraft:o.parent=root
root.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'aeropredict-airliner-v2.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True)

# Separate studio objects are excluded from the exported aircraft.
world=bpy.data.worlds.new('V2 dark studio');world.use_nodes=True;scene.world=world
n=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');n.inputs['Color'].default_value=(.025,.037,.060,1);n.inputs['Strength'].default_value=.45
def area(name,location,power,size):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size
 o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=location;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
area('V2 key',(14,-22,30),12000,22);area('V2 cool rim',(-24,12,20),16000,18);area('V2 front fill',(-6,-30,7),6500,15)
data=bpy.data.cameras.new('V2 presentation camera');cam=bpy.data.objects.new('V2 presentation camera',data);scene.collection.objects.link(cam)
cam.location=(35,-47,26);cam.rotation_euler=(Vector((0,0,.5))-cam.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=53;scene.camera=cam
scene.render.resolution_x=1500;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.render.filepath=str(OUT/'aircraft-v2-render.png')
try:scene.render.engine='BLENDER_EEVEE'
except TypeError:pass
scene.view_settings.view_transform='AgX'
for a in bpy.context.screen.areas:
 if a.type=='VIEW_3D':a.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'aeropredict-airliner-v2.blend'))
report={'meshes':len(aircraft),'faces':sum(len(o.data.polygons) for o in aircraft),'glb':str(OUT/'aeropredict-airliner-v2.glb'),'blend':str(OUT/'aeropredict-airliner-v2.blend'),'dimensions_m':[36.2,36.9,9.5]}
(OUT/'aircraft-v2-metadata.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
