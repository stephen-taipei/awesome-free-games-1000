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

  interface GPUQueue {
    writeBuffer(
      buffer: GPUBuffer,
      bufferOffset: GPUSize64,
      data: AllowSharedBufferSource,
      dataOffset?: GPUSize64,
      size?: GPUSize64,
    ): undefined;
  }
}

export {};
