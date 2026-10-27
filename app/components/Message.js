"use client";
import { useState } from "react";

// Renders text with ``` code blocks as copyable cards and **bold** inline.
function Inline({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <b key={i}>{p.slice(2, -2)}</b>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i}>{p.slice(1, -1)}</code>;
    return <span key={i}>{p}</span>;
  });
}

function Code({ lang, code }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="code">
      <div className="code-head">
        <span>{lang || "code"}</span>
        <button type="button" onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre>{code}</pre>
    </div>
  );
}

export default function Message({ m }) {
  const blocks = m.content.split(/```(\w*)\n?([\s\S]*?)```/g);
  const out = [];
  for (let i = 0; i < blocks.length; i += 3) {
    if (blocks[i]) out.push(<div key={i} className="text"><Inline text={blocks[i]} /></div>);
    if (blocks[i + 2] !== undefined) out.push(<Code key={i + "c"} lang={blocks[i + 1]} code={blocks[i + 2].replace(/\n$/, "")} />);
  }
  return (
    <div className={"msg " + m.role}>
      <div className="bubble">{out}</div>
      <small className="meta">{m.role === "user" ? (m.voice ? "🎙 voice" : "") : m.meta}</small>
    </div>
  );
}
