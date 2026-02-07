import React from 'react';

/**
 * WhatsApp-style message status indicators (check marks).
 * Shows sending/sent/delivered/read/failed states.
 */
const MessageStatus = ({ status, isHighlighted }: { status?: string | number | null | undefined; isHighlighted?: boolean }) => {
  const baseColor = isHighlighted ? 'text-gray-600' : 'text-blue-200';
  const readColor = 'text-blue-400';
  
  // Default: 2 grey checks - delivered
  if (status === null || status === undefined) {
    return (
      <svg className={`w-4 h-3 ${baseColor}`} viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 7l4 4L14 3" />
        <path d="M8 7l4 4L20 3" />
      </svg>
    );
  }
  
  // Normalize status (Chatwoot sends numbers or different strings)
  let normalizedStatus: string = 'delivered';
  
  if (typeof status === 'number') {
    const statusMap: Record<number, string> = { 0: 'sent', 1: 'delivered', 2: 'read', 3: 'failed' };
    normalizedStatus = statusMap[status] ?? 'delivered';
  } else if (typeof status === 'string') {
    const statusLower = status.toLowerCase();
    if (statusLower === 'sending' || statusLower === 'pending' || statusLower === 'progress') {
      normalizedStatus = 'sending';
    } else if (statusLower === 'sent' || statusLower === 'created') {
      normalizedStatus = 'sent';
    } else if (statusLower === 'delivered') {
      normalizedStatus = 'delivered';
    } else if (statusLower === 'read' || statusLower === 'seen') {
      normalizedStatus = 'read';
    } else if (statusLower === 'failed' || statusLower === 'error') {
      normalizedStatus = 'failed';
    } else {
      normalizedStatus = 'delivered';
    }
  }
  
  switch (normalizedStatus) {
    case 'sending':
      return (
        <svg className={`w-3 h-3 ${baseColor} animate-spin`} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    case 'failed':
      return (
        <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'sent':
      return (
        <svg className={`w-3 h-3 ${baseColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'read':
      return (
        <svg className={`w-4 h-3 ${readColor}`} viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 7l4 4L14 3" />
          <path d="M8 7l4 4L20 3" />
        </svg>
      );
    case 'delivered':
    default:
      return (
        <svg className={`w-4 h-3 ${baseColor}`} viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 7l4 4L14 3" />
          <path d="M8 7l4 4L20 3" />
        </svg>
      );
  }
};

export default MessageStatus;
