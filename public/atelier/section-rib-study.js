import { drawSectionRib } from "./section-rib.js";

export const sectionRibStudy = {
  id: "section-ribs", name: "Section ribs", family: "Lines & geometry",
  offThread: true, title: "The spaces become part of the form.", control: "Face contrast",
  medium: "Crossing section planes / open ribbon cage", swatch: "#aaa47d",
  category: "SECTION-DERIVED RENDERING PROXY",
  description: "Broad crossing slabs reveal the arch, ring and stepped base through open cells. The hollow vase becomes a ribbon cage; fine stems retain their original sheets. Shared lights cast a new lattice shadow.",
  mechanism: "Fixed, finite section faces derived from the original triangles · independent depth and shadow raster · matte material pigments. A separate depiction proxy preserves the reference geometry; no engineered slots or fabrication claim. Partial and object-scoped mixes composite finished images and retain lower imagery.",
  reference: "https://sliceforms.wordpress.com/2010/11/20/a-sliceform-super-egg/",
  referenceLabel: "John Sharp / Sliceform Super-egg",
  referencePage: "https://www.sliceformsproject.com/plantillas",
  referencePageLabel: "María García Monera / Sliceforms Project",
  draw: drawSectionRib,
};
