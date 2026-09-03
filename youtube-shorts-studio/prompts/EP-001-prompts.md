# PROMPTS — EP-001

These are the exact prompt strings to run through OpenArt MCP in order.

## Character Reference Lock (used verbatim inside every generation)
### PIP (yellow bear-cub)
```
Pip: a round chibi yellow bear-cub 3D character, sunny yellow body, warm cream belly patch,
two small round ears, large glossy dark-brown eyes with white catchlights, tiny round nose,
small sweet smile, short stubby arms as round soft mitts (no separate fingers), short stubby
legs, signature teal scarf always on. Friendly, expressive, preschool toddler look.
```

### NANA (mint rabbit)
```
Nana: a round chibi mint-green rabbit 3D character, mint green body, white inner ears and
muzzle, two long soft ears, big friendly glossy eyes, two small front buck teeth, a pink
polka-dot bow on one ear, soft rounded plushy body. Gentle, warm.
```

### FLIPPY (coral fox)
```
Flippy: a round chibi coral-orange fox 3D character, coral body, cream chest, big pointy but
cute rounded ears, cheeky grin, upturned glossy eyes with a black band-aid on one ear,
shorter bushy tail, soft plushy rounded body. Fast, silly, playful.
```

### MOMO (cream chick)
```
Momo: a tiny round cream fluffy chick 3D character, warm cream feathers, big round glossy
dark eyes, tiny orange beak, two tiny wing stubs, tiny feet, waddles. Comically small and cute.
```

## Scene Prompts (append each to the STYLE_BIBLE base + chosen characters)
For the actual tool calls we build the full prompt = [STYLE base] + [environment] + [characters lock] + [scene action line from the storyboard].

### S1 (hook)
Full prompt assembled from storyboard S1.

### S2 (setup)
Full prompt assembled from storyboard S2.

### S3a / S3b / S3c (escalation)
Full prompts assembled from storyboard S3 blocks.

### S4 (payoff)
Full prompt assembled from storyboard S4.

### S5 (ending/loop)
Full prompt assembled from storyboard S5.

## Video Generation Motion Notes (per clip)
- **S1→S2:** Momo waddles behind leaf; trio walk in. Motion: low, gentle. 3s clip.
- **S2→S3:** Flippy tiptoes; camera tracks. Motion: medium. 4s.
- **S3 blocks:** each clip = ONE searching action (flip leaf / peek flower / check log / tap tree). Motion: simple, 3s each.
- **S4:** reveal + hug. Motion: joyful but controlled; leaf lifts, hug gathers. 4s.
- **S5:** Momo peek + wave + wink. Motion: small, steady, 3s.

All clips: "smooth children's 3D animation, natural body movement, no character deformation, background stable, gentle camera push."
