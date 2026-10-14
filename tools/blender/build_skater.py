"""
Builds public/models/skater-<body>.glb: the CC0 Blender Studio human base mesh rigged with a
plain FK armature, dressed (skating dress + skirt and white boots for the female body, shirt,
trousers and black boots for the male body), with hair, blades and toe picks. No animation is
baked: poses live in three/rig/poses.ts and timelines in three/animation/.

Run headless for both bodies:
  <blender> -b --python tools/blender/build_skater.py -- --body female --preview /tmp/prev
  <blender> -b --python tools/blender/build_skater.py -- --body male

Bone names (glTF nodes): root, hips, spine, chest, neck, head, head_tip, shoulder_L,
upper_arm_L, forearm_L, hand_L, hand_L_tip, thigh_L, shin_L, foot_L, foot_L_tip (+ _R).
Character faces -Y in Blender, which the exporter turns into +Z in three.js (Y up).
"""
import argparse
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BUNDLE = os.path.join(ROOT, "tools/blender/assets/human-base-meshes/human-base-meshes-bundle-v1.4.1/human_base_meshes_bundle.blend")

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--body", default="female", choices=["female", "male"])
ap.add_argument("--out", default="")
ap.add_argument("--preview", default="")
args = ap.parse_args(argv)
OUT = args.out or os.path.join(ROOT, f"public/models/skater-{args.body}.glb")
FEMALE = args.body == "female"

BLADE_H = 0.026
STANCHION_H = 0.018
SOLE_H = 0.012
GROUND = BLADE_H + STANCHION_H + SOLE_H

OUTFITS = {
    "female": {"top": (0.36, 0.03, 0.09), "legs": (0.80, 0.60, 0.50), "boot": (0.94, 0.94, 0.96), "hair": (0.16, 0.08, 0.05)},
    "male": {"top": (0.16, 0.25, 0.58), "legs": (0.05, 0.05, 0.08), "boot": (0.06, 0.06, 0.07), "hair": (0.09, 0.06, 0.04)},
}
PALETTE = OUTFITS[args.body]

# ---------------------------------------------------------------- scene + body
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
with bpy.data.libraries.load(BUNDLE, link=False) as (src, dst):
    dst.objects = [f"GEO-body_{args.body}_realistic"]
body = dst.objects[0]
scene.collection.objects.link(body)
body.name = "Skater"
body.modifiers.clear()
body.location = (0, 0, 0)
body.parent = None

coords = [v.co.copy() for v in body.data.vertices]
zmin = min(c.z for c in coords)
zmax = max(c.z for c in coords)
H = zmax - zmin
for v in body.data.vertices:
    v.co.z += -zmin + GROUND


def z(f):
    return GROUND + H * f


# measured on the bundle's A-pose: shoulders ~0.79H, hands ~0.42H, |x| ~0.26H (both bodies share the topology)
def arm_points(side):
    s = 1 if side == "L" else -1
    shoulder = Vector((s * 0.095 * H, 0.0, z(0.795)))
    tip = Vector((s * 0.255 * H, 0.01 * H, z(0.425)))
    v = tip - shoulder
    return shoulder, shoulder + v * 0.47, shoulder + v * 0.84, tip


def leg_points(side):
    s = 1 if side == "L" else -1
    hip = Vector((s * 0.058 * H, 0.0, z(0.505)))
    knee = Vector((s * 0.062 * H, -0.012 * H, z(0.275)))
    ankle = Vector((s * 0.066 * H, 0.012 * H, z(0.05)))
    toe = Vector((s * 0.066 * H, -0.085 * H, z(0.01)))
    return hip, knee, ankle, toe


# ---------------------------------------------------------------- helpers
def make_material(name, rgb, metallic=0.0, roughness=0.6, double_sided=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    m.diffuse_color = (*rgb, 1.0)
    m.metallic = metallic
    m.roughness = roughness
    m.use_backface_culling = not double_sided
    return m


def tag(ob, group):
    vg = ob.vertex_groups.new(name=f"part_{group}")
    vg.add([v.index for v in ob.data.vertices], 1.0, "REPLACE")


def make_box(name, center, size, material, bevel=0.0, segments=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = size
    bpy.ops.object.transform_apply(scale=True)
    if bevel > 0:
        bpy.ops.object.modifier_add(type="BEVEL")
        ob.modifiers[-1].width = bevel
        ob.modifiers[-1].segments = segments
        bpy.ops.object.modifier_apply(modifier=ob.modifiers[-1].name)
    ob.data.materials.append(material)
    return ob


def make_ellipsoid(name, center, radii, material, segments=24, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=1.0, location=center)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = radii
    bpy.ops.object.transform_apply(scale=True)
    ob.data.materials.append(material)
    return ob


def delete_faces(ob, predicate):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    doomed = [f for f in bm.faces if predicate(f.calc_center_median())]
    bmesh.ops.delete(bm, geom=doomed, context="FACES")
    bm.to_mesh(ob.data)
    bm.free()


mat_skin = make_material("skin", (0.78, 0.56, 0.45), roughness=0.55)
mat_top = make_material("top", PALETTE["top"], roughness=0.5)
mat_legs = make_material("legs", PALETTE["legs"], roughness=0.55)
mat_boot = make_material("boot", PALETTE["boot"], roughness=0.45)
mat_blade = make_material("blade", (0.85, 0.87, 0.9), metallic=1.0, roughness=0.25)
mat_hair = make_material("hair", PALETTE["hair"], roughness=0.7)
mat_skirt = make_material("skirt", PALETTE["top"], roughness=0.5, double_sided=True)

extras = []

# ---------------------------------------------------------------- boots, blades
for side in ("L", "R"):
    hip, knee, ankle, toe = leg_points(side)
    foot_len = 0.15 * H
    cx = ankle.x
    cy = (ankle.y + toe.y) / 2 + 0.01 * H
    foot_h = 0.058 * H + SOLE_H
    foot_part = make_box(f"boot_{side}", (cx, cy, GROUND - SOLE_H + foot_h / 2), (0.064 * H, foot_len, foot_h), mat_boot, bevel=0.02, segments=5)
    cuff = make_box(f"cuff_{side}", (cx, ankle.y + 0.004 * H, GROUND + 0.03 * H + 0.06 * H), (0.058 * H, 0.08 * H, 0.12 * H), mat_boot, bevel=0.018, segments=5)
    sole = make_box(f"heel_{side}", (cx, cy + foot_len * 0.3, GROUND - SOLE_H / 2), (0.05 * H, 0.04 * H, SOLE_H), mat_boot)
    # two stanchions hold the blade under the toe and the heel
    front = make_box(f"stanchion_f_{side}", (cx, cy - foot_len * 0.3, BLADE_H + STANCHION_H / 2), (0.012, 0.03, STANCHION_H), mat_blade)
    back = make_box(f"stanchion_b_{side}", (cx, cy + foot_len * 0.32, BLADE_H + STANCHION_H / 2), (0.012, 0.03, STANCHION_H), mat_blade)
    blade = make_box(f"blade_{side}", (cx, cy, BLADE_H / 2), (0.0045, foot_len * 1.04, BLADE_H), mat_blade)
    pick = make_box(f"pick_{side}", (cx, cy - foot_len * 0.53, BLADE_H * 0.8), (0.0045, 0.016, BLADE_H * 0.55), mat_blade)
    for part in (foot_part, cuff, sole, front, back, blade, pick):
        tag(part, f"foot_{side}")
        extras.append(part)

# ---------------------------------------------------------------- hair
head_c = Vector((0, -0.004, z(0.947)))
hair = make_ellipsoid("hair", head_c, (0.09, 0.12, 0.108) if FEMALE else (0.088, 0.116, 0.102), mat_hair)
# keep the crown and the back; open the face below the hairline and everything below the ears
delete_faces(hair, lambda c: (c.y < -0.035 and c.z < z(0.963)) or (c.z < z(0.92) and c.y < 0.035) or c.z < z(0.895))
tag(hair, "head")
extras.append(hair)
if FEMALE:
    bun = make_ellipsoid("bun", (0, 0.085, z(0.95)), (0.038, 0.034, 0.036), mat_hair, 16, 12)
    tag(bun, "head")
    extras.append(bun)

# ---------------------------------------------------------------- skirt (female)
if FEMALE:
    top_z = z(0.515)
    bottom_z = z(0.395)
    bpy.ops.mesh.primitive_cone_add(vertices=36, radius1=0.21, radius2=0.145, depth=top_z - bottom_z, location=(0, 0.0, (top_z + bottom_z) / 2))
    skirt = bpy.context.active_object
    skirt.name = "skirt"
    skirt.data.materials.append(mat_skirt)
    delete_faces(skirt, lambda c: abs(c.z - top_z) < 0.002 or abs(c.z - bottom_z) < 0.002)
    # wavy hem and a little flare at the back
    for v in skirt.data.vertices:
        if v.co.z < (top_z + bottom_z) / 2:
            ang = math.atan2(v.co.y, v.co.x)
            v.co.z += 0.012 * math.sin(ang * 6)
            v.co.y += 0.015 if v.co.y > 0 else 0.0
    bpy.ops.object.shade_smooth()
    tag(skirt, "hips")
    extras.append(skirt)

# ---------------------------------------------------------------- armature
arm_data = bpy.data.armatures.new("SkaterRig")
rig = bpy.data.objects.new("SkaterRig", arm_data)
scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")


def bone(name, head, tail, parent=None):
    eb = arm_data.edit_bones.new(name)
    eb.head = head
    eb.tail = tail
    if parent:
        eb.parent = arm_data.edit_bones[parent]
    return eb


bone("root", Vector((0, 0, 0)), Vector((0, -0.15, 0)))
bone("hips", Vector((0, 0, z(0.52))), Vector((0, 0, z(0.60))), "root")
bone("spine", Vector((0, 0, z(0.60))), Vector((0, -0.005 * H, z(0.70))), "hips")
bone("chest", Vector((0, -0.005 * H, z(0.70))), Vector((0, 0, z(0.815))), "spine")
bone("neck", Vector((0, 0, z(0.815))), Vector((0, -0.01 * H, z(0.87))), "chest")
bone("head", Vector((0, -0.01 * H, z(0.87))), Vector((0, -0.01 * H, z(1.0))), "neck")
bone("head_tip", Vector((0, -0.01 * H, z(1.0))), Vector((0, -0.01 * H, z(1.03))), "head")
for side in ("L", "R"):
    s = 1 if side == "L" else -1
    shoulder, elbow, wrist, tip = arm_points(side)
    bone(f"shoulder_{side}", Vector((s * 0.015 * H, 0, z(0.80))), shoulder, "chest")
    bone(f"upper_arm_{side}", shoulder, elbow, f"shoulder_{side}")
    bone(f"forearm_{side}", elbow, wrist, f"upper_arm_{side}")
    bone(f"hand_{side}", wrist, tip, f"forearm_{side}")
    bone(f"hand_{side}_tip", tip, tip + (tip - wrist) * 0.3, f"hand_{side}")
    hip, knee, ankle, toe = leg_points(side)
    bone(f"thigh_{side}", hip, knee, "hips")
    bone(f"shin_{side}", knee, ankle, f"thigh_{side}")
    bone(f"foot_{side}", ankle, toe, f"shin_{side}")
    bone(f"foot_{side}_tip", toe, toe + Vector((0, -0.03 * H, 0)), f"foot_{side}")
bpy.ops.object.mode_set(mode="OBJECT")

# ---------------------------------------------------------------- remove bare feet, add material slots, join, auto weights
bpy.context.view_layer.objects.active = body
cut = GROUND + 0.075 * H
delete_faces(body, lambda c: c.z < cut)
body.data.materials.append(mat_skin)
body.data.materials.append(mat_top)
body.data.materials.append(mat_legs)

bpy.ops.object.select_all(action="DESELECT")
for ob in extras:
    ob.select_set(True)
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
body = bpy.context.active_object
bpy.ops.object.shade_smooth()

bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type="ARMATURE_AUTO")

# tagged parts follow one bone rigidly
for vg in list(body.vertex_groups):
    if not vg.name.startswith("part_"):
        continue
    bone_name = vg.name[len("part_") :]
    target = body.vertex_groups.get(bone_name) or body.vertex_groups.new(name=bone_name)
    idx = [v.index for v in body.data.vertices if any(g.group == vg.index for g in v.groups)]
    for other in body.vertex_groups:
        if other is not vg and other is not target:
            other.remove(idx)
    target.add(idx, 1.0, "REPLACE")
    body.vertex_groups.remove(vg)

for b in arm_data.bones:
    if b.name.endswith("_tip") or b.name == "root":
        b.use_deform = False
        vg = body.vertex_groups.get(b.name)
        if vg:
            body.vertex_groups.remove(vg)

# ---------------------------------------------------------------- outfit by dominant bone
skin_groups = {"head", "neck", "hand_L", "hand_R"}
leg_groups = {"thigh_L", "thigh_R", "shin_L", "shin_R", "foot_L", "foot_R"}
arm_groups = {"shoulder_L", "shoulder_R", "upper_arm_L", "upper_arm_R", "forearm_L", "forearm_R", "hand_L", "hand_R"}
gi = {vg.index: vg.name for vg in body.vertex_groups}
mesh = body.data
dominant = []
for v in mesh.vertices:
    best, bw = None, 0.0
    for g in v.groups:
        if g.weight > bw:
            bw, best = g.weight, gi.get(g.group)
    dominant.append(best)
slot = {m.name: i for i, m in enumerate(mesh.materials) if m}
fixed_slots = {slot[n] for n in ("boot", "blade", "hair", "skirt") if n in slot}
waist = z(0.53)
for p in mesh.polygons:
    if p.material_index in fixed_slots:
        continue
    names = [dominant[vi] for vi in p.vertices]
    centre = sum((mesh.vertices[vi].co for vi in p.vertices), Vector()) / len(p.vertices)
    if sum(1 for n in names if n in skin_groups) * 2 > len(names):
        p.material_index = slot["skin"]
    elif centre.z < waist and sum(1 for n in names if n in arm_groups) * 2 <= len(names):
        p.material_index = slot["legs"]
    else:
        p.material_index = slot["top"]

unweighted = sum(1 for v in mesh.vertices if not v.groups)
print(f"SKATER body={args.body} verts={len(mesh.vertices)} faces={len(mesh.polygons)} unweighted={unweighted} H={H:.3f} bones={len(arm_data.bones)}")

# ---------------------------------------------------------------- export
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
rig.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_apply=True, export_animations=False, export_skins=True, export_yup=True, export_materials="EXPORT", export_image_format="NONE")
print(f"EXPORTED {OUT} {os.path.getsize(OUT)} bytes")

# ---------------------------------------------------------------- optional preview renders
if args.preview:
    os.makedirs(args.preview, exist_ok=True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    pb = rig.pose.bones
    for name, rot in {"thigh_L": (math.radians(-70), 0, 0), "shin_L": (math.radians(90), 0, 0), "upper_arm_L": (0, 0, math.radians(-80)), "upper_arm_R": (0, 0, math.radians(80)), "spine": (math.radians(10), 0, 0)}.items():
        pb[name].rotation_mode = "XYZ"
        pb[name].rotation_euler = rot
    bpy.ops.object.mode_set(mode="OBJECT")
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = 600
    scene.render.resolution_y = 900
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.world = bpy.data.worlds.new("W")
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = H * 1.25
    cam = bpy.data.objects.new("Cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    cz = GROUND + H / 2
    for name, loc, rot in [("front", (0, -5, cz), (math.pi / 2, 0, 0)), ("side", (5, 0, cz), (math.pi / 2, 0, math.pi / 2)), ("iso", (3.5, -3.5, cz + 0.3), (math.radians(80), 0, math.radians(45)))]:
        cam.location = loc
        cam.rotation_euler = rot
        scene.render.filepath = os.path.join(args.preview, f"{args.body}_{name}.png")
        bpy.ops.render.render(write_still=True)
    print("PREVIEW_DONE")
