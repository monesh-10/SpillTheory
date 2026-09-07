import React from 'react';
import { X, Bell, AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import { NotificationItem } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed top-11 right-0 bottom-0 z-40 w-80 sm:w-96 bg-[#FFFFE3] dark:bg-[#171B1F] border-l border-[#CBCBCB] dark:border-[#353D46] flex flex-col text-[#4A4A4A] dark:text-[#FFFFE3] shadow-2xl select-none font-sans">
      {/* Header */}
      <div className="p-3.5 border-b border-[#CBCBCB] dark:border-[#353D46] bg-white dark:bg-[#272E36] flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#6D8196]" />
          <h3 className="font-semibold text-xs uppercase tracking-wider text-[#4A4A4A] dark:text-[#FFFFE3]">
            System Alerts & Advisories
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onMarkAllRead}
            className="text-[11px] text-[#6D8196] hover:text-[#586A7D] dark:text-[#FFFFE3] transition-colors cursor-pointer font-medium"
          >
            Mark all read
          </button>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-[#CBCBCB]/30 text-[#6D8196] hover:text-[#4A4A4A] dark:text-[#CBCBCB] dark:hover:text-[#FFFFE3] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar text-xs">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-[#6D8196] dark:text-[#CBCBCB] text-xs">
            No active alerts in this sector.
          </div>
        ) : (
          notifications.map((item) => {
            const isCritical = item.severity === 'CRITICAL';
            const isWarning = item.severity === 'WARNING';
            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-colors shadow-xs ${
                  isCritical
                    ? 'bg-white dark:bg-[#272E36] border-[#D9534F]/60'
                    : isWarning
                    ? 'bg-white dark:bg-[#272E36] border-[#D9822B]/60'
                    : 'bg-white dark:bg-[#272E36] border-[#CBCBCB] dark:border-[#353D46]'
                } ${!item.read ? 'border-l-4 border-l-[#6D8196]' : 'opacity-80'}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs">
                    {isCritical ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-[#D9534F] shrink-0" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-[#D9822B] shrink-0" />
                    ) : (
                      <Info className="w-3.5 h-3.5 text-[#6D8196] shrink-0" />
                    )}
                    <span className={isCritical ? 'text-[#D9534F]' : isWarning ? 'text-[#D9822B]' : 'text-[#4A4A4A] dark:text-[#FFFFE3]'}>
                      {item.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#6D8196] dark:text-[#CBCBCB] font-mono whitespace-nowrap">{item.timestamp}</span>
                </div>
                <p className="text-xs text-[#6D8196] dark:text-[#CBCBCB] leading-relaxed">
                  {item.message}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
