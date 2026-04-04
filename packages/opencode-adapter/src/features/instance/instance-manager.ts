import type { OpencodeClient } from "@opencode-ai/sdk/v2";

export class InstanceManager {
  readonly client: OpencodeClient;

  constructor(client: OpencodeClient) {
    this.client = client;
  }

  async dispose(input?: {
    directory?: string;
    workspace?: string;
  }): Promise<boolean> {
    const result = await this.client.instance.dispose({
      directory: input?.directory,
      workspace: input?.workspace,
    });

    return result.data ?? false;
  }
}
