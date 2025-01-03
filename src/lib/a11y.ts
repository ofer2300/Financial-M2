import { useEffect } from 'react';

export const a11yConfig = {
  standards: 'WCAG 2.1 AA',
  requirements: {
    contrast: '4.5:1',
    keyboardNav: true,
    screenReader: true,
    reducedMotion: true,
  },
  i18n: {
    rtl: true,
    languages: ['he', 'en'],
    numberFormat: true,
  },
};

export function useA11y() {
  useEffect(() => {
    // בדיקת העדפות תנועה מופחתת
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (prefersReducedMotion.matches) {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms');
    }

    // בדיקת כיווניות
    const isRTL = document.documentElement.dir === 'rtl';
    if (isRTL) {
      document.documentElement.classList.add('rtl');
    }

    // הוספת תמיכה בניווט מקלדת
    document.addEventListener('keydown', handleKeyboardNavigation);

    return () => {
      document.removeEventListener('keydown', handleKeyboardNavigation);
    };
  }, []);
}

function handleKeyboardNavigation(event: KeyboardEvent) {
  // ניווט עם Tab
  if (event.key === 'Tab') {
    document.body.classList.add('keyboard-nav');
  }

  // ניווט עם חצים בתפריטים
  if (event.key.startsWith('Arrow')) {
    const activeElement = document.activeElement;
    if (activeElement?.getAttribute('role') === 'menuitem') {
      handleMenuNavigation(event, activeElement as HTMLElement);
    }
  }

  // קיצורי מקלדת
  if (event.altKey) {
    switch (event.key) {
      case 'h':
        // מעבר לדף הבית
        window.location.href = '/';
        break;
      case 's':
        // מעבר לחיפוש
        document.querySelector<HTMLElement>('[role="search"]')?.focus();
        break;
      case 'm':
        // פתיחת תפריט ראשי
        document.querySelector<HTMLElement>('[role="navigation"]')?.focus();
        break;
    }
  }
}

function handleMenuNavigation(event: KeyboardEvent, currentElement: HTMLElement) {
  const menu = currentElement.closest('[role="menu"]');
  if (!menu) return;

  const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));
  const currentIndex = items.indexOf(currentElement);

  let nextIndex: number;
  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      nextIndex = currentIndex + 1;
      if (nextIndex >= items.length) nextIndex = 0;
      break;
    case 'ArrowUp':
    case 'ArrowLeft':
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) nextIndex = items.length - 1;
      break;
    default:
      return;
  }

  (items[nextIndex] as HTMLElement).focus();
  event.preventDefault();
}

export function formatNumber(number: number, locale = 'he-IL'): string {
  return new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(number);
}

export function formatDate(date: Date, locale = 'he-IL'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatCurrency(amount: number, currency = 'ILS', locale = 'he-IL'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

export const ariaLabels = {
  main: 'תוכן ראשי',
  navigation: 'ניווט ראשי',
  search: 'חיפוש',
  menu: 'תפריט',
  dialog: 'דיאלוג',
  alert: 'התראה',
  closeButton: 'סגור',
  nextPage: 'עמוד הבא',
  previousPage: 'עמוד קודם',
  loading: 'טוען...',
  error: 'שגיאה',
  success: 'פעולה הושלמה בהצלחה',
} as const; 