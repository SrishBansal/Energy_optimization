import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const fmtINR = (v: number) => {
    const absV = Math.abs(v);
    let formatted = "";
    if (absV >= 1e7) {
        formatted = (absV / 1e7).toFixed(2) + "Cr"; // 1 Crore = 10,000,000
    } else if (absV >= 1e5) {
        formatted = (absV / 1e5).toFixed(2) + "L"; // 1 Lakh = 100,000
    } else {
        formatted = absV.toLocaleString("en-IN");
    }
    return v < 0 ? `-₹${formatted}` : `₹${formatted}`;
};
