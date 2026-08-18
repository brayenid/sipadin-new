"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface PrivacyModeContextType {
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
  setPrivacyMode: (value: boolean) => void;
}

const PrivacyModeContext = createContext<PrivacyModeContextType>({
  isPrivacyMode: false,
  togglePrivacyMode: () => {},
  setPrivacyMode: () => {},
});

export const usePrivacyMode = () => useContext(PrivacyModeContext);

const PRIVACY_STORAGE_KEY = "sipadin_privacy_mode";

export function PrivacyModeProvider({ children }: { children: React.ReactNode }) {
  const [isPrivacyMode, setIsPrivacyModeState] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(PRIVACY_STORAGE_KEY);
    if (stored === "true") {
      setIsPrivacyModeState(true);
      document.documentElement.setAttribute("data-privacy-mode", "true");
    }
  }, []);

  const setPrivacyMode = (value: boolean) => {
    setIsPrivacyModeState(value);
    localStorage.setItem(PRIVACY_STORAGE_KEY, value ? "true" : "false");
    if (value) {
      document.documentElement.setAttribute("data-privacy-mode", "true");
    } else {
      document.documentElement.removeAttribute("data-privacy-mode");
    }
  };

  const togglePrivacyMode = () => {
    setPrivacyMode(!isPrivacyMode);
  };

  // MutationObserver cerdas untuk otomatis mendeteksi dan memberi class privacy-blur pada semua teks berawalan 'Rp'
  useEffect(() => {
    if (!mounted || !isPrivacyMode) {
      document.querySelectorAll("[data-currency]").forEach((el) => {
        el.removeAttribute("data-currency");
      });
      return;
    }

    const rpRegex = /(?:^|\s)(?:Rp\.?|RP\.?)\s*[\d.,]+/i;

    const scanAndTag = (root: Node = document.body) => {
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName.toLowerCase();
            if (tag === "script" || tag === "style" || tag === "input" || tag === "textarea") {
              return NodeFilter.FILTER_REJECT;
            }
            if (rpRegex.test(node.nodeValue || "")) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
          },
        }
      );

      const nodesToTag: HTMLElement[] = [];
      let currentNode = walker.nextNode();
      while (currentNode) {
        if (currentNode.parentElement && !currentNode.parentElement.closest(".no-privacy-blur")) {
          nodesToTag.push(currentNode.parentElement);
        }
        currentNode = walker.nextNode();
      }

      nodesToTag.forEach((el) => {
        el.setAttribute("data-currency", "true");
      });
    };

    scanAndTag();

    const observer = new MutationObserver(() => {
      scanAndTag();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [mounted, isPrivacyMode]);

  return (
    <PrivacyModeContext.Provider value={{ isPrivacyMode, togglePrivacyMode, setPrivacyMode }}>
      {children}
      <style jsx global>{`
        [data-privacy-mode="true"] [data-currency="true"],
        [data-privacy-mode="true"] .privacy-blur {
          filter: blur(6px) !important;
          transition: filter 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
          user-select: none !important;
          cursor: pointer !important;
          display: inline-block;
        }

        [data-privacy-mode="true"] [data-currency="true"]:hover,
        [data-privacy-mode="true"] .privacy-blur:hover {
          filter: blur(0px) !important;
          user-select: auto !important;
        }
      `}</style>
    </PrivacyModeContext.Provider>
  );
}
