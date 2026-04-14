/// <reference types="vite/client" />
/// <reference types="@webgpu/types" />

declare global {
  interface Element {
    disabled: boolean;
    dataset: DOMStringMap;
    style: CSSStyleDeclaration;
  }

  interface AudioParam {
    exponentialDecayTo?(value: number, endTime: number): AudioParam;
  }
}

export {};
