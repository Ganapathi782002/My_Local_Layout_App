import React, { useEffect, useRef, useState } from 'react';
import { Copy, ClipboardPaste, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface ContextMenuProps {
  x: number;
  y: number;
  theme: 'light' | 'dark';
  onClose: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  x, y, theme, onClose, onCopy, onPaste, onDelete, onBringToFront, onSendToBack
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: y, left: x });

  useEffect(() => {
    if (menuRef.current) {
      const { width: menuWidth, height: menuHeight } = menuRef.current.getBoundingClientRect();
      const { innerWidth: windowWidth, innerHeight: windowHeight } = window;
      
      let adjustedX = x;
      let adjustedY = y;
      if (x + menuWidth > windowWidth) {
        adjustedX = x - menuWidth;
      }
      if (y + menuHeight > windowHeight) {
        adjustedY = y - menuHeight;
      }
      if(adjustedX !== x || adjustedY !== y) {
        setMenuPosition({ top: adjustedY, left: adjustedX });
      }
    }
  }, [x, y]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const menuBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const menuBorder = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
  const itemText = theme === 'dark' ? 'text-gray-200' : 'text-gray-800';
  const itemHover = theme === 'dark' ? 'hover:bg-blue-600' : 'hover:bg-blue-500';
  const separatorBorder = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
  
  const menuItemClasses = `flex items-center w-full px-3 py-2 text-sm text-left ${itemText} ${itemHover} hover:text-white rounded`;

  return (
    <div
      ref={menuRef}
      className={`fixed p-1 rounded-md shadow-xl border z-[1000] ${menuBg} ${menuBorder}`}
      style={{ top: menuPosition.top, left: menuPosition.left }}
    >
      <ul className="space-y-1">
        <li><button onClick={onCopy} className={menuItemClasses}><Copy size={14} className="mr-2" /> Copy</button></li>
        <li><button onClick={onPaste} className={menuItemClasses}><ClipboardPaste size={14} className="mr-2" /> Paste</button></li>
        <li><button onClick={onDelete} className={menuItemClasses}><Trash2 size={14} className="mr-2" /> Delete</button></li>
        
        <hr className={`my-1 ${separatorBorder}`} />

        <li><button onClick={onBringToFront} className={menuItemClasses}><ArrowUp size={14} className="mr-2" /> Bring to Front</button></li>
        <li><button onClick={onSendToBack} className={menuItemClasses}><ArrowDown size={14} className="mr-2" /> Send to Back</button></li>
      </ul>
    </div>
  );
};

export default ContextMenu;