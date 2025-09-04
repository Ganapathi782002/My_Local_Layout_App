import React, { useEffect, useState } from 'react';
import { Copy, ClipboardPaste, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { usePopper } from 'react-popper';
import type { VirtualElement } from '@popperjs/core';

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
  const [referenceElement, setReferenceElement] = useState<VirtualElement | null>(null);
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null);

  //console.log("Reference element before and after useEffect: ",referenceElement);

  useEffect(() => {
    setReferenceElement({
      getBoundingClientRect: () => DOMRect.fromRect({
        width: 0,
        height: 0,
        x: x,
        y: y,
      }),
    });
  }, [x, y]);


  const { styles } = usePopper(referenceElement, popperElement, {
    placement: 'top-end',
    modifiers: [
      { name: 'offset', options: { offset: [5,5] } },
      { name: 'flip' },
      { name: 'preventOverflow', options: { padding: 5 } },
    ],
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popperElement && !popperElement.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [popperElement, onClose]);

  const menuBg = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const menuBorder = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
  const itemText = theme === 'dark' ? 'text-gray-200' : 'text-gray-800';
  const itemHover = theme === 'dark' ? 'hover:bg-blue-600' : 'hover:bg-blue-500';
  const separatorBorder = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
  
  const menuItemClasses = `flex items-center w-full px-3 py-2 text-sm text-left ${itemText} ${itemHover} hover:text-white rounded`;

  return (
    <div
      ref={setPopperElement}
      style={styles.popper}
      className={`fixed p-1 rounded-md shadow-xl border z-[10000] ${menuBg} ${menuBorder}`}
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