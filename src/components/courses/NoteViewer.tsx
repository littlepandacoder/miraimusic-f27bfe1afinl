interface NoteViewerProps {
  note: {
    id: string;
    title: string;
    content: string;
  };
}

// Escape HTML special characters before injecting into innerHTML to prevent XSS.
// Applied before the markdown regex so user content cannot introduce arbitrary tags.
const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

const NoteViewer = ({ note }: NoteViewerProps) => {
  // Simple markdown-like formatting for notes
  const renderContent = (text: string) => {
    const lines = text.split("\n");
    const elements = [];
    let currentList: string[] = [];

    lines.forEach((line, index) => {
      // Headers
      if (line.startsWith("# ")) {
        elements.push(
          <h1 key={`h1-${index}`} className="text-2xl font-black text-foreground mt-4 mb-2">
            {line.slice(2)}
          </h1>
        );
      } else if (line.startsWith("## ")) {
        elements.push(
          <h2 key={`h2-${index}`} className="text-xl font-bold text-foreground mt-3 mb-2">
            {line.slice(3)}
          </h2>
        );
      } else if (line.startsWith("### ")) {
        elements.push(
          <h3 key={`h3-${index}`} className="text-lg font-semibold text-foreground mt-2 mb-1">
            {line.slice(4)}
          </h3>
        );
      }
      // Lists
      else if (line.trim().startsWith("- ")) {
        currentList.push(line.trim().slice(2));
      } else if (currentList.length > 0 && !line.trim().startsWith("- ")) {
        elements.push(
          <ul key={`list-${index}`} className="list-disc list-inside space-y-1 text-foreground mb-2">
            {currentList.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        );
        currentList = [];
        if (line.trim()) {
          elements.push(
            <p key={`p-${index}`} className="text-foreground mb-2">
              {line}
            </p>
          );
        }
      }
      // Paragraphs
      else if (line.trim()) {
        let content = escapeHtml(line)
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>")
          .replace(/`(.*?)`/g, "<code>$1</code>");

        elements.push(
          <p
            key={`p-${index}`}
            className="text-foreground mb-2"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        );
      }
    });

    // Add any remaining list
    if (currentList.length > 0) {
      elements.push(
        <ul key="final-list" className="list-disc list-inside space-y-1 text-foreground">
          {currentList.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      );
    }

    return elements;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">{note.title}</h2>
      </div>
      <div className="text-foreground space-y-4 prose-invert max-w-none">
        {renderContent(note.content)}
      </div>
    </div>
  );
};

export default NoteViewer;
