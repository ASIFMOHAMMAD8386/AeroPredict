"""Paint the loading area and add Blender safety cones and a waiting baggage cart."""
import bpy,math
from pathlib import Path
scene=bpy.data.scenes['AeroPredict Airport Flight'];bpy.context.window.scene=scene
out=Path(__file__).resolve().parent
mat=bpy.data.materials['Airport life vertex colours']
parent=bpy.data.objects['AirportLifeArchitecture']
vs=[];fs=[];colors=[]
def shape(vertices,faces,color):
 offset=len(vs);vs.extend([(x,-z,y) for x,y,z in vertices]);fs.extend([tuple(i+offset for i in f) for f in faces]);colors.extend([color]*len(faces))
def stripe(x,z,dx,dz):
 shape([(x-dx/2,.14,z-dz/2),(x+dx/2,.14,z-dz/2),(x+dx/2,.14,z+dz/2),(x-dx/2,.14,z+dz/2)],[(0,1,2,3)],(.9,.6,.015))
for x in [322,349]:stripe(x,-209,.15,24)
for z in [-221,-197]:stripe(335.5,z,27,.15)
for x,z in [(321,-220),(350,-220),(350,-198),(321,-198),(338,-205)]:
 rings=[(.12,.26),(.16,.26),(.4,.15),(.50,.12),(.75,.035)]
 vertices=[(x+r*math.cos(j*math.tau/12),y,z+r*math.sin(j*math.tau/12)) for y,r in rings for j in range(12)]
 for k in range(4):
  col=(.82,.13,.01) if k!=2 else (.8,.85,.85)
  for j in range(12):shape([vertices[k*12+j],vertices[k*12+(j+1)%12],vertices[(k+1)*12+(j+1)%12],vertices[(k+1)*12+j]],[(0,1,2,3)],col)
data=bpy.data.meshes.new('Ground service workzone markings');data.from_pydata(vs,[],fs);data.update();data.materials.append(mat)
attr=data.color_attributes.new(name='Color',type='BYTE_COLOR',domain='CORNER')
for polygon,color in zip(data.polygons,colors):
 for li in polygon.loop_indices:attr.data[li].color=(*color,1)
o=bpy.data.objects.new('Ground service workzone markings',data);scene.collection.objects.link(o);o.parent=parent
for index,x in [(1,333),(2,335)]:bpy.data.objects[f'Ground crew {index:02}'].location=(x,207.8,.12)
source=bpy.data.objects['BaggageCartPrototype'];cart=source.copy();scene.collection.objects.link(cart);cart.name='Waiting luggage trolley';cart.location=(326,202,.12);cart.rotation_euler=(0,0,math.pi/2)
for child in source.children:
 o=child.copy();scene.collection.objects.link(o);o.parent=cart
bpy.ops.object.select_all(action='DESELECT');root=bpy.data.objects['AirportDeparture'];root.select_set(True)
for o in root.children_recursive:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/'aeropredict-airport-v2.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'aeropredict-airport-living.blend'))
bpy.ops.render.render(write_still=True)
print('Saved the marked loading zone, safety cones and waiting luggage trolley.')
