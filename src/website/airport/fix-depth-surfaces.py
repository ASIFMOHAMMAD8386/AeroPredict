"""Unify intersecting asphalt slabs into one non-overlapping surface."""
import bpy,json
from pathlib import Path
from mathutils import Vector
out=Path(__file__).resolve().parent
scene=bpy.data.scenes['AeroPredict Airport Flight']
scene.view_layers[0].update()
meadow=bpy.data.objects.get('Airport Meadow')
if meadow and max((meadow.matrix_world@p.co).z for p in meadow.data.vertices)>-.25:
    # The detailed meadow was only 18 mm above the old terrain box.
    # Keep the old terrain below it with a generous gap at long camera distances.
    for p in meadow.data.vertices:p.co.z-=.30
obj=bpy.data.objects['Airport Runway asphalt'];rects=[]
for f in obj.data.polygons:
    pts=[obj.matrix_world@obj.data.vertices[i].co for i in f.vertices]
    if len(pts)==4 and max(p.z for p in pts)-min(p.z for p in pts)<.0001 and .035<pts[0].z<.13:
        rects.append((min(p.x for p in pts),max(p.x for p in pts),min(p.y for p in pts),max(p.y for p in pts)))
assert len(rects)>=4,'Expected the authored runway, taxiways and connectors.'
xs=sorted(set(round(x,4) for r in rects for x in r[:2]));ys=sorted(set(round(y,4) for r in rects for y in r[2:]))
cells=set()
for i in range(len(xs)-1):
    for j in range(len(ys)-1):
        x=(xs[i]+xs[i+1])/2;y=(ys[j]+ys[j+1])/2
        if any(a-.0001<=x<=b+.0001 and c-.0001<=y<=d+.0001 for a,b,c,d in rects):cells.add((i,j))
vertices=[];faces=[];index={}
def v(x,y,z):
    key=(x,y,z)
    if key not in index:index[key]=len(vertices);vertices.append(tuple(obj.matrix_world.inverted()@Vector(key)))
    return index[key]
for i,j in cells:
    a,b=xs[i:i+2];c,d=ys[j:j+2]
    q=[v(a,c,.08),v(b,c,.08),v(b,d,.08),v(a,d,.08)]
    faces.append(tuple(q))
    for neighbor,edge in [((i,j-1),[(a,c),(b,c)]),((i+1,j),[(b,c),(b,d)]),((i,j+1),[(b,d),(a,d)]),((i-1,j),[(a,d),(a,c)])]:
        if neighbor not in cells:
            (x0,y0),(x1,y1)=edge;faces.append((v(x1,y1,.08),v(x0,y0,.08),v(x0,y0,-.12),v(x1,y1,-.12)))
data=bpy.data.meshes.new('Unified asphalt without overlapping intersections');data.from_pydata(vertices,[],faces);data.update()
for m in obj.data.materials:data.materials.append(m)
obj.data=data
if bpy.context.window:bpy.context.window.scene=scene
with bpy.context.temp_override(scene=scene,view_layer=scene.view_layers[0]):
    bpy.ops.object.select_all(action='DESELECT')
    root=bpy.data.objects['AirportDeparture'];root.select_set(True)
    for child in root.children_recursive:child.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(out.parent/'public/simulation/assets/aeropredict-airport-v2.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_animations=False)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'aeropredict-airport-living.blend'))
(out/'depth-surface-fix.json').write_text(json.dumps({'original_slabs':len(rects),'non_overlapping_cells':len(cells),'surface_height_metres':.08},indent=2))
print(f'Unified {len(rects)} slabs into {len(cells)} non-overlapping asphalt cells.')
