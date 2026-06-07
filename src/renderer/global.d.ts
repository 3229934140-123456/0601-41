export {};

declare global {
  interface Window {
    __INITIAL_STATE__?: any;
    require: (module: string) => any;
  }
}
