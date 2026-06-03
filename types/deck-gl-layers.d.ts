declare module "@deck.gl/layers" {
  import { Layer } from "@deck.gl/core";

  export class ScatterplotLayer<DataT = unknown> extends Layer {
    constructor(props: Record<string, unknown> & { data?: DataT[] });
  }
}
