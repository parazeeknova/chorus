import type { OpencodeClient } from "@opencode-ai/sdk/v2";

export interface OpencodeModelSummary {
  attachment: boolean;
  connected: boolean;
  modelID: string;
  name: string;
  providerID: string;
  providerName: string;
  reasoning: boolean;
  releaseDate: string;
  status?: "alpha" | "beta" | "deprecated";
  temperature: boolean;
  toolCall: boolean;
}

export interface OpencodeModelCatalog {
  defaultModel?: {
    modelID: string;
    providerID: string;
  };
  models: OpencodeModelSummary[];
}

export class ProviderManager {
  readonly client: OpencodeClient;

  constructor(client: OpencodeClient) {
    this.client = client;
  }

  async listModels(input?: {
    directory?: string;
    workspace?: string;
  }): Promise<OpencodeModelCatalog> {
    const result = await this.client.provider.list({
      directory: input?.directory,
      workspace: input?.workspace,
    });

    const providers = result.data;
    if (!providers) {
      return {
        models: [],
      };
    }

    const connected = new Set(providers.connected);
    const models = providers.all
      .flatMap((provider) =>
        Object.values(provider.models).map((model) => ({
          attachment: model.attachment,
          connected: connected.has(provider.id),
          modelID: model.id,
          name: model.name,
          providerID: provider.id,
          providerName: provider.name,
          reasoning: model.reasoning,
          releaseDate: model.release_date,
          status: model.status,
          temperature: model.temperature,
          toolCall: model.tool_call,
        }))
      )
      .sort((left, right) => {
        if (left.connected !== right.connected) {
          return left.connected ? -1 : 1;
        }

        if (left.providerName !== right.providerName) {
          return left.providerName.localeCompare(right.providerName);
        }

        return left.name.localeCompare(right.name);
      });

    const defaultProviderID = Object.keys(providers.default)[0];
    const defaultModelID = defaultProviderID
      ? providers.default[defaultProviderID]
      : undefined;

    return {
      defaultModel:
        defaultProviderID && defaultModelID
          ? {
              providerID: defaultProviderID,
              modelID: defaultModelID,
            }
          : undefined,
      models,
    };
  }
}
