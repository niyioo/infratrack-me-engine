export type AppStore = {
  appName: string;
};

export const appStore: AppStore = {
  appName: import.meta.env.VITE_APP_NAME || "BuildWitness"
};
