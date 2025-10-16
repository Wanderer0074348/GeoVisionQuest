declare module '@google/earthengine' {
  export namespace data {
    function authenticateViaPrivateKey(
      credentials: { client_email: string; private_key: string },
      onSuccess: () => void,
      onError: (error: Error) => void
    ): void;
  }

  export function initialize(
    baseUrl: string | null,
    tileUrl: string | null,
    onSuccess: () => void,
    onError: (error: Error) => void
  ): void;

  export class Geometry {
    static Point(coordinates: [number, number]): Geometry;
    buffer(distance: number): Geometry;
    bounds(): Geometry;
    getInfo(): { coordinates: any };
  }

  export interface ImageCollection {
    filterBounds(geometry: Geometry): ImageCollection;
    filterDate(start: string, end: string): ImageCollection;
    filter(filter: Filter): ImageCollection;
    sort(property: string, ascending?: boolean): ImageCollection;
    first(): Image;
  }

  export function ImageCollection(id: string): ImageCollection;

  export class Image {
    getThumbURL(params: {
      region: any;
      dimensions: number;
      format: string;
      min: number;
      max: number;
      bands: string[];
    }): string;
  }

  export namespace Filter {
    function lt(property: string, value: number): Filter;
  }

  export class Filter {}
}
