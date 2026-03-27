"use client";

import { useState } from "react";

const SKILL_PRESETS = [
  "JavaScript", "TypeScript", "React", "Next.js", "Vue.js", "Angular",
  "Node.js", "Python", "Go", "Java", "C++", "Rust",
  "PostgreSQL", "MongoDB", "Redis", "Docker", "Kubernetes", "CI/CD",
  "Git", "REST API", "GraphQL", "HTML/CSS", "Tailwind CSS", "Figma",
  "UI/UX", "Photoshop", "Illustrator", "Blender", "Unity",
  "Data Science", "Machine Learning", "TensorFlow", "PyTorch",
  "Agile", "Scrum", "Product Management", "Marketing", "SEO",
  "1С", "Excel", "Power BI", "Tableau", "R",
  "iOS", "Android", "Flutter", "React Native", "Swift", "Kotlin",
  "Linux", "Nginx", "AWS", "GCP", "Azure",
];

export function SkillPicker({
  selected,
  onChange,
  label = "Навыки",
  searchPlaceholder = "Найти навык...",
  customPlaceholder = "Свой навык...",
}: {
  selected: string[];
  onChange: (skills: string[]) => void;
  label?: string;
  searchPlaceholder?: string;
  customPlaceholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [customInput, setCustomInput] = useState("");

  const filtered = SKILL_PRESETS.filter(
    (s) => !selected.includes(s) && s.toLowerCase().includes(search.toLowerCase()),
  ).slice(0, 12);

  const add = (skill: string) => {
    if (!selected.includes(skill)) onChange([...selected, skill]);
    setSearch("");
    setCustomInput("");
  };
  const remove = (skill: string) => onChange(selected.filter((s) => s !== skill));

  const addCustom = () => {
    const val = customInput.trim();
    if (val && !selected.includes(val)) {
      onChange([...selected, val]);
      setCustomInput("");
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-[var(--text-secondary)]">{label}</label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-cyan)]/15 px-2.5 py-1 text-xs font-medium text-[var(--brand-cyan)]"
            >
              {s}
              <button type="button" onClick={() => remove(s)} className="ml-0.5 hover:opacity-70">
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        className="glass-input w-full px-4 py-2.5 text-sm"
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {search && filtered.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-[var(--glass-border)] px-2.5 py-1 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--glass-bg-strong)] hover:text-[var(--text-primary)]"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className="glass-input flex-1 px-3 py-2 text-sm"
          placeholder={customPlaceholder}
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customInput.trim()}
          className="rounded-lg bg-[var(--glass-bg-strong)] px-3 py-2 text-xs text-[var(--text-primary)] disabled:opacity-40"
        >
          Добавить
        </button>
      </div>
    </div>
  );
}
