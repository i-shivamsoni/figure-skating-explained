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
from mathutils import Euler, Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BUNDLE = os.path.join(ROOT, "tools/blender/assets/human-base-meshes/human-base-meshes-bundle-v1.4.1/human_base_meshes_bundle.blend")

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--body", default="female", choices=["female", "male"])
ap.add_argument("--out", default="")
ap.add_argument("--preview", default="")
ap.add_argument("--boot-preview", default="")
args = ap.parse_args(argv)
OUT = args.out or os.path.join(ROOT, f"public/models/skater-{args.body}.glb")
FEMALE = args.body == "female"

# the boot's sole top (where the foot rests) sits this far above the ice; the runner is 28 mm tall,
# the front mounting plate 17 mm and the leather sole 12 mm
GROUND = 0.057

OUTFITS = {
    # black sleeveless dress with a short flared skirt, black gloves, auburn low bun, white boots
    "female": {"top": (0.035, 0.03, 0.04), "legs": (0.80, 0.60, 0.50), "glove": (0.03, 0.03, 0.035), "sleeves": "none", "boot": (0.93, 0.91, 0.88), "sole": (0.78, 0.68, 0.55), "lace": (0.97, 0.96, 0.94), "vent": (0.72, 0.70, 0.66), "eyelet": (0.55, 0.52, 0.48), "hair": (0.30, 0.10, 0.05)},
    # fitted charcoal shirt with rolled sleeves, slim black trousers, black gloves, dark hair, black boots
    "male": {"top": (0.10, 0.10, 0.11), "legs": (0.04, 0.04, 0.05), "glove": (0.03, 0.03, 0.035), "sleeves": "short", "boot": (0.05, 0.05, 0.06), "sole": (0.08, 0.07, 0.07), "lace": (0.14, 0.14, 0.15), "vent": (0.02, 0.02, 0.02), "eyelet": (0.30, 0.30, 0.32), "hair": (0.07, 0.045, 0.035)},
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


def rotate_about(ob, center, euler):
    """Rotates mesh data (already in world coordinates) about `center`."""
    c = Vector(center)
    ob.data.transform(Matrix.Translation(c) @ Euler(euler).to_matrix().to_4x4() @ Matrix.Translation(-c))


def delete_faces(ob, predicate):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    doomed = [f for f in bm.faces if predicate(f.calc_center_median())]
    bmesh.ops.delete(bm, geom=doomed, context="FACES")
    bm.to_mesh(ob.data)
    bm.free()


mat_skin = make_material("skin", (0.78, 0.56, 0.45), roughness=0.55)
mat_top = make_material("top", PALETTE["top"], roughness=0.36 if FEMALE else 0.55)
mat_legs = make_material("legs", PALETTE["legs"], roughness=0.55)
mat_glove = make_material("glove", PALETTE["glove"], roughness=0.5)
mat_eyelet = make_material("eyelet", PALETTE["eyelet"], metallic=0.6, roughness=0.4)
mat_boot = make_material("boot", PALETTE["boot"], roughness=0.38)
mat_sole = make_material("sole", PALETTE["sole"], roughness=0.6)
mat_lace = make_material("lace", PALETTE["lace"], roughness=0.7)
mat_vent = make_material("vent", PALETTE["vent"], roughness=0.6)
mat_blade = make_material("blade", (0.86, 0.88, 0.91), metallic=1.0, roughness=0.22)
mat_plate = make_material("plate", (0.80, 0.81, 0.84), metallic=0.9, roughness=0.35)
mat_hair = make_material("hair", PALETTE["hair"], roughness=0.7)
mat_skirt = make_material("skirt", PALETTE["top"], roughness=0.42, double_sided=True)

extras = []

# ---------------------------------------------------------------- skates
def apply_mods(ob):
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def skin_chain(name, nodes, edges, material):
    """A smooth organic shell from a vertex skeleton: nodes = [((x, y, z), (r1, r2)), ...]."""
    me = bpy.data.meshes.new(name)
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    me.from_pydata([n[0] for n in nodes], edges, [])
    me.update()
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    skin = ob.modifiers.new("Skin", "SKIN")
    skin.use_smooth_shade = True
    for i, n in enumerate(nodes):
        me.skin_vertices[0].data[i].radius = n[1]
    me.skin_vertices[0].data[0].use_root = True
    sub = ob.modifiers.new("Sub", "SUBSURF")
    sub.levels = 2
    sub.render_levels = 2
    apply_mods(ob)
    me.materials.append(material)
    return ob


def profile_extrude(name, points, width, material):
    """Extrudes a closed side-view polygon (y, z) into a plate of the given width along x."""
    me = bpy.data.meshes.new(name)
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    bm = bmesh.new()
    verts = [bm.verts.new((-width / 2, y, zz)) for y, zz in points]
    face = bm.faces.new(verts)
    res = bmesh.ops.extrude_face_region(bm, geom=[face])
    moved = [g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=moved, vec=(width, 0, 0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(material)
    return ob


def build_skate(side):
    """One skate at the origin of its foot (x = lateral centre, y = 0 at the ankle, z = 0 on the ice)."""
    k = H / 1.639
    parts = []
    heel_raise = 0.022 * k
    pivot_y = -0.14 * k  # the toe stays down, the heel comes up
    tilt = math.atan2(heel_raise, 0.24 * k)
    sole_top = GROUND  # at the toe

    def tilted(y, zz):
        """Rotate a point of the boot about the toe so the heel rises; y toward the toe is negative."""
        dy = y - pivot_y
        return (y, sole_top + zz + dy * math.sin(tilt))

    # leather shell: foot chain and ankle chain, radii = (lateral, vertical) for foot nodes, (lateral, front-back) for ankle nodes.
    # Subdivision shrinks the skin mesh, so the radii are generous and the underside is cut flat afterwards.
    foot = [(-0.165, 0.014, (0.034, 0.030)), (-0.100, 0.018, (0.054, 0.036)), (-0.030, 0.024, (0.054, 0.044)), (0.045, 0.024, (0.048, 0.044)), (0.088, 0.026, (0.036, 0.036))]
    ankle = [(-0.012, 0.090, (0.047, 0.056)), (-0.006, 0.145, (0.046, 0.054)), (-0.002, 0.205, (0.045, 0.052))]
    nodes = []
    for y, zz, r in foot:
        yy, zw = tilted(y * k, zz * k)
        nodes.append(((0, yy, zw), (r[0] * k, r[1] * k)))
    for y, zz, r in ankle:
        yy, zw = tilted(y * k, zz * k)
        nodes.append(((0, yy, zw), (r[0] * k, r[1] * k)))
    edges = [(0, 1), (1, 2), (2, 3), (3, 4), (2, 5), (5, 6), (6, 7)]
    shell = skin_chain(f"boot_{side}", nodes, edges, mat_boot)
    for v in shell.data.vertices:
        floor = tilted(v.co.y, 0.0)[1] + 0.003
        if v.co.z < floor:
            v.co.z = floor
    parts.append(shell)
    shell_pts = [v.co.copy() for v in shell.data.vertices]
    y_min = min(c.y for c in shell_pts)
    y_max = max(c.y for c in shell_pts)

    def front_at(zz):
        band = [c for c in shell_pts if abs(c.z - zz) < 0.008 and abs(c.x) < 0.012]
        return min(c.y for c in band) if band else -0.05 * k

    def side_at(y, zz):
        band = [c for c in shell_pts if abs(c.z - zz) < 0.012 and abs(c.y - y) < 0.012]
        return max(abs(c.x) for c in band) if band else 0.04 * k

    # leather sole trimmed to the shell, and a stacked heel
    sole_pts = [(y_min + 0.004, -0.012 * k), (y_min + 0.004, 0.0), (y_max - 0.004, 0.0), (y_max - 0.004, -0.012 * k)]
    sole = profile_extrude(f"sole_{side}", [tilted(y, zz) for y, zz in sole_pts], 0.076 * k, mat_sole)
    parts.append(sole)
    heel_pts = [(0.030, -0.012), (0.030, -0.034), (0.090, -0.034), (0.090, -0.012)]
    heel = profile_extrude(f"heelblock_{side}", [tilted(y * k, zz * k) for y, zz in heel_pts], 0.062 * k, mat_sole)
    parts.append(heel)

    # runner: level on the ice, serrated toe pick at the front, slight rise at both ends
    blade_top = 0.028
    runner = [
        (0.102, 0.010), (0.096, 0.003), (0.080, 0.0), (-0.120, 0.0), (-0.142, 0.004), (-0.153, 0.012),
        (-0.149, 0.016), (-0.158, 0.023), (-0.152, 0.026), (-0.161, 0.034), (-0.154, 0.037), (-0.163, 0.046), (-0.150, 0.047),
        (-0.138, blade_top + 0.004), (-0.120, blade_top), (0.090, blade_top), (0.100, blade_top - 0.006),
    ]
    blade = profile_extrude(f"blade_{side}", [(y * k, zz * k) for y, zz in runner], 0.0042, mat_blade)
    parts.append(blade)

    # mounting plates: a wide front plate under the ball, a short one under the heel block
    def plate(name, y0, y1):
        top = min(tilted(y0 * k, -0.012 * k)[1], tilted(y1 * k, -0.012 * k)[1])
        if y0 > 0:
            top = tilted(y0 * k, -0.034 * k)[1]
        pts = [(y0 * k, blade_top * k - 0.002), (y0 * k - 0.006 * k, top), (y1 * k + 0.006 * k, top), (y1 * k, blade_top * k - 0.002)]
        ob = profile_extrude(name, pts, 0.022 * k, mat_plate)
        return ob

    parts.append(plate(f"plate_f_{side}", -0.112, -0.062))
    parts.append(plate(f"plate_b_{side}", 0.040, 0.076))

    # laces: crossed strips up the instep and ankle, sitting on the boot's front surface
    for i in range(7):
        t = i / 6
        zz = (0.062 + 0.118 * t) * k
        zw = tilted(-0.04 * k, zz)[1]
        yy = front_at(zw) + 0.0045
        pitch = math.radians(34 - 22 * t)
        for sign in (1, -1):
            lc = (0, yy, zw)
            bpy.ops.mesh.primitive_cube_add(size=1, location=lc)
            strip = bpy.context.active_object
            strip.name = f"lace_{side}_{i}_{sign}"
            strip.scale = (0.030 * k, 0.0035, 0.0045)
            bpy.ops.object.transform_apply(scale=True)
            rotate_about(strip, lc, (pitch, 0, sign * math.radians(40)))
            strip.data.materials.append(mat_lace)
            parts.append(strip)
        for sx in (1, -1):
            ec = (sx * 0.0135 * k, yy - 0.0035, zw)
            bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.0028, depth=0.003, location=ec)
            eye = bpy.context.active_object
            eye.name = f"eyelet_{side}_{i}_{sx}"
            bpy.ops.object.transform_apply(scale=True)
            rotate_about(eye, ec, (math.pi / 2 - pitch, 0, 0))
            eye.data.materials.append(mat_eyelet)
            parts.append(eye)

    # side vents: three slanted slits on each side of the ankle, flush with the leather
    for sx in (1, -1):
        for i in range(3):
            y = (-0.028 + 0.028 * i) * k
            yy, zw = tilted(y, 0.125 * k)
            x = side_at(yy, zw) - 0.0025
            vc = (sx * x, yy, zw)
            bpy.ops.mesh.primitive_cube_add(size=1, location=vc)
            vent = bpy.context.active_object
            vent.name = f"vent_{side}_{sx}_{i}"
            vent.scale = (0.004, 0.0085, 0.026)
            bpy.ops.object.transform_apply(scale=True)
            rotate_about(vent, vc, (math.radians(-16), 0, 0))
            vent.data.materials.append(mat_vent)
            parts.append(vent)

    for ob in parts:
        bpy.ops.object.select_all(action="DESELECT")
        ob.select_set(True)
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.shade_smooth()
    return parts


for side in ("L", "R"):
    hip, knee, ankle, toe = leg_points(side)
    for part in build_skate(side):
        part.location = (ankle.x, ankle.y + 0.004 * H, 0.0)
        bpy.ops.object.select_all(action="DESELECT")
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.transform_apply(location=True)
        tag(part, f"foot_{side}")
        extras.append(part)

# ---------------------------------------------------------------- hair
# the cranium sits between y = -0.12 (forehead) and y = +0.05 (back of the head) on the female body
k = H / 1.639
head_c = Vector((0, -0.036 * k, z(0.949)))
hair = make_ellipsoid("hair", head_c, (0.087 * k, 0.107 * k, 0.099 * k) if FEMALE else (0.089 * k, 0.112 * k, 0.104 * k), mat_hair, segments=64, rings=40)


# hairline: high on the forehead, dipping behind the ears, lowest at the nape
def hairline(y):
    y = y / k
    if FEMALE:
        pts = [(-0.14, z(0.968)), (-0.09, z(0.956)), (-0.04, z(0.922)), (0.0, z(0.905)), (0.06, z(0.888))]
    else:
        # fringe: the cap reaches down over the forehead at the front
        pts = [(-0.14, z(0.945)), (-0.10, z(0.948)), (-0.05, z(0.925)), (0.0, z(0.905)), (0.06, z(0.885))]
    if y <= pts[0][0]:
        return pts[0][1]
    for (y0, z0), (y1, z1) in zip(pts, pts[1:]):
        if y <= y1:
            t = (y - y0) / (y1 - y0)
            return z0 + (z1 - z0) * t
    return pts[-1][1]


delete_faces(hair, lambda c: c.z < hairline(c.y) or c.y < (-0.113 if FEMALE else -0.126) * k)
tag(hair, "head")
extras.append(hair)
if FEMALE:
    fc = (0.028 * k, -0.075 * k, z(0.962))
    fringe = make_ellipsoid("fringe", fc, (0.052 * k, 0.05 * k, 0.03 * k), mat_hair, 32, 20)
    rotate_about(fringe, fc, (0, math.radians(-14), math.radians(-18)))
    delete_faces(fringe, lambda c: c.y < -0.112 * k or c.z < z(0.94))
else:
    qc = (0, -0.062 * k, z(0.985))
    quiff = make_ellipsoid("quiff", qc, (0.072 * k, 0.07 * k, 0.034 * k), mat_hair, 32, 20)
    rotate_about(quiff, qc, (math.radians(-16), 0, 0))
    delete_faces(quiff, lambda c: c.y < -0.128 * k or c.z < z(0.95))
    fringe = quiff
tag(fringe, "head")
extras.append(fringe)
if not FEMALE:
    bpy.ops.mesh.primitive_torus_add(major_radius=0.147 * k, minor_radius=0.011, major_segments=48, minor_segments=8, location=(0, -0.012, z(0.535)))
    belt = bpy.context.active_object
    belt.name = "belt"
    belt.scale = (1.0, 0.70, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    belt.data.materials.append(make_material("belt", (0.03, 0.03, 0.035), roughness=0.35))
    tag(belt, "hips")
    extras.append(belt)
if FEMALE:
    bun = make_ellipsoid("bun", (0, 0.062 * k, z(0.912)), (0.042, 0.036, 0.038), mat_hair, 20, 14)
    tag(bun, "head")
    extras.append(bun)

# ---------------------------------------------------------------- skirt (female)
if FEMALE:
    top_z = z(0.515)
    bottom_z = z(0.395)
    bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=0.235, radius2=0.14, depth=top_z - bottom_z, location=(0, 0.0, (top_z + bottom_z) / 2))
    skirt = bpy.context.active_object
    skirt.name = "skirt"
    skirt.data.materials.append(mat_skirt)
    delete_faces(skirt, lambda c: abs(c.z - top_z) < 0.002 or abs(c.z - bottom_z) < 0.002)
    # wavy hem and a little flare at the back
    for v in skirt.data.vertices:
        if v.co.z < (top_z + bottom_z) / 2:
            ang = math.atan2(v.co.y, v.co.x)
            v.co.z += 0.014 * math.sin(ang * 7) + 0.006 * math.sin(ang * 3 + 1)
            v.co.y += 0.012 if v.co.y > 0 else 0.0
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

# ---------------------------------------------------------------- remove bare feet, weight the body, then join the accessories
bpy.context.view_layer.objects.active = body
cut = GROUND + 0.085 * H
delete_faces(body, lambda c: c.z < cut)
body.data.materials.append(mat_skin)
body.data.materials.append(mat_top)
body.data.materials.append(mat_legs)
body.data.materials.append(mat_glove)

bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type="ARMATURE_AUTO")
body_unweighted = sum(1 for v in body.data.vertices if not v.groups)
if body_unweighted:
    raise RuntimeError(f"automatic weights left {body_unweighted} body vertices unweighted")

bpy.ops.object.select_all(action="DESELECT")
for ob in extras:
    ob.select_set(True)
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
body = bpy.context.active_object
bpy.ops.object.shade_smooth()

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
skin_groups = {"head", "neck"}
glove_groups = {"hand_L", "hand_R"}
sleeves = PALETTE["sleeves"]
bare_arm_groups = {"none": {"shoulder_L", "shoulder_R", "upper_arm_L", "upper_arm_R", "forearm_L", "forearm_R"}, "short": {"forearm_L", "forearm_R"}, "long": set()}[sleeves]
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
fixed_slots = {slot[n] for n in ("boot", "sole", "lace", "vent", "eyelet", "blade", "plate", "hair", "skirt", "belt") if n in slot}
waist = z(0.53)
for p in mesh.polygons:
    if p.material_index in fixed_slots:
        continue
    names = [dominant[vi] for vi in p.vertices]
    centre = sum((mesh.vertices[vi].co for vi in p.vertices), Vector()) / len(p.vertices)
    if sum(1 for n in names if n in glove_groups) * 2 > len(names):
        p.material_index = slot["glove"]
    elif sum(1 for n in names if n in skin_groups or n in bare_arm_groups) * 2 > len(names):
        p.material_index = slot["skin"]
    elif FEMALE and centre.z > z(0.775) and centre.y < -0.02 and abs(centre.x) < 0.075:
        p.material_index = slot["skin"]  # scoop neckline
    elif FEMALE and centre.z > z(0.70) and centre.y > 0.045 and abs(centre.x) < 0.09:
        p.material_index = slot["skin"]  # open back
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

# ---------------------------------------------------------------- boot close-ups
if args.boot_preview:
    os.makedirs(args.boot_preview, exist_ok=True)
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = 800
    scene.render.resolution_y = 600
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.world = bpy.data.worlds.new("Wb")
    cam_data = bpy.data.cameras.new("CamB")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 0.42
    cam = bpy.data.objects.new("CamB", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    _, _, ankle_r, _ = leg_points("R")
    fx, fy, fz = ankle_r.x, ankle_r.y, 0.11
    for name, loc, rot in [("side", (fx + 3, fy, fz), (math.pi / 2, 0, math.pi / 2)), ("front34", (fx + 2.2, fy - 2.2, fz + 0.9), (math.radians(72), 0, math.radians(45)))]:
        cam.location = loc
        cam.rotation_euler = rot
        scene.render.filepath = os.path.join(args.boot_preview, f"{args.body}_boot_{name}.png")
        bpy.ops.render.render(write_still=True)
    print("BOOT_PREVIEW_DONE")

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
