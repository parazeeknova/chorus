import type { BoardViewMode } from "@chorus/contracts";
import type { WorkspaceBoard } from "@/features/workspace/types";

export const BOARD_CARD_WIDTH = 1280;
export const BOARD_CARD_HEIGHT = 720;
export const RELAXED_GAP_X = 48;
export const RELAXED_GAP_Y = 48;
export const STACKED_CARD_X_OFFSET = 18;
export const STACKED_CARD_Y_OFFSET = 56;
export const LAYOUT_PADDING_X = 120;
export const LAYOUT_PADDING_Y = 120;

export interface BoardLayoutItem {
  boardId: string;
  height: number;
  position: {
    x: number;
    y: number;
  };
  width: number;
  zIndex: number;
}

export function getAutoLayoutBoardIds(input: {
  boards: Pick<WorkspaceBoard, "boardId">[];
  forceReset?: boolean;
  previousBoardIds: string[];
  previousViewMode: BoardViewMode | null;
  viewMode: BoardViewMode;
}) {
  if (input.forceReset) {
    return input.boards.map((board) => board.boardId);
  }

  if (input.previousViewMode === null) {
    return [];
  }

  if (input.previousViewMode !== input.viewMode) {
    return input.boards.map((board) => board.boardId);
  }

  const previousBoardIdSet = new Set(input.previousBoardIds);

  return input.boards
    .filter((board) => !previousBoardIdSet.has(board.boardId))
    .map((board) => board.boardId);
}

export function getRelaxedColumnCount(boardCount: number) {
  if (boardCount <= 1) {
    return 1;
  }

  return Math.ceil(Math.sqrt(boardCount));
}

function getStackOrder(boards: WorkspaceBoard[]) {
  return boards;
}

function computeRelaxedLayout(boards: WorkspaceBoard[], canvasWidth: number) {
  const columnCount = Math.min(
    boards.length || 1,
    getRelaxedColumnCount(boards.length)
  );
  const totalWidth =
    columnCount * BOARD_CARD_WIDTH + (columnCount - 1) * RELAXED_GAP_X;
  const startX = Math.max(
    LAYOUT_PADDING_X,
    Math.round((Math.max(canvasWidth, totalWidth) - totalWidth) / 2)
  );

  return new Map(
    boards.map((board, index) => {
      const column = index % columnCount;
      const row = Math.floor(index / columnCount);

      return [
        board.boardId,
        {
          boardId: board.boardId,
          height: BOARD_CARD_HEIGHT,
          position: {
            x: startX + column * (BOARD_CARD_WIDTH + RELAXED_GAP_X),
            y: LAYOUT_PADDING_Y + row * (BOARD_CARD_HEIGHT + RELAXED_GAP_Y),
          },
          width: BOARD_CARD_WIDTH,
          zIndex: 0,
        } satisfies BoardLayoutItem,
      ];
    })
  );
}

function computeStackedLayout(boards: WorkspaceBoard[], canvasWidth: number) {
  const orderedBoards = getStackOrder(boards);
  const stackWidth =
    BOARD_CARD_WIDTH +
    Math.max(orderedBoards.length - 1, 0) * STACKED_CARD_X_OFFSET;
  const startX = Math.max(
    LAYOUT_PADDING_X,
    Math.round((Math.max(canvasWidth, stackWidth) - stackWidth) / 2)
  );

  return new Map(
    orderedBoards.map((board, index) => {
      return [
        board.boardId,
        {
          boardId: board.boardId,
          height: BOARD_CARD_HEIGHT,
          position: {
            x: startX + index * STACKED_CARD_X_OFFSET,
            y: LAYOUT_PADDING_Y + index * STACKED_CARD_Y_OFFSET,
          },
          width: BOARD_CARD_WIDTH,
          zIndex: orderedBoards.length - index,
        } satisfies BoardLayoutItem,
      ];
    })
  );
}

export function computeBoardLayout(input: {
  boards: WorkspaceBoard[];
  canvasWidth: number;
  selectedBoardId: string | null;
  viewMode: BoardViewMode;
}) {
  if (input.viewMode === "stacked") {
    return computeStackedLayout(input.boards, input.canvasWidth);
  }

  return computeRelaxedLayout(input.boards, input.canvasWidth);
}
