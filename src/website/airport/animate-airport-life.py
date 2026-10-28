"""Add role-specific, editable crew and service animations to the living airport."""
import bpy,math
from pathlib import Path
from mathutils import Vector
scene=bpy.data.scenes['AeroPredict Airport Flight'];bpy.context.window.scene=scene
out=Path(__file__).resolve().parent
def xyz(x,y,z):return (x,-z,y)
def repeat(obj):
 if not obj.animation_data:return
 for layer in obj.animation_data.action.layers:
  for strip in layer.strips:
   for slot in obj.animation_data.action.slots:
    bag=strip.channelbag(slot)
    if bag:
     for fc in bag.fcurves:
      fc.modifiers.new('CYCLES')
      for p in fc.keyframe_points:p.interpolation='LINEAR'
positions=[(329,-206),(335,-205),(324,-202),(339,-211),(320,-199),(331,-199),(344,-211),(317,-210),(322,-245),(331,-246),(350,15),(349,24),(335,113),(342,115),(328,225),(337,228),(351,-324),(342,-320)]
def find(root,prefix):return next(o for o in root.children_recursive if o.name.startswith(prefix))
for i,(x,z) in enumerate(positions):
 root=bpy.data.objects[f'Ground crew {i+1:02}'];root.animation_data_clear()
 walk=i in [2,4,6,10,14,17];marshal=i in [8,9];carry=i in [2,6,14]
 if walk:
  for n in range(33):
   frame=1+round(n/32*449);a=i+n/32*math.tau
   root.location=xyz(x+math.cos(a)*1.1,.12,z+math.sin(a)*1.1);root.rotation_euler=(0,0,-a)
   root.keyframe_insert(data_path='location',frame=frame);root.keyframe_insert(data_path='rotation_euler',frame=frame)
  repeat(root)
 else:root.rotation_euler=(0,0,math.pi/2 if marshal else math.pi)
 for side,s in [('L',-1),('R',1)]:
  arm=find(root,'CrewArm'+side);leg=find(root,'CrewLeg'+side)
  for part in [arm,leg]:part.animation_data_clear()
  for n in range(17):
   frame=1+round(n/16*86);w=n/16*math.tau
   ax=.12 if marshal else -.8 if carry else s*math.sin(w)*.48 if walk else -.55+s*math.sin(w)*.22
   az=s*(1.7+.45*math.sin(w)) if marshal else 0
   arm.rotation_euler=(ax,-az,0);leg.rotation_euler=(s*math.sin(w)*.30 if walk else 0,0,0)
   arm.keyframe_insert(data_path='rotation_euler',frame=frame);leg.keyframe_insert(data_path='rotation_euler',frame=frame)
  repeat(arm);repeat(leg)
  for wand in arm.children:
   if wand.name.startswith('CrewWand'):wand.hide_render=not marshal
 if carry:
  src=bpy.data.objects['SuitcasePrototype'];bag=src.copy();scene.collection.objects.link(bag);bag.parent=root;bag.location=xyz(0,.95,.34);bag.scale=(.7,.7,.7)
  for c in src.children:
   o=c.copy();scene.collection.objects.link(o);o.parent=bag
# Baggage cases travel up the conveyor toward the parked aircraft.
belt=bpy.data.objects['Cargo belt at gate 02']
for i in range(4):
 src=bpy.data.objects['SuitcasePrototype'];bag=src.copy();scene.collection.objects.link(bag);bag.parent=belt;bag.name=f'Conveyor moving suitcase {i+1}'
 for c in src.children:
  o=c.copy();scene.collection.objects.link(o);o.parent=bag
 for f,u in [(1,0),(170,1)]:
  zz=-4+8*u;bag.location=xyz(0,.63+(zz+4.5)/9*1.55,zz);bag.keyframe_insert(data_path='location',frame=f+i*42)
 repeat(bag)
truck=bpy.data.objects['Catering truck at gate 02'];platform=find(truck,'CateringPlatform')
for f,y in [(1,2.9),(180,3.12),(360,2.9)]:platform.location.z=y;platform.keyframe_insert(data_path='location',frame=f)
repeat(platform)
# Move the complete baggage trains, including each trailer.
def service_point(distance):
 points=[(356,-370),(356,370),(365,390),(365,-370),(356,-370)]
 lengths=[math.dist(a,b) for a,b in zip(points,points[1:])];d=distance%sum(lengths)
 for i,length in enumerate(lengths):
  if d<=length:
   a,b=points[i:i+2];u=d/length;return (a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,math.atan2(b[0]-a[0],b[1]-a[1]))
  d-=length
for i,start in enumerate([0,470,970]):
 members=[(bpy.data.objects[f'Moving baggage tractor {i}'],0)]+[(bpy.data.objects[f'Baggage cart {i}-{j}'],(j+1)*4.4) for j in range(3)]
 for obj,offset in members:
  obj.animation_data_clear()
  for frame in range(1,3701,20):
   x,z,yaw=service_point(start+(frame-1)/30*6-offset);obj.location=xyz(x,.12,z);obj.rotation_euler=(0,0,yaw);obj.keyframe_insert(data_path='location',frame=frame);obj.keyframe_insert(data_path='rotation_euler',frame=frame)
# Linear interpolation avoids aircraft dipping below runway level.
for name in ['Background landing flight','Background departing flight']:
 obj=bpy.data.objects[name]
 for layer in obj.animation_data.action.layers:
  for strip in layer.strips:
   for slot in obj.animation_data.action.slots:
    bag=strip.channelbag(slot)
    if bag:
     for fc in bag.fcurves:
      for p in fc.keyframe_points:p.interpolation='LINEAR'
scene.frame_set(180)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'aeropredict-airport-living.blend'))
scene.render.filepath=str(out/'airport-life-crew.png');bpy.ops.render.render(write_still=True)
print('Saved role-based crew work, walking, marshalling, moving conveyor bags and complete baggage trains.')
