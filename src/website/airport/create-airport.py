"""Build the original AeroPredict airport, web assets and an animated Blender flight."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parent;OUT.mkdir(exist_ok=True)
scene=bpy.data.scenes.new('AeroPredict Airport Flight');bpy.context.window.scene=scene
parts=[]
def material(name,color,metal=0,rough=.6,emission=0):
 m=bpy.data.materials.new('Airport '+name);m.use_nodes=True
 n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough
 if emission:
  n.inputs['Emission Color'].default_value=(*color,1);n.inputs['Emission Strength'].default_value=emission
 m.diffuse_color=(*color,1);return m
grass=material('Meadow',(.20,.32,.17));asphalt=material('Runway asphalt',(.075,.09,.105));concrete=material('Apron concrete',(.43,.48,.49));white=material('White markings',(.86,.89,.87));yellow=material('Taxiway gold',(.95,.65,.035));glass=material('Terminal glass',(.08,.27,.37),.3,.24);roof=material('Roof aluminium',(.47,.58,.63),.4,.37);navy=material('Airline navy',(.015,.055,.12),.2,.3);planeWhite=material('Parked aircraft white',(.83,.87,.9),.15,.3);black=material('Rubber',(.018,.025,.032));chrome=material('Landing gear alloy',(.43,.51,.57),.7,.3);blue=material('Blue taxi lights',(.03,.25,.85),.2,.3,2);amber=material('Warm apron lamps',(.95,.71,.26),.1,.3,1);green=material('Threshold green',(.02,.65,.28),.1,.3,2);red=material('Runway end red',(.8,.015,.025),.1,.3,2)
def link(o):
 for c in list(o.users_collection):c.objects.unlink(o)
 scene.collection.objects.link(o);parts.append(o);return o
def box(name,x,z,y,dx,dz,dy,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x,-z,y));o=link(bpy.context.object);o.name=name;o.scale=(dx,dz,dy);o.data.materials.append(mat);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);return o
def mesh(name,vs,fs,mat):
 d=bpy.data.meshes.new(name);d.from_pydata(vs,[],fs);d.update();o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);d.materials.append(mat);parts.append(o);return o
def pathline(name,points,mat,width=.3,height=.08):
 d=bpy.data.curves.new(name,'CURVE');d.dimensions='3D';d.bevel_depth=width/2;d.bevel_resolution=1
 s=d.splines.new('POLY');s.points.add(len(points)-1)
 for p,(x,z) in zip(s.points,points):p.co=(x,-z,height,1)
 o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);d.materials.append(mat);parts.append(o);return o
def flatText(text,x,z,h,size,mat):
 d=bpy.data.curves.new(text,'FONT');d.body=text;d.size=size;d.align_x='CENTER';d.extrude=.015
 o=bpy.data.objects.new('Airport sign '+text,d);scene.collection.objects.link(o);o.location=(x,-z,h);d.materials.append(mat);parts.append(o);return o
box('Airport grass terrain',0,0,-.38,6200,7600,.6,grass)
box('Runway 09 27',0,0,-.02,50,2300,.20,asphalt)
box('Parallel taxiway',160,0,-.015,24,2000,.2,asphalt)
box('Departure runway connector',80,-900,-.01,185,26,.2,asphalt)
box('Arrival runway exit',80,650,-.01,185,26,.2,asphalt)
box('Terminal apron',310,-15,-.025,295,890,.2,concrete)
for z in range(-970,971,65):box('Runway centreline',0,z,.095,.9,30,.025,white)
for x in [-24,24]:box('Runway edge paint',x,0,.10,.35,2210,.025,white)
for z in [-1050,1050]:
 for x in [-20,-16,-12,-8,8,12,16,20]:box('Threshold piano key',x,z,.11,2.1,28,.025,white)
 for x in [-13,13]:
  for zz in [z*.75,z*.62]:box('Touchdown aiming block',x,zz,.11,5,38,.025,white)
flatText('09',0,-1000,.13,15,white);flatText('27',0,1000,.13,15,white)
for z in range(-1110,1111,45):
 for x in [-27,27]:box('Runway edge lamp',x,z,.45,.55,.55,.8,white)
 for x in [146,174]:box('Taxiway edge lamp',x,z,.3,.35,.35,.45,blue)
for z,mat in [(-1120,green),(1120,red)]:
 for x in range(-24,25,6):box('Runway end lamp',x,z,.4,.6,.6,.7,mat)
pathline('Taxiway centreline',[(160,-950),(160,950)],yellow,.35)
pathline('Departure taxi route',[(310,-270),(240,-270),(160,-330),(160,-790),(130,-900),(40,-900),(0,-850),(0,-820)],yellow,.35)
pathline('Arrival taxi route',[(0,550),(0,650),(110,650),(160,500),(160,-50),(250,-55),(310,-55)],yellow,.35)
for x in [65,69]:box('Hold short line',x,-900,.13,.35,24,.03,yellow)
for z in range(-380,381,110):
 pathline('Stand lead in',[(170,z),(350,z)],yellow,.3)
 box('Stand stop line',352,z,.12,.4,10,.025,yellow)

# Terminal concourse and glass curtain wall, with gates and jet bridges.
box('Terminal main concourse',445,-10,10,115,810,20,glass)
box('Terminal floating roof',445,-10,21,128,825,2.4,roof)
box('Terminal lower plinth',445,-10,1.4,120,815,2.8,concrete)
for z in range(-390,391,22):
 box('Terminal structural mullion',386,z,10.5,.8,1.1,19,roof)
 box('Terminal roof fin',445,z,23,131,1,1,white)
for z in [-330,-220,-110,0,110,220,330]:
 box('Jet bridge',380,z,5.5,65,5,4.3,roof)
 box('Glass jet bridge side',380,z-2.55,5.5,60,.12,2.1,glass)
 box('Jet bridge cab',348,z,5.1,7,8,5,roof)
 box('Jet bridge support',360,z,2.0,1.4,1.4,4,concrete)
box('Airport car park',665,-20,.04,260,800,.15,asphalt)
for z in range(-360,361,14):
 for x in [570,620,680,730]:box('Car park stall line',x,z,.14,18,.2,.02,white)
for z in [-350,0,350]:box('Landside access road',835,z,.02,35,280,.15,asphalt)
box('Control tower shaft',255,545,26,15,15,52,concrete)
box('Control tower glass cab',255,545,55,27,27,9,glass)
box('Control tower roof',255,545,60,30,30,1.5,roof)
box('Control tower antenna',255,545,68,.7,.7,15,white)
for z in [-360,-120,120,360]:
 box('Apron lighting mast',210,z,14,.65,.65,28,roof)
 box('Apron lamp crossbar',210,z,28,10,.5,.5,roof)
 for x in [206,210,214]:box('Apron floodlight',x,z,27.6,2,1.2,.5,amber)
box('Hangar',260,820,16,140,100,32,roof);box('Hangar door',260,768,13,118,1,25,navy)
box('Fire station',370,760,6,60,75,12,concrete)
for z in [740,760,780]:box('Fire station doors',338,z,4.3,.5,12,8,red)

# Readable low-polygon parked jets, all authored in Blender.
def parkedJet(x,z,angle=math.pi/2):
 coords=[];faces=[];n=16
 sections=[(-18,.10),(-16,1.2),(-13,1.8),(10,1.8),(14,1.1),(18,.05)]
 def world(v):
  xx,zz,yy=v;return (x+xx*math.cos(angle)+zz*math.sin(angle),-(z-xx*math.sin(angle)+zz*math.cos(angle)),yy+4.1)
 for zz,rad in sections:
  for j in range(n):coords.append(world((rad*math.cos(j*math.tau/n),zz,rad*math.sin(j*math.tau/n))))
 for k in range(len(sections)-1):
  for j in range(n):faces.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
 o=mesh('Parked jet fuselage',coords,faces,planeWhite)
 for f in o.data.polygons:f.use_smooth=True
 for s in [-1,1]:
  vs=[world(v) for v in [(s*1,-1,-.4),(s*16,-7,.8),(s*16,-9,1),(s*2,-6,-.4)]]
  mesh('Parked jet swept wing',vs,[(0,1,2,3)],planeWhite)
  mesh('Parked jet tailplane',[world(v) for v in [(s*.5,-11,.5),(s*6,-16,1.1),(s*6,-17,1.1),(s*.5,-15,.5)]],[(0,1,2,3)],planeWhite)
  eng=[world((s*5+.95*math.cos(j*math.tau/16),zz,-1.7+.95*math.sin(j*math.tau/16))) for zz in [1,-3] for j in range(16)]
  mesh('Parked jet nacelle',eng,[(j,(j+1)%16,(j+1)%16+16,j+16) for j in range(16)],planeWhite)
  mesh('Parked jet dark intake',[world((s*5+.8*math.cos(j*math.tau/16),1.04,-1.7+.8*math.sin(j*math.tau/16))) for j in range(16)],[tuple(range(16))],black)
  for zz in range(-11,12,2):
   mesh('Parked cabin window',[world((s*1.77,zz+d,.6+h)) for d,h in [(-.18,-.22),(.18,-.22),(.18,.22),(-.18,.22)]],[(0,1,2,3)],navy)
 mesh('Parked jet vertical fin',[world(v) for v in [(0,-10,1),(0,-14,6),(0,-16,6),(0,-17,0)]],[(0,1,2,3)],navy)
for z in [-330,-220,-110,0,110,220,330]:parkedJet(322,z)
for z in [-500,-420,435,515]:parkedJet(220,z,0)
for x,z in [(280,-350),(290,-180),(360,60),(265,240),(370,300)]:
 box('Ground service truck',x,z,1.7,3.2,7,3.0,white)
 box('Truck windshield',x,z+3.55,2.0,2.7,.08,1.1,glass)
 for xx in [-1.7,1.7]:
  for zz in [-2,2]:box('Service vehicle wheel',x+xx,z+zz,.65,.35,1.1,1.1,black)
 for zz in [10,15,20]:box('Baggage cart',x,z+zz,.9,2.5,3.5,1.4,navy)

# Consolidate airport meshes by material for efficient web rendering.
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.convert(target='MESH')
materials=[grass,asphalt,concrete,white,yellow,glass,roof,navy,planeWhite,black,chrome,blue,amber,green,red]
for mat in materials:
 group=[o for o in scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==mat]
 if not group:continue
 bpy.ops.object.select_all(action='DESELECT')
 for o in group:o.select_set(True)
 bpy.context.view_layer.objects.active=group[0]
 if len(group)>1:bpy.ops.object.join()
 group[0].name=mat.name
env=[o for o in scene.objects if o.type=='MESH']
departure=bpy.data.objects.new('AirportDeparture',None);scene.collection.objects.link(departure)
for o in env:o.parent=departure
bpy.ops.object.select_all(action='DESELECT');departure.select_set(True)
for o in env:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'aeropredict-airport.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True)

# Use the detailed airliner from its retained Blender scene, with new landing gear.
source=bpy.data.objects.get('AeroPredict V2 Airliner')
if source is None:raise RuntimeError('Open the aircraft V2 Blender file before running this authoring script.')
active=bpy.data.objects.new('AirportFlightAircraft',None);scene.collection.objects.link(active)
for source_obj in source.children:
 o=source_obj.copy();o.data=source_obj.data;scene.collection.objects.link(o);o.parent=active
gear=bpy.data.objects.new('AirportLandingGear',None);scene.collection.objects.link(gear);gear.parent=active
before=set(scene.objects)
for x,z in [(0,13.3),(-2.3,-1.0),(2.3,-1.0)]:
 box('Landing gear strut',x,z,-2.8,.16,.20,1.7,chrome)
 for xx in [-.25,.25]:
  bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.45,depth=.22,location=(x+xx,-z,-3.65),rotation=(0,math.pi/2,0));o=link(bpy.context.object);o.name='Landing wheel';o.data.materials.append(black)
for o in set(scene.objects)-before:o.parent=gear
bpy.ops.object.select_all(action='DESELECT');active.select_set(True);gear.select_set(True)
for o in active.children:
 o.select_set(True)
 for child in o.children:child.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'aeropredict-airport-airliner.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True)

# Add a second airport for a complete, editable Blender animation.
arrival=bpy.data.objects.new('AirportArrival',None);scene.collection.objects.link(arrival);arrival.location.y=-8000
for source_obj in env:
 o=source_obj.copy();o.data=source_obj.data;scene.collection.objects.link(o);o.parent=arrival
keys=[(1,(310,-270,4.1)),(180,(240,-270,4.1)),(340,(160,-330,4.1)),(520,(160,-790,4.1)),(620,(130,-900,4.1)),(710,(40,-900,4.1)),(800,(0,-820,4.1)),(1100,(0,670,4.1)),(1400,(0,2070,210)),(1800,(0,3650,650)),(2200,(0,5400,210)),(2600,(0,7350,4.1)),(2900,(0,8550,4.1)),(3100,(110,8650,4.1)),(3300,(160,8500,4.1)),(3500,(160,7950,4.1)),(3700,(310,7945,4.1))]
for i,(frame,(x,z,y)) in enumerate(keys):
 active.location=(x,-z,y)
 nxt=keys[min(i+1,len(keys)-1)][1];prev=keys[max(0,i-1)][1]
 direction=Vector((nxt[0]-prev[0],-(nxt[1]-prev[1]),nxt[2]-prev[2]))
 if direction.length:active.rotation_euler=direction.to_track_quat('-Y','Z').to_euler()
 active.keyframe_insert(data_path='location',frame=frame);active.keyframe_insert(data_path='rotation_euler',frame=frame)
for frame,scale in [(1,1),(1150,1),(1300,.001),(2180,.001),(2400,1),(3700,1)]:
 gear.scale=(scale,scale,scale);gear.keyframe_insert(data_path='scale',frame=frame)
# Linear interpolation prevents overshoot below the ground between landing/taxi keys.
for obj in [active,gear]:
 if obj.animation_data and obj.animation_data.action:
  action=obj.animation_data.action
  for layer in action.layers:
   for strip in layer.strips:
    for slot in action.slots:
     bag=strip.channelbag(slot)
     if bag:
      for fc in bag.fcurves:
       for key in fc.keyframe_points:key.interpolation='LINEAR'
scene.frame_start=1;scene.frame_end=3700;scene.render.fps=30;scene.frame_set(1)
world=bpy.data.worlds.new('Airport clear daylight');world.use_nodes=True;scene.world=world
node=next(n for n in world.node_tree.nodes if n.type=='BACKGROUND');node.inputs['Color'].default_value=(.43,.62,.82,1);node.inputs['Strength'].default_value=.65
d=bpy.data.lights.new('Airport afternoon sun','SUN');d.energy=3;sun=bpy.data.objects.new('Airport afternoon sun',d);scene.collection.objects.link(sun);sun.rotation_euler=(.45,-.4,-.6)
d=bpy.data.cameras.new('Airport overview camera');camera=bpy.data.objects.new('Airport overview camera',d);scene.collection.objects.link(camera)
camera.location=(1180,1450,1150);camera.rotation_euler=(Vector((180,0,0))-camera.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=2600;d.clip_end=30000;scene.camera=camera
scene.render.resolution_x=1500;scene.render.resolution_y=1050;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'airport-overview.png')
try:scene.render.engine='BLENDER_EEVEE'
except TypeError:pass
# A second camera stays with the animated aircraft when playing the Blender file.
d=bpy.data.cameras.new('Airport flight follow camera');d.lens=43;d.clip_start=.5;d.clip_end=30000
chase=bpy.data.objects.new('Airport flight follow camera',d);scene.collection.objects.link(chase);chase.parent=active;chase.location=(70,100,48)
track=chase.constraints.new('TRACK_TO');track.target=active;track.track_axis='TRACK_NEGATIVE_Z';track.up_axis='UP_Y';scene.camera=chase
for a in bpy.context.screen.areas:
 if a.type=='VIEW_3D':a.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'aeropredict-airport-flight.blend'))
report={'airport_meshes':len(env),'airport_faces':sum(len(o.data.polygons) for o in env),'parked_aircraft_per_airport':11,'runway_metres':2300,'animation_frames':3700,'fps':30,'style':'Original stylized airport; not an accurate model of a real airport layout.'}
(OUT/'airport-metadata.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
