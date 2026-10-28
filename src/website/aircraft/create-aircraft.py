import bpy, math, json
from pathlib import Path
from mathutils import Vector
out=Path(__file__).resolve().parent
out.mkdir(exist_ok=True)
scene=bpy.data.scenes.new('AeroPredict_Aircraft')
bpy.context.window.scene=scene
def material(name,color,metal=0,rough=.35):
 m=bpy.data.materials.new(name);m.use_nodes=True
 n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough
 return m
white=material('Pearl white airframe',(.78,.83,.88),.22,.24)
navy=material('Midnight blue livery',(.018,.065,.14),.4,.25)
glass=material('Cockpit and cabin glazing',(.009,.025,.045),.55,.16)
silver=material('Polished aluminium',(.54,.62,.68),.85,.23)
dark=material('Engine interior',(.023,.03,.038),.35,.4)
blue=material('Blue livery stripe',(.02,.3,.66),.4,.24)
red=material('Port navigation light',(.8,.015,.01),.1,.2)
green=material('Starboard navigation light',(.015,.65,.2),.1,.2)
objects=[]
def mesh(name,verts,faces,mat,smooth=False):
 data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update();obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.data.materials.append(mat)
 if smooth:
  for p in data.polygons:p.use_smooth=True
 objects.append(obj);return obj
def loft(name,sections,mat,cx=0,cz=0,n=64,caps=True):
 verts=[(cx+rx*math.cos(i*2*math.pi/n),y,cz+rz*math.sin(i*2*math.pi/n)) for y,rx,rz in sections for i in range(n)]
 faces=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(sections)-1) for i in range(n)]
 if caps:faces +=[tuple(reversed(range(n))),tuple((len(sections)-1)*n+i for i in range(n))]
 return mesh(name,verts,faces,mat,True)
profiles=[(-5.65,.015,.025),(-5.5,.16,.14),(-5.25,.32,.28),(-4.9,.45,.40),(-4.4,.55,.52),(-3.8,.59,.59),(-3,.60,.61),(2.7,.6,.61),(3.5,.55,.55),(4.2,.43,.43),(4.8,.28,.28),(5.35,.10,.13),(5.6,.025,.04)]
body=loft('Airframe',profiles,white)
def radius(y):
 for (y0,r0,z0),(y1,r1,z1) in zip(profiles,profiles[1:]):
  if y0<=y<=y1:
   t=(y-y0)/(y1-y0);return (r0+(r1-r0)*t,z0+(z1-z0)*t)
 return (.6,.61)
def slab(name,points,thickness,mat):
 verts=[(x,y,z+side*thickness/2) for side in [-1,1] for x,y,z in points];n=len(points)
 faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 ob=mesh(name,verts,faces,mat);mod=ob.modifiers.new('Rounded engineered edges','BEVEL');mod.width=.025;mod.segments=3
 return ob
for side in [-1,1]:
 slab('Swept main wing',[(side*.42,-.8,-.12),(side*2.5,.5,-.03),(side*5.05,2.65,.16),(side*5.15,3.13,.20),(side*2.7,2.15,.02),(side*.45,1.9,-.12)],.11,white)
 slab('Wingtip sharklet',[(side*5.02,2.65,.17),(side*5.22,2.78,.9),(side*5.4,3.23,1.03),(side*5.14,3.15,.19)],.045,navy)
 slab('Horizontal stabilizer',[(side*.3,3.8,.17),(side*1.95,4.72,.31),(side*2.15,5.12,.32),(side*.2,4.95,.2)],.075,white)
 slab('Engine pylon',[(side*1.6,-.25,-.15),(side*1.8,.45,-.15),(side*1.8,.5,-.58),(side*1.6,-.2,-.58)],.12,silver)
 # Rounded hollow nacelle and intake lip, nose is negative Y.
 cx=side*1.75;cz=-.72
 loft('Turbofan nacelle',[(-1.1,.35,.35),(-1.04,.39,.39),(-.9,.42,.42),(-.3,.42,.42),(.45,.33,.33),(.65,.24,.24)],white,cx,cz,caps=False)
 loft('Metal intake lip',[(-.96,.405,.405),(-1.1,.35,.35),(-1.08,.315,.315),(-.88,.32,.32)],silver,cx,cz,caps=False)
 loft('Intake dark throat',[(-1.07,.315,.315),(-.72,.30,.30)],dark,cx,cz,caps=False)
 loft('Fan backing',[(-.71,.30,.30),(-.67,.30,.30)],dark,cx,cz,n=48)
 loft('Spinner cone',[(-.99,.012,.012),(-.83,.07,.07),(-.70,.11,.11)],silver,cx,cz,n=32)
 for i in range(20):
  a=2*math.pi*i/20
  pts=[(cx+r*math.cos(a+twist),y,cz+r*math.sin(a+twist)) for r,twist,y in [(.09,0,-.74),(.29,.17,-.75),(.30,.27,-.70),(.10,.16,-.69)]]
  mesh('Fan blade',pts,[(0,1,2,3)],silver)
 loft('Exhaust dark core',[(.5,.24,.24),(.78,.2,.2)],dark,cx,cz,n=40,caps=False)
 loft('Exhaust cone',[(.55,.15,.15),(.95,.025,.025)],silver,cx,cz,n=32)
 # Glazed oval cabin windows follow the cylindrical fuselage surface.
 for i in range(30):
  y=-3.55+i*.205;rx,rz=radius(y);z=.20
  x=side*(rx*math.sqrt(1-(z/rz)**2)+.006)
  bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=(x,y,z));o=bpy.context.object;o.name='Cabin window';o.scale=(.012,.057,.079);o.data.materials.append(glass);objects.append(o)
  for poly in o.data.polygons:poly.use_smooth=True
 # Thin blue accent below the windows, conforming to the body.
 verts=[]
 for j in range(70):
  y=-4+j*8.2/69;rx,rz=radius(y)
  for z in [-.025,.025]:verts.append((side*(rx*math.sqrt(1-(z/rz)**2)+.008),y,z))
 mesh('Livery stripe',verts,[(j*2,j*2+1,j*2+3,j*2+2) for j in range(69)],blue)
 for y in [-3.85,2.95]:
  # Door outline drawn as a thin curve around a rounded rectangle on the hull.
  points=[]
  for j in range(49):
   a=2*math.pi*j/48;yy=y+.145*math.copysign(abs(math.cos(a))**.3,math.cos(a));z=.02+.38*math.copysign(abs(math.sin(a))**.3,math.sin(a));rx,rz=radius(yy);x=side*(rx*math.sqrt(max(.01,1-(z/rz)**2))+.01);points.append((x,yy,z))
  curve=bpy.data.curves.new('Door seam','CURVE');curve.dimensions='3D';curve.bevel_depth=.006;curve.bevel_resolution=2;spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
  for p,co in zip(spline.points,points):p.co=(*co,1)
  obj=bpy.data.objects.new('Passenger door',curve);scene.collection.objects.link(obj);curve.materials.append(silver);objects.append(obj)
 # Cockpit panels on the upper front taper.
 for ys in [(-4.94,-4.59),(-4.56,-4.15)]:
  pts=[];faces=[]
  for j in range(9):
   t=j/8;y=ys[0]+(ys[1]-ys[0])*t
   for k in range(7):
    z=(.18+.05*t)*(1-k/6)+(.32+.12*t)*k/6
    rx,rz=radius(y);z=min(z,rz*.9)
    pts.append((side*(rx*math.sqrt(1-(z/rz)**2)+.025),y,z))
  for j in range(8):
   for k in range(6):
    face=(j*7+k,(j+1)*7+k,(j+1)*7+k+1,j*7+k+1)
    faces.append(face if side>0 else tuple(reversed(face)))
  mesh('Cockpit glazing',pts,faces,glass)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=(side*5.16,3.08,.24));o=bpy.context.object;o.name='Navigation light';o.scale=(.045,.07,.045);o.data.materials.append(red if side<0 else green);objects.append(o)
# Tail fin has a genuine swept silhouette with a broad root.
finVerts=[(-.065,3.15,.38),(-.045,4.2,2.18),(-.035,5.03,2.3),(-.05,5.38,.26),(.065,3.15,.38),(.045,4.2,2.18),(.035,5.03,2.3),(.05,5.38,.26)]
fin=mesh('Vertical stabilizer',finVerts,[(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],navy)
bev=fin.modifiers.new('Tail edge finish','BEVEL');bev.width=.025;bev.segments=3
for side in [-1,1]:mesh('Tail blue accent',[(side*.07,3.75,.65),(side*.055,4.50,1.9),(side*.045,4.82,1.94),(side*.065,4.13,.65)],[(0,1,2,3)],blue)
# Join by material after applying bevels and curve conversion for efficient web draws.
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=body
bpy.ops.object.convert(target='MESH')
for o in list(bpy.context.selected_objects):
 bpy.context.view_layer.objects.active=o
 for m in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=m.name)
objects=list(bpy.context.selected_objects)
for mat in [white,navy,glass,silver,dark,blue,red,green]:
 group=[o for o in list(scene.objects) if o.type=='MESH' and o.data.materials and o.data.materials[0]==mat]
 if not group:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in group:o.select_set(True)
 bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();group[0].name='Aircraft '+mat.name
bpy.ops.object.select_all(action='SELECT')
aircraft=list(bpy.context.selected_objects)
bpy.ops.export_scene.gltf(filepath=str(out/'aeropredict-airliner.glb'),use_selection=True,use_active_scene=True,export_apply=True)
# Studio lighting and an orthographic three-quarter render.
world=bpy.data.worlds.new('Aircraft studio');world.use_nodes=True;scene.world=world
background=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');background.inputs['Color'].default_value=(.025,.04,.065,1);background.inputs['Strength'].default_value=.45
def area(name,position,power,size):
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=position;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
area('Key softbox',(3,-6,9),1800,8);area('Rim softbox',(-7,4,6),2200,7);area('Front fill',(1,-10,2),900,5)
data=bpy.data.cameras.new('Aircraft presentation');cam=bpy.data.objects.new('Aircraft presentation',data);scene.collection.objects.link(cam);cam.location=(11,-14,7);cam.rotation_euler=(Vector((0,0,.15))-cam.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=14;scene.camera=cam
scene.render.resolution_x=1500;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False;scene.render.filepath=str(out/'aircraft-render.png')
for areaObj in bpy.context.screen.areas:
 if areaObj.type=='VIEW_3D':areaObj.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=str(out/'aeropredict-airliner.blend'))
print(json.dumps({'blend':str(out/'aeropredict-airliner.blend'),'glb':str(out/'aeropredict-airliner.glb'),'mesh_objects':len(aircraft),'faces':sum(len(o.data.polygons) for o in aircraft)}))
