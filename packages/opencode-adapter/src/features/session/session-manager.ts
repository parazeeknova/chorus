import type {
  AgentPartInput,
  FilePartInput,
  OpencodeClient,
  OutputFormat,
  Session,
  SubtaskPartInput,
  TextPartInput,
} from "@opencode-ai/sdk/v2";

function unwrap<T>(data: T | undefined, operation: string): T {
  if (data === undefined) {
    throw new Error(`OpenCode ${operation} returned no data`);
  }
  return data;
}

export interface SessionCreateInput {
  directory?: string;
  parentID?: string;
  title?: string;
  workspaceID?: string;
}

export interface SessionPromptInput {
  agent?: string;
  directory?: string;
  format?: OutputFormat;
  model?: {
    providerID: string;
    modelID: string;
  };
  noReply?: boolean;
  parts?: Array<
    TextPartInput | FilePartInput | AgentPartInput | SubtaskPartInput
  >;
  sessionID: string;
  system?: string;
  text: string;
  variant?: string;
  workspace?: string;
}

export interface SessionPromptAsyncInput {
  agent?: string;
  directory?: string;
  model?: {
    providerID: string;
    modelID: string;
  };
  parts?: Array<
    TextPartInput | FilePartInput | AgentPartInput | SubtaskPartInput
  >;
  sessionID: string;
  system?: string;
  text: string;
  variant?: string;
  workspace?: string;
}

export interface SessionCommandInput {
  agent?: string;
  arguments?: string;
  command: string;
  directory?: string;
  model?: string;
  sessionID: string;
  workspace?: string;
}

export interface SessionForkInput {
  directory?: string;
  messageID?: string;
  sessionID: string;
  workspace?: string;
}

export class SessionManager {
  readonly client: OpencodeClient;

  constructor(client: OpencodeClient) {
    this.client = client;
  }

  async create(input: SessionCreateInput): Promise<Session> {
    const result = await this.client.session.create({
      title: input.title,
      parentID: input.parentID,
      directory: input.directory,
      workspaceID: input.workspaceID,
    });
    return unwrap(result.data, "session.create");
  }

  async get(sessionID: string, directory?: string): Promise<Session> {
    const result = await this.client.session.get({
      sessionID,
      directory,
    });
    return unwrap(result.data, "session.get");
  }

  async list(options?: {
    directory?: string;
    roots?: boolean;
    search?: string;
    limit?: number;
  }): Promise<Session[]> {
    const result = await this.client.session.list({
      directory: options?.directory,
      roots: options?.roots,
      search: options?.search,
      limit: options?.limit,
    });
    return unwrap(result.data, "session.list");
  }

  async delete(sessionID: string, directory?: string): Promise<boolean> {
    const result = await this.client.session.delete({ sessionID, directory });
    return unwrap(result.data, "session.delete");
  }

  async abort(sessionID: string, directory?: string): Promise<boolean> {
    const result = await this.client.session.abort({ sessionID, directory });
    return unwrap(result.data, "session.abort");
  }

  async prompt(input: SessionPromptInput) {
    const parts = input.parts ?? [{ type: "text" as const, text: input.text }];
    const result = await this.client.session.prompt({
      sessionID: input.sessionID,
      directory: input.directory,
      workspace: input.workspace,
      model: input.model,
      agent: input.agent,
      parts,
      format: input.format,
      system: input.system,
      noReply: input.noReply,
      variant: input.variant,
    });
    return unwrap(result.data, "session.prompt");
  }

  async promptAsync(input: SessionPromptAsyncInput) {
    const parts = input.parts ?? [{ type: "text" as const, text: input.text }];
    await this.client.session.promptAsync({
      sessionID: input.sessionID,
      directory: input.directory,
      workspace: input.workspace,
      model: input.model,
      agent: input.agent,
      parts,
      system: input.system,
      variant: input.variant,
    });
  }

  async command(input: SessionCommandInput) {
    const result = await this.client.session.command({
      sessionID: input.sessionID,
      directory: input.directory,
      workspace: input.workspace,
      command: input.command,
      arguments: input.arguments,
      agent: input.agent,
      model: input.model,
    });
    return unwrap(result.data, "session.command");
  }

  async fork(input: SessionForkInput): Promise<Session> {
    const result = await this.client.session.fork({
      sessionID: input.sessionID,
      directory: input.directory,
      workspace: input.workspace,
      messageID: input.messageID,
    });
    return unwrap(result.data, "session.fork");
  }

  async status(directory?: string): Promise<Record<string, { type: string }>> {
    const result = await this.client.session.status({ directory });
    return result.data ?? {};
  }

  async messages(
    sessionID: string,
    options?: { limit?: number; directory?: string }
  ) {
    const result = await this.client.session.messages({
      sessionID,
      limit: options?.limit,
      directory: options?.directory,
    });
    return unwrap(result.data, "session.messages");
  }

  async summarize(
    sessionID: string,
    options?: { providerID?: string; modelID?: string }
  ) {
    await this.client.session.summarize({
      sessionID,
      providerID: options?.providerID,
      modelID: options?.modelID,
    });
  }
}
