# Movement Analyzer — Climbing Technique Catalog (v1 draft)

> Catalog of common climbing-technique mistakes the Movement Analyzer should detect and surface, paired with the pose-landmark math that backs each one. Drafted from public coaching sources (Lattice, Climbing.com, Hooper's Beta, The Climbing Doctor, UKC, Training4Climbing, etc.) and from academic prior art on pose-estimation for climbing (Beltrán 2023, Qu 2024, BlazePose).
>
> **You (Budnik) own this doc.** I drafted; you fine-tune. The catalog is the source of truth for what the detector tries to find.

---

## How to use this doc

Each entry has a stable ID (e.g. `H01`, `K07`). Use the `Coach review` line at the bottom of each entry to mark it up:

- `✓` — ship in v1, language is right
- `✓ but…` — keep, with a tweak (use the line to note what)
- `✗` — drop entirely (wrong, redundant, or not how you coach)
- `✎` — keep, but rewrite the coaching cue / detection signal
- `+` — add new entry below (give it the next available ID for that section)

When the doc is settled, the IDs become the rule-engine keys in code.

---

## Architectural foundations (read first)

These shape every detection rule below. Five takeaways from the pose-feasibility research:

1. **Finite-state machine per climbing phase** (Beltrán et al. 2023). Don't score frames in isolation. Climbing alternates between phases — *reaching, pulling, weight-transfer, stand-up, rest, dynamic-launch, latch*. The same joint angle is **correct in one phase and an error in another** (a bent arm is fine during a pull, wrong at a rest). Each technique rule below names which phase(s) it applies to.

2. **Visibility threshold ≥ 0.5** on every required landmark. MediaPipe hallucinates positions when joints are occluded. If `landmark.visibility < 0.5`, refuse to score that rule on that frame and show "low confidence" in the UI rather than a wrong number. This is mandatory, not an optimization.

3. **One-Euro filter on top of MediaPipe's internal Kalman** for any velocity-based detection (foot-search, dyno classification, hand/foot sequence). MediaPipe's smoothing is tuned for stationary upper-body, not athletic motion — climbing jitter exceeds the signal magnitude on subtle moves without extra filtering.

4. **Camera-angle warning at upload.** If the shoulder-hip line is not roughly vertical, OR the left/right ear landmarks aren't symmetric, the camera is off-axis. Refuse to score depth-dependent rules (any rule using `worldLandmarks.z`) and flag the user: "tilt your phone level next time, or stand directly side-on to the wall."

5. **`worldLandmarks.z` is the weakest axis.** Reported error roughly 2x larger than xy. Treat z **only as direction / relative trend**, never as an absolute measurement. "Hips moved further from the wall over time" is honest; "hips are 24 cm from the wall" is not.

---

## v1 shortlist (Easy detectability — promote these aggressively)

These are the rules we can build with high confidence on day one. Joint-angle math from 3 well-tracked landmarks, no z-axis dependence, validated against motion capture at <10° mean error.

| ID | Name | Primitive | Wall angle |
|---|---|---|---|
| S01 | Bent arms at rest | `elbow_angle` per arm during static phases | Vertical, Overhang |
| S04 | Chicken-wing elbow on lock-off | `shoulder_elbow_wrist_angle` + elbow-vs-wrist height | Any |
| S05 | Shrugged shoulders | `acromion_to_ear` vertical distance under load | Any |
| K01 | High step without body follow | `ankle_y - hip_y` AND lateral `hip_to_ankle_x` offset | Slab, Vertical |
| K02 | Heel raised on a smear | `ankle_dorsiflexion` proxy (foot-index vs heel y) | Slab |
| K05 | Knee valgus collapse (knees-in) | `hip_knee_ankle` frontal-plane projection angle | Slab |
| W01 | Pulling instead of pushing (arm-initiated) | `elbow_flexion_velocity` *before* `knee_extension_velocity` | Any |
| G01 | Head down / not tracking the foot | `head_pitch` correlated with `ankle_y` placement events | Slab |

---

## v1 stretch (Medium detectability — ship with confidence-scoring + "approximate" UI language)

Detectable, but report direction rather than precise magnitude. UI should say "your hips are moving away from the wall on this clip" rather than "your hips are 18.4° off vertical."

| ID | Name | Primitive | Notes |
|---|---|---|---|
| H01 | Hips peeling off wall (banana sag) | `hip_to_shoulder_ankle_line_deviation` (sag from chain) | Side-on camera needed |
| H02 | Square hips ("ladder climbing") | `hip_line_angle - shoulder_line_angle` (rotation delta) | Direction reliable; degree count is not |
| H03 | Hips into wall on slab ("hugging") | Same primitive as H01, opposite sign on wall angle | Slab only |
| K06 | Cutting feet uncontrolled | Both ankles `z`-spike away from wall simultaneously | Z-axis noisy — use 2D xy-displacement as backup |
| K07 | Foot search / tap-dance before commit | Ankle velocity entropy per placement (≥ 3 touches) | Robust at 10–15 Hz windows |
| S02 | Pulling with arms before legs extend | Elbow-angle decrease *before* knee-angle increase | Temporal sequence, not absolute |
| W02 | Barn-door / COM outside base of support | `hip_x` outside the polygon formed by current foot positions | High-confidence on side-on view |
| W03 | Dynamic when static would work (or vice versa) | CoM velocity profile per move + grade-relative thresholds | Needs move-segmentation |
| W04 | No hip lead — arm-initiated reaches | `hip_velocity` lag vs `wrist_velocity` at move start | Direction reliable |
| G02 | Looking up before the foot is set | Temporal: head pitch rises *before* the placing-ankle stabilizes | Slab-specific |

---

## Deferred (v2+ or never — be honest with users about this)

These either need hardware we don't have (LiDAR, multi-camera) or model components we don't ship (Hand Landmarker, FaceMesh-iris).

| ID | Name | Why deferred |
|---|---|---|
| X01 | Hip-to-wall *absolute* distance (e.g. "your hips are 30 cm out") | Monocular z error is too large; need LiDAR (Beltrán used iPad Pro LiDAR) |
| X02 | Grip type classification (crimp / open / pinch / sloper) | Pose model has no finger joints. Hand Landmarker exists but hands fill <50 px at climbing distance |
| X03 | Over-gripping (grip force) | Not visible at any landmark level — would need pressure sensors on the wall |
| X04 | Breath-holding | Chest expansion is below MediaPipe's signal threshold |
| X05 | Precise gaze direction ("did they look at the next hand?") | FaceMesh + iris needs face large in frame; climbers face the wall |
| X06 | Z-clipping / sport-lead clip technique | Needs rope + draw detection, not pose |
| X07 | Heel-hook engagement quality (passive vs active) | Requires knowing where the hold-feature is |
| X08 | Toe-hook detection | Same as X07 |
| X09 | Kneebar engagement | Same as X07 — needs opposing-surface detection |

We surface a tactful explanation in the UI when a user asks "why don't you check my grip?" — frame as a v1 scope decision, not a permanent limit.

---

## Full catalog (browse mode)

Organized by body region, then within each region by wall angle. Detectability ratings come from Agent C's pose-feasibility research.

### H — Hips & Core

#### H01 — Hips peeling off wall (banana sag)
- **Description:** On overhang, hips hang back from the wall instead of being driven up close. Whole body forms an open arc; fingers take all the load; feet skate off.
- **Visual indicator:** Hip midpoint is significantly behind the line connecting shoulder midpoint to ankle midpoint. Spine forms a convex curve away from wall.
- **Coaching cue:** *"Hips to the wall — suck it in."*
- **Wall angle:** Overhang, roof
- **Phase:** Pulling, weight-transfer
- **Detectability:** Medium — direction reliable, magnitude approximate
- **Primitive(s):** `hip_to_shoulder_ankle_line_deviation`, `hip_to_wall_z` (relative trend only)
- **Source:** [Climb Fit — How To Climb Overhangs](https://www.climbfit.com.au/how-to-climb-overhangs/), [The Climbing Doctor](https://theclimbingdoctor.com/strength-for-overhang-climbing-improving-core-strength-and-body-positioning/)
- **Coach review:** _________

#### H02 — Square hips / "ladder climbing"
- **Description:** Climber faces wall with hips parallel through every reach, never turning a hip in. Arms over-extend to compensate.
- **Visual indicator:** Both knees point at wall; hip-line stays parallel to shoulder-line through reach moves; arms work to lock off where a hip turn would have made the reach static.
- **Coaching cue:** *"Turn the hip in — same-side hip to the wall."*
- **Wall angle:** Vertical, Overhang
- **Phase:** Reaching
- **Detectability:** Medium — direction reliable; magnitude approximate
- **Primitive(s):** `hip_shoulder_rotation_delta` (angle between hip-line and shoulder-line vectors)
- **Source:** [Bliss Climbing — Hips and Dimes](https://climbbliss.com/technique/hips-and-dimes-improve-your-position-become-amazing/), [Climbing — The Hips Don't Lie](https://www.climbing.com/skills/the-hips-dont-lie/)
- **Coach review:** _________

#### H03 — Hips pasted to wall on slab ("hugging")
- **Description:** Climber instinctively hugs the slab for security. Pelvis pressed to rock, butt below shoulders, knees collapsing in — friction drops because feet are under-loaded.
- **Visual indicator:** Hip-to-wall distance near zero while ankle-to-wall is positive; pelvis tilts the hip joint vertically *above* the ankle instead of behind it.
- **Coaching cue:** *"Butt out — nose over toes."*
- **Wall angle:** Slab
- **Phase:** Any stance
- **Detectability:** Medium — same primitive as H01 with inverted correctness for slab
- **Primitive(s):** `hip_x_vs_ankle_x`, `shoulder_hip_ankle_line_tilt`
- **Source:** [Climbing — How to Slab Climb](https://www.climbing.com/skills/how-to-slab-climb/), [Touchstone — Slab Secrets](https://touchstoneclimbing.com/keys-for-staying-on-your-feet-slab-secrets-revealed/)
- **Coach review:** _________

#### H04 — Cross-loaded COM (hands and feet stacked on opposite sides)
- **Description:** Climber leaves CoM outside the polygon connecting points of contact. Barn-door is one free limb away.
- **Visual indicator:** Hip midpoint x-coord falls *outside* the lateral range of currently-loaded ankle x-coords.
- **Coaching cue:** *"Hands over feet — stack the COM."*
- **Wall angle:** Vertical, Overhang
- **Phase:** Any
- **Detectability:** Easy on side-on view
- **Primitive(s):** `com_outside_support_polygon` (hip vs ankle range)
- **Source:** [Philly Rock Gym — Avoiding the Barn Door](https://philarockgym.com/how-to-prevent-the-annoying-barn-door-in-climbing/)
- **Coach review:** _________

#### H05 — Loss of body tension (involuntary feet cut)
- **Description:** Core/glutes disengage mid-move; feet swing off uncontrollably; legs trail behind body; arms take 100% of weight.
- **Visual indicator:** Both ankle z-positions spike away from wall simultaneously *during* a reach, not at its peak.
- **Coaching cue:** *"Toes pull in — squeeze the box."*
- **Wall angle:** Overhang, Roof
- **Phase:** Reaching, latch
- **Detectability:** Medium (z-spikes noisy; back-up with 2D xy displacement of ankles relative to hips)
- **Primitive(s):** `feet_cut_event`, `hip_ankle_distance_increase`
- **Source:** [The Climbing Doctor — Body Tension](https://theclimbingdoctor.com/climbing-specific-body-tension-2/), [Atomique Coaching](https://www.atomiquecoaching.com/blog/steep-climbing-101-how-to-train-body-tension)
- **Coach review:** _________

#### H06 — No hip lead (arm-initiated movement)
- **Description:** Climber starts every reach with the arm; hips don't travel between holds.
- **Visual indicator:** Wrist velocity peaks first; hip midpoint velocity lags by ≥ 200 ms (or doesn't move at all).
- **Coaching cue:** *"Lead with the hips — throw the hip first."*
- **Wall angle:** Any
- **Phase:** Reaching
- **Detectability:** Medium — direction of temporal sequence reliable
- **Primitive(s):** `wrist_velocity_lead_time_vs_hip`
- **Source:** [Climbing — The Hips Don't Lie](https://www.climbing.com/skills/the-hips-dont-lie/), [PitchSix Hip Rotation Drill](https://pitchsix.com/blogs/academy/academy-hip-rotation-drill)
- **Coach review:** _________

#### H07 — Core sag on roof
- **Description:** On near-horizontal terrain, hips droop below the line connecting hands and feet, breaking the kinetic chain.
- **Visual indicator:** Hip y-position drops below the interpolated wrist-y to ankle-y line during a near-horizontal climbing pose.
- **Coaching cue:** *"Squeeze the box — hips up."*
- **Wall angle:** Roof
- **Phase:** Any
- **Detectability:** Medium — needs roof-orientation detection
- **Primitive(s):** `hip_below_wrist_ankle_chord`
- **Source:** [Climbing — Master Roof Climbing](https://www.climbing.com/skills/climbing-techniques-how-to-climb-roofs/)
- **Coach review:** _________

#### H08 — No "frog" / hip turnout missing
- **Description:** Climber keeps knees forward instead of opening them out to bring the pelvis flush to the wall.
- **Visual indicator:** Knees point straight at wall during a stance with both feet on; pelvis floats away from wall; no rest is achievable.
- **Coaching cue:** *"Knees out, hips in."*
- **Wall angle:** Vertical, Overhang
- **Phase:** Resting, weight-transfer
- **Detectability:** Medium — knee orientation in xy-plane reliable, hip-to-wall depth weaker
- **Primitive(s):** `knee_lateral_angle`, `hip_to_wall_z` (relative)
- **Source:** [Hooper's Beta — High Feet & Open Hips](https://www.hoopersbeta.com/library/3-steps-to-improve-your-high-feet-open-hips), [Boulderinginfo — Frogging](https://boulderinginfo.online/introduction-to-bouldering/technics-of-bouldering-and-climbing/frogging/)
- **Coach review:** _________

---

### K — Knees & Footwork

#### K01 — High step without body follow
- **Description:** Foot placed high on a hold, but pelvis stays low/away and the climber can't transfer weight onto it.
- **Visual indicator:** Knee y-position rises high (near armpit), but hip y-position stays below the new foot's y. No hip-over-foot transfer.
- **Coaching cue:** *"Drive the hip OVER the high foot."*
- **Wall angle:** Vertical, Slab
- **Phase:** Weight-transfer, stand-up
- **Detectability:** Easy
- **Primitive(s):** `ankle_y - hip_y`, `hip_lateral_offset_from_ankle`
- **Source:** [Hooper's Beta](https://www.hoopersbeta.com/library/3-steps-to-improve-your-high-feet-open-hips), [TrainingBeta — Hip Mobility](https://www.trainingbeta.com/hip-mobility-for-rock-climbers/)
- **Coach review:** _________

#### K02 — Heel raised on a smear
- **Description:** Climber points toes / lifts heel on a slab smear; rubber-to-wall contact patch shrinks; foot pops.
- **Visual indicator:** Foot-index (toe) y-position lower than heel y-position; ankle dorsiflexion negative.
- **Coaching cue:** *"Drop the heel."*
- **Wall angle:** Slab
- **Phase:** Any
- **Detectability:** Easy (foot-index and heel are tracked, though noisy)
- **Primitive(s):** `ankle_dorsiflexion_proxy = heel_y - foot_index_y`
- **Source:** [Climbing — Friction Slabs / Hazel Findlay](https://www.climbing.com/skills/friction-slabs-tips-from-hazel-findlay/), [Climbing House — Smearing](https://climbinghouse.com/smearing-technique-what-how/)
- **Coach review:** _________

#### K03 — Foot search / tap-dancing
- **Description:** Climber lifts and re-places the foot multiple times before weighting; arms hold extra weight while feet shuffle.
- **Visual indicator:** ≥ 3 ankle-position dips on the same foot in < 1 second; horizontal jitter > stable placement.
- **Coaching cue:** *"First placement is final."*
- **Wall angle:** Any
- **Phase:** Foot-move
- **Detectability:** Medium — needs One-Euro filter to avoid false positives from MediaPipe foot jitter
- **Primitive(s):** `foot_placement_entropy`, `ankle_settle_duration`
- **Source:** [Climbing — 10 Footwork Tips](https://www.climbing.com/skills/quit-floundering-turn-your-feet-into-precision-instruments-with-these-10-tips/), [Training4Climbing](https://trainingforclimbing.com/improve-climbing-footwork-with-target-practice/)
- **Coach review:** _________

#### K04 — Noisy / slapping foot placement
- **Description:** Foot smacks the wall with momentum, then needs correction.
- **Visual indicator:** Ankle velocity at contact > threshold (e.g. > 2 m/s in worldLandmarks); ≥ 2 micro-adjustments after first contact.
- **Coaching cue:** *"Silent feet — place, don't slap."*
- **Wall angle:** Any
- **Phase:** Foot-move
- **Detectability:** Medium — velocity reliable, post-contact correction less so
- **Primitive(s):** `ankle_contact_velocity`
- **Source:** [Climbing — Improve Your Footwork](https://www.climbing.com/skills/how-to-improve-footwork-climbing/), [MojaGear — Silent Feet](https://mojagear.com/new-climber-tip-silent-feet/)
- **Coach review:** _________

#### K05 — Knee valgus collapse (knees-in on slab/stand-up)
- **Description:** Knees cave toward midline (genu valgus) under load; kneecap points inward; foot rotates off the smear.
- **Visual indicator:** Knee x-coord is medial to ankle x-coord in frontal view; hip-knee-ankle vectors form an inward angle.
- **Coaching cue:** *"Drive the knee over the toe."*
- **Wall angle:** Slab, vertical
- **Phase:** Stand-up, weight-transfer
- **Detectability:** Medium — direction yes, degrees no (MediaPipe FPPA biased ~19° vs mocap)
- **Primitive(s):** `frontal_plane_projection_angle` (FPPA) — direction-only
- **Source:** [The Climbing Doctor — Hip Mobility](https://theclimbingdoctor.com/hip-mobility-a-climbers-secret-weapon-2/), [FPPA literature, IJSPT](https://pmc.ncbi.nlm.nih.gov/articles/PMC9718689/)
- **Coach review:** _________

#### K06 — Cutting feet uncontrolled (especially on a deadpoint latch)
- **Description:** Feet release uncontrolled during a dynamic latch; climber swings out and can't re-pin.
- **Visual indicator:** Both ankle-to-wall z values spike at the moment of latch (or in image-space: both ankles drop below knees as legs swing).
- **Coaching cue:** *"Latch — then squeeze the feet back."*
- **Wall angle:** Overhang
- **Phase:** Latch (post-dynamic)
- **Detectability:** Medium — 2D backup primitive needed because z is noisy
- **Primitive(s):** `feet_cut_event`, `ankle_pendulum_amplitude`
- **Source:** [Conquer Your Crux — Deadpoint](https://www.conqueryourcrux.com/how-to-deadpoint-in-climbing/), [Climbing — Roof Climbing](https://www.climbing.com/skills/climbing-techniques-how-to-climb-roofs/)
- **Coach review:** _________

#### K07 — Hands move before feet (over-reaching cycle)
- **Description:** Climber over-extends the arms upward then drags feet up afterwards — repeated pull-up-then-feet pattern.
- **Visual indicator:** Wrist y rises sharply before ankle y rises (temporal lag > 500 ms between wrist event and next ankle event).
- **Coaching cue:** *"Feet first, then hands."*
- **Wall angle:** Any (esp. slab/vertical)
- **Phase:** Move sequencing
- **Detectability:** Easy
- **Primitive(s):** `wrist_y_velocity` vs `ankle_y_velocity` temporal correlation
- **Source:** [The Climbing Doctor — Three Common Errors](https://theclimbingdoctor.com/three-common-errors-made-by-new-climbers/)
- **Coach review:** _________

#### K08 — Missed drop-knee on twin feet
- **Description:** When both feet are placed, climber doesn't twist a knee down to lock the hip in and extend the reach.
- **Visual indicator:** Both knees square (not laterally offset from ankles); hip-line stays parallel to wall through the reach; reach feels short.
- **Coaching cue:** *"Drop the same-side knee."*
- **Wall angle:** Vertical, Overhang
- **Phase:** Reaching
- **Detectability:** Medium
- **Primitive(s):** `knee_lateral_offset_from_ankle`, `hip_shoulder_rotation_delta`
- **Source:** [Climbing — Drop-Knee Technique](https://www.climbing.com/skills/drop-knee-climbing-technique/)
- **Coach review:** _________

#### K09 — Missed outside edge on steep terrain
- **Description:** Climber uses inside edge with hips square on a steep wall where an outside edge + back step would set up the reach.
- **Visual indicator:** Toe-vector points directly at wall (inside edge); hip-shoulder rotation delta near zero; arms doing all the lock-off.
- **Coaching cue:** *"Pinky toe — drop the hip."*
- **Wall angle:** Overhang
- **Phase:** Reaching
- **Detectability:** Medium — foot rotation about ankle is approximate from foot-index landmark
- **Primitive(s):** `foot_rotation_about_ankle`, `hip_shoulder_rotation_delta`
- **Source:** [Climbing — Master Outside Edging](https://www.climbing.com/skills/outside-edge-steep-climb-technique-how-to/)
- **Coach review:** _________

#### K10 — Foot used as platform (toe not drilled in)
- **Description:** On overhang, climber places foot passively like it's standing on a stair, instead of actively pressing the toe through the hold.
- **Visual indicator:** Calf-line is relaxed (no visible tension); ankle in neutral position at moment of weighting; foot pops shortly after.
- **Coaching cue:** *"Drill the toe through the hold."*
- **Wall angle:** Overhang
- **Phase:** Any
- **Detectability:** Hard — calf tension isn't a landmark, only inferable from posture
- **Primitive(s):** `ankle_plantarflexion_proxy`, `calf_line_angle` (approximate)
- **Source:** [Climb Fit — How To Climb Overhangs](https://www.climbfit.com.au/how-to-climb-overhangs/)
- **Coach review:** _________

#### K11 — Passive flag (free leg dangling)
- **Description:** Free leg dangles as dead weight instead of actively pressing/smearing into the wall.
- **Visual indicator:** Free-foot toe-to-wall z-distance large (> body-width); free leg swings during the reach instead of staying braced.
- **Coaching cue:** *"Push the flag into the wall."*
- **Wall angle:** Vertical
- **Phase:** Reaching, weight-transfer
- **Detectability:** Medium — relies on z-axis for "in vs out of wall"; backup: free-ankle stillness vs body
- **Primitive(s):** `free_ankle_to_wall_distance`, `free_ankle_stillness`
- **Source:** [FlashPumped — How to Flag](https://www.flashpumped.com/blog/how-to-flag/), [Climbing.com — Flagging](https://www.climbing.com/skills/flagging/)
- **Coach review:** _________

#### K12 — Flagging foot above the knee
- **Description:** Free leg raised high and tensed for a flag instead of letting it drop low and pendulum.
- **Visual indicator:** Free-leg ankle y-position above same-side knee y-position during a counter-balance move.
- **Coaching cue:** *"Long flag — foot below the knee."*
- **Wall angle:** Vertical
- **Phase:** Reaching
- **Detectability:** Easy
- **Primitive(s):** `free_ankle_y - knee_y`
- **Source:** [Climbing — Learn Flagging](https://www.climbing.com/skills/flagging/)
- **Coach review:** _________

---

### S — Shoulders & Arms

#### S01 — Bent arms at rest
- **Description:** Climber holds positions with elbows flexed instead of skeletally hanging between moves. Forearms pump out fast.
- **Visual indicator:** Elbow angle persistently < 150° during phases classified as "rest" or "stance"; no straight-arm dwell before the next move.
- **Coaching cue:** *"Hang from bone."*
- **Wall angle:** Vertical, Overhang
- **Phase:** Rest, stance
- **Detectability:** Easy
- **Primitive(s):** `elbow_angle` per arm, `phase_classifier`
- **Source:** [Philly Rock Gym — Straight Arms](https://philarockgym.com/what-is-straight-arming-and-why-every-climber-should-do-it/), [Vertical Horizons](https://www.verticalhorizonsclimbinggym.com/post/climbing-with-straight-arms)
- **Coach review:** _________

#### S02 — Pulling instead of pushing (arm-initiated movement)
- **Description:** Climber initiates upward movement with bicep curl on the handhold rather than extending the trailing leg.
- **Visual indicator:** Elbow flexion decreases (bicep curl) BEFORE knee extension; shoulder rises while hip stays at same height relative to feet.
- **Coaching cue:** *"Stand up tall on the foot."*
- **Wall angle:** Any (esp. Slab, Vertical)
- **Phase:** Stand-up, weight-transfer
- **Detectability:** Easy
- **Primitive(s):** `elbow_flexion_velocity` vs `knee_extension_velocity` temporal sequence
- **Source:** [The Climbing Doctor — Three Common Errors](https://theclimbingdoctor.com/three-common-errors-made-by-new-climbers/), [Online Climbing Coach](http://onlineclimbingcoach.blogspot.com/2006/08/specific-technique-feet-are-for.html)
- **Coach review:** _________

#### S03 — T-Rex arms (elbows pulled to ribs)
- **Description:** Elbows clamped to the ribs, hands pulled in close to the chest, climber "hugs" the wall instead of pushing or hanging straight.
- **Visual indicator:** Elbow flexion < 90°; wrist-to-shoulder horizontal distance small; biceps visibly active.
- **Coaching cue:** *"Long arms — push, don't pull."*
- **Wall angle:** Slab (especially), Vertical
- **Phase:** Stance, reaching
- **Detectability:** Easy
- **Primitive(s):** `elbow_angle`, `wrist_to_shoulder_x_distance`
- **Source:** [Go Climb Magazine — 4 Mistakes](https://goclimbmagazine.com/4-mistakes-climbers-make-and-how-to-fix-them/), [Climbing — Hazel Findlay on Slabs](https://www.climbing.com/skills/friction-slabs-tips-from-hazel-findlay/)
- **Coach review:** _________

#### S04 — Chicken-wing elbow on lock-off
- **Description:** Elbow rotates up and away from the ribs during a lock-off — force mis-aligned into the joint instead of the lat. Long-term shoulder injury risk.
- **Visual indicator:** Elbow y-position rises above wrist y-position during a hard pull; elbow flares laterally from the body.
- **Coaching cue:** *"Elbows to ribs — tennis balls in the armpits."*
- **Wall angle:** Any
- **Phase:** Pulling, lock-off
- **Detectability:** Easy
- **Primitive(s):** `elbow_y_minus_wrist_y`, `elbow_lateral_offset_from_shoulder`
- **Source:** [Mend Colorado — Chicken-Wing](https://www.mendcolorado.com/physical-therapy-blog/2022/6/7/why-do-we-chicken-wing-in-rock-climbing/), [Boulder Climbing Community](https://www.boulderclimbers.org/news/2022/10/31/the-science-of-the-chicken-wing)
- **Coach review:** _________

#### S05 — Shrugged shoulders (failed scapular set)
- **Description:** Scapulae ride up toward the ears under load instead of being depressed/retracted; engages neck instead of lats.
- **Visual indicator:** Acromion-to-ear vertical distance shortens under load; head appears to "sink" between shoulders.
- **Coaching cue:** *"Long neck — shoulders down."*
- **Wall angle:** Any
- **Phase:** Hang, stance
- **Detectability:** Easy
- **Primitive(s):** `shoulder_to_ear_vertical_distance`
- **Source:** [The Climbing Doctor — Scapular Instability](https://theclimbingdoctor.com/scapular-instability/), [Training For Climbing — Scapular Pull-up](https://trainingforclimbing.com/the-best-exercise-youre-not-doing-the-scapular-pull-up/)
- **Coach review:** _________

#### S06 — Shoulder dump (failed scap engagement under load)
- **Description:** Climber hangs deadweight off a fully extended arm with scapula collapsed up toward the ear — "noodle shoulder." Injury risk plus inefficient.
- **Visual indicator:** Acromion rides high (close to ear) AND elbow fully extended AND high body-weight load on that arm.
- **Coaching cue:** *"Pack the shoulder — pull the blade down."*
- **Wall angle:** Overhang
- **Phase:** Hang
- **Detectability:** Easy (combination of S05 + S01 detectors)
- **Primitive(s):** `shoulder_to_ear_vertical_distance` + `elbow_angle` (combined trigger)
- **Source:** [Training For Climbing — Scapular Pull-up](https://trainingforclimbing.com/the-best-exercise-youre-not-doing-the-scapular-pull-up/)
- **Coach review:** _________

#### S07 — No scap engagement on dynamic catch
- **Description:** On a dyno catch the shoulder is fully passive — shoulder rolls forward, head of humerus exposed. High injury risk.
- **Visual indicator:** Shoulder visibly extends forward of chest line at moment of catch; "rag-doll" arm.
- **Coaching cue:** *"Engage the shoulder before you weight it."*
- **Wall angle:** Overhang
- **Phase:** Latch
- **Detectability:** Medium — temporal correlation with latch event needed
- **Primitive(s):** `shoulder_forward_z`, `latch_event_detector`
- **Source:** [Hooper's Beta — Inaccurate Advice](https://www.hoopersbeta.com/library/inaccurate-climbing-advice-i-hear-every-day-even-from-pros)
- **Coach review:** _________

#### S08 — Cross-body reach without hip rotation
- **Description:** Climber reaches across the body to a hold without turning the same-side hip in. Maximum leverage disadvantage.
- **Visual indicator:** Hip-line parallel to shoulder-line during a cross-reach; reaching shoulder rounded; opposite hip not driven into the wall.
- **Coaching cue:** *"Same-side hip to the wall before you reach."*
- **Wall angle:** Vertical, Overhang
- **Phase:** Reaching
- **Detectability:** Medium
- **Primitive(s):** `hip_shoulder_rotation_delta`, `wrist_lateral_position_vs_shoulder`
- **Source:** [Philly Rock Gym — Twist-Locking: Back-Stepping](https://philarockgym.com/twist-locking-series-the-basics-of-back-stepping/), [Climbing Collective — Twist-Locking](https://climbing-collective.com/twist-locking-series-the-complete-guidelines/)
- **Coach review:** _________

---

### G — Head & Gaze

#### G01 — Eyes off the foot during placement
- **Description:** Climber looks up at the next hand reach before the foot is weighted, causing slips.
- **Visual indicator:** Head pitch rises (chin up) while the placing ankle is still in motion or just contacting.
- **Coaching cue:** *"Watch the foot until it sticks."*
- **Wall angle:** Slab, Vertical
- **Phase:** Foot-move, weight-transfer
- **Detectability:** Easy (binary: head-up vs head-tracking-down)
- **Primitive(s):** `head_pitch` correlated with `ankle_settle_event`
- **Source:** [Butora — Footwork Tips](https://butorausa.com/blogs/beta-blog/improve-your-climbing-footwork-with-these-tips-and-techniques), [Boulderflash — Slab](https://boulderflash.com/slab-climbing-how-not-to-suck/)
- **Coach review:** _________

#### G02 — Gaze-down panic (slab fear posture)
- **Description:** Climber stares at the ground or directly down between their feet, narrowing visual exploration. Locks the neck and signals fear.
- **Visual indicator:** Head pitch strongly negative for sustained period (> 2s); ears drop below shoulder line.
- **Coaching cue:** *"Eyes on the next foot, not the ground."*
- **Wall angle:** Slab
- **Phase:** Any
- **Detectability:** Medium — face landmarks weaker when climber faces wall
- **Primitive(s):** `head_pitch`, `ear_to_shoulder_y_distance`
- **Source:** [NCBI — Visual Exploration under Fear of Heights](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4148313/)
- **Coach review:** _________

#### G03 — Head dropped back / cervical hyperextension
- **Description:** Climber cranes the neck back to spot the next hand hold, pulling shoulders up and disrupting alignment.
- **Visual indicator:** Chin pointed at sky (head pitch strongly positive); cervical spine compressed; shoulders rise toward ears.
- **Coaching cue:** *"Neutral neck — look with the eyes, not the chin."*
- **Wall angle:** Any
- **Phase:** Route-reading mid-climb
- **Detectability:** Easy
- **Primitive(s):** `head_pitch_positive_extreme`
- **Source:** [Hooper's Beta — Climber's Hunch](https://www.hoopersbeta.com/library/lets-end-the-climbers-hunch-epidemic-how-to-fix-bad-posture)
- **Coach review:** _________

---

### W — Whole-body sequencing

#### W01 — Three-point-contact loss on reach
- **Description:** Climber moves a hand while also moving (or losing) a foot, dropping below three points of contact and barn-dooring.
- **Visual indicator:** Two or more limbs simultaneously off-wall during a non-dynamic move.
- **Coaching cue:** *"Three before you free."*
- **Wall angle:** Vertical (especially), Slab
- **Phase:** Reaching
- **Detectability:** Medium — limb-to-wall z is the weak axis; backup: count limbs with ≥ 100 ms stillness
- **Primitive(s):** `limbs_in_contact_count`
- **Source:** [Climber Magazine — Top Technique Tips](https://www.climber.co.uk/indoor/indoor-climbing/top-1-technique-tips-for-indoor-climbing/)
- **Coach review:** _________

#### W02 — Static lock-off when a deadpoint is needed
- **Description:** Climber grinds a move statically that requires a controlled dynamic moment, falls just short.
- **Visual indicator:** Slow ratcheting CoM motion toward a hold; fingertip grazes target then falls. Visible bicep/lat strain at peak.
- **Coaching cue:** *"Generate from the legs — deadpoint it."*
- **Wall angle:** Vertical, Overhang
- **Phase:** Reaching
- **Detectability:** Medium — hold position unknown, but failed-reach pattern is detectable
- **Primitive(s):** `wrist_velocity_curve`, `reach_failure_event`
- **Source:** [Climbing — Train Dynamic Climbing](https://www.climbing.com/skills/why-to-train-dynamic-climbing/)
- **Coach review:** _________

#### W03 — Hesitation on a deadpoint (aborted launch)
- **Description:** Climber begins to generate then aborts mid-swing — kills momentum and misses the catch.
- **Visual indicator:** CoM accelerates upward, then decelerates *before* the latch point. Visible "hitch" — hips rise then drop before the reach.
- **Coaching cue:** *"Commit — no half-moves."*
- **Wall angle:** Vertical, Overhang
- **Phase:** Dynamic-launch
- **Detectability:** Medium — CoM velocity profile clear, but requires move-segmentation
- **Primitive(s):** `com_velocity_dip_before_peak`
- **Source:** [Conquer Your Crux — Deadpoint](https://www.conqueryourcrux.com/how-to-deadpoint-in-climbing/)
- **Coach review:** _________

#### W04 — Hands-heavy sequencing on steep terrain
- **Description:** Climber makes 3-4 hand moves between every foot move on overhang, instead of constantly resetting feet.
- **Visual indicator:** Ratio of hand-movement events to foot-movement events > ~1.5 across an overhang segment.
- **Coaching cue:** *"More foot moves than hand moves."*
- **Wall angle:** Overhang
- **Phase:** Whole-sequence
- **Detectability:** Medium — needs reliable per-limb move event detection
- **Primitive(s):** `hand_to_foot_move_ratio`
- **Source:** [Training For Climbing — Ondra Performance Analysis](https://trainingforclimbing.com/performance-analysis-of-adam-ondras-breakthrough-ascent-of-the-worlds-first-5-15d-9c/)
- **Coach review:** _________

#### W05 — Bent arms before a dynamic move
- **Description:** Climber pre-bends arms before generating, losing the hang/swing that creates upward force.
- **Visual indicator:** Elbow angle < 120° at the start of a dynamic launch (no wind-up extension).
- **Coaching cue:** *"Hang first, then pop."*
- **Wall angle:** Vertical, Overhang
- **Phase:** Dynamic-launch
- **Detectability:** Easy
- **Primitive(s):** `elbow_angle_pre_launch`
- **Source:** [Climbing House — Deadpoint](https://climbinghouse.com/), [ClimbingFacts — Deadpointing](https://climbingfacts.com/deadpointing/)
- **Coach review:** _________

#### W06 — Rushing through moves (no rest pauses)
- **Description:** Climber blasts through the route at constant speed, never pausing at jugs/stems to recover or assess.
- **Visual indicator:** No CoM velocity dwell (< 0.1 m/s for > 1s) at potential rest stances throughout climb. Constant motion.
- **Coaching cue:** *"Find the rest, then move."*
- **Wall angle:** Vertical, Overhang
- **Phase:** Whole-sequence
- **Detectability:** Medium — rest stances are inferred (not detected from holds)
- **Primitive(s):** `com_velocity_dwell_events`
- **Source:** [Climbing — Effective Resting](https://www.climbing.com/skills/effective-resting-for-rock-climbing?scope=anon)
- **Coach review:** _________

#### W07 — Tunnel vision / no route reading
- **Description:** Climber climbs hold-to-hold reactively, never previews the full sequence. Ends up mid-route in wrong body position.
- **Visual indicator:** Frequent backtracks (wrist or ankle reversing direction within < 2s); sudden body re-orients mid-section.
- **Coaching cue:** *"Read 3 moves ahead."*
- **Wall angle:** Any
- **Phase:** Whole-sequence
- **Detectability:** Medium — backtrack detection is approximate
- **Primitive(s):** `limb_backtrack_events`
- **Source:** [Climbing — Reading Routes](https://www.climbing.com/skills/reading-routes/)
- **Coach review:** _________

#### W08 — Big steps between feet
- **Description:** Climber skips intermediate footholds and takes a single tall step, momentarily unweighting the trailing foot.
- **Visual indicator:** Foot displacement between consecutive placements > 1.5× average step length for this clip; large knee-flexion spike on the new foot.
- **Coaching cue:** *"Baby steps."*
- **Wall angle:** Slab (especially)
- **Phase:** Foot-move
- **Detectability:** Easy
- **Primitive(s):** `foot_step_length`, `knee_flexion_spike_at_placement`
- **Source:** [Climber News — Slab Technique](https://climbernews.com/what-is-slab-climbing-slab-climbing-technique/)
- **Coach review:** _________

#### W09 — Wrong-side reach (no flag, no foot push)
- **Description:** Climber reaches with right hand while pushing on right foot, with no flag — guaranteed barn-door.
- **Visual indicator:** Active hand and the loaded foot are on the same side of the body's midline; opposite leg has no wall contact (no flag).
- **Coaching cue:** *"Opposite foot pushes."*
- **Wall angle:** Vertical (especially), Overhang
- **Phase:** Reaching
- **Detectability:** Medium — needs reliable "active hand" + "loaded foot" detection
- **Primitive(s):** `active_hand_side`, `loaded_foot_side`, `free_leg_contact`
- **Source:** [Climb Fit — How To Climb Overhangs](https://www.climbfit.com.au/how-to-climb-overhangs/)
- **Coach review:** _________

---

## Detection primitives library

Cross-cutting math the rules call into. Each primitive is a small pure function over a window of pose frames.

### Joint angles (Easy)
- `elbow_angle(side)` — 3-point angle from shoulder→elbow→wrist
- `knee_angle(side)` — 3-point angle from hip→knee→ankle
- `hip_flexion(side)` — angle of femur vs torso in sagittal plane
- `ankle_dorsiflexion_proxy(side)` — heel_y vs foot_index_y delta
- `head_pitch` — angle of nose-to-mid-eye vector vs vertical

### Spatial relationships (Easy)
- `ankle_y - hip_y` per side — high step detector
- `knee_x` vs `ankle_x` in frontal plane — valgus detector (FPPA-style, direction only)
- `shoulder_to_ear_vertical_distance` — shrug detector
- `wrist_y - elbow_y - shoulder_y` ordering — chicken-wing detector
- `free_ankle_y - knee_y` — high-flag detector
- `hip_lateral_offset_from_ankle_range` — barn-door / COM-out-of-base detector
- `foot_step_length` (consecutive ankle positions) — big-step detector

### Rotation (Medium — direction reliable, magnitude not)
- `hip_shoulder_rotation_delta` — angle between hip-line and shoulder-line vectors
- `foot_rotation_about_ankle` — toe-vector vs ankle (inside vs outside edge)

### Depth-axis primitives (Hard — relative trend only, NEVER absolute)
- `hip_to_wall_z_trend` — change over time only, not absolute distance
- `ankle_to_wall_z_trend` — same caveat
- Add a `confidence_gate` parameter that returns null when camera-angle classifier flags off-axis

### Temporal / velocity (Medium — needs One-Euro filter)
- `com_velocity(t)` — magnitude of hip midpoint velocity per frame
- `limb_velocity_curve(landmark, t)` — for wrist/ankle dynamics
- `wrist_lead_time_vs_hip` — temporal correlation
- `elbow_flexion_velocity` vs `knee_extension_velocity` — push-vs-pull sequence
- `foot_placement_entropy` — ankle position variance during placement window
- `ankle_settle_duration` — time below stillness threshold before weighting

### Move segmentation (Medium — built on the above)
- `limbs_in_contact_count(t)` — number of limbs near-stationary near wall
- `move_event(limb)` — start/end frames of each limb's discrete moves
- `phase_classifier(t)` → `reaching | pulling | weight-transfer | stand-up | rest | dynamic-launch | latch`
- `wall_angle_estimator(clip)` — slab / vertical / overhang / roof from climber's vertical orientation history
- `camera_angle_classifier(clip)` — on-axis vs off-axis warning

---

## References

### Coaching sources
- [Climbing.com — full technique-skills section](https://www.climbing.com/skills/)
- [The Climbing Doctor](https://theclimbingdoctor.com/) — biomechanical & rehab framing
- [Hooper's Beta](https://www.hoopersbeta.com/) — video coaching
- [Lattice Training](https://latticetraining.com/blog/) — Tom Randall, performance-focused
- [Training4Climbing](https://trainingforclimbing.com/) — Eric Hörst
- [UKC Articles, Neil Gresham series](https://www.ukclimbing.com/articles/skills/series/neil_gresham_technique_and_training/) — series of technique columns
- [Philly Rock Gym blog](https://philarockgym.com/) — beginner-aimed but solid
- [Climb Fit AU — Overhangs](https://www.climbfit.com.au/how-to-climb-overhangs/)
- [Climbing Collective — Twist-Locking series](https://climbing-collective.com/twist-locking-series-the-complete-guidelines/)
- [Bliss Climbing — Hips and Dimes](https://climbbliss.com/technique/hips-and-dimes-improve-your-position-become-amazing/)

### Academic / engineering
- [Beltrán et al. — *Climbing Technique Evaluation by Means of Skeleton Video Stream Analysis*, Sensors 23(19):8216 (2023)](https://www.mdpi.com/1424-8220/23/19/8216) — **FSM-per-phase pattern, 6-error detector with iPad LiDAR**
- [Qu — *Using Pose Estimation to Analyze Rock Climbing Technique*, Stanford CS231N 2024](https://cs231n.stanford.edu/2024/papers/using-pose-estimation-to-analyze-rock-climbing-technique.pdf)
- [Hwang et al. — *Accuracy Evaluation of 3D Pose Reconstruction with MediaPipe Pose*, PMC11644880](https://pmc.ncbi.nlm.nih.gov/articles/PMC11644880/) — z-axis error vs xy
- [Stenum et al. — *Influence of the Camera Viewing Angle on OpenPose Validity*, PMC11819822](https://pmc.ncbi.nlm.nih.gov/articles/PMC11819822/) — off-axis bias
- [BlazePose — *On-device, Real-time Body Pose Tracking with MediaPipe*, Google Research](https://research.google/blog/on-device-real-time-body-pose-tracking-with-mediapipe-blazepose/)
- [MediaPipe Pose Landmarker documentation](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker)
- [One-Euro filter — Practical smoothing guide](https://medium.com/@debasishraut.dev/setting-up-smoothing-filters-for-mediapipe-pose-estimation-pipeline-a-practical-guide-fcc03f462196)
- [FPPA literature — IJSPT PMC9718689](https://pmc.ncbi.nlm.nih.gov/articles/PMC9718689/) — 2D knee-valgus measurement
- [it-jim — *MediaPipe for Sports Apps*](https://www.it-jim.com/blog/mediapipe-for-sports-apps/) — practical limitations

### Existing climbing-pose projects (GitHub)
- [temi-ro/climb-pose-estimation](https://github.com/temi-ro/climb-pose-estimation) — CoM + limb tension prototype
- [xinrui98/climbAI](https://github.com/xinrui98/climbAI) — Detectron2 holds + MediaPipe pose
- [Laura05010/Indoor-Rock-Climbing-Assistance-Tool](https://github.com/Laura05010/Indoor-Rock-Climbing-Assistance-Tool)
