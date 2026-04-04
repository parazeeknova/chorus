import type { OpencodeClient } from "@opencode-ai/sdk/v2";

export interface TuiLookupInput {
  directory?: string;
  workspace?: string;
}

export class TuiManager {
  readonly client: OpencodeClient;

  constructor(client: OpencodeClient) {
    this.client = client;
  }

  async openModels(input?: TuiLookupInput): Promise<boolean> {
    const result = await this.client.tui.openModels({
      directory: input?.directory,
      workspace: input?.workspace,
    });

    return result.data ?? false;
  }

  async runConnect(input?: TuiLookupInput): Promise<boolean> {
    const appendResult = await this.client.tui.appendPrompt({
      directory: input?.directory,
      workspace: input?.workspace,
      text: "/connect",
    });

    if (!appendResult.data) {
      return false;
    }

    const submitResult = await this.client.tui.submitPrompt({
      directory: input?.directory,
      workspace: input?.workspace,
    });

    return submitResult.data ?? false;
  }
}
