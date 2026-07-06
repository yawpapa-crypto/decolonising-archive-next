declare module "react-simple-maps" {
  import type { CSSProperties, ReactNode, SVGProps } from "react";

  export type GeographyObject = {
    rsmKey: string;
    properties: Record<string, string | number | undefined>;
    geometry: unknown;
  };

  export type ComposableMapProps = {
    projection?: string;
    projectionConfig?: Record<string, number>;
    className?: string;
    children?: ReactNode;
  };

  export type GeographiesProps = {
    geography: string | object;
    children: (args: { geographies: GeographyObject[] }) => ReactNode;
  };

  export type GeographyProps = {
    geography: GeographyObject;
    onMouseEnter?: (event: React.MouseEvent<SVGPathElement>) => void;
    onMouseMove?: (event: React.MouseEvent<SVGPathElement>) => void;
    onMouseLeave?: () => void;
    onClick?: () => void;
    style?: {
      default?: CSSProperties;
      hover?: CSSProperties;
      pressed?: CSSProperties;
    };
    "aria-label"?: string;
  };

  export function ComposableMap(props: ComposableMapProps): JSX.Element;
  export function Geographies(props: GeographiesProps): JSX.Element;
  export function Geography(props: GeographyProps): JSX.Element;
  export function Graticule(props: SVGProps<SVGPathElement>): JSX.Element;
  export function Sphere(props: SVGProps<SVGCircleElement> & { id?: string }): JSX.Element;
}
