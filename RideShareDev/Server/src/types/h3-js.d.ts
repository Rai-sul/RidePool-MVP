declare module 'h3-js' {
  export function geoToH3(lat: number, lng: number, res: number): string;
  export function kRing(h3Index: string, k: number): string[];
}