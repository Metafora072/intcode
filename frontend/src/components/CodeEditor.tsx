import Editor, { OnMount } from "@monaco-editor/react";
import { useRef } from "react";

interface Props {
  language: string;
  value: string;
  onChange: (val: string) => void;
  theme: "vs-light" | "vs-dark";
  onRunShortcut?: () => void;
  height?: string;
}

const CodeEditor = ({ language, value, onChange, theme, onRunShortcut, height = "100%" }: Props) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunShortcut?.();
    });
    // 父容器尺寸变化时重算布局
    const observer = new ResizeObserver(() => editor.layout());
    observer.observe(editor.getDomNode() as HTMLElement);
    editor.onDidDispose(() => observer.disconnect());
  };
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner h-full">
      <Editor
        height={height}
        theme={theme}
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={(val) => onChange(val ?? "")}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          smoothScrolling: true,
          automaticLayout: true
        }}
      />
    </div>
  );
};

export default CodeEditor;
