import Editor, { OnMount } from "@monaco-editor/react";

interface Props {
  language: string;
  value: string;
  onChange: (val: string) => void;
  theme: "vs-light" | "vs-dark";
  onRunShortcut?: () => void;
}

const CodeEditor = ({ language, value, onChange, theme, onRunShortcut }: Props) => {
  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunShortcut?.();
    });
  };
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner">
      <Editor
        height="520px"
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
