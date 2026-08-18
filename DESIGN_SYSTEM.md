# ATHLETA AI — DESIGN SYSTEM & OFFICIAL ART DIRECTION GUIDE

> **Version:** 1.0.0  
> **Target Platform:** Athleta AI Web & Mobile PWA  
> **Scope:** Visual Identity, Graphic Resources, 3D Anatomical Render Standards, and UI Components.

---

## 1. Brand Identity & Visual Philosophy

Athleta AI is a high-performance scientific workout prescription and nutrition platform. The visual identity reflects **biomechanical precision**, **hyper-realistic anatomical science**, and **elite athletic elegance**.

- **Primary Color Palette**: Obsidian Dark Canvas (`#09090B` / `bg-slate-950`), Dark Slate (`#0F172A`), Crimson Red Accent (`#E11D48` / `#FF2A55`), Cyan Highlight (`#06B6D4`), Emerald Green (`#10B981`).
- **Typography**: Plus Jakarta Sans / Inter for UI controls, Playfair Display or Heavy Sans for display headers.
- **Visual Vibe**: High contrast, dark studio lighting, metallic obsidian textures, and neon volumetric muscular highlights.

---

## 2. Mandatory 3D Anatomical Model Standard

All exercise illustrations and muscle group guides across Athleta AI **MUST** conform strictly to the following 3D anatomical rendering rules:

```
+-------------------------------------------------------------------------+
|                  3D ANATOMICAL MODEL SPECIFICATION                      |
+-------------------------------------------------------------------------+
| Background      : Dark Minimalist Charcoal Studio (#09090B)             |
| Lighting        : 45° Key Light + Crimson/Cyan Rim Specular Lighting    |
| Agonist Muscle  : Vibrant Crimson Red Neon Glow (#E11D48 / #FF2A55)     |
| Synergist Muscle: Warm Amber / Subtle Cyan Accent (#F59E0B / #06B6D4)   |
| Non-Target Body : Dark Metallic Obsidian / Slate Shading                |
| Perspective     : 3/4 Isometric / Anatomical View (Front, Back, Side)   |
| Aspect Ratio    : 1:1 Square (Card & Modal Compatible)                  |
| Render Engine   : 3D Ray-traced Ambient Occlusion with Soft Shadows     |
+-------------------------------------------------------------------------+
```

### 2.1 Standardized 3D Anatomical Assets

| Muscle Pattern | Motor Pattern | Primary Active Highlight | Standard Asset Path |
| :--- | :--- | :--- | :--- |
| **Squat / Quadríceps** | Agachamento, Leg Press | Quadríceps, Glúteos (Neon Crimson Glow) | `/src/assets/images/athletic_squat_3d_1786105958653.jpg` |
| **Hinge / Posteriores** | Stiff, RDL, Elevação Pélvica | Isquiotibiais, Glúteo Máximo (Neon Crimson) | `/src/assets/images/athletic_hinge_3d_1786106034930.jpg` |
| **Horizontal Push / Peitoral**| Supino Reto/Inclinado, Crucifixo | Peitoral Maior (Neon Crimson Glow) | `/src/assets/images/athletic_bench_3d_1786105975477.jpg` |
| **Pull / Costas** | Remada Curvada, Puxada Alta, Barra | Latíssimo do Dorso, Romboide (Neon Crimson) | `/src/assets/images/athletic_row_3d_1786105987331.jpg` |
| **Vertical Push / Ombros** | Desenvolvi. OHP, Elevação Lateral | Deltóide Anterior/Lateral (Neon Crimson) | `/src/assets/images/athletic_overhead_3d_1786105999818.jpg` |
| **Isolamento / Braços & Core** | Rosca Direta, Tríceps, Prancha | Bíceps Braquial, Tríceps, Core (Neon Crimson)| `/src/assets/images/athletic_arms_3d_1786106010485.jpg` |

---

## 3. UI Graphic & Iconography Standards

1. **Icons**:
   - Exclusively `lucide-react` vector icons.
   - Stroke width: `1.5px` or `2.0px`.
   - Never use solid raster icons or unstyled SVGs.

2. **Component Cards**:
   - Background: `bg-slate-900` with 1px border `border-slate-800`.
   - Hover state: `hover:border-slate-700` with smooth transition (`transition-all duration-300`).
   - Border radius: `rounded-2xl` (16px) for cards, `rounded-3xl` (24px) for modals.

3. **Status & Category Badges**:
   - Muscle Category: `bg-cyan-950/90 text-cyan-300 border border-cyan-500/30`.
   - Video Available: `bg-emerald-950/90 text-emerald-300 border border-emerald-500/30`.
   - High Fatigue/Warning: `bg-amber-950/90 text-amber-300 border border-amber-500/30`.

---

## 4. Mandatory Rules for New Images

When generating or importing new images into the application:
1. **Prompt Structure**: Always include `"3D anatomical model of athlete performing [exercise], detailed muscular anatomy, target muscles glowing in vibrant crimson red neon highlight, dark minimalist charcoal studio backdrop, 3D raytraced render"`.
2. **Format**: JPG or WebP with 1:1 aspect ratio.
3. **No Stock Photo Clutter**: Images must NOT show random gym background clutter, watermarks, faces, or non-anatomical clothing that distracts from the targeted muscle groups.

---

*Document created and maintained by Athleta AI Art Direction & UI Engineering.*
