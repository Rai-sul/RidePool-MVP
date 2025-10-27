declare module 'h3-js' {
  function geoToH3(lat: number, lng: number, res: number): string;
  function kRing(h3Index: string, k: number): string[];
  export = {
    geoToH3,
    kRing
  };
}
