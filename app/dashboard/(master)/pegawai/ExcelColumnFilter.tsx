"use client";

import React, { useState, useMemo, useDeferredValue } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Filter,
  X,
  Search,
  CheckSquare,
  Square,
  RotateCcw,
} from "lucide-react";

export type FilterOption = {
  label: string;
  value: string;
  count: number;
};

interface ExcelColumnFilterProps {
  title: string;
  selectedValues: string[] | null; // null means all selected (no active filter)
  onFilterChange: (selected: string[] | null) => void;
  options: FilterOption[];
  onSortAsc?: () => void;
  onSortDesc?: () => void;
  isSortedAsc?: boolean;
  isSortedDesc?: boolean;
  align?: "start" | "end";
}

const MAX_DISPLAY_OPTIONS = 80;

export default function ExcelColumnFilter({
  title,
  selectedValues,
  onFilterChange,
  options,
  onSortAsc,
  onSortDesc,
  isSortedAsc = false,
  isSortedDesc = false,
  align = "start",
}: ExcelColumnFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const isFilterActive = selectedValues !== null && selectedValues.length < options.length;

  // Filter options based on inner search with deferred value to prevent input lag on large datasets
  const filteredOptions = useMemo(() => {
    if (!open) return []; // Don't compute when closed for performance!
    const q = deferredSearch.toLowerCase().trim();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, deferredSearch, open]);

  // Capped slice for DOM rendering performance (handles 5,000+ items smoothly)
  const visibleOptions = useMemo(() => {
    return filteredOptions.slice(0, MAX_DISPLAY_OPTIONS);
  }, [filteredOptions]);

  // Current checked set
  const activeSet = useMemo(() => {
    if (selectedValues === null) {
      return new Set(options.map((o) => o.value));
    }
    return new Set(selectedValues);
  }, [selectedValues, options]);

  const allSelected = useMemo(() => {
    if (filteredOptions.length === 0) return false;
    return filteredOptions.every((opt) => activeSet.has(opt.value));
  }, [filteredOptions, activeSet]);

  const noneSelected = useMemo(() => {
    if (filteredOptions.length === 0) return true;
    return filteredOptions.every((opt) => !activeSet.has(opt.value));
  }, [filteredOptions, activeSet]);

  const handleSelectAllToggle = () => {
    if (allSelected) {
      const newSet = new Set(activeSet);
      filteredOptions.forEach((opt) => newSet.delete(opt.value));
      onFilterChange(Array.from(newSet));
    } else {
      const newSet = new Set(activeSet);
      filteredOptions.forEach((opt) => newSet.add(opt.value));
      if (newSet.size === options.length) {
        onFilterChange(null);
      } else {
        onFilterChange(Array.from(newSet));
      }
    }
  };

  const handleOptionToggle = (val: string) => {
    const newSet = new Set(activeSet);
    if (newSet.has(val)) {
      newSet.delete(val);
    } else {
      newSet.add(val);
    }

    if (newSet.size === options.length) {
      onFilterChange(null);
    } else {
      onFilterChange(Array.from(newSet));
    }
  };

  const handleSelectOnly = (e: React.MouseEvent, val: string) => {
    e.preventDefault();
    e.stopPropagation();
    onFilterChange([val]);
  };

  const handleClearColumnFilter = () => {
    onFilterChange(null);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={`w-full flex items-center justify-between gap-1.5 cursor-pointer py-1 px-1.5 rounded-md transition select-none group hover:bg-slate-200/70 text-left ${
              isFilterActive ? "bg-indigo-50/90 text-indigo-900 font-bold" : "text-slate-700"
            }`}
            title={`Filter & Urutkan kolom ${title}`}
          />
        }
      >
        <span className="truncate text-xs font-semibold">{title}</span>
        <div className="flex items-center shrink-0">
          {isFilterActive ? (
            <span className="p-0.5 rounded bg-indigo-600 text-white shadow-2xs">
              <Filter className="w-3 h-3 fill-current" />
            </span>
          ) : (
            <Filter className="w-3 h-3 text-slate-400 group-hover:text-slate-700 opacity-60 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        sideOffset={6}
        className="w-72 p-0 shadow-xl border border-slate-200/90 rounded-xl bg-white overflow-hidden text-xs"
      >
        {/* Header Popover */}
        <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            Filter {title}
          </span>
          {isFilterActive && (
            <button
              type="button"
              onClick={handleClearColumnFilter}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        {/* Sort Actions */}
        {(onSortAsc || onSortDesc) && (
          <div className="p-2 border-b border-slate-100 grid grid-cols-2 gap-1.5 bg-slate-50/40">
            {onSortAsc && (
              <Button
                type="button"
                variant={isSortedAsc ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  onSortAsc();
                  setOpen(false);
                }}
                className={`h-7 px-2 text-[11px] justify-center font-medium ${
                  isSortedAsc ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <ArrowDownAZ className="w-3.5 h-3.5 mr-1 text-slate-500 shrink-0" />
                <span>A → Z</span>
              </Button>
            )}
            {onSortDesc && (
              <Button
                type="button"
                variant={isSortedDesc ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  onSortDesc();
                  setOpen(false);
                }}
                className={`h-7 px-2 text-[11px] justify-center font-medium ${
                  isSortedDesc ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <ArrowUpAZ className="w-3.5 h-3.5 mr-1 text-slate-500 shrink-0" />
                <span>Z → A</span>
              </Button>
            )}
          </div>
        )}

        {/* Search Input */}
        <div className="p-2 border-b border-slate-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nilai..."
              className="h-7 text-xs pl-7 pr-7 bg-slate-50/80 border-slate-200 focus:bg-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1.5 p-0.5 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Select All Bar */}
        <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-600 bg-slate-50/40 select-none">
          <button
            type="button"
            onClick={handleSelectAllToggle}
            className="flex items-center gap-1.5 font-medium hover:text-indigo-600 cursor-pointer"
          >
            {allSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
            ) : noneSelected ? (
              <Square className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <div className="w-3.5 h-3.5 bg-indigo-600 rounded-xs flex items-center justify-center text-white text-[9px] font-bold">
                -
              </div>
            )}
            <span>(Pilih Semua)</span>
          </button>
          <span className="text-[10px] text-slate-400 font-mono">
            {activeSet.size}/{options.length}
          </span>
        </div>

        {/* Options List */}
        <div className="max-h-52 overflow-y-auto p-1 space-y-0.5 [scrollbar-width:thin]">
          {visibleOptions.length > 0 ? (
            visibleOptions.map((opt) => {
              const isChecked = activeSet.has(opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={() => handleOptionToggle(opt.value)}
                  className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition text-xs ${
                    isChecked
                      ? "hover:bg-slate-100 text-slate-900"
                      : "opacity-60 hover:opacity-100 hover:bg-slate-50 text-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => handleOptionToggle(opt.value)}
                      className="w-3.5 h-3.5 rounded border-slate-300 data-[state=checked]:bg-indigo-600"
                    />
                    <span className="truncate" title={opt.label}>
                      {opt.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleSelectOnly(e, opt.value)}
                      className="opacity-0 group-hover:opacity-100 text-[10px] text-indigo-600 hover:underline px-1 rounded hover:bg-indigo-50 transition-opacity cursor-pointer font-medium"
                      title={`Hanya pilih "${opt.label}"`}
                    >
                      Hanya ini
                    </button>
                    <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-100">
                      {opt.count}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-5 text-center text-slate-400 text-xs">
              Tidak ada nilai yang cocok
            </div>
          )}

          {filteredOptions.length > MAX_DISPLAY_OPTIONS && (
            <div className="py-1.5 px-2 text-center text-[10px] text-slate-400 border-t border-slate-100 bg-slate-50/50">
              Menampilkan {MAX_DISPLAY_OPTIONS} dari {filteredOptions.length} opsi. Gunakan kotak pencarian untuk menyaring lebih spesifik.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-2 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-6 px-2.5 text-[11px] font-medium"
          >
            Tutup
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
