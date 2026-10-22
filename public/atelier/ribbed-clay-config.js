// Frozen admitted Vase-only clay field. No exposed model controls.
const deepFreeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))deepFreeze(child);Object.freeze(value);}return value;};
export const ribbedClayConfig=deepFreeze({
  "id": "ribbed-clay",
  "name": "Ribbed clay",
  "eligibleIDs": [
    7
  ],
  "modelVersion": 1,
  "modelSHA256": "ef7f8ad1a798572ac09db003be699af4f7a3a3213aa4eeaddb06f9cc098d3666",
  "proofMaterialSHA256": "70566fbc7981a6ad96c00f22f4d38e46f2f94b1cfa227c996ea2fc204e20c610",
  "chartPeriod": 6.283185307179586,
  "chartMaxV": 1.8400081814276228,
  "meridianArcs": [
    0,
    0.057783687335660076,
    0.10868039490892598,
    0.1577244172811363,
    0.2056247287880522,
    0.2526608811191814,
    0.2989747901687817,
    0.34465021303653226,
    0.38974335750075856,
    0.43429676555916574,
    0.47834691070011215,
    0.521928315746609,
    0.5650758502040464,
    0.6078264548360797,
    0.6502198712028325,
    0.6922989851514428,
    0.7341100161018298,
    0.7757020494099041,
    0.8171269989925289,
    0.8584390671180747,
    0.8996949319489731,
    0.9409551977662481,
    0.9822888065210821,
    1.0237824313734636,
    1.0655588135556702,
    1.1078051539995648,
    1.1508100391040121,
    1.1949935009291173,
    1.2408946136300911,
    1.2890699234599365,
    1.339884227145449,
    1.3932521183863193,
    1.4484595527689836,
    1.504195833927261,
    1.5588530538474465,
    1.611025992700569,
    1.6600207084137792,
    1.7060899140028332,
    1.7502057861219826,
    1.7936302755013154,
    1.8400081814276228
  ],
  "model": {
    "version": 1,
    "status": "Frozen before candidate pixels; one first-image model, no parameter search",
    "identity": "Exterior-only illustrative joined clay-course height-field shading over the original backing; not physical coil construction",
    "courseTopology": "Individually closed circumferential courses, not a spiral",
    "chart": {
      "u": "native Lathe UV.x times 2*pi, unwrapped across duplicate seam vertices",
      "v": "polygonal meridian arc measured upward from exact original Float32 41-sample profile",
      "period": 6.283185307179586,
      "metric": "shader chart derivatives converted to a view-space dual tangent frame",
      "geometry": "unchanged source and baked position, normal, uv, index, transform; only one added chart attribute in an isolated borrowed-buffer view",
      "poles": "exact positive-radius original vase has no poles; all other geometry unsupported"
    },
    "boundary": {
      "pitch": 0.18,
      "formula": "B(k,u)=pitch*(k+0.055*sin(2*u+1.7*k)+0.028*cos(5*u-0.9*k)+0.020*sin(7*u+0.37*k))",
      "maximumJitterInPitches": 0.103,
      "minimumCourseWidthInPitches": 0.794,
      "boundedSearch": "floor(v/pitch)-1 through +2; nearest lower and upper boundary"
    },
    "profile": {
      "height": 0.024,
      "heightMultiplier": "1+0.14*sin(1.31*k)+0.07*cos(3*u+0.77*k)",
      "peakPhase": "0.44+0.035*sin(1.13*k)",
      "shape": "t=(v-Blo)/(Bhi-Blo); z=(t-peakPhase)/(t<peakPhase?peakPhase:1-peakPhase); h=A*(1-z^4)^2",
      "meaning": "broad compressed crown with rounded fused shoulders meeting at a common zero-height contact seam; h and first derivatives continuous at joins; no finite plates, crossings, gaps or overhangs",
      "lowerFade": [
        0.0,
        0.065
      ],
      "upperFadeFromRim": [
        0.025,
        0.09
      ],
      "fades": "multiply height by cubic smoothstep at bottom and below plain upper rim, including derivatives"
    },
    "appearance": {
      "linearPigment": [
        0.48,
        0.3,
        0.19
      ],
      "pigmentVariation": "none",
      "roughness": 0.82,
      "metalness": 0,
      "ior": 1.5,
      "envMapIntensity": 0.48,
      "clearcoat": 0,
      "sheen": 0,
      "anisotropy": 0,
      "transmission": 0,
      "specularIntensity": 1
    },
    "interior": "Double-sided original vase; gl_FrontFacing false uses unchanged smooth backing normal and same pigment/roughness; no course relief or local visibility inside",
    "visibility": {
      "geometric": "original recorded cast-shadow map unchanged",
      "directLocal": "illustrative tangent-height ray visibility against this same height field, 16 uniformly spaced tests at t=0.01..0.16 world units along each directional light; maximum positive blocker excess mapped by 1-smoothstep(0.0003,0.001,excess); macro-normal dot light <=0 rejects direct light",
      "support": "finite 0.16-world-unit neighborhood, no claim of global exact visibility, overhangs or interreflection; grazing rays can omit farther occluders",
      "indirect": "original baked AO on hemisphere/PMREM only; no extra microsurface indirect visibility"
    },
    "sampling": {
      "radiance": "four midpoint samples at (-0.25,-0.25), (+0.25,-0.25), (-0.25,+0.25), (+0.25,+0.25) of each pixel chart parallelogram; full stock Three direct and indirect radiance accumulated before output tone mapping",
      "gradients": "analytic boundary, profile, amplitude and fade derivatives; original interpolated macro normal",
      "validity": "finite chart and dual frame; absolute Jacobian >1e-20 and relative Jacobian >1e-8; dual-frame determinant >1e-12; guard failure uses flat backing and is counted diagnostically",
      "limitations": "finite quadrature and finite visibility samples, not an exact filtered-BRDF closure; no image-space material filtering"
    },
    "batch": {
      "nativeSize": 720,
      "views": [
        "default orbit=0,time=25,Mixed Garden"
      ],
      "conditions": [
        "candidate",
        "flat same pigment/roughness, relief disabled",
        "released Tiled original settings",
        "released Shingle original settings"
      ],
      "reductions": [
        360,
        90,
        60
      ],
      "reductionConvention": "complete native720 display-encoded RGB images reduced once with Pillow LANCZOS to literal widths; no crops, sharpening, grading or source-color fitting",
      "retuning": "none after candidate pixels; a generic ribbed reading or damaged material/scene form means HOLD"
    },
    "fixed": [
      "original vase mesh/profile/transform",
      "all non-vase geometry/materials",
      "camera",
      "primary lights",
      "studio PMREM",
      "silhouette",
      "depth",
      "geometric cast shadows"
    ],
    "pipeline": "installed Three r180 shader expansion through existing scene exporter; actual native Mesa EGL/GLES replay with checksum-pinned studio PMREM; not browser QA",
    "sourceCommit": "3df51d05735c3ab176b5b4244db20af0a610d603"
  }
});
export const RIBBED_CLAY_ID=ribbedClayConfig.id;
export const RIBBED_CLAY_ELIGIBLE_IDS=ribbedClayConfig.eligibleIDs;
export const RIBBED_CLAY_MODEL_VERSION=ribbedClayConfig.modelVersion;
export const RIBBED_CLAY_MODEL_SHA256=ribbedClayConfig.modelSHA256;
export const RIBBED_CLAY_PERIOD=ribbedClayConfig.chartPeriod;
export const RIBBED_CLAY_MAX_V=ribbedClayConfig.chartMaxV;
export const RIBBED_CLAY_MERIDIAN_ARCS=ribbedClayConfig.meridianArcs;
