export interface BoardSessionRecord {
  boardId: string;
  directory: string;
  projectId?: string;
  sessionId: string;
}

export class BoardSessionRegistry {
  readonly #records = new Map<string, BoardSessionRecord>();

  get(boardId: string): BoardSessionRecord | undefined {
    return this.#records.get(boardId);
  }

  set(record: BoardSessionRecord): BoardSessionRecord {
    this.#records.set(record.boardId, record);
    return record;
  }

  delete(boardId: string): void {
    this.#records.delete(boardId);
  }
}
