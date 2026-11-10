import type { AppConfig, AppRecord } from "@/lib/types";

export type UpdateConfig = (updater: (config: AppConfig) => AppConfig) => void;

export type PanelProps = {
  app: AppRecord;
  appId: string;
  config: AppConfig;
  update: UpdateConfig;
  reload: () => Promise<void>;
};
