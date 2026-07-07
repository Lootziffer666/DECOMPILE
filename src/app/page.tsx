"use client";

import { useEffect, useState } from "react";

type Note = {
  id: string;
  text: string;
  createdAt: number;
};

const STORAGE_KEY = "notes.v1";

function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Note[]) : [];
  } catch {
    return [];
  }
}

export default function Home() {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  function addNote() {
    const text = draft.trim();
    if (!text) return;
    setNotes((prev) => [
      { id: crypto.randomUUID(), text, createdAt: Date.now() },
      ...prev,
    ]);
    setDraft("");
  }

  function removeNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <main className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col">
      <header className="px-5 pt-10 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
        <p className="text-sm text-neutral-400">
          {notes.length} {notes.length === 1 ? "note" : "notes"} saved on this device
        </p>
      </header>

      <section className="px-4 flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addNote();
          }}
          placeholder="Write a note…"
          rows={3}
          className="flex-1 resize-none rounded-2xl bg-neutral-800 px-4 py-3 text-base outline-none ring-1 ring-neutral-700 focus:ring-emerald-500 placeholder:text-neutral-500"
        />
        <button
          onClick={addNote}
          aria-label="Add note"
          className="self-end rounded-2xl bg-emerald-500 px-5 py-3 font-medium text-neutral-900 active:scale-95 transition"
        >
          Add
        </button>
      </section>

      <ul className="flex-1 px-4 py-4 space-y-3" suppressHydrationWarning>
        {notes.length === 0 && (
          <li className="text-center text-neutral-500 mt-16">
            No notes yet. Add your first one above.
          </li>
        )}
        {notes.map((note) => (
          <li
            key={note.id}
            className="group flex items-start gap-3 rounded-2xl bg-neutral-800/60 px-4 py-3 ring-1 ring-neutral-700/60"
          >
            <p className="flex-1 whitespace-pre-wrap break-words">{note.text}</p>
            <button
              onClick={() => removeNote(note.id)}
              aria-label="Delete note"
              className="text-neutral-500 hover:text-red-400 text-sm shrink-0"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
