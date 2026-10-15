"""
Builds public/models/skater-<body>.glb: the CC0 Blender Studio human base mesh rigged with a
plain FK armature, dressed (a real dress shell with a ring-built skirt and white boots for the
female body, a painted shirt, trousers and black boots for the male body), with hair, blades and
toe picks. No animation is baked: poses live in three/rig/poses.ts and timelines in
three/animation/.

Run headless for both bodies:
  <blender> -b --python tools/blender/build_skater.py -- --body female --preview /tmp/prev
  <blender> -b --python tools/blender/build_skater.py -- --body male

Outfit options. The defaults reproduce the site's looks: the woman in a black sleeveless
scoop-neck dress with an open back, a short flared skirt, black gloves, an auburn low bun and
white boots; the man in a charcoal fitted shirt with an open collar and rolled sleeves, slim
black trousers, a belt, black gloves, a dark quiff and black boots.
  --sleeves none|short|long   sleeve length (female default: none, male default: short)
  --skirt short|long|none     skirt length (female default: short, male default: none)
  --neckline scoop|high       scoop front + open back (woman) / open collar (man), or a high neck
  --palette <name>            colour set from PALETTES: black (female default), charcoal (male
                              default), ruby, navy, ivory, emerald, midnight, burgundy, white
  --out FILE                  GLB path (default public/models/skater-<body>.glb)
  --preview DIR               body renders (front, side, iso) and hand close-ups
  --boot-preview DIR          skate close-ups

Material names are a contract with three/skaterStore.ts, which recolours them at runtime by
name: "top" (dress bodice + briefs / shirt), "skirt" (female only), "legs" (tights / trousers),
"glove", "boot", "sole", "hair", "blade", "plate". The rest (skin, lace, vent, eyelet, hook, tongue,
belt) keep their built colours.

Bone names (glTF nodes): root, hips, spine, chest, neck, head, head_tip, shoulder_L,
upper_arm_L, forearm_L, hand_L, hand_L_tip, thigh_L, shin_L, foot_L, foot_L_tip (+ _R).
The rig (25 bones, hierarchy, rest pose) and the skater's height are depended on by
three/rig and tests/rig.test.ts: outfit changes must not move them.
Character faces -Y in Blender, which the exporter turns into +Z in three.js (Y up).

Blender 5 gotcha: transform_apply(scale=True) bakes the object location into the mesh and zeroes
it, so parts are built in their local frame and rotated with rotate_about(), never with
transform_apply(rotation=True).
"""
import argparse
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BUNDLE = os.path.join(ROOT, "tools/blender/assets/human-base-meshes/human-base-meshes-bundle-v1.4.1/human_base_meshes_bundle.blend")


def srgb(hex_str):
    """CSS hex colour -> linear RGB tuple (Blender base colours are linear)."""
    h = hex_str.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i : i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


# Colour sets. "skirt" defaults to "top". The female and male defaults are "black" and "charcoal".
WHITE_BOOT = {"boot": (0.93, 0.91, 0.88), "sole": (0.93, 0.91, 0.88), "lace": (0.97, 0.96, 0.94), "vent": (0.72, 0.70, 0.66), "eyelet": (0.55, 0.52, 0.48), "tongue": (0.90, 0.88, 0.85)}
BLACK_BOOT = {"boot": (0.05, 0.05, 0.06), "sole": (0.05, 0.05, 0.06), "lace": (0.14, 0.14, 0.15), "vent": (0.02, 0.02, 0.02), "eyelet": (0.30, 0.30, 0.32), "tongue": (0.07, 0.07, 0.08)}
TIGHTS = (0.80, 0.60, 0.50)
AUBURN = (0.30, 0.10, 0.05)
DARK_HAIR = (0.07, 0.045, 0.035)
BLACK_GLOVE = (0.03, 0.03, 0.035)
PALETTES = {
    # black sleeveless dress with a short flared skirt, black gloves, auburn low bun, white boots
    "black": {"top": (0.035, 0.03, 0.04), "legs": TIGHTS, "glove": BLACK_GLOVE, "hair": AUBURN, **WHITE_BOOT},
    # fitted charcoal shirt with rolled sleeves, slim black trousers, black gloves, dark hair, black boots
    "charcoal": {"top": (0.10, 0.10, 0.11), "legs": (0.04, 0.04, 0.05), "glove": BLACK_GLOVE, "hair": DARK_HAIR, **BLACK_BOOT},
    "ruby": {"top": srgb("#8f1230"), "legs": TIGHTS, "glove": srgb("#8f1230"), "hair": AUBURN, **WHITE_BOOT},
    "navy": {"top": srgb("#16264d"), "legs": TIGHTS, "glove": srgb("#16264d"), "hair": AUBURN, **WHITE_BOOT},
    "ivory": {"top": srgb("#f1ead9"), "legs": TIGHTS, "glove": srgb("#f1ead9"), "hair": AUBURN, **WHITE_BOOT, "boot": srgb("#f5f3ee")},
    "emerald": {"top": srgb("#0f5a3f"), "legs": TIGHTS, "glove": srgb("#0f5a3f"), "hair": AUBURN, **WHITE_BOOT},
    "midnight": {"top": srgb("#1b2a4a"), "legs": srgb("#0c1324"), "glove": BLACK_GLOVE, "hair": DARK_HAIR, **BLACK_BOOT},
    "burgundy": {"top": srgb("#5a1424"), "legs": srgb("#120a0e"), "glove": BLACK_GLOVE, "hair": DARK_HAIR, **BLACK_BOOT},
    "white": {"top": srgb("#ece9e4"), "legs": srgb("#101014"), "glove": BLACK_GLOVE, "hair": DARK_HAIR, **BLACK_BOOT},
}

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--body", default="female", choices=["female", "male"])
ap.add_argument("--out", default="")
ap.add_argument("--preview", default="")
ap.add_argument("--boot-preview", default="")
ap.add_argument("--sleeves", default="", choices=["", "none", "short", "long"])
ap.add_argument("--skirt", default="", choices=["", "short", "long", "none"])
ap.add_argument("--neckline", default="scoop", choices=["scoop", "high"])
ap.add_argument("--palette", default="", choices=["", *PALETTES])
args = ap.parse_args(argv)
OUT = args.out or os.path.join(ROOT, f"public/models/skater-{args.body}.glb")
FEMALE = args.body == "female"
SLEEVES = args.sleeves or ("none" if FEMALE else "short")
SKIRT = args.skirt or ("short" if FEMALE else "none")
NECK = args.neckline
PALETTE = dict(PALETTES[args.palette or ("black" if FEMALE else "charcoal")])
PALETTE.setdefault("skirt", PALETTE["top"])
SKIN_RGB = (0.78, 0.56, 0.45)
# sleeves are painted regions with their own materials so the viewer can dress them at runtime
# (top colour or skin); the GLB carries the default look of this body
PALETTE.setdefault("sleeve_upper", PALETTE["top"] if SLEEVES in ("short", "long") else SKIN_RGB)
PALETTE.setdefault("sleeve_lower", PALETTE["top"] if SLEEVES == "long" else SKIN_RGB)
# the woman's bodice is a real fabric shell over the skin; the man's shirt is painted on the body
SHELL = FEMALE

# the boot's sole top (where the foot rests) sits this far above the ice; the runner is 28 mm tall,
# the front mounting plate 17 mm and the leather sole 12 mm
GROUND = 0.057

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


def tag_weights(ob, weights):
    """Per-vertex bone shares: weights[vertex index] = {bone: share}. Shares are normalised at join time."""
    groups = {}
    for vi, shares in enumerate(weights):
        for bone_name, w in shares.items():
            if w <= 0:
                continue
            vg = groups.get(bone_name)
            if vg is None:
                vg = groups[bone_name] = ob.vertex_groups.new(name=f"part_{bone_name}")
            vg.add([vi], w, "REPLACE")


def torso_slab(z0, half=0.012):
    """Torso vertices (not the A-pose arms hanging past the hips) in a slab around height z0."""
    return [v.co for v in body.data.vertices if abs(v.co.z - z0) < half and abs(v.co.x) < 0.13 * H and abs(v.co.y) < 0.12 * H]


def body_extent(z0, half=0.012):
    """Half-widths and centre of the body's cross-section in a slab around height z0."""
    pts = torso_slab(z0, half)
    xs = [c.x for c in pts]
    ys = [c.y for c in pts]
    return max(abs(x) for x in xs), (max(ys) - min(ys)) / 2, (max(ys) + min(ys)) / 2


def outline(pts, centre, e1, e2, n):
    """The outline of a cross-section: the farthest reach of `pts` from `centre` in n directions of
    the plane spanned by e1, e2 (sector maxima, lightly smoothed)."""
    flat = [((c - centre).dot(e1), (c - centre).dot(e2)) for c in pts]
    radii = []
    for i in range(n):
        ang = 2 * math.pi * i / n
        ca, sa = math.cos(ang), math.sin(ang)
        best = 0.0
        for dx, dy in flat:
            da = (math.atan2(dy, dx) - ang + math.pi) % (2 * math.pi) - math.pi
            if abs(da) < 2.2 * math.pi / n:
                best = max(best, dx * ca + dy * sa)
        radii.append(best)
    for i in range(n):  # an empty sector borrows from its neighbours
        if radii[i] <= 0:
            radii[i] = max(radii[i - 1], radii[(i + 1) % n])
    return [(radii[i - 1] + 2 * radii[i] + radii[(i + 1) % n]) / 4 for i in range(n)]


def torso_profile(z0, n, half=0.012):
    """The body's actual outline at height z0: (centre y, radius from the section centre in n directions)."""
    pts = torso_slab(z0, half)
    ys = [c.y for c in pts]
    cy = (max(ys) + min(ys)) / 2
    return cy, outline(pts, Vector((0, cy, z0)), Vector((1, 0, 0)), Vector((0, 1, 0)), n)


def fitted_torus(name, centre, e1, e2, axis, radii, tube, material, sides=10):
    """A ring that follows a measured outline: its centre line runs through
    centre + radii[i] * (cos e1 + sin e2), with an elliptical tube (radial, axial half-sizes)."""
    n = len(radii)
    me = bpy.data.meshes.new(name)
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    bm = bmesh.new()
    grid = []
    for i in range(n):
        ang = 2 * math.pi * i / n
        radial = e1 * math.cos(ang) + e2 * math.sin(ang)
        c = centre + radial * radii[i]
        row = []
        for j in range(sides):
            b = 2 * math.pi * j / sides
            row.append(bm.verts.new(c + radial * (tube[0] * math.cos(b)) + axis * (tube[1] * math.sin(b))))
        grid.append(row)
    for i in range(n):
        for j in range(sides):
            bm.faces.new((grid[i][j], grid[(i + 1) % n][j], grid[(i + 1) % n][(j + 1) % sides], grid[i][(j + 1) % sides]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(material)
    return ob


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


def rotate_about(ob, center, rot):
    """Rotates mesh data (already in world coordinates) about `center`; rot is an Euler tuple or a Matrix."""
    c = Vector(center)
    m = rot.to_4x4() if isinstance(rot, Matrix) else Euler(rot).to_matrix().to_4x4()
    ob.data.transform(Matrix.Translation(c) @ m @ Matrix.Translation(-c))


def delete_faces(ob, predicate):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    doomed = [f for f in bm.faces if predicate(f.calc_center_median())]
    bmesh.ops.delete(bm, geom=doomed, context="FACES")
    bm.to_mesh(ob.data)
    bm.free()


def split_at_boundaries(me, classify, iters=16):
    """Splits every edge whose two ends classify differently at the exact point where the label
    flips (a bisection along the edge), so that faces can then be assigned to a region along the
    curve itself instead of along the coarse mesh. Returns the number of edges split."""
    bm = bmesh.new()
    bm.from_mesh(me)
    percents = {}
    for e in bm.edges:
        a, b = e.verts
        la = classify(a.co)
        if la == classify(b.co):
            continue
        lo, hi = 0.0, 1.0
        for _ in range(iters):
            mid = (lo + hi) / 2
            if classify(a.co.lerp(b.co, mid)) == la:
                lo = mid
            else:
                hi = mid
        percents[e] = min(0.97, max(0.03, (lo + hi) / 2))
    if percents:
        bmesh.ops.subdivide_edges(bm, edges=list(percents), cuts=1, edge_percents=percents, use_grid_fill=True)
    bm.to_mesh(me)
    bm.free()
    return len(percents)


def cut_along(ob, keep):
    """Trims a part along a curve: the boundary is split exactly, then the faces outside are removed."""
    split_at_boundaries(ob.data, lambda c: bool(keep(c)))
    delete_faces(ob, lambda c: not keep(c))


def apply_mods(ob):
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def smooth(ob):
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.shade_smooth()


mat_skin = make_material("skin", SKIN_RGB, roughness=0.55)
mat_sleeve_upper = make_material("sleeve_upper", PALETTE["sleeve_upper"], roughness=0.55)
mat_sleeve_lower = make_material("sleeve_lower", PALETTE["sleeve_lower"], roughness=0.55)
mat_top = make_material("top", PALETTE["top"], roughness=0.36 if FEMALE else 0.55, double_sided=SHELL)
mat_legs = make_material("legs", PALETTE["legs"], roughness=0.55)
mat_glove = make_material("glove", PALETTE["glove"], roughness=0.5)
mat_eyelet = make_material("eyelet", PALETTE["eyelet"], metallic=0.6, roughness=0.4)
mat_boot = make_material("boot", PALETTE["boot"], roughness=0.38, double_sided=True)  # the shaft is open at the cuff
mat_sole = make_material("sole", PALETTE["sole"], roughness=0.6)
mat_lace = make_material("lace", PALETTE["lace"], roughness=0.7)
mat_vent = make_material("vent", PALETTE["vent"], roughness=0.6)
mat_tongue = make_material("tongue", PALETTE["tongue"], roughness=0.5)
mat_hook = make_material("hook", (0.72, 0.73, 0.76), metallic=0.9, roughness=0.3)
# steel: a mid-grey base under full metalness reads as polished steel; a near-white base only
# mirrors the bright environment and looks like frosted plastic. The viewer recolours both by name.
mat_blade = make_material("blade", (0.60, 0.62, 0.66), metallic=0.7, roughness=0.25)
mat_plate = make_material("plate", (0.42, 0.43, 0.46), metallic=0.7, roughness=0.4)
# hair shells are cut open at the hairline and seen from inside at the openings: render both sides;
# a little sheen so the strands catch the light
mat_hair = make_material("hair", PALETTE["hair"], roughness=0.5, double_sided=True)


def hair_textures(size=512, seed=7):
    """Procedural strands: a greyscale map (clumps of lighter and darker strands running along V)
    that multiplies whatever hair colour the viewer picks, and a normal map of the same relief."""
    rng = np.random.default_rng(seed)
    cols = np.convolve(rng.normal(0, 1, size), np.ones(5) / 5, mode="same")
    fine = rng.normal(0, 1, (size + 64, size))
    w = 40
    cs = np.cumsum(np.vstack([np.zeros((1, size)), fine]), axis=0)
    sm = ((cs[w:] - cs[:-w]) / w)[:size]
    h = 0.6 * np.tile(cols, (size, 1)) + 0.4 * sm * 2.4
    h = (h - h.min()) / (h.max() - h.min())
    albedo = 0.86 + 0.14 * h
    strength = 1.6
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * strength
    dy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * strength
    n = np.stack([-dx, -dy, np.ones_like(h)], axis=-1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return np.repeat(albedo[..., None], 3, axis=2), n * 0.5 + 0.5


def image_from(name, rgb, non_color=False):
    size = rgb.shape[0]
    img = bpy.data.images.new(name, size, size, alpha=True)
    rgba = np.ones((size, size, 4), dtype=np.float32)
    rgba[..., :3] = rgb
    img.pixels.foreach_set(rgba.ravel())
    if non_color:
        img.colorspace_settings.name = "Non-Color"
    img.file_format = "PNG"
    try:
        img.pack()
    except RuntimeError:
        tmp = os.path.join(os.path.dirname(OUT) or ".", f"_{name}.png")
        img.filepath_raw = tmp
        img.save()
        img.pack()
        os.remove(tmp)
    return img


def texture_hair(mat, strength=0.35):
    """Base colour = the strand map (the viewer multiplies its chosen colour in), normal = the strand relief."""
    albedo, normal = hair_textures()
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image_from("hair_strands", albedo)
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    ntex = nt.nodes.new("ShaderNodeTexImage")
    ntex.image = image_from("hair_normal", normal, non_color=True)
    nmap = nt.nodes.new("ShaderNodeNormalMap")
    nmap.inputs["Strength"].default_value = strength
    nt.links.new(ntex.outputs["Color"], nmap.inputs["Color"])
    nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])


texture_hair(mat_hair)
mat_skirt = make_material("skirt", PALETTE["skirt"], roughness=0.42, double_sided=True)

extras = []

# ---------------------------------------------------------------- skates
def skin_chain(name, nodes, edges, material, levels=2):
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
    sub.levels = levels
    sub.render_levels = levels
    apply_mods(ob)
    me.materials.append(material)
    return ob


def profile_extrude(name, points, width, material, bevel=0.0, segments=3):
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
    if bevel > 0:
        mod = ob.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = segments
        mod.limit_method = "ANGLE"
        mod.angle_limit = math.radians(40)
        apply_mods(ob)
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
    # the shaft is open at the top: the subdivided skin tube narrows into a rounded cap over the
    # last ~3 cm below its top node, so it is cut where it is still full width; the leg sits inside
    shaft_top = tilted(ankle[-1][0] * k, ankle[-1][1] * k)[1] - 0.028
    cut_along(shell, lambda c: c.z <= shaft_top)
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

    # padded cuff: a collar following the shaft's outline at its open top, proud of the leather and
    # a little higher at the back
    band = [c for c in shell_pts if abs(c.z - (shaft_top - 0.008)) < 0.012]
    cuff_c = Vector((0, (max(c.y for c in band) + min(c.y for c in band)) / 2, shaft_top - 0.001))
    cuff_rx = max(abs(c.x) for c in band) + 0.003
    cuff_ry = (max(c.y for c in band) - min(c.y for c in band)) / 2 + 0.003
    # the subdivided skin tube is near enough an ellipse (its sparse vertices make a noisy outline)
    cuff_r = [cuff_rx * cuff_ry / math.hypot(cuff_ry * math.cos(2 * math.pi * i / 40), cuff_rx * math.sin(2 * math.pi * i / 40)) for i in range(40)]
    cuff = fitted_torus(f"cuff_{side}", cuff_c, Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)), cuff_r, (0.0075 * k, 0.0095 * k), mat_boot, 10)
    rotate_about(cuff, cuff_c, (tilt + math.radians(6), 0, 0))
    parts.append(cuff)

    # tongue: a padded flap up the front of the shaft under the laces, rising above the cuff
    def tongue_front(zw):
        if zw <= shaft_top - 0.012:
            return front_at(zw) - 0.0045
        # above the shaft the tongue carries straight on, leaning a little forward
        return front_at(shaft_top - 0.012) - 0.0045 - 0.18 * (zw - (shaft_top - 0.012))

    def tongue_slope(zw):
        return (tongue_front(zw + 0.004) - tongue_front(zw - 0.004)) / 0.008

    z_lo = tilted(-0.05 * k, 0.05 * k)[1]
    z_hi = shaft_top + 0.022 * k
    steps = 12
    flap = []
    for i in range(steps + 1):
        zw = z_lo + (z_hi - z_lo) * i / steps
        flap.append((tongue_front(zw), zw))
    for i in range(steps, -1, -1):
        zw = z_lo + (z_hi - z_lo) * i / steps
        pad = 0.008 + 0.005 * max(0.0, (zw - (shaft_top - 0.03)) / 0.05)  # thicker padding at the top
        flap.append((tongue_front(zw) + pad, zw))
    tongue = profile_extrude(f"tongue_{side}", flap, 0.036 * k, mat_tongue, bevel=0.009, segments=4)
    parts.append(tongue)

    # laces: strips crossing over the tongue from each eyelet to the next row's opposite one, from
    # the instep up to the cuff; eyelets on the lower rows, lace hooks on the top two
    rows = 8
    row_z = [(0.060 + 0.108 * i / (rows - 1)) * k for i in range(rows)]  # the top row sits just under the cuff
    eye_x = 0.0205 * k
    for i in range(rows):
        zw = tilted(-0.04 * k, row_z[i])[1]
        pitch = -math.atan(tongue_slope(zw))
        if i < rows - 1:
            zw1 = tilted(-0.04 * k, row_z[i + 1])[1]
            zm = (zw + zw1) / 2
            lc = Vector((0, tongue_front(zm) - 0.0025, zm))
            cross = math.atan2(zw1 - zw, 2 * eye_x)
            for sign in (1, -1):
                bpy.ops.mesh.primitive_cube_add(size=1, location=lc)
                strip = bpy.context.active_object
                strip.name = f"lace_{side}_{i}_{sign}"
                strip.scale = (math.hypot(2 * eye_x, zw1 - zw) + 0.004, 0.0035, 0.0045)
                bpy.ops.object.transform_apply(scale=True)
                rotate_about(strip, lc, Matrix.Rotation(-math.atan(tongue_slope(zm)), 3, "X") @ Matrix.Rotation(sign * cross, 3, "Y"))
                strip.data.materials.append(mat_lace)
                parts.append(strip)
        for sx in (1, -1):
            if i < rows - 2:
                ec = (sx * eye_x, front_at(zw) + 0.0015, zw)
                bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.0028, depth=0.0035, location=ec)
                eye = bpy.context.active_object
                eye.name = f"eyelet_{side}_{i}_{sx}"
                bpy.ops.object.transform_apply(scale=True)
                rotate_about(eye, ec, (math.pi / 2 + pitch, 0, 0))
                eye.data.materials.append(mat_eyelet)
                parts.append(eye)
            else:
                hc = (sx * (eye_x + 0.001), front_at(zw) - 0.0015, zw)
                bpy.ops.mesh.primitive_torus_add(major_radius=0.0028, minor_radius=0.0011, major_segments=14, minor_segments=6, location=hc)
                hook = bpy.context.active_object
                hook.name = f"hook_{side}_{i}_{sx}"
                bpy.ops.object.transform_apply(scale=True)
                rotate_about(hook, hc, (math.pi / 2 + pitch, 0, 0))
                hook.data.materials.append(mat_hook)
                parts.append(hook)

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
        smooth(ob)
    return parts


def shin_centre(side):
    """Where the base mesh's lower leg actually is at boot-shaft height: the bones run a little inside
    (the man's a good 6 cm), so the boots are centred on the leg, not on the ankle bone."""
    s = 1 if side == "L" else -1
    pts = [v.co for v in body.data.vertices if 0.20 <= v.co.z <= 0.27 and v.co.x * s > 0.03]
    xs = [c.x for c in pts]
    ys = [c.y for c in pts]
    return (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2


for side in ("L", "R"):
    cx, cy = shin_centre(side)
    _, _, ankle_pt, _ = leg_points(side)
    for part in build_skate(side):
        part.location = (cx, cy, 0.0)
        bpy.ops.object.select_all(action="DESELECT")
        part.select_set(True)
        bpy.context.view_layer.objects.active = part
        bpy.ops.object.transform_apply(location=True)
        # a skating boot bends only a little at the ankle: everything below the malleoli (sole, heel,
        # blade, toe box) rides the foot bone, the shaft above them rides the shin, and the leather in
        # between blends, so a pointed or flexed foot never carries the shaft away from the leg
        lo = ankle_pt.z - 0.015
        hi = ankle_pt.z + 0.055
        shares = []
        for v in part.data.vertices:
            u = min(1.0, max(0.0, (v.co.z - lo) / (hi - lo)))
            u = u * u * (3 - 2 * u)
            shares.append({f"foot_{side}": 1.0 - u, f"shin_{side}": u})
        tag_weights(part, shares)
        extras.append(part)

# ---------------------------------------------------------------- hair
# Every style is its own skinned object named per the viewer's contract (three/skaterStore.ts:
# hair.<style>, hair.ponytail.<length>, hair.loose.<length>); the viewer shows one and hides the
# rest, so the GLB carries them all. Variant objects are not joined into the body.
k = H / 1.639
head_c = Vector((0, -0.036 * k, z(0.949)))
HAIR_SEG = (48, 30)
variants = []


def finish_variant(ob, name, bone="head"):
    """A separate skinned object: its part_* groups become bone groups, an armature modifier binds it."""
    ob.name = name
    ob.data.name = name
    for vg in list(ob.vertex_groups):
        if vg.name.startswith("part_"):
            vg.name = vg.name[len("part_") :]
    if not ob.vertex_groups:
        tag(ob, bone)
        ob.vertex_groups["part_" + bone].name = bone
    smooth(ob)
    variants.append(ob)
    return ob


def join_parts(parts, name):
    bpy.ops.object.select_all(action="DESELECT")
    for ob in parts:
        ob.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    ob = bpy.context.active_object
    ob.name = name
    return ob


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


CAP_RADII = (0.087 * k, 0.107 * k, 0.099 * k) if FEMALE else (0.089 * k, 0.112 * k, 0.104 * k)


def on_cap(p, lift=0.005):
    """The point of the cap's surface in the direction of `p` from the head centre, raised by `lift`."""
    d = Vector(p) - head_c
    n = math.sqrt((d.x / CAP_RADII[0]) ** 2 + (d.y / CAP_RADII[1]) ** 2 + (d.z / CAP_RADII[2]) ** 2)
    return tuple(head_c + d / n + d.normalized() * lift)


def smoothstep(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def tube_uv(ob, root, tip, tile=0.08):
    """Cylindrical UVs along a lock, so the strands run from root to tip; one texture tile per `tile` metres."""
    axis = Vector(tip) - Vector(root)
    axis.normalize()
    e1 = axis.cross(Vector((0, 0, 1)))
    if e1.length < 1e-3:
        e1 = axis.cross(Vector((0, 1, 0)))
    e1.normalize()
    e2 = axis.cross(e1)
    me = ob.data
    uv = me.uv_layers.new(name="UVMap")
    r0 = Vector(root)
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co - r0
            uv.data[li].uv = ((math.atan2(co.dot(e2), co.dot(e1)) / (2 * math.pi)) % 1.0, co.dot(axis) / tile)


def comb(ob, across, period=0.019, amp=0.0009, wobble=0.5):
    """Combed-hair relief: fine ridges running along the combing direction (`across` gives the
    coordinate perpendicular to it), raised outward only, so a smooth shell reads as strands."""
    me = ob.data
    me.update()
    for v in me.vertices:
        u = across(v.co)
        phase = 2 * math.pi * u / period + wobble * math.sin(53.0 * v.co.z + 31.0 * v.co.y)
        v.co = v.co + v.normal * (amp * (0.5 + 0.5 * math.sin(phase)))
    me.update()


def lock(name, pts, r0, r1):
    """One lock of hair: a tapered tube along a polyline, radius r0 at the root to r1 at the tip, strands along it."""
    nodes = []
    n = len(pts) - 1
    for i, pt in enumerate(pts):
        r = r0 + (r1 - r0) * (i / n)
        nodes.append((tuple(pt), (r, r)))
    edges = [(i, i + 1) for i in range(n)]
    ob = skin_chain(name, nodes, edges, mat_hair, levels=1)
    tube_uv(ob, pts[0], pts[-1])
    return ob


def hair_cap(lift=0.0, combed=True, fade=0.0):
    """The cap of hair above the hairline; `fade` raises the cut at the sides and nape (short, faded
    sides under a longer top, as in a fade or an undercut)."""
    cap = make_ellipsoid("cap", head_c, CAP_RADII, mat_hair, 56, 36)

    def side_lift(c):
        if not fade:
            return 0.0
        sides = smoothstep(0.05 * k, 0.085 * k, abs(c.x))
        back = smoothstep(0.02 * k, 0.07 * k, c.y)
        return fade * max(sides, 0.8 * back)

    cut_along(cap, lambda c: c.z >= hairline(c.y) + lift + side_lift(c) and c.y >= (-0.113 if FEMALE else -0.126) * k)
    if combed:
        # combed back from the forehead: ridges run front to back, so they vary across x
        comb(cap, lambda c: c.x + 0.25 * c.y)
    return cap


def hair_fringe():
    fc = (0.028 * k, -0.075 * k, z(0.962))
    fringe = make_ellipsoid("fringe", fc, (0.052 * k, 0.05 * k, 0.03 * k), mat_hair, 32, 20)
    rotate_about(fringe, fc, (0, math.radians(-14), math.radians(-18)))
    cut_along(fringe, lambda c: c.y >= -0.112 * k and c.z >= z(0.94))
    return fringe


def hair_quiff():
    """Pompadour: the front swept up and back over the crown as one combed mass."""
    qc = (0, -0.066 * k, z(0.994))
    quiff = make_ellipsoid("quiff", qc, (0.064 * k, 0.074 * k, 0.042 * k), mat_hair, 40, 26)
    rotate_about(quiff, qc, (math.radians(-18), 0, 0))
    cut_along(quiff, lambda c: c.y >= -0.135 * k and c.z >= z(0.95))
    comb(quiff, lambda c: c.x, period=0.014, amp=0.0016)
    return quiff


def hair_fringe_short():
    """Textured crop: a short, choppy mass brushed forward over the forehead."""
    fc = (0, -0.09 * k, z(0.975))
    fringe = make_ellipsoid("cropfringe", fc, (0.07 * k, 0.055 * k, 0.03 * k), mat_hair, 36, 22)
    rotate_about(fringe, fc, (math.radians(-26), 0, 0))
    cut_along(fringe, lambda c: c.y >= -0.132 * k and c.z >= z(0.95))
    comb(fringe, lambda c: c.x, period=0.011, amp=0.0022, wobble=1.2)
    return fringe


def hair_sweep():
    """A side part: a flat mass lying diagonally across the forehead, swept to the skater's left."""
    sc = (0.028 * k, -0.082 * k, z(0.972))
    sweep = make_ellipsoid("sweep", sc, (0.08 * k, 0.052 * k, 0.027 * k), mat_hair, 40, 24)
    rotate_about(sweep, sc, (math.radians(-12), math.radians(14), math.radians(-28)))
    cut_along(sweep, lambda c: c.y >= -0.128 * k and c.z >= z(0.945))
    comb(sweep, lambda c: c.y - 0.5 * c.x, period=0.013, amp=0.0014)
    return sweep


def hair_slick():
    """Slicked back: a low combed ridge from the forehead over the crown, ending inside the cap."""
    rc = (0, -0.03 * k, z(0.988))
    ridge = make_ellipsoid("slick", rc, (0.064 * k, 0.105 * k, 0.028 * k), mat_hair, 40, 26)
    rotate_about(ridge, rc, (math.radians(10), 0, 0))
    cut_along(ridge, lambda c: c.y >= -0.125 * k and c.y <= 0.045 * k and c.z >= z(0.93))
    comb(ridge, lambda c: c.x, period=0.012, amp=0.0016)
    return ridge


def hair_bun(center):
    return make_ellipsoid("bun", center, (0.042, 0.036, 0.038), mat_hair, 20, 14)


def hair_tail(length):
    """A ponytail: rooted inside the cap at the back of the skull, gathered at the nape, then a
    tapered tube hanging down the back clear of the neck."""
    n = 8
    nodes = [((0.0, 0.040 * k, z(0.932)), (0.034, 0.034)), ((0.0, 0.066 * k, z(0.905)), (0.030, 0.030))]
    top_z = z(0.905)
    for i in range(1, n + 1):
        u = i / n
        pos = (0.0, 0.072 * k + 0.012 * u, top_z - length * u)
        r = 0.026 * (1 - u) + 0.011 * u
        nodes.append((pos, (r, r)))
    edges = [(i, i + 1) for i in range(len(nodes) - 1)]
    tail = skin_chain("tail", nodes, edges, mat_hair, levels=1)
    tube_uv(tail, nodes[1][0], nodes[-1][0])
    return tail


def hair_mane(length):
    """Loose hair: a shell around the back and sides of the head reaching `length` below the crown."""
    top = head_c.z + 0.04
    bottom = head_c.z - length
    rz = (top - bottom) / 2
    mane = make_ellipsoid("mane", (0, 0.02 * k, (top + bottom) / 2), (0.098 * k, 0.118 * k, rz), mat_hair, 36, 24)
    cut_along(mane, lambda c: c.z <= top - 0.004 and c.y >= -0.052 * k)
    return mane


if FEMALE:
    finish_variant(join_parts([hair_cap(), hair_fringe(), hair_bun((0, 0.062 * k, z(0.912)))], "hair.lowBun"), "hair.lowBun")
    finish_variant(join_parts([hair_cap(), hair_fringe(), hair_bun((0, 0.004 * k, head_c.z + 0.099 * k + 0.018))], "hair.highBun"), "hair.highBun")
    for name, length in (("short", 0.12), ("medium", 0.22), ("long", 0.32)):
        finish_variant(join_parts([hair_cap(), hair_fringe(), hair_tail(length)], f"hair.ponytail.{name}"), f"hair.ponytail.{name}")
    for name, length in (("short", 0.17), ("medium", 0.27), ("long", 0.38)):
        finish_variant(join_parts([hair_cap(), hair_fringe(), hair_mane(length)], f"hair.loose.{name}"), f"hair.loose.{name}")
    finish_variant(join_parts([hair_cap(), hair_fringe(), hair_mane(0.13)], "hair.bob"), "hair.bob")
else:
    # short faded sides under every men's style, as in a fade or an undercut
    finish_variant(join_parts([hair_cap(fade=0.03), hair_quiff()], "hair.quiff"), "hair.quiff")
    finish_variant(join_parts([hair_cap(lift=0.006, fade=0.024), hair_fringe_short()], "hair.crop"), "hair.crop")
    finish_variant(join_parts([hair_cap(fade=0.028), hair_sweep()], "hair.sidePart"), "hair.sidePart")
    finish_variant(join_parts([hair_cap(fade=0.03), hair_slick()], "hair.sweptBack"), "hair.sweptBack")
    # a flat strap following the waist's outline
    belt_z = z(0.535)
    belt_cy, belt_r = torso_profile(belt_z, 56, half=0.014)
    belt = fitted_torus("belt", Vector((0, belt_cy, belt_z)), Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)), [r + 0.0035 for r in belt_r], (0.0035, 0.013), make_material("belt", (0.03, 0.03, 0.035), roughness=0.35), 8)
    tag(belt, "hips")
    extras.append(belt)

# ---------------------------------------------------------------- outfit regions (by geometry)
# Regions are decided from where a point sits on the body (along each arm's axis, the height, the
# neckline curves), not from the auto weights. The mesh is split exactly along these curves below.
ARM = {side: arm_points(side) for side in ("L", "R")}
waist = z(0.505) if FEMALE else z(0.53)
# the dress shell runs on under the skirt's waistband so its lower edge is hidden; briefs below it
shell_hem = z(0.488) if FEMALE else waist


def arm_frame(side):
    """The arm's axis and the hand's frame: (shoulder, axis, unit axis, palm normal, across-the-hand).
    The palm faces -normal (inward); the base mesh's hand hangs forward of the bone axis."""
    sh, _, _, tip = ARM[side]
    axis = tip - sh
    a = axis.normalized()
    n = Vector((0, 0, 1)) - a * a.z
    n.normalize()
    return sh, axis, a, n, a.cross(n)


FRAME = {side: arm_frame(side) for side in ("L", "R")}


def arm_coord(c):
    """(u along the arm from shoulder 0 to fingertip 1, on_arm) for the nearer arm. Past the elbow
    the test widens across the hand, where the fingers and thumb reach far from the bone axis."""
    best = (None, 1e9, False)
    for side, (sh, axis, a, n, s_dir) in FRAME.items():
        rel = c - sh
        u = rel.dot(axis) / axis.length_squared
        d = rel - axis * u
        dist = d.length
        if dist < best[1]:
            across = abs(d.dot(s_dir)) < (0.115 * H if u > 0.7 else 0.075 * H)
            best = (u, dist, abs(d.dot(n)) < 0.075 * H and across and u > 0.06)
    return best[0], best[2]


def neck_open(c):
    """True where the neckline leaves the skin bare."""
    if c.z > z(0.83):
        return True
    if NECK == "high":
        return c.z > z(0.822)
    if FEMALE:
        xn = c.x / (0.072 * H)
        if c.y < -0.005 and c.z > z(0.728) + 0.095 * H * min(1.0, xn * xn):
            return True  # scoop neckline
        xb = c.x / (0.085 * H)
        return c.y > 0.02 and c.z > z(0.66) + 0.14 * H * min(1.0, xb * xb)  # open back
    xn = c.x / (0.045 * H)
    return c.y < -0.005 and c.z > z(0.772) + 0.06 * H * min(1.0, xn * xn)  # open collar


def leg_line(c):
    """Lower edge of the woman's briefs: cut high on the hip, lower at the crotch."""
    xn = c.x / (0.075 * H)
    return z(0.44) + 0.045 * H * min(1.0, xn * xn)


def region(c):
    u, on_arm = arm_coord(c)
    if on_arm and u > 0.77:
        return "glove"  # a few centimetres up the forearm, so the wrist and the thumb root are covered
    if on_arm:
        # the shoulder cap belongs to the top; upper arm and forearm are sleeve regions the viewer
        # paints with the top colour or the skin
        if u > 0.50:
            return "sleeve_lower"
        if u > 0.10:
            return "sleeve_upper"
        return "top"
    if neck_open(c):
        return "skin"
    if c.z < shell_hem:
        if FEMALE and c.z > leg_line(c):
            return "briefs"
        return "legs"
    return "top"


# what the body itself wears in each region (the shell carries the dress; the man's shirt is painted)
BODY_PAINT = {"skin": "skin", "glove": "glove", "legs": "legs", "briefs": "top", "top": "skin" if SHELL else "top", "sleeve_upper": "sleeve_upper", "sleeve_lower": "sleeve_lower"}

# ---------------------------------------------------------------- remove bare feet, relax the hands
bpy.context.view_layer.objects.active = body
cut = GROUND + 0.085 * H
delete_faces(body, lambda c: c.z < cut)


def relax_hand(side):
    """Closes the base mesh's splayed fingers into a relaxed hand: the fingers are drawn together
    and curled a little toward the palm, the thumb is laid against the palm. Done in the hand's own
    frame (the base mesh's hand hangs forward of the arm bones' axis)."""
    sh, axis, a, n, s_dir = FRAME[side]
    hand = []
    for v in body.data.vertices:
        u = (v.co - sh).dot(axis) / axis.length_squared
        if u < 0.78:
            continue
        d = v.co - (sh + axis * u)
        if d.length > 0.08 * H:
            continue
        hand.append((v, u, d.dot(s_dir), d.dot(n)))
    palm = [(s, nn) for _, u, s, nn in hand if 0.86 < u < 0.92]
    sc = sum(s for s, _ in palm) / len(palm)
    nc = sum(nn for _, nn in palm) / len(palm)
    half = max(abs(nn - nc) for _, nn in palm) * 0.45  # about half the palm's thickness
    u_knuckle, u_tip = 0.905, 1.0
    # the four fingers: cluster the finger vertices across the hand, fit each finger's centre line,
    # then pack the lines side by side so the fingers touch (a uniform squeeze would only shrink
    # the fingers as much as the gaps between them)
    fingers = []
    for u0, u1, step in ((0.92, 0.955, 0.002), (0.935, 0.965, 0.0015), (0.945, 0.975, 0.0015)):
        bins = {}
        for _, u, s, nn in hand:
            if u0 <= u <= u1:
                bins.setdefault(round((s - sc) / step), []).append((u, s - sc))
        clusters = []
        for key in sorted(bins):
            if clusters and key - clusters[-1][-1] <= 1:
                clusters[-1].append(key)
            else:
                clusters.append([key])
        fingers = []
        for keys in clusters:
            pts = [p for key in keys for p in bins[key]]
            if len(pts) < 6:
                continue
            um = sum(u for u, _ in pts) / len(pts)
            sm = sum(s for _, s in pts) / len(pts)
            var = sum((u - um) ** 2 for u, _ in pts)
            slope = sum((u - um) * (s - sm) for u, s in pts) / var if var > 1e-12 else 0.0
            fingers.append({"c": sm, "u": um, "m": slope, "h": max(abs(s - sm - slope * (u - um)) for u, s in pts)})
        if len(fingers) == 4:
            break
    fingers.sort(key=lambda f: -f["c"])
    packed = len(fingers) in (3, 4)  # three clusters: two fingers already touch, pack the rest to them
    if packed:
        mid = sum(f["c"] for f in fingers) / len(fingers)
        width = sum(2 * f["h"] for f in fingers) * 0.9
        edge = mid + width / 2
        for f in fingers:
            f["target"] = edge - f["h"] * 0.9
            edge -= 2 * f["h"] * 0.9
    else:
        print(f"HAND {side}: found {len(fingers)} fingers, keeping the fan")

    def finger_shift(u, s):
        """How far across the hand a finger vertex moves so the fingers lie together."""
        if not packed:
            return 0.0
        best = min(fingers, key=lambda f: abs(s - (f["c"] + f["m"] * (u - f["u"]))))
        t = max(0.0, min(1.0, (u - u_knuckle) / (u_tip - u_knuckle)))
        target = best["target"] + (mid - best["target"]) * 0.12 * t  # the tips draw in a touch
        return target - (best["c"] + best["m"] * (u - best["u"]))

    for v, u, s, nn in hand:
        s -= sc
        nn -= nc
        t = max(0.0, min(1.0, (u - u_knuckle) / (u_tip - u_knuckle)))  # 0 at the knuckles, 1 at the tips
        # fingers together, blending in from the knuckles
        ramp = max(0.0, min(1.0, (u - 0.885) / 0.035))
        if ramp > 0:
            s += finger_shift(u, s) * ramp * ramp * (3 - 2 * ramp)
        # the thumb lies on the palm side: press it in against the palm (smooth ramps, no seam)
        if nn < 0 and u > 0.795:
            w = max(0.0, min(1.0, (-nn - 0.6 * half) / half)) * min(1.0, (u - 0.795) / 0.03)
            w = w * w * (3 - 2 * w)
            nn += w * 0.5 * (-0.9 * half - nn)
        # curl toward the palm: rotate about the knuckle line in the (finger, palm-normal) plane
        ang = math.radians(34) * t ** 1.4
        du = (u - u_knuckle) * axis.length
        du2 = du * math.cos(ang) + nn * math.sin(ang)
        nn2 = -du * math.sin(ang) + nn * math.cos(ang)
        if t <= 0:
            du2, nn2 = du, nn
        v.co = sh + axis * u_knuckle + a * du2 + n * (nn2 + nc) + s_dir * (s + sc)


for side in ("L", "R"):
    relax_hand(side)

# split the body exactly along the outfit boundaries, then paint the regions
n_split = split_at_boundaries(body.data, region)
body.data.materials.append(mat_skin)
body.data.materials.append(mat_top)
body.data.materials.append(mat_legs)
body.data.materials.append(mat_glove)
body.data.materials.append(mat_sleeve_upper)
body.data.materials.append(mat_sleeve_lower)
body_slot = {m.name: i for i, m in enumerate(body.data.materials)}
for p in body.data.polygons:
    centre = sum((body.data.vertices[vi].co for vi in p.vertices), Vector()) / len(p.vertices)
    p.material_index = body_slot[BODY_PAINT[region(centre)]]

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

# ---------------------------------------------------------------- weight the body
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type="ARMATURE_AUTO")
body_unweighted = sum(1 for v in body.data.vertices if not v.groups)
if body_unweighted:
    raise RuntimeError(f"automatic weights left {body_unweighted} body vertices unweighted")

# ---------------------------------------------------------------- dress shell (female)
if SHELL:
    # the bodice is a copy of the weighted skin under it, lifted off the body and given a thickness
    # with a rim, so the neckline, armholes and back show a fabric edge and it deforms with the skin
    dress = body.copy()
    dress.data = body.data.copy()
    dress.name = "dress"
    scene.collection.objects.link(dress)
    dress.parent = None
    dress.modifiers.clear()
    delete_faces(dress, lambda c: region(c) != "top")
    bm = bmesh.new()
    bm.from_mesh(dress.data)
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * 0.002
    bm.to_mesh(dress.data)
    bm.free()
    solid = dress.modifiers.new("Solid", "SOLIDIFY")
    solid.thickness = 0.003
    solid.offset = 1.0
    solid.use_rim = True
    solid.use_even_offset = True
    apply_mods(dress)
    for p in dress.data.polygons:
        p.material_index = body_slot["top"]
    extras.append(dress)

# ---------------------------------------------------------------- skirts (female): both lengths, the viewer shows one


def build_skirt(kind):
    """A skirt hanging from the hip: the waistband tucked inside the dress shell, flaring to a wavy hem."""
    # the skirt hangs from the hip: its waistband is tucked just inside the dress shell so the two
    # read as one garment, then it clears the pelvis and flares to a wavy hem
    top_z = z(0.515)
    hem_z = z(0.405) if kind == "short" else z(0.30)
    hem_r = 0.235 if kind == "short" else 0.31
    N = 56
    RINGS = 9 if kind == "short" else 13
    yc0, prof0 = torso_profile(top_z, N)
    rx0, ry0, _ = body_extent(top_z)
    bm = bmesh.new()
    rings = []
    for ri in range(RINGS):
        u = ri / (RINGS - 1)
        zr = top_z + (hem_z - top_z) * u
        yc, prof = torso_profile(zr, N)
        flare = u ** 1.6
        off = 0.003 if ri == 0 else 0.009 + 0.004 * u
        ycr = yc * (1 - flare) + (yc0 + 0.012) * flare  # a little fuller at the back
        ring = []
        for i in range(N):
            ang = 2 * math.pi * i / N
            r_body = prof[i] + off
            r_flare = prof0[i] + (hem_r - prof0[i]) * flare
            r = max(r_body, r_flare)
            zz = zr + (0.014 * math.sin(ang * 7) + 0.006 * math.sin(ang * 3 + 1)) * u  # wavy hem
            ring.append(bm.verts.new((r * math.cos(ang), ycr + r * math.sin(ang), zz)))
        rings.append(ring)
    for ri in range(RINGS - 1):
        for i in range(N):
            a_, b_ = rings[ri][i], rings[ri][(i + 1) % N]
            c_, d_ = rings[ri + 1][(i + 1) % N], rings[ri + 1][i]
            bm.faces.new((a_, b_, c_, d_))
    # face the fabric outward (the lit side), whichever way the rings were wound
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.faces.ensure_lookup_table()
    f0 = bm.faces[0]
    outward = f0.calc_center_median() - Vector((0, yc0, f0.calc_center_median().z))
    if f0.normal.dot(outward) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    skirt_mesh = bpy.data.meshes.new("skirt")
    bm.to_mesh(skirt_mesh)
    bm.free()
    skirt = bpy.data.objects.new("skirt", skirt_mesh)
    scene.collection.objects.link(skirt)
    skirt.data.materials.append(mat_skirt)
    smooth(skirt)
    # the fabric follows the pelvis at the waistband and increasingly the legs toward the hem: the
    # front of the skirt rides on the thighs (sit, land), the sides lift with their leg (camel,
    # spiral), the back keeps hanging from the hips so it cannot swing under the pelvis
    shares = []
    for v in skirt.data.vertices:
        u = (top_z - v.co.z) / (top_z - hem_z)
        u = min(1.0, max(0.0, u))
        side = max(-1.0, min(1.0, v.co.x / max(rx0, 1e-6)))
        front = max(-1.0, min(1.0, -(v.co.y - yc0) / max(ry0, 1e-6)))
        reach = 0.9 if front > 0 else 0.9 - 0.45 * (-front)
        leg = reach * u ** 1.5
        wl = leg * (0.5 + 0.5 * side)
        wr = leg * (0.5 - 0.5 * side)
        shares.append({"hips": 1.0 - wl - wr, "thigh_L": wl, "thigh_R": wr})
    tag_weights(skirt, shares)
    return skirt


if FEMALE:
    for kind in ("short", "long"):
        finish_variant(build_skirt(kind), f"skirt.{kind}", bone="hips")

# ---------------------------------------------------------------- rolled sleeve cuffs (short sleeves)
if not FEMALE:
    # a rolled cuff: a band following the forearm's outline just below the elbow (painted like the upper sleeve)
    for side in ("L", "R"):
        sh, axis, a, e1, e2 = FRAME[side]
        u_cuff = 0.515
        ring_pts = []
        for v in body.data.vertices:
            u = (v.co - sh).dot(axis) / axis.length_squared
            d = v.co - (sh + axis * u)
            if abs(u - u_cuff) < 0.012 and d.length < 0.075 * H:
                ring_pts.append(v.co.copy())
        cc = sum(ring_pts, Vector()) / len(ring_pts)  # the arm's own centre (it hangs forward of the bone axis)
        cuff = fitted_torus(f"cuff_{side}", cc, e1, e2, a, [r + 0.0015 for r in outline(ring_pts, cc, e1, e2, 36)], (0.006, 0.009), mat_sleeve_upper, 8)
        tag(cuff, f"forearm_{side}")
        extras.append(cuff)

# ---------------------------------------------------------------- join the accessories
bpy.ops.object.select_all(action="DESELECT")
for ob in extras:
    ob.select_set(True)
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
body = bpy.context.active_object
bpy.ops.object.shade_smooth()

# tagged parts follow their bones: one bone rigidly (tag) or several by share (tag_weights)
part_groups = [vg for vg in body.vertex_groups if vg.name.startswith("part_")]
part_bone = {vg.index: vg.name[len("part_") :] for vg in part_groups}
for bone_name in set(part_bone.values()):
    if not body.vertex_groups.get(bone_name):
        body.vertex_groups.new(name=bone_name)
bone_group = {name: body.vertex_groups[name] for name in set(part_bone.values())}
other_groups = [vg for vg in body.vertex_groups if vg.index not in part_bone]
for v in body.data.vertices:
    parts = [(part_bone[g.group], g.weight) for g in v.groups if g.group in part_bone]
    if not parts:
        continue
    total = sum(w for _, w in parts) or 1.0
    for other in other_groups:
        other.remove([v.index])
    for bone_name, w in parts:
        bone_group[bone_name].add([v.index], w / total, "REPLACE")
for vg in part_groups:
    body.vertex_groups.remove(vg)

for b in arm_data.bones:
    if b.name.endswith("_tip") or b.name == "root":
        b.use_deform = False
        vg = body.vertex_groups.get(b.name)
        if vg:
            body.vertex_groups.remove(vg)

mesh = body.data
unweighted = sum(1 for v in mesh.vertices if not v.groups)
print(f"SKATER body={args.body} sleeves={SLEEVES} skirt={SKIRT} neckline={NECK} palette={args.palette or 'default'} verts={len(mesh.vertices)} faces={len(mesh.polygons)} split_edges={n_split} unweighted={unweighted} H={H:.3f} bones={len(arm_data.bones)}")
if unweighted:
    raise RuntimeError(f"{unweighted} vertices unweighted")

# ---------------------------------------------------------------- export
os.makedirs(os.path.dirname(OUT), exist_ok=True)
# the variant objects (hair styles, skirts) bind to the same armature as separate skinned meshes
for ob in variants:
    mod = ob.modifiers.new("Armature", "ARMATURE")
    mod.object = rig
    ob.parent = rig
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
rig.select_set(True)
for ob in variants:
    ob.select_set(True)
print(f"VARIANTS {[ob.name for ob in variants]}")
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_apply=True, export_animations=False, export_skins=True, export_yup=True, export_materials="EXPORT", export_image_format="AUTO")
print(f"EXPORTED {OUT} {os.path.getsize(OUT)} bytes")


def workbench(res_x, res_y):
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = res_x
    scene.render.resolution_y = res_y
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    if scene.world is None:
        scene.world = bpy.data.worlds.new("W")
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.type = "ORTHO"
    cam = bpy.data.objects.new("Cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    return cam


def render(cam, path, loc, rot, ortho):
    cam.data.ortho_scale = ortho
    cam.location = loc
    cam.rotation_euler = rot
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


# ---------------------------------------------------------------- boot close-ups
if args.boot_preview:
    os.makedirs(args.boot_preview, exist_ok=True)
    cam = workbench(800, 600)
    _, _, ankle_l, _ = leg_points("L")
    fx, fy, fz = ankle_l.x, ankle_l.y, 0.15
    render(cam, os.path.join(args.boot_preview, f"{args.body}_boot_side.png"), (fx + 3, fy, fz), (math.pi / 2, 0, math.pi / 2), 0.50)
    render(cam, os.path.join(args.boot_preview, f"{args.body}_boot_front34.png"), (fx + 2.2, fy - 2.2, fz + 0.9), (math.radians(72), 0, math.radians(45)), 0.46)
    render(cam, os.path.join(args.boot_preview, f"{args.body}_boot_front.png"), (fx, fy - 3, fz + 0.02), (math.pi / 2, 0, 0), 0.40)
    render(cam, os.path.join(args.boot_preview, f"{args.body}_boot_back34.png"), (fx + 2.2, fy + 2.2, fz + 0.9), (math.radians(72), 0, math.radians(135)), 0.46)
    print("BOOT_PREVIEW_DONE")

# ---------------------------------------------------------------- optional preview renders
if args.preview:
    os.makedirs(args.preview, exist_ok=True)
    cam = workbench(600, 900)
    # hand close-ups in the bind pose (the left hand, from the front and from outside)
    sh, _, _, tip = arm_points("L")
    hc = sh + (tip - sh) * 0.92
    render(cam, os.path.join(args.preview, f"{args.body}_hand_front.png"), (hc.x, hc.y - 2, hc.z), (math.pi / 2, 0, 0), 0.26)
    render(cam, os.path.join(args.preview, f"{args.body}_hand_out.png"), (hc.x + 2, hc.y, hc.z), (math.pi / 2, 0, math.pi / 2), 0.26)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    pb = rig.pose.bones
    for name, rot in {"thigh_L": (math.radians(-70), 0, 0), "shin_L": (math.radians(90), 0, 0), "upper_arm_L": (0, 0, math.radians(-80)), "upper_arm_R": (0, 0, math.radians(80)), "spine": (math.radians(10), 0, 0)}.items():
        pb[name].rotation_mode = "XYZ"
        pb[name].rotation_euler = rot
    bpy.ops.object.mode_set(mode="OBJECT")
    cz = GROUND + H / 2
    render(cam, os.path.join(args.preview, f"{args.body}_front.png"), (0, -5, cz), (math.pi / 2, 0, 0), H * 1.25)
    render(cam, os.path.join(args.preview, f"{args.body}_side.png"), (5, 0, cz), (math.pi / 2, 0, math.pi / 2), H * 1.25)
    render(cam, os.path.join(args.preview, f"{args.body}_iso.png"), (3.5, -3.5, cz + 0.3), (math.radians(80), 0, math.radians(45)), H * 1.25)
    render(cam, os.path.join(args.preview, f"{args.body}_torso.png"), (2.2, -2.2, z(0.72)), (math.radians(82), 0, math.radians(45)), 0.55)
    print("PREVIEW_DONE")
