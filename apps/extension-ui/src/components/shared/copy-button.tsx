import React, { useState } from 'react';

export interface CopyButtonProps {
  text: string
  title?: string
  className?: string
}

export const CopyButton = ({ text, title = 'Copy', className = 'jee-icon-btn' }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const onClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // clipboard errors handled by parent if needed
    }
  };

  return (
    <span className="jee-copy-wrap">
      <a href="#" className={className} title={title} onClick={onClick}>
        <i className="mdi mdi-content-copy fs-6" />
      </a>
      {copied ?
        <span className="jee-copied-tip" role="status">
          Copied
          <i className="mdi mdi-content-copy" />
        </span>
        :
        null
      }
    </span>
  );
};
