"""
Builds public/models/skater.glb: the CC0 Blender Studio human base mesh rigged with a
plain FK armature, skate boots and blades, exported as glTF binary (no animations:
poses and clips are authored in three/animation/*.ts and played at runtime).

Run headless:
  <blender> -b --python tools/blender/build_skater.py -- [--body female|male] [--out public/models/skater.glb] [--preview DIR]

Bone names (glTF nodes): root, hips, spine, chest, neck, head, head_tip,
shoulder_L, upper_arm_L, forearm_L, hand_L, hand_L_tip, thigh_L, shin_L, foot_L, foot_L_tip (+ _R).
Character faces -Y in Blender, which the exporter turns into +Z in three.js (Y up).
"""
import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BUNDLE = os.path.join(ROOT, "tools/blender/assets/human-base-meshes/human-base-meshes-bundle-v1.4.1/human_base_meshes_bundle.blend")

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--body", default="female", choices=["female", "male"])
ap.add_argument("--out", default=os.path.join(ROOT, "public/models/skater.glb"))
ap.add_argument("--preview", default="")
args = ap.parse_args(argv)

BLADE_H = 0.028
SOLE_H = 0.012

# ---------------------------------------------------------------- scene + body
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
body_name = f"GEO-body_{args.body}_realistic"
with bpy.data.libraries.load(BUNDLE, link=False) as (src, dst):
    dst.objects = [body_name]
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
# feet flat on the blade: lift the whole body so the sole sits on top of the blade + sole
for v in body.data.vertices:
    v.co.z += -zmin + BLADE_H + SOLE_H
GROUND = BLADE_H + SOLE_H


def z(f):
    return GROUND + H * f


# measured on the bundle's A-pose: shoulders at ~0.79H, hands at ~0.42H, |x| 0.26H
def arm_points(side):
    s = 1 if side == "L" else -1
    shoulder = Vector((s * 0.095 * H, 0.0, z(0.795)))
    tip = Vector((s * 0.255 * H, 0.01 * H, z(0.425)))
    v = tip - shoulder
    elbow = shoulder + v * 0.47
    wrist = shoulder + v * 0.84
    return shoulder, elbow, wrist, tip


def leg_points(side):
    s = 1 if side == "L" else -1
    hip = Vector((s * 0.058 * H, 0.0, z(0.505)))
    knee = Vector((s * 0.062 * H, -0.012 * H, z(0.275)))
    ankle = Vector((s * 0.066 * H, 0.012 * H, z(0.05)))
    toe = Vector((s * 0.066 * H, -0.085 * H, z(0.01)))
    return hip, knee, ankle, toe


# ---------------------------------------------------------------- boots and blades
def make_box(name, center, size, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (size[0], size[1], size[2])
    bpy.ops.object.transform_apply(scale=True)
    ob.data.materials.append(material)
    return ob


def make_material(name, rgb, metallic=0.0, roughness=0.6):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    m.diffuse_color = (*rgb, 1.0)
    m.metallic = metallic
    m.roughness = roughness
    return m


mat_skin = make_material("skin", (0.78, 0.56, 0.45), roughness=0.55)
mat_costume = make_material("costume", (0.07, 0.22, 0.58), roughness=0.5)
mat_boot = make_material("boot", (0.93, 0.93, 0.95), roughness=0.45)
mat_blade = make_material("blade", (0.85, 0.87, 0.9), metallic=1.0, roughness=0.25)

extras = []
for side in ("L", "R"):
    hip, knee, ankle, toe = leg_points(side)
    foot_len = 0.15 * H
    cx = ankle.x
    cy = (ankle.y + toe.y) / 2 + 0.01 * H
    # boot: a low foot part plus an ankle cuff, both bevelled
    foot_part = make_box(f"boot_{side}", (cx, cy, GROUND + 0.028 * H), (0.064 * H, foot_len, 0.056 * H), mat_boot)
    bpy.ops.object.modifier_add(type="BEVEL")
    foot_part.modifiers[-1].width = 0.018
    foot_part.modifiers[-1].segments = 4
    bpy.ops.object.modifier_apply(modifier=foot_part.modifiers[-1].name)
    cuff = make_box(f"cuff_{side}", (cx, ankle.y + 0.004 * H, GROUND + 0.056 * H + 0.048 * H), (0.06 * H, 0.085 * H, 0.096 * H), mat_boot)
    bpy.ops.object.modifier_add(type="BEVEL")
    cuff.modifiers[-1].width = 0.016
    cuff.modifiers[-1].segments = 4
    bpy.ops.object.modifier_apply(modifier=cuff.modifiers[-1].name)
    # sole + blade holder
    sole = make_box(f"sole_{side}", (cx, cy, BLADE_H + SOLE_H / 2), (0.062 * H, foot_len, SOLE_H), mat_boot)
    # blade: thin, full length, plus a toe pick at the front (-Y)
    blade = make_box(f"blade_{side}", (cx, cy, BLADE_H / 2), (0.0045, foot_len * 1.02, BLADE_H), mat_blade)
    pick = make_box(f"pick_{side}", (cx, cy - foot_len * 0.52, BLADE_H * 0.75), (0.0045, 0.014, BLADE_H * 0.5), mat_blade)
    for part in (foot_part, cuff, sole, blade, pick):
        vg = part.vertex_groups.new(name=f"skate_{side}")
        vg.add([v.index for v in part.data.vertices], 1.0, "REPLACE")
    extras += [foot_part, cuff, sole, blade, pick]

# remove the bare feet: faces entirely below the boot cuff are hidden anyway
import bmesh
bm = bmesh.new()
bm.from_mesh(body.data)
cut = GROUND + 0.075 * H
doomed = [f for f in bm.faces if all(v.co.z < cut for v in f.verts)]
bmesh.ops.delete(bm, geom=doomed, context="FACES")
bm.to_mesh(body.data)
bm.free()

# body materials: slot 0 skin, slot 1 costume (assigned after weighting)
body.data.materials.append(mat_skin)
body.data.materials.append(mat_costume)

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

# ---------------------------------------------------------------- join boots into the body, auto weights
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

# skate parts: rigid, 100% on the foot bone
for side in ("L", "R"):
    tag = body.vertex_groups.get(f"skate_{side}")
    foot = body.vertex_groups.get(f"foot_{side}") or body.vertex_groups.new(name=f"foot_{side}")
    if tag:
        idx = [v.index for v in body.data.vertices if any(g.group == tag.index for g in v.groups)]
        for vg in body.vertex_groups:
            if vg is not tag and vg is not foot:
                vg.remove(idx)
        foot.add(idx, 1.0, "REPLACE")
        body.vertex_groups.remove(tag)

# tip bones should not deform; drop their (empty) groups and mark non-deforming
for b in arm_data.bones:
    if b.name.endswith("_tip") or b.name == "root":
        b.use_deform = False
        vg = body.vertex_groups.get(b.name)
        if vg:
            body.vertex_groups.remove(vg)

# ---------------------------------------------------------------- materials by dominant bone
skin_groups = {"head", "neck", "hand_L", "hand_R"}
gi = {vg.index: vg.name for vg in body.vertex_groups}
mesh = body.data
vert_skin = []
for v in mesh.vertices:
    best = None
    bw = 0.0
    for g in v.groups:
        if g.weight > bw:
            bw = g.weight
            best = gi.get(g.group)
    vert_skin.append(best in skin_groups)
boot_slots = {i for i, m in enumerate(mesh.materials) if m and m.name in ("boot", "blade")}
for p in mesh.polygons:
    if p.material_index in boot_slots:
        continue
    skin_votes = sum(1 for vi in p.vertices if vert_skin[vi])
    p.material_index = 0 if skin_votes * 2 > len(p.vertices) else 1

# report weighting coverage
unweighted = sum(1 for v in mesh.vertices if not v.groups)
print(f"SKATER verts={len(mesh.vertices)} faces={len(mesh.polygons)} unweighted={unweighted} H={H:.3f} bones={len(arm_data.bones)}")

# ---------------------------------------------------------------- export
os.makedirs(os.path.dirname(args.out), exist_ok=True)
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
rig.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=args.out,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_animations=False,
    export_skins=True,
    export_yup=True,
    export_materials="EXPORT",
    export_image_format="NONE",
)
print(f"EXPORTED {args.out} {os.path.getsize(args.out)} bytes")

# ---------------------------------------------------------------- optional preview renders of a test pose
if args.preview:
    os.makedirs(args.preview, exist_ok=True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    pb = rig.pose.bones
    for name, rot in {
        "thigh_L": (math.radians(-70), 0, 0),
        "shin_L": (math.radians(90), 0, 0),
        "thigh_R": (math.radians(20), 0, 0),
        "upper_arm_L": (0, 0, math.radians(-80)),
        "upper_arm_R": (0, 0, math.radians(80)),
        "forearm_R": (math.radians(60), 0, 0),
        "spine": (math.radians(15), 0, 0),
        "head": (math.radians(-10), 0, 0),
    }.items():
        pb[name].rotation_mode = "XYZ"
        pb[name].rotation_euler = rot
    bpy.ops.object.mode_set(mode="OBJECT")
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = 600
    scene.render.resolution_y = 900
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    world = bpy.data.worlds.new("W")
    scene.world = world
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
        scene.render.filepath = os.path.join(args.preview, f"skater_{name}.png")
        bpy.ops.render.render(write_still=True)
    print("PREVIEW_DONE")
