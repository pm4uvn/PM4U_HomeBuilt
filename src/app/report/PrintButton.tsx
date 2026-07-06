"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-blue-600 text-white text-sm font-semibold rounded-lg px-4 py-2 hover:opacity-90"
    >
      🖨️ In / Lưu PDF
    </button>
  );
}
