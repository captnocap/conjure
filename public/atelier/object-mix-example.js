// A composition starting point. Scene materials, camera, light and strength
// remain the user's current choices; only the mixer recipe is replaced.
export const objectExampleMix = () => ({
  mode: "layers",
  layers: [
    { id: "color-woodblock", enabled: true, weight: 100, blend: "normal",
      targets: [0, 1, 2, 3, 4, 5, 6, 9, 20] },
    { id: "architectural", enabled: true, weight: 20, blend: "multiply",
      targets: [2, 3, 4, 5, 6, 9, 20] },
    { id: "wash", enabled: true, weight: 94, blend: "normal",
      targets: [7, 11, 12, 13, 14, 15, 16, 17, 18, 19] },
    { id: "spectral", enabled: true, weight: 82, blend: "normal",
      targets: [8, 10] },
  ],
});
