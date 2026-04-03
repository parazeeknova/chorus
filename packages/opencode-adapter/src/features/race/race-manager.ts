import type { OpencodeClient, Session } from "@opencode-ai/sdk/v2";

export interface RaceConfig {
  raceGroupId: string;
  sessions: Array<{
    sessionID: string;
    model: {
      providerID: string;
      modelID: string;
    };
  }>;
}

export interface RaceResult {
  raceGroupId: string;
  sessions: Array<{
    sessionID: string;
    model: {
      providerID: string;
      modelID: string;
    };
    status: "running" | "completed" | "failed" | "aborted";
  }>;
}

export class RaceManager {
  readonly client: OpencodeClient;

  constructor(client: OpencodeClient) {
    this.client = client;
  }

  async createRaceSessions(
    parentSessionID: string,
    models: Array<{ providerID: string; modelID: string }>,
    baseTitle?: string
  ): Promise<Session[]> {
    const sessions: Session[] = [];

    for (const model of models) {
      const title = baseTitle
        ? `${baseTitle} (${model.providerID}/${model.modelID})`
        : undefined;

      const result = await this.client.session.create({
        parentID: parentSessionID,
        title,
      });

      if (result.data) {
        sessions.push(result.data);
      }
    }

    return sessions;
  }

  async promptAll(
    sessions: Array<{
      sessionID: string;
      model: { providerID: string; modelID: string };
    }>,
    text: string
  ): Promise<void> {
    const prompts: Promise<unknown>[] = sessions.map((s) =>
      this.client.session.promptAsync({
        sessionID: s.sessionID,
        model: s.model,
        parts: [{ type: "text", text }],
      })
    );

    await Promise.allSettled(prompts);
  }

  async abortAll(sessionIDs: string[]): Promise<void> {
    const aborts: Promise<unknown>[] = sessionIDs.map((id) =>
      this.client.session.abort({ sessionID: id })
    );

    await Promise.allSettled(aborts);
  }

  async forkForRace(sessionID: string, messageID?: string): Promise<Session> {
    const result = await this.client.session.fork({
      sessionID,
      messageID,
    });
    if (!result.data) {
      throw new Error("OpenCode session.fork returned no data");
    }
    return result.data;
  }
}
