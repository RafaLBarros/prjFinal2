// src/renderer/src/components/SearchableSelect.tsx
import { useState, useRef, useEffect } from 'react';

interface Option {
  id: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SearchableSelect({ options, value, onChange, placeholder = "Selecione...", disabled = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.id === value);

  useEffect(() => {
    if (!isOpen) {
      setSearch(selectedOption ? selectedOption.label : "");
    }
  }, [isOpen, selectedOption]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Ignora eventos de elementos que já foram removidos do DOM.
      if (!document.body.contains(event.target as Node)) return;
      
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={isOpen ? search : (selectedOption ? selectedOption.label : "")}
        onChange={(e) => { 
          setSearch(e.target.value); 
          if (!isOpen) setIsOpen(true); 
        }}
        onFocus={() => {
          setSearch(""); 
          setIsOpen(true);
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-slate-900 border border-slate-600 text-slate-200 text-sm p-1.5 rounded focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors relative z-[100]"
      />
      <div className="absolute right-2 top-2.5 pointer-events-none text-slate-500 text-[10px] z-[101]">▼</div>

      {isOpen && !disabled && (
        <ul className="absolute z-[200] w-full mt-1 bg-slate-800 border border-slate-600 rounded shadow-2xl max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(option => (
              <li
                key={option.id}
                onMouseDown={(e) => {
                  e.preventDefault(); 
                  e.stopPropagation();
                  onChange(option.id);
                  setIsOpen(false);
                }}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                  value === option.id 
                    ? 'bg-emerald-900/50 text-emerald-400 font-bold border-l-2 border-emerald-500' 
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {option.label}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-slate-500 italic text-center">Nenhum resultado...</li>
          )}
        </ul>
      )}
    </div>
  );
}