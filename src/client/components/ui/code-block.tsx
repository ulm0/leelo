import React from 'react';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
  language?: string;
}

export function CodeBlock({ children, className, language }: CodeBlockProps) {
  return (
    <div className={cn("my-4", className)}>
      {language && (
        <div className="bg-muted px-3 py-1 text-xs font-mono text-muted-foreground border-b border-border rounded-t-lg">
          {language}
        </div>
      )}
      <pre className={cn(
        "p-4 rounded-lg overflow-x-auto text-sm font-mono",
        language ? "rounded-t-none" : "rounded-lg",
        // Theme-specific styles
        "bg-muted border text-foreground",
        // Light mode specific
        "light:bg-gray-50 light:border-gray-200 light:text-gray-900",
        // Dark mode specific
        "dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100",
        // Warm mode specific - using amber for better contrast
        "warm:bg-amber-50 warm:border-amber-300 warm:text-amber-900"
      )}>
        <code className="bg-transparent p-0">
          {children}
        </code>
      </pre>
    </div>
  );
}

interface InlineCodeProps {
  children: React.ReactNode;
  className?: string;
}

export function InlineCode({ children, className }: InlineCodeProps) {
  return (
    <code className={cn(
      "px-1 py-0.5 rounded text-sm font-mono",
      // Theme-specific styles
      "bg-muted text-foreground border",
      // Light mode specific
      "light:bg-gray-100 light:border-gray-200 light:text-gray-900",
      // Dark mode specific
      "dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100",
      // Warm mode specific - using amber for better contrast
      "warm:bg-amber-100 warm:border-amber-300 warm:text-amber-900",
      className
    )}>
      {children}
    </code>
  );
}
