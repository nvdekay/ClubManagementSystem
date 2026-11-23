import { useEffect, useState, type MouseEvent } from "react";
import { flushSync } from "react-dom";

export type Theme = "light" | "dark";

// Đọc theme đã lưu, mặc định theo cài đặt hệ thống
function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage có thể bị chặn (chế độ riêng tư); khi đó dùng theo cài đặt hệ thống.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Áp theme đã lưu lên thẻ html trước khi React render
/**
 * Áp theme đã lưu trước khi React render, để các trang không có nút đổi theme (đăng nhập, chọn workspace)
 * theo đúng lựa chọn của người dùng và không bị chớp nền sáng trước khi chuyển sang tối. Chỉ gọi một lần trong main.tsx.
 */
export function applyInitialTheme() {
  document.documentElement.classList.toggle("dark", initialTheme() === "dark");
}

// Hook theme sáng/tối dùng chung, lưu lựa chọn vào localStorage
/** Theme sáng/tối dùng chung cho mọi layout: bật/tắt `.dark` trên <html> và ghi nhớ lựa chọn. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("theme", theme); } catch { /* không được lưu khi storage bị chặn */ }
  }, [theme]);

  /**
   * Đổi theme bằng hiệu ứng quét tròn xuất phát từ nút bật/tắt (View Transitions API): khi chuyển sang tối, theme mới
   * loang ra từ nút; khi chuyển sang sáng, trang tối co lại vào nút, nên hai chiều
   * đối xứng nhau. Trình duyệt không có API này, và người dùng bật giảm chuyển động, sẽ đổi theme thẳng không hiệu ứng.
   */
  function toggleTheme(event?: MouseEvent<HTMLElement>) {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduced) {
      setTheme(next);
      return;
    }
    // Kích hoạt bằng bàn phím báo toạ độ (0, 0): thay vào đó bắt đầu từ giữa control.
    const rect = event?.currentTarget.getBoundingClientRect();
    const x = event && event.detail > 0 ? event.clientX : rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = event && event.detail > 0 ? event.clientY : rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const root = document.documentElement;
    // Hiệu ứng quét là CSS animation trên các pseudo-element snapshot (index.css), nên khung hình đầu đã
    // bị cắt sẵn; nếu điều khiển bằng JS sau `ready` thì sẽ lọt một khung hình của cả trang mới (chớp tối).
    root.style.setProperty("--theme-x", `${x}px`);
    root.style.setProperty("--theme-y", `${y}px`);
    root.style.setProperty("--theme-r", `${radius}px`);
    root.dataset.themeWipe = next === "light" ? "collapse" : "expand";
    const transition = document.startViewTransition(() => {
      // Snapshot của trang "mới" được chụp ngay sau callback này, nên class phải có sẵn trên <html>.
      root.classList.toggle("dark", next === "dark");
      flushSync(() => setTheme(next));
    });
    void transition.finished.finally(() => {
      delete root.dataset.themeWipe;
      for (const name of ["--theme-x", "--theme-y", "--theme-r"]) root.style.removeProperty(name);
    });
  }

  return { theme, setTheme, toggleTheme };
}
