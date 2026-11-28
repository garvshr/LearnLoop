import React, { useMemo, useState } from "react";

/**
 * Reusable searchable skill picker.
 * Filters a large catalog of skills by search text and optional category.
 */
export default function SkillSearchSelect({
  skills = [],
  categories = [],
  selectedSkill = "",
  onSelect,
  placeholder = "Search skills (e.g. React, Guitar, SEO)...",
  disabledSkills = [],
}) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const disabledSet = useMemo(
    () => new Set(disabledSkills.map((s) => s.toLowerCase())),
    [disabledSkills]
  );

  const filteredSkills = useMemo(() => {
    const q = query.trim().toLowerCase();
    return skills.filter((item) => {
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [skills, query, selectedCategory]);

  return (
    <div className="skill-picker">
      <div className="skill-picker-controls">
        <input
          type="text"
          className="form-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
        />
        <select
          className="form-select"
          style={{ maxWidth: "210px" }}
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="All">All Categories ({skills.length})</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="skill-picker-list">
        {filteredSkills.length === 0 ? (
          <div className="skill-picker-empty">
            No skills found matching "{query}"
          </div>
        ) : (
          filteredSkills.map((item) => {
            const isSelected =
              selectedSkill.toLowerCase() === item.name.toLowerCase();
            const isDisabled = disabledSet.has(item.name.toLowerCase());

            return (
              <button
                key={item.name}
                type="button"
                disabled={isDisabled}
                className={`skill-picker-item ${isSelected ? "selected" : ""}`}
                onClick={() => onSelect(item)}
              >
                <span className="skill-picker-name">{item.name}</span>
                <span className="skill-picker-cat">{item.category}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
