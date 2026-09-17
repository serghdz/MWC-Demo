"""Run with Blender --background --factory-startup --python. No live scene is changed."""
import bpy, bmesh, math, json, struct
from pathlib import Path
from mathutils import Vector

P=Path(__file__).resolve().parents[1]
OUT=P/'public/assets'
SOURCE=P/'assets/blender'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
def material(name, color, metal=1, rough=.25, emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1)
 bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
 if emission: bs.inputs['Emission Color'].default_value=(*color,1);bs.inputs['Emission Strength'].default_value=emission
 return m
silver=material('Satin silver — cross',(.44,.47,.49),1,.29)
polish=material('Polished silver — balls',(.64,.65,.66),1,.17)
bandmat=material('Polished silver — flat band',(.54,.58,.60),1,.23)
typemat=material('Silver lettering',(.78,.86,.89),.55,.25)
export_objects=[]
bpy.ops.import_scene.gltf(filepath=str(SOURCE/'cross.glb'))
cross=[o for o in bpy.context.selected_objects if o.type=='MESH']
bounds=[o.matrix_world@Vector(v) for o in cross for v in o.bound_box]
center=Vector(tuple((min(v[i] for v in bounds)+max(v[i] for v in bounds))/2 for i in range(3)))
factor=3.95/(max(v.z for v in bounds)-min(v.z for v in bounds))
for o in cross:
 world=o.matrix_world.copy()
 for v in o.data.vertices:v.co=(world@v.co-center)*factor
 o.parent=None;o.matrix_world.identity();o.name='Cross_'+o.name.replace(' ','_')
 o.data.materials.clear();o.data.materials.append(polish if 'ball' in o.name.lower() else silver)
 export_objects.append(o)

# Continuous circular band: planar faces, cylindrical walls, small machined bevels.
verts=[];faces=[];segments=160
for radius,y in [(2.178,-.122),(2.352,-.122),(2.352,.122),(2.178,.122)]:
 for i in range(segments):
  a=i*math.tau/segments;verts.append((radius*math.cos(a),y,radius*math.sin(a)))
for j in range(4):
 for i in range(segments):faces.append((j*segments+i,j*segments+(i+1)%segments,((j+1)%4)*segments+(i+1)%segments,((j+1)%4)*segments+i))
mesh=bpy.data.meshes.new('Flat silver ring');mesh.from_pydata(verts,[],faces);mesh.update()
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
ring=bpy.data.objects.new('MetalRing',mesh);scene.collection.objects.link(ring);mesh.materials.append(bandmat)
for f in mesh.polygons:f.use_smooth=abs(f.normal.y)<.5
bev=ring.modifiers.new('Fine machined edge bevel','BEVEL');bev.width=.012;bev.segments=2;bev.limit_method='ANGLE';bev.angle_limit=.3
ring.modifiers.new('Weighted face normals','WEIGHTED_NORMAL');export_objects.append(ring)

# Real Blender curves preserve the existing bold letter outlines and extrude them.
font=json.loads((SOURCE/'helvetiker_bold.typeface.json').read_text())
font_scale=.245/font['resolution'];tracking=.09;phrase='MISSION WORLD CHURCH'
metrics={'name':phrase,'tracking':tracking,'orbitRadius':2.52,'orbitDepth':2.52,'repeatGap':.28,'glyphs':{},'font':'Helvetiker Bold'}
glyph_objects={}
for ch in sorted(set(phrase)-{' '}):
 tokens=font['glyphs'][ch]['o'].split();i=0;contours=[];points=[];last=(0,0)
 while i<len(tokens):
  op=tokens[i];i+=1
  if op in ('m','l'):
   p=(float(tokens[i])*font_scale,float(tokens[i+1])*font_scale);i+=2
   if op=='m':
    if points:contours.append(points)
    points=[]
   points.append(p);last=p
  elif op in ('q','b'):
   n=4 if op=='q' else 6;v=[float(x)*font_scale for x in tokens[i:i+n]];i+=n
   end=v[:2];c1=v[2:4];c2=v[4:6] if op=='b' else None
   for step in range(1,7):
    t=step/6;s=1-t
    p=tuple(s*s*last[k]+2*s*t*c1[k]+t*t*end[k] if op=='q' else s**3*last[k]+3*s*s*t*c1[k]+3*s*t*t*c2[k]+t**3*end[k] for k in range(2));points.append(p)
   last=end
 if points:contours.append(points)
 curve=bpy.data.curves.new('Bold '+ch,'CURVE');curve.dimensions='2D';curve.fill_mode='BOTH';curve.extrude=.0225;curve.bevel_depth=.003;curve.bevel_resolution=1;curve.resolution_u=1
 for contour in contours:
  if contour[-1]==contour[0]:contour=contour[:-1]
  spline=curve.splines.new('POLY');spline.points.add(len(contour)-1)
  for p,xy in zip(spline.points,contour):p.co=(*xy,0,1)
  spline.use_cyclic_u=True
 obj=bpy.data.objects.new('Glyph_'+ch,curve);scene.collection.objects.link(obj);curve.materials.append(typemat)
 # glTF is Y-up; author letters in Blender's X/Z front plane.
 obj.rotation_euler.x=math.pi/2
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH');obj=bpy.context.object
 matrix=obj.matrix_world.copy();coords=[matrix@v.co for v in obj.data.vertices]
 mid=Vector(tuple((max(p[k] for p in coords)+min(p[k] for p in coords))/2 for k in range(3)))
 for v,p in zip(obj.data.vertices,coords):v.co=p-mid
 obj.matrix_world.identity();glyph_objects[ch]=obj;export_objects.append(obj)
 width=max(v.co.x for v in obj.data.vertices)-min(v.co.x for v in obj.data.vertices)
 metrics['glyphs'][ch]={'advance':font['glyphs'][ch]['ha']*font_scale,'width':width,'node':obj.name}
metrics['glyphs'][' ']={'advance':font['glyphs'][' ']['ha']*font_scale}
(OUT/'lettering.json').write_text(json.dumps(metrics,separators=(',',':')))

# Bake the geographic point layout once. Browser animation uses only GPU attributes.
land=json.loads((SOURCE/'land.json').read_text());polys=[]
for f in land['features']:
 for poly in ([f['geometry']['coordinates']] if f['geometry']['type']=='Polygon' else f['geometry']['coordinates']):
  p=poly[0];polys.append((p,min(v[0] for v in p),max(v[0] for v in p),min(v[1] for v in p),max(v[1] for v in p)))
def is_land(x,y):
 for p,x0,x1,y0,y1 in polys:
  if not x0<=x<=x1 or not y0<=y<=y1:continue
  inside=False;b=p[-1]
  for a in p:
   if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:inside=not inside
   b=a
  if inside:return True
 return False
def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
mint=[linear(v/255) for v in (139,245,178)];blue=[linear(v/255) for v in (148,196,255)];ocean=[linear(v/255) for v in (86,133,188)]
records=[];preview=[[],[],[]];lat=-78
while lat<82:
 phi=math.radians(lat);c=math.cos(phi);step=2.5/max(.24,c);lon=-180
 while lon<180:
  onland=is_land(lon,lat)
  if onland or math.floor(lon/step+.5)%3==0:
   theta=math.radians(lon+95);pos=(2.12*c*math.sin(theta),2.12*math.sin(phi),2.12*c*math.cos(theta))
   value=math.sin(lon*12.9898+lat*78.233)*43758.5453;mix=max(0,min(1,((value%1)-.12)/.76));mix=mix*mix*(3-2*mix)
   color=[a+(b-a)*mix for a,b in zip(mint,blue)] if onland else ocean
   records.append((*pos,*color,2.55 if onland else 1.4,math.sin(lat*12+lon*5)*.5+.5))
   preview[(0 if mix<.5 else 1) if onland else 2].append((pos[0],-pos[2],pos[1]))
  lon+=step
 lat+=2.3
with (OUT/'globe.bin').open('wb') as file:
 file.write(struct.pack('<4sI',b'MWC1',len(records)))
 for row in records:file.write(struct.pack('<8f',*row))

# Export the prepared meshes only; Blender lighting and point preview are separate.
bpy.ops.object.select_all(action='DESELECT')
for obj in export_objects:obj.select_set(True)
bpy.context.view_layer.objects.active=ring
bpy.ops.export_scene.gltf(filepath=str(OUT/'hero-assets.glb'),use_selection=True,export_apply=True,export_yup=True,export_materials='EXPORT',export_cameras=False,export_lights=False)

# Arrange an editable overview in the native Blender file.
raw=bpy.data.collections.new('Letter masters — reusable meshes');scene.collection.children.link(raw)
for obj in glyph_objects.values():
 for coll in list(obj.users_collection):coll.objects.unlink(obj)
 raw.objects.link(obj)
raw.hide_render=True;raw.hide_viewport=True
name_width=sum(metrics['glyphs'][ch]['advance']+tracking for ch in phrase)-tracking;cursor=0
for index,ch in enumerate(phrase):
 advance=metrics['glyphs'][ch]['advance'];center=cursor+advance/2;cursor+=advance+tracking
 if ch==' ':continue
 angle=math.pi/2+(name_width/2-center)/2.52
 obj=bpy.data.objects.new(f'Name {index:02d} — {ch}',glyph_objects[ch].data);scene.collection.objects.link(obj)
 obj.location=(math.cos(angle)*2.52,-math.sin(angle)*2.52,-math.sin(angle)*.48+.17)
 obj.scale.x=max(.08,math.sin(angle))*.9
ring.rotation_euler=(.18,0,-.2)
for i,points in enumerate(preview):
 mesh=bpy.data.meshes.new('Geographic point positions');mesh.from_pydata(points,[],[])
 obj=bpy.data.objects.new(['Mint land particles','Blue land particles','Ocean particles'][i],mesh);scene.collection.objects.link(obj)
 mat=material(obj.name,[mint,blue,ocean][i],0,.5,.65)
 nodes=bpy.data.node_groups.new(obj.name+' preview','GeometryNodeTree');nodes.interface.new_socket(name='Geometry',in_out='INPUT',socket_type='NodeSocketGeometry');nodes.interface.new_socket(name='Geometry',in_out='OUTPUT',socket_type='NodeSocketGeometry')
 inp=nodes.nodes.new('NodeGroupInput');out=nodes.nodes.new('NodeGroupOutput');ico=nodes.nodes.new('GeometryNodeMeshIcoSphere');ico.inputs['Radius'].default_value=.009 if i<2 else .005;ico.inputs['Subdivisions'].default_value=1
 sm=nodes.nodes.new('GeometryNodeSetMaterial');sm.inputs['Material'].default_value=mat;inst=nodes.nodes.new('GeometryNodeInstanceOnPoints')
 nodes.links.new(inp.outputs['Geometry'],inst.inputs['Points']);nodes.links.new(ico.outputs['Mesh'],sm.inputs['Geometry']);nodes.links.new(sm.outputs['Geometry'],inst.inputs['Instance']);nodes.links.new(inst.outputs['Instances'],out.inputs['Geometry'])
 obj.modifiers.new('Particle preview — points stay editable','NODES').node_group=nodes
def aim(obj,p):obj.rotation_euler=(Vector(p)-obj.location).to_track_quat('-Z','Y').to_euler()
for name,location,power,size in [('Key',(-3,-4,5),1000,5),('Fill',(4,-2,2),850,4),('Rim',(1,3,3),1300,3)]:
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=location;aim(obj,(0,0,0))
camera_data=bpy.data.cameras.new('Emblem preview');camera=bpy.data.objects.new('Emblem preview',camera_data);scene.collection.objects.link(camera);camera.location=(0,-12,1.4);aim(camera,(0,0,0));camera_data.type='ORTHO';camera_data.ortho_scale=6.1;scene.camera=camera
scene.world.color=(.12,.15,.18);scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=True
scene['Read me']='Complete editable Mission World Church emblem. Silver flat ring, custom cross, reusable bold glyphs and geographic point layout. Web assets export in public/assets. Browser handles rotation and particle dispersion.'
bpy.ops.object.select_all(action='DESELECT');ring.select_set(True);bpy.context.view_layer.objects.active=ring
bpy.ops.wm.save_as_mainfile(filepath=str(P/'assets/blender/mission-world-hero.blend'))
scene.render.filepath=str(P/'assets/blender/hero-preview.png');bpy.ops.render.render(write_still=True)
print(json.dumps({'particles':len(records),'glyphs':len(glyph_objects),'cross_parts':len(cross),'glb_bytes':(OUT/'hero-assets.glb').stat().st_size,'particle_bytes':(OUT/'globe.bin').stat().st_size}))
