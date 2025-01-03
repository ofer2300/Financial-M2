declare module 'grid-styled' {
  import * as React from 'react';

  export interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
    width?: number | string | Array<number | string>;
    m?: number | string | Array<number | string>;
    mt?: number | string | Array<number | string>;
    mr?: number | string | Array<number | string>;
    mb?: number | string | Array<number | string>;
    ml?: number | string | Array<number | string>;
    p?: number | string | Array<number | string>;
    pt?: number | string | Array<number | string>;
    pr?: number | string | Array<number | string>;
    pb?: number | string | Array<number | string>;
    pl?: number | string | Array<number | string>;
  }

  export interface FlexProps extends BoxProps {
    alignItems?: string;
    justifyContent?: string;
    flexDirection?: string;
    flexWrap?: string;
  }

  export const Box: React.ComponentType<BoxProps>;
  export const Flex: React.ComponentType<FlexProps>;
} 