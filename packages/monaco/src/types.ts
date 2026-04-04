export type EditorMode = "edit" | "diff" | "readonly";

export interface LspConnectionConfig {
  documentSelector?: string[];
  languageId: string;
  workspaceFolder?: string;
  wsUrl: string;
}

export interface DiffView {
  language: string;
  modified: string;
  original: string;
}

export interface ChorusMonacoProps {
  className?: string;
  diffView?: DiffView;
  filePath: string;
  height?: string;
  language: string;
  lspConfig?: LspConnectionConfig;
  mode?: EditorMode;
  onChange?: (value: string) => void;
  onSave?: (value: string) => void;
  readOnly?: boolean;
  value: string;
  width?: string;
}

export interface BorderlessFileViewProps {
  className?: string;
  filePath: string;
  height?: string;
  language: string;
  lspConfig?: LspConnectionConfig;
  onChange?: (value: string) => void;
  value: string;
}

export interface DiffFloatingWindowProps {
  className?: string;
  language: string;
  modified: string;
  onClose: () => void;
  original: string;
  visible: boolean;
}
