export {};

declare global {
  interface Window {
    electronAPI: {
      openWindow: (name: string, data?: any) => Promise<void>;
      closeWindow: (name: string) => Promise<void>;
      getData: (key: string) => Promise<any>;
      setData: (key: string, value: any) => Promise<boolean>;
      showOpenDialog: (options: any) => Promise<any>;
      showSaveDialog: (options: any) => Promise<any>;
    };
  }
}
