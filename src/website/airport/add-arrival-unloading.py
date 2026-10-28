"""Build reusable cargo equipment and an editable arrival-unloading Blender scene."""
import bpy,math
from pathlib import Path
from mathutils import Vector
out=Path(__file__).resolve().parent
base=bpy.data.scenes['AeroPredict Airport Flight'];lib=bpy.data.scenes['Airport Life Asset Library'];scene=lib
paint=bpy.data.materials['Airport life vertex colours']
def v(p):return (p[0],-p[2],p[1])
def empty(name,parent=None,p=(0,0,0)):
 o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.parent=parent;o.location=v(p);return o
def mesh(name,vs,fs,color,parent):
 d=bpy.data.meshes.new(name);d.from_pydata([v(p) for p in vs],[],fs);d.update();d.materials.append(paint)
 a=d.color_attributes.new(name='Color',type='BYTE_COLOR',domain='CORNER')
 for item in a.data:item.color=(*color,1)
 o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.parent=parent;return o
def box(name,p,size,color,parent):
 x,y,z=p;dx,dy,dz=[n/2 for n in size]
 vs=[(x+i*dx,y+j*dy,z+k*dz) for i,j,k in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 return mesh(name,vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(1,2,6,5),(0,4,7,3)],color,parent)
def wheel(parent,x,z):
 vs=[(x+xx,.25+.25*math.cos(j*math.tau/12),z+.25*math.sin(j*math.tau/12)) for xx in [-.1,.1] for j in range(12)]
 return mesh('Equipment wheel',vs,[tuple(range(11,-1,-1)),tuple(range(12,24))]+[(j,(j+1)%12,(j+1)%12+12,j+12) for j in range(12)],(.01,.016,.02),parent)
door=empty('CargoDoorPrototype')
mesh('Open cargo hold',[(-1.48,-2.15,9.95),(-1.48,-2.15,12.25),(-1.48,-1.02,12.25),(-1.48,-1.02,9.95)],[(0,1,2,3)],(.008,.018,.026),door)
hinge=empty('CargoHinge',door,(-1.54,-1.02,11.1));box('Hinged cargo door',(-.04,-.56,0),(.10,1.12,2.3),(.76,.82,.86),hinge)
cart=empty('EmptyCartPrototype');box('Empty luggage deck',(0,.62,0),(1.8,.18,2.6),(.23,.32,.39),cart)
for x in [-.9,.9]:
 for z in [-.78,.78]:wheel(cart,x,z)
box('Tow bar',(0,.5,1.95),(.14,.14,1.35),(.23,.32,.39),cart)
belt=bpy.data.objects['BeltLoaderPrototype']
for x in [-.85,.85]:
 for z in [-2,2]:wheel(belt,x,z)
def export(target,roots,name):
 if bpy.context.window:bpy.context.window.scene=target
 with bpy.context.temp_override(scene=target,view_layer=target.view_layers[0]):
  bpy.ops.object.select_all(action='DESELECT')
  for root in roots:
   root.select_set(True)
   for o in root.children_recursive:o.select_set(True)
  bpy.ops.export_scene.gltf(filepath=str(out/name),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_animations=False)
names=['CrewPrototype','TractorPrototype','BaggageCartPrototype','BusPrototype','FollowMePrototype','CateringPrototype','BeltLoaderPrototype','SuitcasePrototype','BackgroundJetPrototype','CargoDoorPrototype','EmptyCartPrototype']
export(lib,[bpy.data.objects[n] for n in names],'aeropredict-airport-activity.glb')
scene=base
if bpy.context.window:bpy.context.window.scene=base
addon=bpy.data.objects['AirportLifeArchitecture']
for name,p,size,color in [
 ('Arrival gate walkway',(355,5.5,-57),(60,3,4),(.15,.24,.30)),
 ('Arrival jetbridge glazing',(355,5.8,-54.94),(58,1.6,.05),(.025,.13,.20)),
 ('Arrival bridge roof',(355,7.15,-57),(61,.25,4.5),(.55,.64,.69)),
 ('Arrival gate cab',(325.5,5.3,-57),(5,3.2,5),(.35,.46,.51)),
 ('Arrival service line',(329,.14,-39),(34,.025,.20),(.9,.6,.015)),
]:box(name,p,size,color,addon)
export(base,[bpy.data.objects['AirportDeparture']],'aeropredict-airport-v2.glb')
scene=bpy.data.scenes.new('AeroPredict Arrival Unloading')
if bpy.context.window:bpy.context.window.scene=scene
scene.world=base.world
def copy_tree(src,parent=None):
 o=src.copy();o.animation_data_clear();scene.collection.objects.link(o);o.parent=parent
 for child in src.children:copy_tree(child,o)
 return o
copy_tree(bpy.data.objects['AirportDeparture'])
hero=copy_tree(bpy.data.objects['AirportFlightAircraft']);hero.name='Arrived AeroPredict aircraft';hero.location=v((310,4.1,-55));hero.rotation_euler=(0,0,math.pi/2)
bay=copy_tree(door,hero);bay.location=(0,0,0)
h=next(o for o in bay.children_recursive if o.name.startswith('CargoHinge'))
for f,a in [(1,0),(90,1.45)]:h.rotation_euler.y=a;h.keyframe_insert(data_path='rotation_euler',frame=f)
conveyor=copy_tree(belt);conveyor.location=v((321,.12,-49));conveyor.rotation_euler.z=math.pi
for f,x in [(1,350),(60,321)]:conveyor.location.x=x;conveyor.keyframe_insert(data_path='location',frame=f)
for name,x in [('TractorPrototype',330),('EmptyCartPrototype',334.4),('EmptyCartPrototype',338.8),('EmptyCartPrototype',343.2)]:
 o=copy_tree(bpy.data.objects[name]);o.location=v((x,.12,-39));o.rotation_euler.z=-math.pi/2
for i,(x,z) in enumerate([(322.2,-45),(320,-44.7),(334,-38),(302,-28)]):
 worker=copy_tree(bpy.data.objects['CrewPrototype']);worker.location=v((x,.12,z));worker.rotation_euler.z=math.pi
 for o in worker.children_recursive:
  if o.name.startswith('CrewWand'):o.hide_render=i!=3
 for prefix in ['CrewArmL','CrewArmR']:
  arm=next(o for o in worker.children_recursive if o.name.startswith(prefix))
  for f,a in [(1,-.6),(45,-.95),(90,-.6)]:arm.rotation_euler.x=a;arm.keyframe_insert(data_path='rotation_euler',frame=f)
  for layer in arm.animation_data.action.layers:
   for strip in layer.strips:
    for slot in arm.animation_data.action.slots:
     bag=strip.channelbag(slot)
     if bag:
      for fc in bag.fcurves:fc.modifiers.new('CYCLES')
for i in range(8):
 b=copy_tree(bpy.data.objects['SuitcasePrototype'],conveyor)
 for child in [b]+list(b.children_recursive):
  for f,hidden in [(1,True),(90+i*45,False),(210+i*45,True)]:child.hide_render=hidden;child.keyframe_insert(data_path='hide_render',frame=f)
 for f,z in [(90+i*45,4),(210+i*45,-4)]:b.location=v((0,.63+(z+4.5)/9*1.55,z));b.keyframe_insert(data_path='location',frame=f)
 stored=copy_tree(bpy.data.objects['SuitcasePrototype']);stored.location=v((334.4+(i%3)*4.4,.86,-39+(i//3-1)*.7))
 for child in [stored]+list(stored.children_recursive):
  for f,hidden in [(1,True),(255+i*45,False)]:child.hide_render=hidden;child.keyframe_insert(data_path='hide_render',frame=f)
sun=copy_tree(bpy.data.objects['Airport afternoon sun'])
data=bpy.data.cameras.new('Arrival unloading camera');data.lens=39;data.clip_end=30000
cam=bpy.data.objects.new('Arrival unloading camera',data);scene.collection.objects.link(cam);cam.location=v((337,5,-27));cam.rotation_euler=(Vector(v((322,1.7,-46)))-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam
scene.frame_start=1;scene.frame_end=600;scene.render.fps=30;scene.frame_set(420)
scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1500;scene.render.resolution_y=1000;scene.render.resolution_percentage=80;scene.render.filepath=str(out/'arrival-unloading.png')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'aeropredict-airport-living.blend'))
if not bpy.app.background:bpy.ops.render.render(write_still=True,scene=scene.name)
print('Saved the arrival cargo hatch, wheeled conveyor, empty trolleys and four-worker unloading scene.')
