import type { BeadColor } from '@/types'

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function srgbToLinear(c: number): number {
  c = c / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r)
  const lg = srgbToLinear(g)
  const lb = srgbToLinear(b)

  let x = lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375
  let y = lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750
  let z = lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041

  x /= 0.95047
  y /= 1.0
  z /= 1.08883

  const f = (t: number): number => (t > 0.008856 ? Math.cbrt(t) : (903.3 * t + 16) / 116)

  const L = 116 * f(y) - 16
  const a = 500 * (f(x) - f(y))
  const bVal = 200 * (f(y) - f(z))

  return [L, a, bVal]
}

function makeColor(code: string, series: string, seq: number, hex: string): BeadColor {
  const [r, g, b] = hexToRgb(hex)
  const lab = rgbToLab(r, g, b)
  return { code, series, seq, hex, r, g, b, lab }
}

export const MARD_COLORS: readonly BeadColor[] = Object.freeze([
  // A Series (26 colors)
  makeColor('A1', 'A', 1, '#FAF4C8'),
  makeColor('A2', 'A', 2, '#FFFFD5'),
  makeColor('A3', 'A', 3, '#FEFF8B'),
  makeColor('A4', 'A', 4, '#FBED56'),
  makeColor('A5', 'A', 5, '#F4D738'),
  makeColor('A6', 'A', 6, '#FEAC4C'),
  makeColor('A7', 'A', 7, '#FE8B4C'),
  makeColor('A8', 'A', 8, '#FFDA45'),
  makeColor('A9', 'A', 9, '#FF995B'),
  makeColor('A10', 'A', 10, '#F77C31'),
  makeColor('A11', 'A', 11, '#FFDD99'),
  makeColor('A12', 'A', 12, '#FE9F72'),
  makeColor('A13', 'A', 13, '#FFC365'),
  makeColor('A14', 'A', 14, '#FD543D'),
  makeColor('A15', 'A', 15, '#FFF365'),
  makeColor('A16', 'A', 16, '#FFFF9F'),
  makeColor('A17', 'A', 17, '#FFE36E'),
  makeColor('A18', 'A', 18, '#FEBE7D'),
  makeColor('A19', 'A', 19, '#FD7C72'),
  makeColor('A20', 'A', 20, '#FFD568'),
  makeColor('A21', 'A', 21, '#FFE395'),
  makeColor('A22', 'A', 22, '#F4F57D'),
  makeColor('A23', 'A', 23, '#E6C9B7'),
  makeColor('A24', 'A', 24, '#F7F8A2'),
  makeColor('A25', 'A', 25, '#FFD67D'),
  makeColor('A26', 'A', 26, '#FFC830'),

  // B Series (32 colors)
  makeColor('B1', 'B', 1, '#E6EE31'),
  makeColor('B2', 'B', 2, '#63F347'),
  makeColor('B3', 'B', 3, '#9EF780'),
  makeColor('B4', 'B', 4, '#5DE035'),
  makeColor('B5', 'B', 5, '#35E352'),
  makeColor('B6', 'B', 6, '#65E2A6'),
  makeColor('B7', 'B', 7, '#3DAF80'),
  makeColor('B8', 'B', 8, '#1C9C4F'),
  makeColor('B9', 'B', 9, '#27523A'),
  makeColor('B10', 'B', 10, '#95D3C2'),
  makeColor('B11', 'B', 11, '#5D722A'),
  makeColor('B12', 'B', 12, '#166F41'),
  makeColor('B13', 'B', 13, '#CAEB7B'),
  makeColor('B14', 'B', 14, '#ADE946'),
  makeColor('B15', 'B', 15, '#2E5132'),
  makeColor('B16', 'B', 16, '#C5ED9C'),
  makeColor('B17', 'B', 17, '#9BB13A'),
  makeColor('B18', 'B', 18, '#E6EE49'),
  makeColor('B19', 'B', 19, '#24B88C'),
  makeColor('B20', 'B', 20, '#C2F0CC'),
  makeColor('B21', 'B', 21, '#156A6B'),
  makeColor('B22', 'B', 22, '#0B3C43'),
  makeColor('B23', 'B', 23, '#303A21'),
  makeColor('B24', 'B', 24, '#EEFCA5'),
  makeColor('B25', 'B', 25, '#4E846D'),
  makeColor('B26', 'B', 26, '#8D7A35'),
  makeColor('B27', 'B', 27, '#CCE1AF'),
  makeColor('B28', 'B', 28, '#9EE5B9'),
  makeColor('B29', 'B', 29, '#C5E254'),
  makeColor('B30', 'B', 30, '#E2FCB1'),
  makeColor('B31', 'B', 31, '#B0E792'),
  makeColor('B32', 'B', 32, '#9CAB5A'),

  // C Series (29 colors)
  makeColor('C1', 'C', 1, '#E8FFE7'),
  makeColor('C2', 'C', 2, '#A9F9FC'),
  makeColor('C3', 'C', 3, '#A0E2FB'),
  makeColor('C4', 'C', 4, '#41CCFF'),
  makeColor('C5', 'C', 5, '#01ACEB'),
  makeColor('C6', 'C', 6, '#50AAF0'),
  makeColor('C7', 'C', 7, '#3677D2'),
  makeColor('C8', 'C', 8, '#0F54C0'),
  makeColor('C9', 'C', 9, '#324BCA'),
  makeColor('C10', 'C', 10, '#3EBCE2'),
  makeColor('C11', 'C', 11, '#28DDDE'),
  makeColor('C12', 'C', 12, '#1C334D'),
  makeColor('C13', 'C', 13, '#CDE8FF'),
  makeColor('C14', 'C', 14, '#D5FDFF'),
  makeColor('C15', 'C', 15, '#22C4C6'),
  makeColor('C16', 'C', 16, '#1557A8'),
  makeColor('C17', 'C', 17, '#04D1F6'),
  makeColor('C18', 'C', 18, '#1D3344'),
  makeColor('C19', 'C', 19, '#1887A2'),
  makeColor('C20', 'C', 20, '#176DAF'),
  makeColor('C21', 'C', 21, '#BEDDFF'),
  makeColor('C22', 'C', 22, '#67B4BE'),
  makeColor('C23', 'C', 23, '#C8E2FF'),
  makeColor('C24', 'C', 24, '#7CC4FF'),
  makeColor('C25', 'C', 25, '#A9E5E5'),
  makeColor('C26', 'C', 26, '#3CAED8'),
  makeColor('C27', 'C', 27, '#D3DFFA'),
  makeColor('C28', 'C', 28, '#BBCFED'),
  makeColor('C29', 'C', 29, '#34488E'),

  // D Series (26 colors)
  makeColor('D1', 'D', 1, '#AEB4F2'),
  makeColor('D2', 'D', 2, '#858EDD'),
  makeColor('D3', 'D', 3, '#2F54AF'),
  makeColor('D4', 'D', 4, '#182A84'),
  makeColor('D5', 'D', 5, '#B843C5'),
  makeColor('D6', 'D', 6, '#AC7BDE'),
  makeColor('D7', 'D', 7, '#8854B3'),
  makeColor('D8', 'D', 8, '#E2D3FF'),
  makeColor('D9', 'D', 9, '#D5B9F8'),
  makeColor('D10', 'D', 10, '#361851'),
  makeColor('D11', 'D', 11, '#B9BAE1'),
  makeColor('D12', 'D', 12, '#DE9AD4'),
  makeColor('D13', 'D', 13, '#B90095'),
  makeColor('D14', 'D', 14, '#8B279B'),
  makeColor('D15', 'D', 15, '#2F1F90'),
  makeColor('D16', 'D', 16, '#E3E1EE'),
  makeColor('D17', 'D', 17, '#C4D4F6'),
  makeColor('D18', 'D', 18, '#A45EC7'),
  makeColor('D19', 'D', 19, '#D8C3D7'),
  makeColor('D20', 'D', 20, '#9C32B2'),
  makeColor('D21', 'D', 21, '#9A009B'),
  makeColor('D22', 'D', 22, '#333A95'),
  makeColor('D23', 'D', 23, '#EBDAFC'),
  makeColor('D24', 'D', 24, '#7786E5'),
  makeColor('D25', 'D', 25, '#494FC7'),
  makeColor('D26', 'D', 26, '#DFC2F8'),

  // E Series (24 colors)
  makeColor('E1', 'E', 1, '#FDD3CC'),
  makeColor('E2', 'E', 2, '#FEC0DF'),
  makeColor('E3', 'E', 3, '#FFB7E7'),
  makeColor('E4', 'E', 4, '#E8649E'),
  makeColor('E5', 'E', 5, '#F551A2'),
  makeColor('E6', 'E', 6, '#F13D74'),
  makeColor('E7', 'E', 7, '#C63478'),
  makeColor('E8', 'E', 8, '#FFDBE9'),
  makeColor('E9', 'E', 9, '#E970CC'),
  makeColor('E10', 'E', 10, '#D33793'),
  makeColor('E11', 'E', 11, '#FCDDD2'),
  makeColor('E12', 'E', 12, '#F78FC3'),
  makeColor('E13', 'E', 13, '#B5006D'),
  makeColor('E14', 'E', 14, '#FFD1BA'),
  makeColor('E15', 'E', 15, '#F8C7C9'),
  makeColor('E16', 'E', 16, '#FFF3EB'),
  makeColor('E17', 'E', 17, '#FFE2EA'),
  makeColor('E18', 'E', 18, '#FFC7DB'),
  makeColor('E19', 'E', 19, '#FEBAD5'),
  makeColor('E20', 'E', 20, '#D8C7D1'),
  makeColor('E21', 'E', 21, '#BD9DA1'),
  makeColor('E22', 'E', 22, '#B785A1'),
  makeColor('E23', 'E', 23, '#937A8D'),
  makeColor('E24', 'E', 24, '#E1BCE8'),

  // F Series (25 colors)
  makeColor('F1', 'F', 1, '#FD957B'),
  makeColor('F2', 'F', 2, '#FC3D46'),
  makeColor('F3', 'F', 3, '#F74941'),
  makeColor('F4', 'F', 4, '#FC283C'),
  makeColor('F5', 'F', 5, '#E7002F'),
  makeColor('F6', 'F', 6, '#943630'),
  makeColor('F7', 'F', 7, '#971937'),
  makeColor('F8', 'F', 8, '#BC0028'),
  makeColor('F9', 'F', 9, '#E2677A'),
  makeColor('F10', 'F', 10, '#8A4526'),
  makeColor('F11', 'F', 11, '#5A2121'),
  makeColor('F12', 'F', 12, '#FD4E6A'),
  makeColor('F13', 'F', 13, '#F35744'),
  makeColor('F14', 'F', 14, '#FFA9AD'),
  makeColor('F15', 'F', 15, '#D30022'),
  makeColor('F16', 'F', 16, '#FEC2A6'),
  makeColor('F17', 'F', 17, '#E69C79'),
  makeColor('F18', 'F', 18, '#D37C46'),
  makeColor('F19', 'F', 19, '#C1444A'),
  makeColor('F20', 'F', 20, '#CD9391'),
  makeColor('F21', 'F', 21, '#F7B4C6'),
  makeColor('F22', 'F', 22, '#FDC0D0'),
  makeColor('F23', 'F', 23, '#F67E66'),
  makeColor('F24', 'F', 24, '#E698AA'),
  makeColor('F25', 'F', 25, '#E54B4F'),

  // G Series (21 colors)
  makeColor('G1', 'G', 1, '#FFE2CE'),
  makeColor('G2', 'G', 2, '#FFC4AA'),
  makeColor('G3', 'G', 3, '#F4C3A5'),
  makeColor('G4', 'G', 4, '#E1B383'),
  makeColor('G5', 'G', 5, '#EDB045'),
  makeColor('G6', 'G', 6, '#E99C17'),
  makeColor('G7', 'G', 7, '#9D5B3E'),
  makeColor('G8', 'G', 8, '#753832'),
  makeColor('G9', 'G', 9, '#E6B483'),
  makeColor('G10', 'G', 10, '#D98C39'),
  makeColor('G11', 'G', 11, '#E0C593'),
  makeColor('G12', 'G', 12, '#FFC890'),
  makeColor('G13', 'G', 13, '#B7714A'),
  makeColor('G14', 'G', 14, '#8D614C'),
  makeColor('G15', 'G', 15, '#FCF9E0'),
  makeColor('G16', 'G', 16, '#F2D9BA'),
  makeColor('G17', 'G', 17, '#78524B'),
  makeColor('G18', 'G', 18, '#FFE4CC'),
  makeColor('G19', 'G', 19, '#E07935'),
  makeColor('G20', 'G', 20, '#A94023'),
  makeColor('G21', 'G', 21, '#B88558'),

  // H Series (23 colors)
  makeColor('H1', 'H', 1, '#FDFBFF'),
  makeColor('H2', 'H', 2, '#FEFFFF'),
  makeColor('H3', 'H', 3, '#B6B1BA'),
  makeColor('H4', 'H', 4, '#89858C'),
  makeColor('H5', 'H', 5, '#48464E'),
  makeColor('H6', 'H', 6, '#2F2B2F'),
  makeColor('H7', 'H', 7, '#000000'),
  makeColor('H8', 'H', 8, '#E7D6DB'),
  makeColor('H9', 'H', 9, '#EDEDED'),
  makeColor('H10', 'H', 10, '#EEE9EA'),
  makeColor('H11', 'H', 11, '#CECDD5'),
  makeColor('H12', 'H', 12, '#FFF5ED'),
  makeColor('H13', 'H', 13, '#F5ECD2'),
  makeColor('H14', 'H', 14, '#CFD7D3'),
  makeColor('H15', 'H', 15, '#98A6A8'),
  makeColor('H16', 'H', 16, '#1D1414'),
  makeColor('H17', 'H', 17, '#F1EDED'),
  makeColor('H18', 'H', 18, '#FFFDF0'),
  makeColor('H19', 'H', 19, '#F6EFE2'),
  makeColor('H20', 'H', 20, '#949FA3'),
  makeColor('H21', 'H', 21, '#FFFBE1'),
  makeColor('H22', 'H', 22, '#CACAD4'),
  makeColor('H23', 'H', 23, '#9A9D94'),

  // M Series (15 colors)
  makeColor('M1', 'M', 1, '#BCC6B8'),
  makeColor('M2', 'M', 2, '#8AA386'),
  makeColor('M3', 'M', 3, '#697D80'),
  makeColor('M4', 'M', 4, '#E3D2BC'),
  makeColor('M5', 'M', 5, '#D0CCAA'),
  makeColor('M6', 'M', 6, '#B0A782'),
  makeColor('M7', 'M', 7, '#B4A497'),
  makeColor('M8', 'M', 8, '#B38281'),
  makeColor('M9', 'M', 9, '#A58767'),
  makeColor('M10', 'M', 10, '#C5B2BC'),
  makeColor('M11', 'M', 11, '#9F7594'),
  makeColor('M12', 'M', 12, '#644749'),
  makeColor('M13', 'M', 13, '#D19066'),
  makeColor('M14', 'M', 14, '#C77362'),
  makeColor('M15', 'M', 15, '#757D78'),
])

export const MARD_COLOR_MAP = new Map(MARD_COLORS.map(c => [c.code, c]))

export const MARD_SERIES_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'M'] as const

export function getColorsBySeries(series: string): BeadColor[] {
  return MARD_COLORS.filter(c => c.series === series)
}
