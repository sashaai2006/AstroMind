import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

type Props = {
  path: string | null;
  content: string;
  language: string;
  onSave: (nextContent: string) => Promise<void>;
  onFix?: () => void;
  onDeepReview?: () => void;
};

const Editor: React.FC<Props> = ({ path, content, language, onSave, onFix, onDeepReview }) => {
  const [value, setValue] = useState(content);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  // Sync value with content prop directly (no typewriter effect)
  useEffect(() => {
    setValue(content);
  }, [content]);

  const handleDeepReview = async () => {
      if (!onDeepReview) return;
      setReviewing(true);
      try {
          await onDeepReview();
      } finally {
          setReviewing(false);
      }
  };

  if (!path) {
    return <div style={{ padding: "1rem", color: "#9ca3af", display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>Select a file to view its contents.</div>;
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(value);
    } finally {
      setSaving(false);
    }
  };

  const isMarkdown = path.endsWith(".md");

  return (
    <div className="glass-panel" style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: "8px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.5rem 1rem",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(0,0,0,0.2)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ color: "#e5e7eb" }}>{path}</span>
          {isMarkdown && (
            <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", borderRadius: "4px", padding: "2px" }}>
              <button 
                onClick={() => setShowPreview(false)}
                style={{ 
                  background: !showPreview ? "rgba(59, 130, 246, 0.5)" : "transparent",
                  color: !showPreview ? "white" : "#9ca3af",
                  border: "none",
                  padding: "2px 8px",
                  fontSize: "0.8rem",
                  borderRadius: "2px",
                  cursor: "pointer"
                }}
              >
                Edit
              </button>
              <button 
                onClick={() => setShowPreview(true)}
                style={{ 
                  background: showPreview ? "rgba(59, 130, 246, 0.5)" : "transparent",
                  color: showPreview ? "white" : "#9ca3af",
                  border: "none",
                  padding: "2px 8px",
                  fontSize: "0.8rem",
                  borderRadius: "2px",
                  cursor: "pointer"
                }}
              >
                Preview
              </button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {onDeepReview && (
                <button 
                    type="button" 
                    onClick={handleDeepReview}
                    disabled={reviewing}
                    title="Run AI code review on this file"
                    style={{
                        background: "rgba(147, 51, 234, 0.2)",
                        color: "#c4b5fd",
                        border: "1px solid rgba(147, 51, 234, 0.3)"
                    }}
                >
                  {reviewing ? "🔍 Reviewing..." : "🔍 Deep Review"}
                </button>
            )}
            {onFix && (
                <button 
                    type="button" 
                    onClick={onFix} 
                    title="Auto-fix bugs in this file"
                    style={{
                        background: "rgba(239, 68, 68, 0.2)",
                        color: "#fca5a5",
                        border: "1px solid rgba(239, 68, 68, 0.3)"
                    }}
                >
                  🚑 Fix It
                </button>
            )}
            <button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {isMarkdown && showPreview ? (
          <div style={{ padding: "1rem", height: "100%", overflowY: "auto", color: "#d1d5db", lineHeight: 1.6 }}>
            <div className="markdown-preview">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {value}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <MonacoEditor
            height="100%"
            language={language}
            value={value}
            theme="vs-dark"
            onChange={(nextValue) => setValue(nextValue || "")}
            options={{ 
                fontSize: 14, 
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 }
            }}
          />
        )}
      </div>
      {isMarkdown && showPreview && (
         <style jsx global>{`
           .markdown-preview h1, .markdown-preview h2, .markdown-preview h3 { color: #fff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.3em; margin-top: 1.5em; }
           .markdown-preview p { margin-bottom: 1em; }
           .markdown-preview code { background: rgba(0,0,0,0.3); padding: 0.2em 0.4em; borderRadius: 3px; font-family: monospace; }
           .markdown-preview pre { background: #1e1e1e; padding: 1em; borderRadius: 6px; overflow: auto; }
           .markdown-preview pre code { background: transparent; padding: 0; }
           .markdown-preview ul, .markdown-preview ol { padding-left: 1.5em; }
           .markdown-preview blockquote { border-left: 4px solid #3b82f6; padding-left: 1em; color: #9ca3af; }
           .markdown-preview table { border-collapse: collapse; width: 100%; margin: 1em 0; }
           .markdown-preview th, .markdown-preview td { border: 1px solid #444; padding: 0.5em; text-align: left; }
           .markdown-preview th { background: rgba(255,255,255,0.1); }
           .markdown-preview a { color: #60a5fa; }
         `}</style>
      )}
    </div>
  );
};

export default Editor;
