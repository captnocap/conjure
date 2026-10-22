# CIE colorimetric data

The two original CSV datasets and their metadata are from the International Commission on Illumination (CIE), Vienna, 2019. They and the derived `../../spectral-data.js` weights are licensed under Creative Commons Attribution-ShareAlike 4.0 International: https://creativecommons.org/licenses/by-sa/4.0/ . No CIE endorsement is implied.

- Colour-matching functions of CIE 1931 standard colorimetric observer. DOI: https://doi.org/10.25039/CIE.DS.xvudnb9b . Source: https://files.cie.co.at/Publications-datasets/CIE_xyz_1931_2deg.csv . SHA256: fa663e3535a7e0763a745993a1f0a192eb0275ac46ad2d1befd7626841e713c1 . Original table: CIE 018:2019, Table 6.
- CIE standard illuminant D65. DOI: https://doi.org/10.25039/CIE.DS.hjfjmt59 . Source: https://files.cie.co.at/Publications-datasets/CIE_std_illum_D65.csv . SHA256: e76f210bffff3d552ef7113025da5f325d5dfec200dd4b878b1a2f3a507032cb . Original table: ISO/CIE 11664-2:2022, Table B.1. Current metadata: https://files.cie.co.at/Publications-datasets/CIE_std_illum_D65.csv_metadata_v2.json .

Adaptation: select every fifth wavelength from 360 through 830 nm, multiply each XYZ observer coefficient by D65 spectral power, apply half weights to the two endpoints, and normalize all weights by their Y sum. Runtime integrates film reflectance against these weights. The original CSV files and metadata are unchanged.

The separate original rendering code and other project assets are not these datasets. Vendor Three.js and p5.js retain their existing licenses.
