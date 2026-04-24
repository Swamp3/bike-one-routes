import 'leaflet';

declare module 'leaflet-polylinedecorator' {
  const _default: unknown;
  export default _default;
}

declare module 'leaflet' {
  interface SymbolOptions {
    pixelSize?: number;
    polygon?: boolean;
    pathOptions?: PathOptions;
    headAngle?: number;
  }

  interface LeafletSymbol {
    buildSymbol(
      dirPoint: { latLng: LatLng; heading: number },
      latLngs: LatLng[],
      map: Map,
      index: number,
      total: number
    ): Layer;
  }

  interface SymbolFactory {
    arrowHead(options?: SymbolOptions): LeafletSymbol;
    dash(options?: SymbolOptions): LeafletSymbol;
    marker(
      options?: SymbolOptions & { markerOptions?: MarkerOptions }
    ): LeafletSymbol;
  }

  const Symbol: SymbolFactory;

  interface PatternDefinition {
    offset?: number | string;
    endOffset?: number | string;
    repeat: number | string;
    symbol: LeafletSymbol;
  }

  interface PolylineDecoratorOptions {
    patterns: PatternDefinition[];
  }

  class PolylineDecorator extends FeatureGroup {
    constructor(
      paths: Polyline | Polyline[] | LatLng[] | LatLng[][],
      options?: PolylineDecoratorOptions
    );
    setPaths(paths: Polyline | Polyline[] | LatLng[] | LatLng[][]): this;
    setPatterns(patterns: PatternDefinition[]): this;
  }

  function polylineDecorator(
    paths: Polyline | Polyline[] | LatLng[] | LatLng[][],
    options?: PolylineDecoratorOptions
  ): PolylineDecorator;
}
