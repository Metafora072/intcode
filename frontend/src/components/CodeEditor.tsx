import Editor from "@monaco-editor/react";

interface Props {
  language: string;
  value: string;
  onChange: (val: string) => void;
}

const CodeEditor = ({ language, value, onChange }: Props) => {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner">
      <Editor
        height="520px"
        theme="vs-light"
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={(val) => onChange(val ?? "")}
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
