/**
 * ✅ FABRK COMPONENT
 * Dropzone - File drag-and-drop zone
 */

'use client';

import { cn } from '../../lib/utils';
import { mode } from '@fabrk/design-system';
import * as React from 'react';

export interface DropzoneProps {
  onFilesDropped?: (files: File[]) => void;
  children?: React.ReactNode;
  className?: string;
}

export const Dropzone = React.forwardRef<HTMLDivElement, DropzoneProps>(
  ({ onFilesDropped, children, className }, ref) => {
    const [isDragOver, setIsDragOver] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    };

    const handleDragLeave = () => {
      setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0 && onFilesDropped) {
        onFilesDropped(files);
      }
    };

    const handleClick = () => {
      fileInputRef.current?.click();
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0 && onFilesDropped) {
        onFilesDropped(files);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };

    return (
      <>
        <div
          data-slot="dropzone"
          ref={ref}
          role="button"
          tabIndex={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          aria-label="Upload files"
          className={cn(
            mode.color.border.default,
            'cursor-pointer border-2 border-dashed p-8 text-center transition-colors',
            mode.radius,
            isDragOver && 'border-primary bg-primary/5',
            className
          )}
        >
          {children}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />
      </>
    );
  }
);
Dropzone.displayName = 'Dropzone';
