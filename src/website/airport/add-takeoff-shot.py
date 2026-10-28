"""Add a dedicated editable Blender takeoff camera and nose-rotation keys."""
import bpy,math
from pathlib import Path
from mathutils import Vector
out=Path(__file__).resolve().parent;s=bpy.data.scenes['AeroPredict Airport Flight'];bpy.context.window.scene=s
plane=bpy.data.objects['AirportFlightAircraft']
for frame,z,y,angle in [(1060,400,4.19,7),(1100,670,4.218,12),(1150,903,10.0,12),(1200,1137,27.43,12),(1250,1370,56.6,12),(1300,1603,97.4,11.3),(1350,1837,150,13.7),(1400,2070,214.1,16.7)]:
 plane.location=(0,-z,y);direction=Vector((0,-math.cos(math.radians(angle)),math.sin(math.radians(angle))))
 plane.rotation_euler=direction.to_track_quat('-Y','Z').to_euler();plane.keyframe_insert(data_path='location',frame=frame);plane.keyframe_insert(data_path='rotation_euler',frame=frame)
data=bpy.data.cameras.new('Takeoff tracking camera');data.lens=43;data.clip_end=30000
cam=bpy.data.objects.new('Takeoff tracking camera',data);s.collection.objects.link(cam);cam.parent=plane;cam.location=(-85,-55,22)
c=cam.constraints.new('TRACK_TO');c.target=plane;c.track_axis='TRACK_NEGATIVE_Z';c.up_axis='UP_Y'
old_camera=s.camera;old_frame=s.frame_current;s.camera=cam;s.frame_set(1250)
s.render.filepath=str(out/'airport-takeoff-shot.png');bpy.ops.render.render(write_still=True)
s.camera=old_camera;s.frame_set(old_frame);bpy.ops.wm.save_as_mainfile(filepath=str(out/'aeropredict-airport-living.blend'))
print('Saved Takeoff tracking camera and continuous nose-up rotation/liftoff keyframes.')
