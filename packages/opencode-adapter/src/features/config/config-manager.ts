import type { Config, OpencodeClient } from "@opencode-ai/sdk/v2";

export class ConfigManager {
  readonly client: OpencodeClient;

  constructor(client: OpencodeClient) {
    this.client = client;
  }

  async get(input?: {
    directory?: string;
    workspace?: string;
  }): Promise<Config> {
    const result = await this.client.config.get({
      directory: input?.directory,
      workspace: input?.workspace,
    });

    return result.data ?? {};
  }

  async getGlobal(): Promise<Config> {
    const result = await this.client.global.config.get();
    return result.data ?? {};
  }

  async updateGlobal(config: Config): Promise<Config> {
    const result = await this.client.global.config.update({
      config,
    });

    return result.data ?? config;
  }

  async configureGlobalProvider(providerID: string): Promise<Config> {
    const current = await this.getGlobal();

    const provider = {
      ...(current.provider ?? {}),
      [providerID]: current.provider?.[providerID] ?? {},
    };

    const disabledProviders = (current.disabled_providers ?? []).filter(
      (disabledProviderID) => disabledProviderID !== providerID
    );

    return this.updateGlobal({
      ...current,
      provider,
      disabled_providers:
        disabledProviders.length > 0 ? disabledProviders : undefined,
    });
  }
}
