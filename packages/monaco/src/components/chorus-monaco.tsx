import MonacoEditor from "@monaco-editor/react";
import type * as monaco from "monaco-editor";
import { LanguageClientWrapper } from "monaco-languageclient/lcwrapper";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChorusMonacoProps } from "../types";
import { DiffFloatingWindow } from "./diff-floating-window";

const CHORUS_THEME: monaco.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [],
  colors: {
    "editor.background": "#0d0d0d",
    "editor.foreground": "#e0e0e0",
    "editorLineNumber.foreground": "#555",
    "editorLineNumber.activeForeground": "#888",
    "editor.lineHighlightBackground": "#1a1a1a",
    "editor.selectionBackground": "#264f78",
    "editor.inactiveSelectionBackground": "#3a3d41",
    "editorCursor.foreground": "#aeafad",
    "editorWhitespace.foreground": "#3b3b3b",
    "editorIndentGuide.background": "#404040",
    "editorIndentGuide.activeBackground": "#707070",
    "scrollbar.shadow": "#000000",
    "scrollbarSlider.background": "#55555580",
    "scrollbarSlider.hoverBackground": "#77777780",
    "scrollbarSlider.activeBackground": "#99999980",
  },
};

export function ChorusMonaco({
  value,
  language,
  mode = "edit",
  lspConfig,
  diffView,
  readOnly = false,
  onChange,
  onSave,
  className,
  height = "100%",
  width = "100%",
}: ChorusMonacoProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof monaco | null>(null);
  const lcWrapperRef = useRef<LanguageClientWrapper | null>(null);
  const [lspError, setLspError] = useState<string | null>(null);
  const lspConfigRef = useRef(lspConfig);
  lspConfigRef.current = lspConfig;

  const startLsp = useCallback(async () => {
    const config = lspConfigRef.current;
    if (!(config && monacoRef.current && editorRef.current)) {
      return;
    }

    try {
      const lcWrapper = new LanguageClientWrapper({
        languageId: config.languageId,
        connection: {
          options: {
            $type: "WebSocketUrl",
            url: config.wsUrl,
          },
        },
        clientOptions: {
          documentSelector: config.documentSelector ?? [config.languageId],
          workspaceFolder: config.workspaceFolder
            ? {
                index: 0,
                name: config.workspaceFolder.split("/").pop() ?? "workspace",
                uri: monacoRef.current.Uri.file(config.workspaceFolder),
              }
            : undefined,
        },
      });

      lcWrapperRef.current = lcWrapper;
      await lcWrapper.start();
      setLspError(null);
    } catch (err) {
      setLspError(
        err instanceof Error ? err.message : "Failed to connect to LSP"
      );
    }
  }, []);

  useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      startLsp();
    }

    return () => {
      lcWrapperRef.current?.dispose();
      lcWrapperRef.current = null;
    };
  }, [startLsp]);

  function handleEditorMount(
    editor: monaco.editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco
  ) {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;

    monacoInstance.editor.defineTheme("chorus-dark", CHORUS_THEME);
    monacoInstance.editor.setTheme("chorus-dark");

    // biome-ignore lint: monaco uses bitwise for key combos
    const saveKey = monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS;
    editor.addCommand(saveKey, () => {
      onSave?.(editor.getValue());
    });

    if (lspConfigRef.current?.wsUrl) {
      startLsp();
    }
  }

  function handleChange(val: string | undefined) {
    if (val !== undefined) {
      onChange?.(val);
    }
  }

  const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    wordWrap: "on",
    automaticLayout: true,
    scrollBeyondLastLine: false,
    readOnly,
    lineNumbers: "on",
    renderWhitespace: "selection",
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true,
    },
    padding: { top: 16, bottom: 16 },
    smoothScrolling: true,
    cursorBlinking: "smooth",
    cursorSmoothCaretAnimation: "on",
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    scrollbar: {
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
  };

  return (
    <div className={className} style={{ height, width, position: "relative" }}>
      <MonacoEditor
        height="100%"
        language={language}
        onChange={handleChange}
        onMount={handleEditorMount}
        options={editorOptions}
        theme="chorus-dark"
        value={value}
      />

      {lspError && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            right: 16,
            background: "#3d1f1f",
            color: "#f87171",
            padding: "4px 12px",
            borderRadius: 4,
            fontSize: 12,
            zIndex: 10,
          }}
        >
          LSP: {lspError}
        </div>
      )}

      {diffView && (
        <DiffFloatingWindow
          language={diffView.language}
          modified={diffView.modified}
          onClose={() => undefined}
          original={diffView.original}
          visible={mode === "diff"}
        />
      )}
    </div>
  );
}
