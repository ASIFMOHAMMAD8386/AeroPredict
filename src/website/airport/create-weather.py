"""Original Blender volume cloud render and branched lightning for the website.
Run with Blender --background --factory-startup --python create-weather.py.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector
out=Path(__file__).resolve().parent
assets=out.parent/'public/simulation/assets'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.name='AeroPredict Volumetric Weather'
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=48
scene.cycles.use_denoising=True
scene.render.resolution_x=640;scene.render.resolution_y=384;scene.render.resolution_percentage=100
scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.world.color=(.12,.15,.20)
volume=bpy.data.materials.new('Soft fractal cloud volume');volume.use_nodes=True
n=volume.node_tree.nodes;n.clear();l=volume.node_tree.links
output=n.new('ShaderNodeOutputMaterial');shader=n.new('ShaderNodeVolumePrincipled')
shader.inputs['Color'].default_value=(.92,.95,1,1);shader.inputs['Anisotropy'].default_value=.2
tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=4;tex.inputs['Detail'].default_value=4.5;tex.inputs['Roughness'].default_value=.68
coord=n.new('ShaderNodeTexCoord');l.new(coord.outputs['Generated'],tex.inputs['Vector'])
ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.32;ramp.color_ramp.elements[1].position=.72
l.new(tex.outputs['Fac'],ramp.inputs[0]);mult=n.new('ShaderNodeMath');mult.operation='MULTIPLY';mult.inputs[1].default_value=2.1
l.new(ramp.outputs[0],mult.inputs[0]);l.new(shader.outputs[0],output.inputs['Volume'])
radius=n.new('ShaderNodeVectorMath');radius.operation='DISTANCE';radius.inputs[1].default_value=(.5,.5,.5);l.new(coord.outputs['Generated'],radius.inputs[0])
fade=n.new('ShaderNodeMapRange');fade.interpolation_type='SMOOTHERSTEP';fade.inputs['From Min'].default_value=.24;fade.inputs['From Max'].default_value=.50;fade.inputs['To Min'].default_value=1;fade.inputs['To Max'].default_value=0;l.new(radius.outputs['Value'],fade.inputs['Value'])
edge=n.new('ShaderNodeMath');edge.operation='MULTIPLY';l.new(mult.outputs[0],edge.inputs[0]);l.new(fade.outputs[0],edge.inputs[1]);l.new(edge.outputs[0],shader.inputs['Density'])
rng=random.Random(83)
for i in range(15):
    x=-4.8+(i%5)*2.4+rng.uniform(-.4,.4);z=(i//5)*.8+1.8*(1-abs(x)/6)+rng.uniform(-.4,.4)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=(x,rng.uniform(-.8,.8),z))
    o=bpy.context.object;o.name=f'Volume cloud lobe {i:02}';o.scale=(rng.uniform(2.1,2.8),rng.uniform(1.4,2.0),rng.uniform(1.4,2.3));o.data.materials.append(volume)
sun_data=bpy.data.lights.new('Cloud sunlight','SUN');sun_data.energy=3;sun_data.angle=.25
sun=bpy.data.objects.new('Cloud sunlight',sun_data);scene.collection.objects.link(sun);sun.rotation_euler=(.4,-.5,-.4)
area_data=bpy.data.lights.new('Cloud sky fill','AREA');area_data.energy=1100;area_data.shape='DISK';area_data.size=12
area=bpy.data.objects.new('Cloud sky fill',area_data);scene.collection.objects.link(area);area.location=(-4,-8,8);area.rotation_euler=(Vector((0,0,1))-area.location).to_track_quat('-Z','Y').to_euler()
cam_data=bpy.data.cameras.new('Volume cloud orthographic');cam_data.type='ORTHO';cam_data.ortho_scale=17.5
cam=bpy.data.objects.new('Volume cloud orthographic',cam_data);scene.collection.objects.link(cam);cam.location=(0,-22,7);cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam
scene.render.filepath=str(assets/'blender-cloud-volume.png')
bpy.ops.render.render(write_still=True)

# Original branched lightning meshes. Thin luminous core plus wider blue halo.
light_scene=bpy.data.scenes.new('AeroPredict Branched Lightning')
if bpy.context.window:bpy.context.window.scene=light_scene
materials=[]
for name,color,strength in [('Lightning white core',(.79,.89,1),10),('Lightning blue halo',(.28,.49,1),2.5)]:
    m=bpy.data.materials.new(name);m.use_nodes=True
    bsdf=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value=(*color,1);bsdf.inputs['Emission Color'].default_value=(*color,1);bsdf.inputs['Emission Strength'].default_value=strength
    materials.append(m)
def stroke(name,points,radius,mat,parent):
    d=bpy.data.curves.new(name,'CURVE');d.dimensions='3D';d.resolution_u=1;d.bevel_depth=radius;d.bevel_resolution=1
    s=d.splines.new('POLY');s.points.add(len(points)-1)
    for p,v in zip(s.points,points):p.co=(*v,1)
    d.materials.append(mat);o=bpy.data.objects.new(name,d);light_scene.collection.objects.link(o);o.parent=parent;return o
for variant in range(3):
    root=bpy.data.objects.new(f'LightningBolt{variant}',None);light_scene.collection.objects.link(root)
    points=[(0,0,480)]
    for i in range(1,16):points.append((rng.uniform(-30,30)+i*1.5,rng.uniform(-4,4),480-i*32))
    for layer,(radius,mat) in enumerate(zip([.55,1.7],materials)):stroke(f'Bolt {variant} main {layer}',points,radius,mat,root)
    for branch,start in enumerate([3,6,9]):
        p=Vector(points[start]);path=[tuple(p)]
        sign=-1 if branch%2 else 1
        for j in range(1,6):path.append(tuple(p+Vector((sign*(j*20+rng.uniform(-8,8)),rng.uniform(-3,3),-j*22))))
        stroke(f'Bolt {variant} fork {branch}',path,.35,materials[0],root)
    root.hide_render=True
with bpy.context.temp_override(scene=light_scene,view_layer=light_scene.view_layers[0]):
    bpy.ops.object.select_all(action='DESELECT')
    for o in light_scene.objects:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(assets/'blender-lightning.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_animations=False)
if bpy.context.window:bpy.context.window.scene=scene
bpy.ops.wm.save_as_mainfile(filepath=str(out/'aeropredict-weather.blend'))
(out/'weather-metadata.json').write_text(json.dumps({'authoring':'Blender Cycles volume cloud + emissive branched lightning','cloud_texture':'blender-cloud-volume.png','lightning_meshes':3,'source':'create-weather.py','seed':83},indent=2))
print('Weather assets and editable Blender project saved.')
